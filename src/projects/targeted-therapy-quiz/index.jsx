import { useEffect, useMemo, useState } from 'react'
import { CloseOutlined, CheckOutlined } from '@ant-design/icons'
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
import './styles.css'

const CATEGORY_ICONS = {
  肺癌: 'lung',
  肉瘤: 'sarcoma',
  消化道瘤: 'digestive',
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
  const stageScale = useStageScale()
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig])
  const categories = config.categories || []
  const homeBackground = assetUrl(config.assetsBaseUrl, config.homeBackgroundImage)
  const questionBackground = assetUrl(config.assetsBaseUrl, config.questionBackgroundImage)
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

  function retest() {
    setQuestion(null)
    setSelectedOption('')
    setResult(null)
    setCategoryDialogOpen(false)
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
        <span>开始测试</span>
      </button>
    </section>
  )
}

function QuestionPage({ question, selectedOption, onSelect, onSubmit, submitting }) {
  return (
    <section className="ttq-question-page" aria-label={`${question.category}答题页`}>
      <p className="ttq-question-category">{question.category} · 随机题</p>
      <h1>{question.title}</h1>
      <div className="ttq-options" role="radiogroup" aria-label="答案选项">
        {question.options.map((option) => {
          const selected = option.id === selectedOption
          return (
            <button
              className={`ttq-option${selected ? ' is-selected' : ''}`}
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(option.id)}
            >
              <span className="ttq-option-letter">{option.id}</span>
              <span className="ttq-option-text">{option.text}</span>
              {selected ? <CheckOutlined className="ttq-option-check" /> : null}
            </button>
          )
        })}
      </div>
      <button className="ttq-primary-button ttq-submit-button" type="button" onClick={onSubmit} disabled={!selectedOption || submitting}>
        <span>{submitting ? '提交中...' : '提交答案'}</span>
      </button>
    </section>
  )
}

function CategoryDialog({ categories, error, loading, onChoose, onClose }) {
  return (
    <div className="ttq-overlay" role="dialog" aria-modal="true" aria-labelledby="ttq-category-title">
      <section className="ttq-category-dialog">
        <button className="ttq-close-button" type="button" onClick={onClose} aria-label="关闭"><CloseOutlined /></button>
        <h2 id="ttq-category-title">请选择类别</h2>
        <span className="ttq-title-decoration" aria-hidden="true" />
        <div className="ttq-category-list">
          {categories.map((category) => (
            <button className="ttq-category-card" key={category} type="button" onClick={() => onChoose(category)} disabled={loading}>
              <CategoryIcon type={CATEGORY_ICONS[category] || 'lung'} />
              <strong>{category}</strong>
              <i />
            </button>
          ))}
        </div>
        {error ? <p className="ttq-category-error">{error}</p> : null}
      </section>
    </div>
  )
}

function ResultDialog({ result, onClose, onRetest }) {
  const correct = result === 'correct'
  return (
    <div className="ttq-overlay ttq-result-overlay" role="dialog" aria-modal="true" aria-labelledby="ttq-result-title">
      <section className={`ttq-result-dialog ${correct ? 'is-correct' : 'is-incorrect'}`}>
        <button className="ttq-close-button" type="button" onClick={onClose} aria-label="关闭"><CloseOutlined /></button>
        <img className="ttq-result-face" src={correct ? smileFace : sadFace} alt={correct ? '笑脸' : '苦脸'} />
        <h2 id="ttq-result-title">{correct ? '回答正确！' : '回答错误'}</h2>
        <p>{correct ? '太棒了，继续加油哦！' : '别灰心，再思考一下哦！'}</p>
        <button className="ttq-primary-button ttq-retest-button" type="button" onClick={onRetest}>
          <span>再测一次</span>
        </button>
      </section>
    </div>
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
