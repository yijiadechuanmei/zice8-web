/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { trackEvent, trackPageView } from '../../shared/analytics'
import {
  getQualityMonthPublicConfig,
  getQualityMonthState,
  startQualityMonthQuiz,
  submitQualityMonthQuiz,
} from './api'
import './styles.css'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

const HOME_ART = {
  background: 'https://file3.ih5.cn/v35/edt/u10013600/7c3ce8c0e0c1e5286db805d23d2f0a0b_25307_750_1624.png',
  left: 'https://file3.ih5.cn/v35/edt/u10013600/b1879bb493dc516c8820fb177d9ee055_2335_75_104.png',
  title: 'https://file3.ih5.cn/v35/edt/u10013600/78c1f885d3321cd4dd0c48f2028a9532_8657_500_377.png',
  sparkle: 'https://file3.ih5.cn/v35/edt/u10013600/c6356e646a7afee9da7ed6319ef53530_4002_105_110.png',
  right: 'https://file3.ih5.cn/v35/edt/u10013600/bbd68fb58e09e4b420dcefa56d179e6e_21848_274_385.png',
  character: 'https://file3.ih5.cn/v35/edt/u10013600/a2dd0b608707e00035bba13d84390872_18781_279_340.png',
  bottom: 'https://file3.ih5.cn/v35/edt/u10013600/b4fda631befaf174cd9969c74e00e789_23238_349_369.png',
  corner: 'https://file3.ih5.cn/v35/edt/u10013600/36372445f37b0d8b966cee0039160b24_4579_312_145.png',
}

export default function QualityMonthProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || 'china_otsuka_quality_month_2026'
  const previewMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('preview') : ''
  const [publicConfig, setPublicConfig] = useState(() => previewMode ? previewPublicConfig : null)
  const [state, setState] = useState(() => previewMode ? buildPreviewState(previewMode) : null)
  const [loading, setLoading] = useState(!previewMode)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef(null)
  const { authReady, blockedMessage } = useWechatAuth(activityKey, publicConfig)
  useWechatShare(activityKey, publicConfig)

  function restoreDraft(data) {
    if (data?.phase !== 'quiz' || !data.attemptId) {
      setAnswers({})
      setQuestionIndex(0)
      return
    }
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey(data.attemptId)) || '{}')
      setAnswers(draft.answers || {})
      setQuestionIndex(Math.min(Number(draft.questionIndex || 0), Math.max(data.questions.length - 1, 0)))
    } catch {
      setAnswers({})
      setQuestionIndex(0)
    }
  }

  useEffect(() => {
    if (previewMode) return undefined
    let alive = true
    getQualityMonthPublicConfig(activityKey)
      .then((config) => {
        if (alive) setPublicConfig(config)
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message || '活动信息加载失败')
      })
    return () => { alive = false }
  }, [activityKey, previewMode])

  useEffect(() => {
    if (!authReady || previewMode) return undefined
    let alive = true
    setLoading(true)
    getQualityMonthState(activityKey)
      .then((data) => {
        if (!alive) return
        setState(data)
        restoreDraft(data)
      })
      .catch((requestError) => {
        if (alive) setError(requestError.message || '答题状态加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
  }, [activityKey, authReady, previewMode])

  useEffect(() => {
    if (!blockedMessage) return
    setLoading(false)
    setError(blockedMessage)
  }, [blockedMessage])

  useEffect(() => {
    document.title = publicConfig?.title || '中国大冢制药有限公司质量月'
  }, [publicConfig])

  useEffect(() => {
    if (!authReady || previewMode) return
    trackPageView(activityKey, '/quality-month', { activityType: 'otsuka_quality_month_quiz' })
  }, [activityKey, authReady, previewMode])

  useEffect(() => {
    if (state?.phase !== 'quiz' || !state.startedAt) return undefined
    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(state.startedAt).getTime()) / 1000)))
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [state?.phase, state?.startedAt])

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
  }, [])

  const questions = state?.questions || []
  const currentQuestion = questions[questionIndex]
  const answeredCount = questions.filter((question) => Number.isInteger(answers[question.id])).length

  function choose(questionId, selectedOption) {
    const next = { ...answers, [questionId]: selectedOption }
    setAnswers(next)
    saveDraft(state.attemptId, next, questionIndex)
  }

  function goTo(index) {
    setQuestionIndex(index)
    saveDraft(state.attemptId, answers, index)
  }

  async function start(profile) {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const data = await startQualityMonthQuiz(activityKey, profile)
      clearDraft(data.attemptId)
      setState(data)
      setAnswers({})
      setQuestionIndex(0)
      setElapsedSeconds(0)
      setProfileDialogOpen(false)
      if (!previewMode) {
        trackEvent({ activityKey, eventType: 'quality_month_start', page: '/quality-month', extra: { activityType: 'otsuka_quality_month_quiz', weekNo: data.currentWeek } })
      }
    } catch (requestError) {
      setError(requestError.message || '开始答题失败')
    } finally {
      setSubmitting(false)
    }
  }

  function requestStart() {
    const activityWindowMessage = getActivityWindowMessage(publicConfig)
    if (activityWindowMessage) {
      showToast(activityWindowMessage)
      return
    }
    if (!state?.profileCompleted) {
      setError('')
      setProfileDialogOpen(true)
      return
    }
    start()
  }

  function showToast(message) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = window.setTimeout(() => {
      setToast('')
      toastTimerRef.current = null
    }, 1800)
  }

  async function finish() {
    if (answeredCount !== questions.length || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const payload = questions.map((question) => ({
        questionId: question.id,
        selectedOption: answers[question.id],
      }))
      const data = await submitQualityMonthQuiz(activityKey, state.attemptId, payload)
      localStorage.removeItem(draftKey(state.attemptId))
      setState(data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      if (!previewMode) {
        trackEvent({ activityKey, eventType: 'quality_month_submit', page: '/quality-month', extra: { activityType: 'otsuka_quality_month_quiz', weekNo: data.currentWeek, accuracy: data.accuracy, correctCount: data.correctCount } })
      }
    } catch (requestError) {
      setError(requestError.message || '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !state) {
    return <QualityShell><div className="qm-loading"><i /><p>{error || '正在进入质量月答题…'}</p></div></QualityShell>
  }

  return (
    <QualityShell>
      {state.phase !== 'home' ? <Header state={state} /> : null}
      {error ? <div className="qm-alert" role="alert">{error}</div> : null}
      {state.phase === 'home' ? <Home state={state} loading={submitting} onStart={requestStart} /> : null}
      {state.phase === 'quiz' && currentQuestion ? (
        <Quiz
          state={state}
          question={currentQuestion}
          questionIndex={questionIndex}
          selected={answers[currentQuestion.id]}
          answeredCount={answeredCount}
          elapsedSeconds={elapsedSeconds}
          loading={submitting}
          onChoose={choose}
          onPrevious={() => goTo(Math.max(0, questionIndex - 1))}
          onNext={() => goTo(Math.min(questions.length - 1, questionIndex + 1))}
          onFinish={finish}
        />
      ) : null}
      {state.phase === 'result' ? <Result state={state} /> : null}
      {toast ? <div className="qm-toast" role="status">{toast}</div> : null}
      <ProfileDialog
        open={profileDialogOpen}
        loading={submitting}
        serverError={error}
        onClose={() => setProfileDialogOpen(false)}
        onSubmit={start}
      />
    </QualityShell>
  )
}

const previewQuestions = [
  { id: 'preview-1', sort: 1, title: '原辅料称量操作：一般情况下按称量数量（ ）的顺序称取各种原辅料。', options: ['由大到小', '由小到大', '无要求'] },
  { id: 'preview-2', sort: 2, title: '每个批号产品内，每种原辅料的使用批号不得超过（ ）。', options: ['一个', '两个', '无要求'] },
  { id: 'preview-3', sort: 3, title: '非最终灭菌安瓿生产产品调配药液高温处理要求80-85℃，药液冷却至（ ）℃。', options: ['40', '50', '60', '70'] },
]

const previewPublicConfig = {
  title: '中国大冢制药有限公司质量月',
  accessMode: 'public',
  oauthScope: 'snsapi_base',
}

function buildPreviewState(mode) {
  const base = {
    activity: { title: previewPublicConfig.title, activityKey: 'china_otsuka_quality_month_2026' },
    currentWeek: 1,
    totalWeeks: 4,
    weekTitle: '第一周｜非终灭安瓿',
    totalQuestions: previewQuestions.length,
  }
  if (mode === 'quiz') return { ...base, phase: 'quiz', attemptId: 'preview', startedAt: new Date().toISOString(), questions: previewQuestions }
  if (mode === 'result') {
    return {
      ...base,
      phase: 'result',
      correctCount: 2,
      accuracy: 66.67,
      durationSeconds: 148,
      answers: previewQuestions.map((question, index) => ({
        ...question,
        questionId: question.id,
        selectedOption: index === 1 ? 0 : index,
        correctOption: index,
        isCorrect: index !== 1,
      })),
    }
  }
  return { ...base, phase: 'home', profileCompleted: true }
}

function QualityShell({ children }) {
  return (
    <main className="qm-app">
      <div className="qm-orbit qm-orbit--one" />
      <div className="qm-orbit qm-orbit--two" />
      <div className="qm-shell">{children}</div>
    </main>
  )
}

function Header({ state }) {
  return (
    <header className="qm-header">
      <div className="qm-brand-mark" aria-hidden="true"><span>Q</span></div>
      <div>
        <p>CHINA OTSUKA PHARMACEUTICAL</p>
        <h1>{state.activity.title}</h1>
      </div>
      <span className="qm-week-badge">W{String(state.currentWeek).padStart(2, '0')}</span>
    </header>
  )
}

function Home({ state, loading, onStart }) {
  return (
    <section className="qm-home">
      <h1 className="qm-sr-only">{state.activity.title}</h1>
      <div className="qm-home-scene">
        <img className="qm-home-art qm-home-art--background" src={HOME_ART.background} alt="" />
        <img className="qm-home-art qm-home-art--character" src={HOME_ART.character} alt="" />
        <img className="qm-home-art qm-home-art--corner" src={HOME_ART.corner} alt="" />
        <img className="qm-home-art qm-home-art--sparkle" src={HOME_ART.sparkle} alt="" />
        <img className="qm-home-art qm-home-art--title" src={HOME_ART.title} alt="质量月 Quality Belongs To All" />
        <img className="qm-home-art qm-home-art--left" src={HOME_ART.left} alt="" />
        <img className="qm-home-art qm-home-art--right" src={HOME_ART.right} alt="" />
        <img className="qm-home-art qm-home-art--bottom" src={HOME_ART.bottom} alt="" />
        <div className="qm-home-cta-wrap">
          <p>第 {state.currentWeek} 周 · {state.weekTitle}</p>
          {state.currentWeek === 1 ? <p className="qm-home-schedule">答题时间：9月1日 08:00—9月4日 16:30</p> : null}
          <button className="qm-primary qm-primary--home" type="button" onClick={onStart} disabled={loading}>
            <span>{loading ? '正在进入…' : '开始本周答题'}</span><b>→</b>
          </button>
          <div className="qm-week-track" aria-label={`共${state.totalWeeks}周，当前第${state.currentWeek}周`}>
            {Array.from({ length: state.totalWeeks }, (_, index) => (
              <span key={index} className={index + 1 === state.currentWeek ? 'is-current' : index + 1 < state.currentWeek ? 'is-past' : ''}>
                {String(index + 1).padStart(2, '0')}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ProfileDialog({ open, loading, serverError, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [employeeNo, setEmployeeNo] = useState('')
  const [formError, setFormError] = useState('')

  if (!open) return null

  function submit(event) {
    event.preventDefault()
    const normalizedName = name.trim()
    const normalizedEmployeeNo = employeeNo.trim()
    if (!normalizedName || !normalizedEmployeeNo) {
      setFormError('请填写姓名和工号后再开始答题')
      return
    }
    setFormError('')
    onSubmit({ name: normalizedName, employeeNo: normalizedEmployeeNo })
  }

  return (
    <div className="qm-profile-dialog-backdrop" role="presentation">
      <section className="qm-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="qm-profile-title">
        <p className="qm-profile-dialog__kicker">FIRST TIME · PROFILE</p>
        <h2 id="qm-profile-title">填写答题信息</h2>
        <p>首次参加质量月答题，请填写真实姓名和工号。信息提交后无需重复填写。</p>
        <form onSubmit={submit}>
          <label>
            <span>姓名</span>
            <input value={name} maxLength={100} autoComplete="name" placeholder="请输入姓名" onChange={(event) => setName(event.target.value)} disabled={loading} />
          </label>
          <label>
            <span>工号</span>
            <input value={employeeNo} maxLength={80} autoComplete="off" placeholder="请输入工号" onChange={(event) => setEmployeeNo(event.target.value)} disabled={loading} />
          </label>
          {formError || serverError ? <p className="qm-profile-dialog__error" role="alert">{formError || serverError}</p> : null}
          <div className="qm-profile-dialog__actions">
            <button className="qm-secondary" type="button" onClick={onClose} disabled={loading}>暂不答题</button>
            <button className="qm-primary qm-primary--compact" type="submit" disabled={loading}>{loading ? '提交中…' : '提交并开始答题'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

function Quiz({ state, question, questionIndex, selected, answeredCount, elapsedSeconds, loading, onChoose, onPrevious, onNext, onFinish }) {
  const isLast = questionIndex === state.totalQuestions - 1
  const allAnswered = answeredCount === state.totalQuestions
  return (
    <section className="qm-quiz">
      <div className="qm-quiz-meta">
        <span>QUESTION {String(questionIndex + 1).padStart(2, '0')}</span>
        <span>{formatDuration(elapsedSeconds)}</span>
      </div>
      <div className="qm-progress"><i style={{ width: `${((questionIndex + 1) / state.totalQuestions) * 100}%` }} /></div>
      <p className="qm-progress-copy">第 {questionIndex + 1} / {state.totalQuestions} 题 · 已答 {answeredCount} 题</p>
      <h2>{question.title}</h2>
      <div className="qm-options" role="radiogroup" aria-label={question.title}>
        {question.options.map((option, index) => (
          <button
            key={`${question.id}-${index}`}
            type="button"
            className={selected === index ? 'is-selected' : ''}
            onClick={() => onChoose(question.id, index)}
            role="radio"
            aria-checked={selected === index}
          >
            <b>{LETTERS[index]}</b><span>{option}</span><i aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="qm-actions">
        <button type="button" className="qm-secondary" onClick={onPrevious} disabled={questionIndex === 0}>上一题</button>
        {!isLast ? (
          <button type="button" className="qm-primary qm-primary--compact" onClick={onNext} disabled={!Number.isInteger(selected)}>下一题</button>
        ) : (
          <button type="button" className="qm-primary qm-primary--compact" onClick={onFinish} disabled={!allAnswered || loading}>
            {loading ? '提交中…' : allAnswered ? '提交答卷' : `还有 ${state.totalQuestions - answeredCount} 题`}
          </button>
        )}
      </div>
    </section>
  )
}

function Result({ state }) {
  const scoreTone = state.accuracy >= 80 ? '优秀' : state.accuracy >= 60 ? '合格' : '继续加油'
  return (
    <section className="qm-result">
      <p className="qm-kicker">WEEK {String(state.currentWeek).padStart(2, '0')} · COMPLETE</p>
      <div className="qm-score-ring">
        <span>正确率</span><strong>{formatNumber(state.accuracy)}<small>%</small></strong><em>{scoreTone}</em>
      </div>
      <h2>本周答题已完成</h2>
      <p>结果已记录。当前周再次进入时将直接显示本页。</p>
      <dl className="qm-result-stats">
        <div><dt>正确题数</dt><dd>{state.correctCount} / {state.totalQuestions}</dd></div>
        <div><dt>答题用时</dt><dd>{formatDuration(state.durationSeconds)}</dd></div>
      </dl>
      <details className="qm-review">
        <summary>查看答题明细</summary>
        <div>
          {state.answers.map((answer, index) => (
            <article key={answer.questionId} className={answer.isCorrect ? 'is-correct' : 'is-wrong'}>
              <span>{answer.isCorrect ? '正确' : '错误'}</span>
              <h3>{index + 1}. {answer.title}</h3>
              <p>你的答案：{LETTERS[answer.selectedOption]} · 正确答案：{LETTERS[answer.correctOption]}</p>
            </article>
          ))}
        </div>
      </details>
    </section>
  )
}

function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0)
  const minutes = Math.floor(value / 60)
  const rest = value % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function formatNumber(value) {
  const number = Number(value) || 0
  return Number.isInteger(number) ? String(number) : number.toFixed(2)
}

function getActivityWindowMessage(publicConfig) {
  const now = Date.now()
  const startTime = publicConfig?.startTime ? new Date(publicConfig.startTime).getTime() : NaN
  const endTime = publicConfig?.endTime ? new Date(publicConfig.endTime).getTime() : NaN
  if (Number.isFinite(startTime) && now < startTime) return '活动未开始'
  if (Number.isFinite(endTime) && now > endTime) return '活动已结束'
  if (publicConfig?.activityWindow?.status === 'not_started') return '活动未开始'
  if (publicConfig?.activityWindow?.status === 'ended') return '活动已结束'
  return ''
}

function draftKey(attemptId) {
  return `quality_month_draft:${attemptId}`
}

function clearDraft(attemptId) {
  if (!attemptId) return
  localStorage.removeItem(draftKey(attemptId))
}

function saveDraft(attemptId, answers, questionIndex) {
  if (!attemptId) return
  localStorage.setItem(draftKey(attemptId), JSON.stringify({ answers, questionIndex }))
}
