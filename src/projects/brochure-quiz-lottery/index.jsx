import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getVisitorId, trackEvent, trackPageView } from '../../shared/analytics'
import { getQueryParam } from '../../shared/utils/url'
import {
  drawPrize,
  getBootstrap,
  getMyPrizes,
  getPublicConfig,
  saveProfile,
  startAttempt,
  submitAttempt,
} from './api'
import {
  assetUrl,
  BROCHURE_QUIZ_LOTTERY_ACTIVITY_KEY,
  BROCHURE_QUIZ_LOTTERY_ACTIVITY_TYPE,
  mergeBrochureConfig,
} from './config'
import './styles.css'

function normalizeActivityKey(routeParams) {
  return routeParams?.activityKey || getQueryParam('activity_key') || BROCHURE_QUIZ_LOTTERY_ACTIVITY_KEY
}

function playAudio(audio) {
  if (!audio) return Promise.resolve(false)
  if (!/MicroMessenger/i.test(navigator.userAgent || '') || !window.WeixinJSBridge?.invoke) {
    return audio.play().then(() => true)
  }
  return new Promise((resolve) => {
    const run = () => audio.play().then(() => resolve(true)).catch(() => resolve(false))
    try {
      window.WeixinJSBridge.invoke('getNetworkType', {}, run)
    } catch {
      run()
    }
  })
}

function buildBackgroundStyle(config) {
  return {
    '--bql-home-bg-overlay': `url("${assetUrl(config, config.home.bgOverlay)}")`,
  }
}

function HomeCanvas({ config, currentSlide, onSlide, onParticipate }) {
  const audioRef = useRef(null)
  const slides = config.brochure.slides
  const active = slides[currentSlide] || slides[0]
  const activeImage = active.image || config.brochure.placeholderImage

  const startAudio = useCallback(async (index) => {
    const audio = audioRef.current
    const slide = slides[index]
    if (!audio || !slide?.audio) return
    audio.src = assetUrl(config, slide.audio, 'audios')
    audio.currentTime = 0
    await playAudio(audio).catch(() => false)
  }, [config, slides])

  useEffect(() => {
    startAudio(currentSlide)
  }, [currentSlide, startAudio])

  const handleEnded = () => {
    if (currentSlide < slides.length - 1) onSlide(currentSlide + 1)
  }

  const handleSlideClick = (index) => {
    onSlide(index)
    window.setTimeout(() => startAudio(index), 0)
  }

  return (
    <main className="bql-home">
      <div className="bql-canvas">
        <img
          className="bql-home-bg-base"
          src={assetUrl(config, config.home.bgBase)}
          alt=""
        />
        <img
          className="bql-home-bg-overlay"
          src={assetUrl(config, config.home.bgOverlay)}
          alt=""
        />
        <img
          className="bql-home-title"
          src={assetUrl(config, config.home.title)}
          alt=""
        />
        <img
          className="bql-home-logo"
          src={assetUrl(config, config.home.logo)}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />

        <div className="bql-carousel-frame">
          <img
            className="bql-carousel-image"
            src={assetUrl(config, activeImage)}
            alt={active.title}
            onError={(event) => {
              if (activeImage !== config.brochure.placeholderImage && !event.currentTarget.dataset.placeholderApplied) {
                event.currentTarget.dataset.placeholderApplied = '1'
                event.currentTarget.src = assetUrl(config, config.brochure.placeholderImage)
                return
              }
            }}
          />
        </div>

        <div className="bql-tab-row" aria-label="画册篇章">
          {slides.map((slide, index) => (
            <button
              key={slide.key}
              className={`bql-image-button bql-tab bql-tab-${index + 1} ${index === currentSlide ? 'is-active' : ''}`}
              type="button"
              onClick={() => handleSlideClick(index)}
              aria-label={slide.title}
            >
              <span className="bql-tab-text">{slide.title}</span>
            </button>
          ))}
        </div>

        <button className="bql-image-button bql-participate" type="button" onClick={onParticipate}>
          <img src={assetUrl(config, config.home.participateButton)} alt="参与互动" />
        </button>
      </div>
      <audio ref={audioRef} onEnded={handleEnded} preload="auto" />
    </main>
  )
}

function ProfileModal({ initialProfile, visitorId, onClose, onSaved }) {
  const [form, setForm] = useState({
    customerName: initialProfile?.customerName || '',
    phone: initialProfile?.phone || '',
    agentName: initialProfile?.agentName || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    const phone = form.phone.trim()
    if (!form.customerName.trim() || !phone || !form.agentName.trim()) {
      setError('请完整填写信息')
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await onSaved({ ...form, visitorId })
    } catch (err) {
      setError(err?.message || '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bql-modal-mask">
      <form className="bql-profile-modal" onSubmit={handleSubmit}>
        <button className="bql-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        <h2>参与信息</h2>
        <label>
          <span>客户真实姓名</span>
          <input value={form.customerName} onChange={(event) => update('customerName', event.target.value)} />
        </label>
        <label>
          <span>手机号</span>
          <input value={form.phone} onChange={(event) => update('phone', event.target.value)} inputMode="tel" maxLength={11} />
        </label>
        <label>
          <span>代理人姓名</span>
          <input value={form.agentName} onChange={(event) => update('agentName', event.target.value)} />
        </label>
        {error ? <p className="bql-form-error">{error}</p> : null}
        <button className="bql-primary" type="submit" disabled={submitting}>{submitting ? '提交中...' : '提交并答题'}</button>
      </form>
    </div>
  )
}

function QuizPage({ attempt, answers, onAnswer, onSubmit, submitting, error }) {
  const questions = attempt?.questions || []
  return (
    <main className="bql-stage bql-quiz-stage">
      <section className="bql-panel">
        <div className="bql-stage-kicker">互动答题</div>
        <h1>随机 5 题</h1>
        <p className="bql-stage-sub">判断题按 A 对、B 错选择；多选题可选择多个答案。</p>
        <div className="bql-question-list">
          {questions.map((question, questionIndex) => {
            const selected = answers[question.id] || []
            return (
              <article className="bql-question" key={question.id}>
                <h2>{questionIndex + 1}. {question.title}</h2>
                <div className="bql-options">
                  {question.options.map((option) => {
                    const active = selected.includes(option.key)
                    return (
                      <button
                        key={option.key}
                        className={`bql-option ${active ? 'is-selected' : ''}`}
                        type="button"
                        onClick={() => onAnswer(question, option.key)}
                      >
                        <span>{option.key}</span>
                        {option.text}
                      </button>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </div>
        {error ? <p className="bql-form-error">{error}</p> : null}
        <button className="bql-primary" type="button" onClick={onSubmit} disabled={submitting}>
          {submitting ? '提交中...' : '提交答案'}
        </button>
      </section>
    </main>
  )
}

function ResultPage({ result, onDraw, onHome }) {
  return (
    <main className="bql-stage">
      <section className="bql-panel bql-result-panel">
        <div className="bql-stage-kicker">答题结果</div>
        <h1>{result?.score || 0} 分</h1>
        <p className="bql-stage-sub">答对 {result?.correctCount || 0} / {result?.totalCount || 5} 题，可参与转盘抽奖。</p>
        <div className="bql-result-actions">
          <button className="bql-primary" type="button" onClick={onDraw}>参与抽奖</button>
          <button className="bql-secondary" type="button" onClick={onHome}>返回画册</button>
        </div>
      </section>
    </main>
  )
}

function WheelPage({ draw, spinning, onDraw, onMyPrizes, onHome }) {
  return (
    <main className="bql-stage">
      <section className="bql-panel bql-wheel-panel">
        <div className="bql-stage-kicker">幸运转盘</div>
        <h1>抽取你的互动奖品</h1>
        <div className={`bql-wheel ${spinning ? 'is-spinning' : ''}`}>
          <div className="bql-wheel-pointer" />
          <div className="bql-wheel-core">GO</div>
        </div>
        {draw ? (
          <div className="bql-prize-result">
            <strong>{draw.won ? draw.prizeName : '谢谢参与'}</strong>
            <span>{draw.won ? '奖品会由客户联系代理人发放' : '本次未中奖'}</span>
          </div>
        ) : (
          <p className="bql-stage-sub">每位用户仅限抽奖 1 次，奖项从剩余奖池中随机抽取。</p>
        )}
        <div className="bql-result-actions">
          <button className="bql-primary" type="button" onClick={onDraw} disabled={spinning || Boolean(draw)}>
            {draw ? '已抽奖' : spinning ? '抽奖中...' : '开始抽奖'}
          </button>
          <button className="bql-secondary" type="button" onClick={onMyPrizes}>我的奖品</button>
          <button className="bql-secondary" type="button" onClick={onHome}>返回画册</button>
        </div>
      </section>
    </main>
  )
}

function MyPrizesModal({ prizes, onClose }) {
  return (
    <div className="bql-modal-mask">
      <section className="bql-profile-modal bql-prize-modal">
        <button className="bql-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        <h2>我的奖品</h2>
        {prizes.length ? (
          <div className="bql-prize-list">
            {prizes.map((prize) => (
              <div className="bql-prize-item" key={prize.id}>
                <strong>{prize.prizeName}</strong>
                <span>{prize.prizeLevel}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="bql-empty">暂无中奖记录</p>
        )}
      </section>
    </div>
  )
}

export default function BrochureQuizLotteryApp({ routeParams }) {
  const activityKey = normalizeActivityKey(routeParams)
  const visitorId = useMemo(() => getVisitorId(), [])
  const [publicConfig, setPublicConfig] = useState(null)
  const [profile, setProfile] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [result, setResult] = useState(null)
  const [draw, setDraw] = useState(null)
  const [view, setView] = useState('home')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [answers, setAnswers] = useState({})
  const [profileOpen, setProfileOpen] = useState(false)
  const [myPrizesOpen, setMyPrizesOpen] = useState(false)
  const [myPrizes, setMyPrizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizError, setQuizError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const config = useMemo(() => mergeBrochureConfig(publicConfig), [publicConfig])

  useEffect(() => {
    let cancelled = false
    getPublicConfig(activityKey)
      .then(async (publicData) => {
        const bootstrap = await getBootstrap(activityKey, visitorId).catch(() => ({
          profile: null,
          attempt: null,
          result: null,
          draw: null,
          myPrizes: [],
        }))
        return [publicData, bootstrap]
      })
      .then(([publicData, bootstrap]) => {
        if (cancelled) return
        setPublicConfig(publicData)
        setProfile(bootstrap.profile)
        setAttempt(bootstrap.attempt)
        setResult(bootstrap.result)
        setDraw(bootstrap.draw)
        setMyPrizes(bootstrap.myPrizes || [])
        document.title = publicData?.title || '中英人寿互动答题'
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || '项目加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activityKey, visitorId])

  useEffect(() => {
    trackPageView(activityKey, '/brochure-quiz-lottery', {
      activityType: BROCHURE_QUIZ_LOTTERY_ACTIVITY_TYPE,
    })
  }, [activityKey])

  const enterInteraction = async () => {
    if (!profile) {
      setProfileOpen(true)
      return
    }
    if (draw) {
      setView('wheel')
      return
    }
    if (result || attempt?.status === 'submitted') {
      setView('result')
      return
    }
    const data = await startAttempt(activityKey, { visitorId })
    setAttempt(data.attempt)
    setAnswers({})
    setView(data.attempt?.status === 'submitted' ? 'result' : 'quiz')
  }

  const handleProfileSaved = async (data) => {
    const saved = await saveProfile(activityKey, data)
    setProfile(saved.profile)
    setProfileOpen(false)
    const started = await startAttempt(activityKey, { visitorId })
    setAttempt(started.attempt)
    setAnswers({})
    setView(started.attempt?.status === 'submitted' ? 'result' : 'quiz')
  }

  const handleAnswer = (question, optionKey) => {
    setQuizError('')
    setAnswers((prev) => {
      const selected = prev[question.id] || []
      if (question.type === 'multiple') {
        return {
          ...prev,
          [question.id]: selected.includes(optionKey)
            ? selected.filter((item) => item !== optionKey)
            : [...selected, optionKey],
        }
      }
      return { ...prev, [question.id]: [optionKey] }
    })
  }

  const handleSubmit = async () => {
    const questions = attempt?.questions || []
    const incomplete = questions.some((question) => !(answers[question.id] || []).length)
    if (incomplete) {
      setQuizError('请完成所有题目')
      return
    }
    setSubmitting(true)
    setQuizError('')
    try {
      const payload = {
        visitorId,
        answers: questions.map((question) => ({
          questionId: question.id,
          answers: answers[question.id] || [],
        })),
      }
      const data = await submitAttempt(activityKey, attempt.id, payload)
      setResult(data.result)
      setAttempt((prev) => ({ ...prev, ...data.result }))
      setView('result')
    } catch (err) {
      setQuizError(err?.message || '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDraw = async () => {
    if (!result?.id && !attempt?.id) return
    setSpinning(true)
    try {
      const requestId = `bql_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const data = await drawPrize(activityKey, result?.id || attempt.id, { visitorId, requestId })
      window.setTimeout(() => {
        setDraw(data.draw)
        setSpinning(false)
      }, 900)
      trackEvent({
        activityKey,
        eventType: 'brochure_quiz_lottery_draw',
        page: '/brochure-quiz-lottery',
        extra: { activityType: BROCHURE_QUIZ_LOTTERY_ACTIVITY_TYPE, won: Boolean(data.draw?.won) },
      })
    } catch (err) {
      setSpinning(false)
      setError(err?.message || '抽奖失败，请重试')
    }
  }

  const openMyPrizes = async () => {
    const data = await getMyPrizes(activityKey, visitorId)
    setMyPrizes(data.prizes || [])
    setMyPrizesOpen(true)
  }

  const backgroundStyle = buildBackgroundStyle(config)

  if (loading) return <div className="bql-loading" style={backgroundStyle} />
  if (error) {
    return (
      <main className="bql-stage" style={backgroundStyle}>
        <section className="bql-panel">
          <h1>项目加载失败</h1>
          <p className="bql-form-error">{error}</p>
        </section>
      </main>
    )
  }

  return (
    <div className="bql-app" style={backgroundStyle}>
      {view === 'home' ? (
        <HomeCanvas
          config={config}
          currentSlide={currentSlide}
          onSlide={setCurrentSlide}
          onParticipate={enterInteraction}
        />
      ) : null}
      {view === 'quiz' ? (
        <QuizPage
          attempt={attempt}
          answers={answers}
          onAnswer={handleAnswer}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={quizError}
        />
      ) : null}
      {view === 'result' ? (
        <ResultPage result={result || attempt} onDraw={() => setView('wheel')} onHome={() => setView('home')} />
      ) : null}
      {view === 'wheel' ? (
        <WheelPage
          draw={draw}
          spinning={spinning}
          onDraw={handleDraw}
          onMyPrizes={openMyPrizes}
          onHome={() => setView('home')}
        />
      ) : null}
      {profileOpen ? (
        <ProfileModal
          initialProfile={profile}
          visitorId={visitorId}
          onClose={() => setProfileOpen(false)}
          onSaved={handleProfileSaved}
        />
      ) : null}
      {myPrizesOpen ? <MyPrizesModal prizes={myPrizes} onClose={() => setMyPrizesOpen(false)} /> : null}
    </div>
  )
}
