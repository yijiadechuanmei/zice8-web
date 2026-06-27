import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getVisitorId, trackEvent, trackPageView } from '../../shared/analytics'
import { getQueryParam } from '../../shared/utils/url'
import {
  drawPrize,
  getBootstrap,
  getDebugAccess,
  getMyPrizes,
  getPublicConfig,
  resetDebugData,
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

const isDebugRequested = getQueryParam('debug') === '1'
const DEBUG_RESET_TOKEN = 'RESET_BQL_2026'

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

function QuizPage({ attempt, answers, currentIndex, onAnswer, onContinue, submitting, error }) {
  const questions = attempt?.questions || []
  const question = questions[currentIndex] || null
  const selected = question ? answers[question.id] || [] : []
  const total = questions.length || 5
  const progress = total > 0 ? Math.min(1, (currentIndex + 1) / total) : 0
  const isLast = currentIndex >= total - 1

  return (
    <main className="bql-stage bql-quiz-stage">
      <section className="bql-panel bql-question-page-panel">
        <div className="bql-progress-card">
          <div className="bql-progress-label">
            题目 <strong>{Math.min(currentIndex + 1, total)}</strong><span>/{total}</span>
          </div>
          <div className="bql-progress-track">
            <div className="bql-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <article className="bql-question-card">
          <div className="bql-stage-kicker">{question?.type === 'multiple' ? '多选题' : '单选题'}</div>
          <h1>{question?.title || '题目加载中...'}</h1>
          <div className="bql-options" role={question?.type === 'multiple' ? 'group' : 'radiogroup'} aria-label="题目选项">
            {(question?.options || []).map((option) => {
              const active = selected.includes(option.key)
              return (
                <button
                  key={option.key}
                  className={`bql-option ${active ? 'is-selected' : ''}`}
                  type="button"
                  disabled={submitting || !question}
                  onClick={() => onAnswer(question, option.key)}
                  aria-pressed={active}
                >
                  <span>{option.key}</span>
                  {option.text}
                </button>
              )
            })}
          </div>
        </article>

        <div className="bql-question-actions">
          <button className="bql-primary" type="button" onClick={onContinue} disabled={submitting || !selected.length}>
            {submitting ? '提交中...' : isLast ? '提交答案' : '下一题'}
          </button>
        </div>
        {error ? <p className="bql-form-error">{error}</p> : null}
      </section>
    </main>
  )
}

function ResultPage({ result, onDraw, onHome }) {
  const total = result?.totalCount || 5
  const correct = result?.correctCount || 0
  const wrong = Math.max(0, total - correct)

  return (
    <main className="bql-stage">
      <section className="bql-panel bql-result-panel bql-phase-like-panel">
        <div className="bql-result-emblem" aria-hidden="true">
          <div className="bql-result-emblem-core">✓</div>
        </div>
        <h1>本次答题完成</h1>
        <div className="bql-score-card">
          <div className="bql-score-number">
            <strong>{result?.score || 0}</strong><span>分</span>
          </div>
          <div className="bql-score-meta">
            <span>答对 {correct} 题</span>
            <span>答错 {wrong} 题</span>
          </div>
        </div>
        <div className="bql-result-actions">
          <button className="bql-primary" type="button" onClick={onDraw}>立即抽奖</button>
          <button className="bql-secondary" type="button" onClick={onHome}>返回画册</button>
        </div>
      </section>
    </main>
  )
}

function WheelPage({ draw, spinning, onDraw, onMyPrizes, onHome }) {
  const segments = ['特等奖', '一等奖', '二等奖', '谢谢参与', '三等奖', '幸运奖']

  return (
    <main className="bql-stage">
      <section className="bql-panel bql-wheel-panel bql-phase-like-panel">
        <h1>幸运转盘</h1>
        <div className="bql-wheel-count">剩余抽奖次数：{draw ? 0 : 1}</div>
        <div className={`bql-wheel ${spinning ? 'is-spinning' : ''}`}>
          <div className="bql-wheel-pointer" />
          {segments.map((segment, index) => (
            <span className={`bql-wheel-label bql-wheel-label-${index + 1}`} key={segment}>{segment}</span>
          ))}
          <button className="bql-wheel-core" type="button" onClick={onDraw} disabled={spinning || Boolean(draw)}>
            {spinning ? '抽奖中' : 'GO'}
          </button>
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
          <button className="bql-secondary" type="button" onClick={onMyPrizes}>查看我的奖品</button>
          <button className="bql-secondary" type="button" onClick={onHome}>返回画册</button>
        </div>
        {spinning ? (
          <div className="bql-wheel-loading" aria-live="polite" aria-busy="true">
            <span className="bql-wheel-loading-spinner" aria-hidden="true" />
            <span>抽奖处理中...</span>
          </div>
        ) : null}
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

function DebugPanel({
  enabled,
  activityKey,
  view,
  attempt,
  draw,
  debugAccess,
  onResetMine,
  onResetAll,
  onGoQuiz,
  onLogState,
}) {
  if (!enabled) return null

  return (
    <div className="bql-debug-panel">
      <div className="bql-debug-title">DEBUG</div>
      <div className="bql-debug-meta">
        <div>activityKey: {activityKey || '-'}</div>
        <div>view: {view || '-'}</div>
        <div>attemptId: {attempt?.id || '-'}</div>
        <div>drawId: {draw?.id || '-'}</div>
        <div>identity: {debugAccess?.identityKey || '-'}</div>
      </div>
      <div className="bql-debug-actions">
        <button type="button" onClick={onResetMine}>重置我的测试数据</button>
        {debugAccess?.allowActivityReset ? (
          <button className="is-danger" type="button" onClick={onResetAll}>重置全部测试数据</button>
        ) : null}
        <button className="is-dark" type="button" onClick={onGoQuiz}>回到答题页</button>
        <button className="is-light" type="button" onClick={onLogState}>console.log 当前状态</button>
      </div>
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [profileOpen, setProfileOpen] = useState(false)
  const [myPrizesOpen, setMyPrizesOpen] = useState(false)
  const [myPrizes, setMyPrizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('加载中...')
  const [error, setError] = useState('')
  const [quizError, setQuizError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [debugAccess, setDebugAccess] = useState(null)
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

  useEffect(() => {
    if (!isDebugRequested || !activityKey || !visitorId) return
    let cancelled = false
    getDebugAccess(activityKey, visitorId)
      .then((data) => {
        if (!cancelled) setDebugAccess(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setDebugAccess(null)
          console.warn('[brochure-quiz-lottery debug access]', err)
        }
      })
    return () => {
      cancelled = true
    }
  }, [activityKey, visitorId])

  const resetLocalState = () => {
    setProfile(null)
    setAttempt(null)
    setResult(null)
    setDraw(null)
    setMyPrizes([])
    setAnswers({})
    setCurrentQuestionIndex(0)
    setQuizError('')
    setSpinning(false)
    setView('home')
  }

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
    setCurrentQuestionIndex(0)
    setView(data.attempt?.status === 'submitted' ? 'result' : 'quiz')
  }

  const handleProfileSaved = async (data) => {
    const saved = await saveProfile(activityKey, data)
    setProfile(saved.profile)
    setProfileOpen(false)
    const started = await startAttempt(activityKey, { visitorId })
    setAttempt(started.attempt)
    setAnswers({})
    setCurrentQuestionIndex(0)
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

  const handleQuestionContinue = () => {
    const questions = attempt?.questions || []
    const question = questions[currentQuestionIndex]
    if (!question || !(answers[question.id] || []).length) {
      setQuizError('请选择答案')
      return
    }
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((index) => index + 1)
      setQuizError('')
      return
    }
    handleSubmit()
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

  const handleDebugResetMine = async () => {
    if (!debugAccess?.canDebug) return
    setLoadingText('正在重置我的测试数据...')
    setLoading(true)
    try {
      const data = await resetDebugData(activityKey, {
        visitorId,
        confirmToken: DEBUG_RESET_TOKEN,
        scope: 'me',
      })
      console.log('[brochure-quiz-lottery debug reset mine]', data)
      resetLocalState()
    } catch (err) {
      setError(err?.message || '重置失败')
    } finally {
      setLoading(false)
      setLoadingText('加载中...')
    }
  }

  const handleDebugResetAll = async () => {
    if (!debugAccess?.canDebug || !debugAccess?.allowActivityReset) return
    if (!window.confirm('确认重置全部测试数据？会清空本活动所有用户的提交信息、答题和抽奖记录，并恢复奖池。')) return
    setLoadingText('正在重置全部测试数据...')
    setLoading(true)
    try {
      const data = await resetDebugData(activityKey, {
        visitorId,
        confirmToken: DEBUG_RESET_TOKEN,
        scope: 'activity',
      })
      console.log('[brochure-quiz-lottery debug reset all]', data)
      resetLocalState()
    } catch (err) {
      setError(err?.message || '重置全部数据失败')
    } finally {
      setLoading(false)
      setLoadingText('加载中...')
    }
  }

  const handleDebugGoQuiz = () => {
    if (!debugAccess?.canDebug || !attempt || attempt.status === 'submitted') return
    setCurrentQuestionIndex(0)
    setView('quiz')
  }

  const handleDebugLogState = () => {
    console.log('[brochure-quiz-lottery debug state]', {
      activityKey,
      visitorId,
      view,
      profile,
      attempt,
      result,
      draw,
      answers,
      currentQuestionIndex,
      myPrizes,
      debugAccess,
    })
  }

  const backgroundStyle = buildBackgroundStyle(config)

  if (loading) return <div className="bql-loading" style={backgroundStyle}>{loadingText}</div>
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
          currentIndex={currentQuestionIndex}
          onAnswer={handleAnswer}
          onContinue={handleQuestionContinue}
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
      <DebugPanel
        enabled={Boolean(isDebugRequested && debugAccess?.canDebug)}
        activityKey={activityKey}
        view={view}
        attempt={attempt}
        draw={draw}
        debugAccess={debugAccess}
        onResetMine={handleDebugResetMine}
        onResetAll={handleDebugResetAll}
        onGoQuiz={handleDebugGoQuiz}
        onLogState={handleDebugLogState}
      />
    </div>
  )
}
