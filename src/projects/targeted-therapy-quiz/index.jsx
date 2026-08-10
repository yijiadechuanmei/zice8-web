import { useEffect, useMemo, useRef, useState } from 'react'
import { CloseOutlined, CheckOutlined } from '@ant-design/icons'
import confetti from 'canvas-confetti'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { activityAudioService } from '../../shared/audio/activityAudioService'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import {
  getRandomQuestion,
  getTargetedTherapyQuizPublicConfig,
  submitAnswer,
} from './api'
import {
  assetUrl,
  mergeConfig,
  TARGETED_THERAPY_QUIZ_ACTIVITY_KEY,
  TARGETED_THERAPY_QUIZ_ACTIVITY_TYPE,
} from './config'
import smileFace from './assets/smile-face.png'
import sadFace from './assets/sad-face.png'
import quizMascot from './assets/quiz-mascot.png'
import './styles.css'

const CATEGORY_ICONS = {
  肺癌: 'lung',
  肉瘤: 'sarcoma',
  消化道瘤: 'digestive',
}

function fireRealisticConfetti() {
  const count = 200
  const defaults = {
    origin: { y: 0.68 },
    zIndex: 2200,
    disableForReducedMotion: true,
  }
  const fire = (particleRatio, options) => {
    confetti({
      ...defaults,
      ...options,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, { spread: 26, startVelocity: 55 })
  fire(0.2, { spread: 60 })
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
  fire(0.1, { spread: 120, startVelocity: 45 })
}

function useStageScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080))
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return scale
}

export default function TargetedTherapyQuizProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || TARGETED_THERAPY_QUIZ_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [question, setQuestion] = useState(null)
  const [selectedOption, setSelectedOption] = useState('')
  const [result, setResult] = useState(null)
  const [categoryError, setCategoryError] = useState('')
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const feedbackAudiosRef = useRef({})
  const stageScale = useStageScale()
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig])
  const categories = config.categories || []
  const homeBackground = assetUrl(config.assetsBaseUrl, config.homeBackgroundImage)
  const questionBackground = assetUrl(config.assetsBaseUrl, config.questionBackgroundImage)
  const correctSound = assetUrl(config.assetsBaseUrl, config.correctSound)
  const incorrectSound = assetUrl(config.assetsBaseUrl, config.incorrectSound)
  const pageState = question ? 'question' : 'home'
  const bgmConfig = publicConfig?.bgmConfig

  useWechatShare(activityKey, publicConfig)

  useEffect(() => {
    activityAudioService.init({ activityKey })
    return () => {
      activityAudioService.destroy()
    }
  }, [activityKey])

  useEffect(() => {
    const feedbackSounds = {
      correct: correctSound,
      incorrect: incorrectSound,
    }
    const audios = Object.fromEntries(
      Object.entries(feedbackSounds)
        .filter(([, url]) => Boolean(url))
        .map(([key, url]) => {
          const audio = new Audio(url)
          audio.preload = 'auto'
          audio.volume = Number(config.feedbackSoundVolume) || 0.82
          audio.load()
          return [key, audio]
        }),
    )
    feedbackAudiosRef.current = audios

    return () => {
      Object.values(audios).forEach((audio) => {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      })
    }
  }, [config.feedbackSoundVolume, correctSound, incorrectSound])

  useEffect(() => {
    if (result === 'correct') fireRealisticConfetti()
  }, [result])

  useEffect(() => {
    let cancelled = false
    getTargetedTherapyQuizPublicConfig(activityKey)
      .then((data) => {
        if (!cancelled) setPublicConfig(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activityKey])

  useEffect(() => {
    document.title = publicConfig?.title || '血靶引领 创见元限'
    trackPageView(activityKey, '/targeted-therapy-quiz', {
      activityType: publicConfig?.type || TARGETED_THERAPY_QUIZ_ACTIVITY_TYPE,
      pageKey: pageState,
    })
  }, [activityKey, pageState, publicConfig])

  function openCategoryDialog() {
    setCategoryError('')
    setCategoryDialogOpen(true)
    trackEvent({
      activityKey,
      eventType: 'enter_activity',
      page: '/targeted-therapy-quiz',
      extra: { eventName: 'open_category_dialog' },
    })
  }

  async function chooseCategory(category) {
    if (loadingQuestion) return
    setLoadingQuestion(true)
    setCategoryError('')
    try {
      const nextQuestion = await getRandomQuestion(activityKey, category)
      setQuestion(nextQuestion)
      setSelectedOption('')
      setResult(null)
      setCategoryDialogOpen(false)
      trackEvent({
        activityKey,
        eventType: 'submit_profile',
        page: '/targeted-therapy-quiz',
        extra: { eventName: 'choose_category', category, questionId: nextQuestion.id },
      })
    } catch (error) {
      setCategoryError(error.message || '题库加载失败，请稍后再试')
    } finally {
      setLoadingQuestion(false)
    }
  }

  async function submitQuestion() {
    if (!selectedOption || !question || submitting) return
    setSubmitting(true)
    try {
      const answerResult = await submitAnswer(activityKey, question.id, selectedOption)
      const correct = Boolean(answerResult?.correct)
      playFeedbackSound(correct ? 'correct' : 'incorrect')
      setResult(correct ? 'correct' : 'incorrect')
      trackEvent({
        activityKey,
        eventType: 'submit_profile',
        page: '/targeted-therapy-quiz',
        extra: { eventName: 'submit_answer', questionId: question.id, selectedOption, correct },
      })
    } finally {
      setSubmitting(false)
    }
  }

  function playFeedbackSound(type) {
    const audio = feedbackAudiosRef.current[type]
    if (!audio) return
    audio.currentTime = 0
    audio.play().catch(() => {})
  }

  function retest() {
    setQuestion(null)
    setSelectedOption('')
    setResult(null)
    setCategoryDialogOpen(true)
  }

  function returnHome() {
    setQuestion(null)
    setSelectedOption('')
    setResult(null)
    setCategoryDialogOpen(false)
  }

  return (
    <main className="ttq-app" aria-label="血靶引领 创见元限互动答题">
      <div className="ttq-stage-wrap">
        <div
          className={`ttq-stage ttq-stage--${pageState}`}
          style={{
            transform: `scale(${stageScale})`,
            backgroundImage: `url("${pageState === 'home' ? homeBackground : questionBackground}")`,
          }}
        >
          {pageState === 'home' ? <HomePage onStart={openCategoryDialog} /> : null}
          {pageState === 'question' && question ? (
            <QuestionPage
              question={question}
              selectedOption={selectedOption}
              onSelect={setSelectedOption}
              onSubmit={submitQuestion}
              submitting={submitting}
            />
          ) : null}
          {categoryDialogOpen ? (
            <CategoryDialog
              categories={categories}
              error={categoryError}
              loading={loadingQuestion}
              onChoose={chooseCategory}
              onClose={() => setCategoryDialogOpen(false)}
            />
          ) : null}
          {result ? <ResultDialog result={result} onClose={returnHome} onRetest={retest} /> : null}
        </div>
      </div>
      <ActivityBgmPlayer bgm={bgmConfig} activityKey={activityKey} />
    </main>
  )
}

function HomePage({ onStart }) {
  return (
    <section className="ttq-home" aria-label="首页">
      <button className="ttq-primary-button ttq-home-start" type="button" onClick={onStart}>
        <span>开始闯关</span>
      </button>
    </section>
  )
}

function QuestionPage({ question, selectedOption, onSelect, onSubmit, submitting }) {
  return (
    <section className="ttq-question-page" aria-label={`${question.category}答题页`}>
      <div className="ttq-question-decoration ttq-question-decoration--one" aria-hidden="true" />
      <div className="ttq-question-decoration ttq-question-decoration--two" aria-hidden="true" />
      <div className="ttq-question-decoration ttq-question-decoration--three" aria-hidden="true" />
      <img className="ttq-question-mascot ttq-question-mascot--one" src={quizMascot} alt="" aria-hidden="true" />
      <img className="ttq-question-mascot ttq-question-mascot--two" src={quizMascot} alt="" aria-hidden="true" />
      <div className="ttq-question-confetti" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <div className="ttq-question-shell">
        <header className="ttq-challenge-bar">
          <div className="ttq-challenge-label">
            <SparkIcon />
            <span>知识闯关</span>
            <strong>{question.category}关</strong>
          </div>
        </header>

        <article className="ttq-question-card">
          <div className="ttq-question-heading">
            <span className="ttq-question-number" aria-hidden="true">Q</span>
            <div>
              <p className="ttq-question-category">随机挑战 · 请选择正确答案</p>
              <h1>{question.title}</h1>
            </div>
          </div>
          <div className="ttq-options" role="radiogroup" aria-label="答案选项">
            {question.options.map((option, index) => {
              const selected = option.id === selectedOption
              return (
                <button
                  className={`ttq-option${selected ? ' is-selected' : ''}`}
                  key={option.id}
                  style={{ '--ttq-option-index': index }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelect(option.id)}
                >
                  <span className="ttq-option-letter">{option.id}</span>
                  <span className="ttq-option-text">{option.text}</span>
                  <span className="ttq-option-status" aria-hidden="true">
                    {selected ? <CheckOutlined /> : <ArrowIcon />}
                  </span>
                </button>
              )
            })}
          </div>
        </article>

        <button className="ttq-primary-button ttq-submit-button" type="button" onClick={onSubmit} disabled={!selectedOption || submitting}>
          <span>{submitting ? '正在判定...' : '确认闯关'}</span>
          {!submitting ? <ArrowIcon /> : null}
        </button>
        <p className="ttq-submit-tip">选好答案，向闯关终点出发</p>
      </div>
    </section>
  )
}

function CategoryDialog({ categories, error, loading, onChoose, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  return (
    <div className="ttq-overlay" role="dialog" aria-modal="true" aria-labelledby="ttq-category-title" aria-describedby="ttq-category-description">
      <section ref={dialogRef} className="ttq-category-dialog" tabIndex={-1}>
        <button className="ttq-close-button" type="button" onClick={onClose} aria-label="关闭"><CloseOutlined /></button>
        <p className="ttq-category-eyebrow">准备出发</p>
        <h2 id="ttq-category-title">请选择您的关卡</h2>
        <span className="ttq-title-decoration" aria-hidden="true" />
        <p className="ttq-category-description" id="ttq-category-description">每个关卡都会随机出现一道知识题</p>
        <div className="ttq-category-list">
          {categories.map((category, index) => (
            <button
              className="ttq-category-card"
              key={category}
              style={{ '--ttq-card-index': index }}
              type="button"
              onClick={() => onChoose(category)}
              disabled={loading}
            >
              <span className="ttq-level-number">第 {index + 1} 关</span>
              <CategoryIcon type={CATEGORY_ICONS[category] || 'lung'} />
              <strong>{category}</strong>
              <small>{loading ? '正在开启...' : '点击开启挑战'}</small>
            </button>
          ))}
        </div>
        {error ? <p className="ttq-category-error" role="alert">{error}</p> : null}
      </section>
    </div>
  )
}

function ResultDialog({ result, onClose, onRetest }) {
  const correct = result === 'correct'
  const actionRef = useRef(null)

  useEffect(() => {
    actionRef.current?.focus()
  }, [])

  return (
    <div className="ttq-overlay ttq-result-overlay" role="dialog" aria-modal="true" aria-labelledby="ttq-result-title">
      <section className={`ttq-result-dialog ${correct ? 'is-correct' : 'is-incorrect'}`} aria-live="polite">
        <button className="ttq-close-button" type="button" onClick={onClose} aria-label="关闭"><CloseOutlined /></button>
        <img className="ttq-result-face" src={correct ? smileFace : sadFace} alt={correct ? '笑脸' : '苦脸'} />
        <h2 id="ttq-result-title">{correct ? '恭喜闯关成功！' : '差一点就成功啦'}</h2>
        <p>{correct ? '太棒了，知识能量已点亮！' : '别灰心，换个关卡再挑战吧！'}</p>
        <button ref={actionRef} className="ttq-primary-button ttq-retest-button" type="button" onClick={onRetest}>
          <span>{correct ? '再闯一关' : '重新挑战'}</span>
          <ArrowIcon />
        </button>
      </section>
    </div>
  )
}

function SparkIcon() {
  return (
    <svg className="ttq-spark-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 4c1.8 10.7 7.3 16.2 18 18-10.7 1.8-16.2 7.3-18 18-1.8-10.7-7.3-16.2-18-18C16.7 20.2 22.2 14.7 24 4Z" />
      <path d="M39 4c.5 3.1 2.1 4.7 5 5.2-2.9.5-4.5 2.1-5 5.2-.5-3.1-2.1-4.7-5-5.2 2.9-.5 4.5-2.1 5-5.2Z" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg className="ttq-arrow-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

function CategoryIcon({ type }) {
  if (type === 'sarcoma') {
    return <svg className="ttq-category-icon" viewBox="0 0 100 100" aria-hidden="true"><path d="M31 70c11-27 20-39 42-43-4 21-17 38-42 43Z" /><path d="M38 62 68 34M46 57l2 11M53 50l11 1" /><circle cx="67" cy="35" r="3" /></svg>
  }
  if (type === 'digestive') {
    return <svg className="ttq-category-icon" viewBox="0 0 100 100" aria-hidden="true"><path d="M59 20c12 4 18 14 17 25-1 13-12 17-12 28 0 10-7 15-16 15-9 0-17-6-17-15 0-9 8-13 11-19 2-6-2-10-8-13-5-2-7-8-5-13 3-7 12-8 17-2 4 5 7 8 13 8" /></svg>
  }
  return <svg className="ttq-category-icon" viewBox="0 0 100 100" aria-hidden="true"><path d="M47 20v24L37 33c-8-9-19-3-19 10v25c0 12 11 18 20 12l9-6v7M53 20v24l10-11c8-9 19-3 19 10v25c0 12-11 18-20 12l-9-6v7" /><path d="M50 19v62" /></svg>
}
