import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DesignStage from '../../shared/components/DesignStage'
import { getToken } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { isWechatBrowser } from '../../shared/utils/url'
import { loadLiubaiActivity, submitLiubaiAnswers } from './api'
import { ACTIVITY_KEY, asset, HOME_IMAGES, PREVIOUS_IMAGE, QUIZ_BACKGROUND, QUIZ_IMAGES, SPLASH_IMAGES, START_IMAGE } from './config'
import './styles.css'

const storageKey = (key) => `liubai-assessment:v1:${key}`

function readDraft(key) {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(key)) || 'null')
    if (value?.page === 'quiz' && Array.isArray(value.answers) && value.answers.length <= 16 &&
      value.answers.every((answer) => ['A', 'B', 'C', 'D'].includes(answer))) {
      return { page: 'quiz', answers: value.answers, index: Math.min(Math.max(Number(value.index) || 0, 0), value.answers.length, 15) }
    }
  } catch { /* A restricted WebView may not allow session storage. */ }
  return { page: 'splash', answers: [], index: 0 }
}

function Art({ images }) {
  return images.map(([name, left, top, width, height]) => (
    <img key={name} className="liubai-art" src={asset(name)} alt="" draggable="false" style={{ left, top, width, height }} />
  ))
}

export default function LiubaiAssessmentProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || ACTIVITY_KEY
  return <LiubaiAssessment key={activityKey} activityKey={activityKey} />
}

function LiubaiAssessment({ activityKey }) {
  const [draft, setDraft] = useState(() => readDraft(activityKey))
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [complete, setComplete] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const locked = useRef(false)
  const advanceTimer = useRef(null)
  const requestAbort = useRef(null)
  const { page, answers, index } = draft
  const auth = useWechatAuth(activityKey, data?.activity)
  const share = useMemo(() => data ? {
    ...data.activity,
    shareTitle: '鎏白 · 矿石人格测试',
    shareDesc: '独一无二的你匹配哪一颗专属矿石水晶杯？',
    shareImage: asset(SPLASH_IMAGES[0][0]),
  } : null, [data])
  useWechatShare(isWechatBrowser() ? activityKey : '', share)

  useEffect(() => {
    document.title = '鎏白 · 矿石人格测试'
    let cancelled = false
    loadLiubaiActivity(activityKey).then((value) => {
      if (cancelled) return
      if (value.questionVersion !== 1 || value.questions?.length !== 16) {
        setLoadError('题目已更新，请重新打开活动')
        return
      }
      setData(value)
      setLoadError('')
    }).catch((error) => {
      if (!cancelled) setLoadError(error.message || '题目加载失败，请重试')
    })
    return () => { cancelled = true }
  }, [activityKey, reload])

  useEffect(() => {
    if (page !== 'splash') return
    const timer = window.setTimeout(() => setDraft({ page: 'home', answers: [], index: 0 }), 1800)
    return () => window.clearTimeout(timer)
  }, [page])

  useEffect(() => {
    try {
      if (page === 'quiz') sessionStorage.setItem(storageKey(activityKey), JSON.stringify(draft))
      else sessionStorage.removeItem(storageKey(activityKey))
    } catch { /* Continue in memory when storage is unavailable. */ }
  }, [activityKey, draft, page])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [page])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => () => {
    window.clearTimeout(advanceTimer.current)
    requestAbort.current?.abort()
  }, [])

  const saveDraft = useCallback((next) => {
    setDraft(next)
    try { sessionStorage.setItem(storageKey(activityKey), JSON.stringify(next)) } catch { /* Optional persistence. */ }
  }, [activityKey])

  function start() {
    if (!data) {
      setMessage(loadError || '题目正在加载，请稍候')
      return
    }
    const next = { page: 'quiz', answers: [], index: 0 }
    // Authorize only when starting; keep the supplied home visible to visitors.
    if (!getToken()) {
      if (!isWechatBrowser()) {
        setMessage('请在微信中打开并开始测试')
        return
      }
      saveDraft(next)
      if (!auth.reauth('liubai-start')) setMessage('授权未完成，请重新打开活动')
      return
    }
    saveDraft(next)
  }

  async function submit(finalAnswers) {
    locked.current = true
    setBusy(true)
    setSubmitError('')
    const controller = new AbortController()
    requestAbort.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    try {
      await submitLiubaiAnswers(activityKey, finalAnswers, data.questionVersion, controller.signal)
      try { sessionStorage.removeItem(storageKey(activityKey)) } catch { /* Optional persistence. */ }
      setComplete(true)
    } catch (error) {
      if (error.status === 401 || (error.status === 403 && error.message.includes('身份'))) {
        if (auth.reauth('liubai-submit')) return
      }
      setSubmitError(error.name === 'AbortError' ? '提交超时，请重试' : (error.message || '提交失败，请重试'))
    } finally {
      window.clearTimeout(timeout)
      requestAbort.current = null
      locked.current = false
      setBusy(false)
    }
  }

  function choose(key) {
    if (locked.current || complete) return
    locked.current = true
    setSelected(key)
    const nextAnswers = [...answers.slice(0, index), key]
    advanceTimer.current = window.setTimeout(() => {
      setSelected('')
      if (index === 15) {
        saveDraft({ page: 'quiz', index, answers: nextAnswers })
        void submit(nextAnswers)
      } else {
        saveDraft({ page: 'quiz', index: index + 1, answers: nextAnswers })
        locked.current = false
      }
    }, 260)
  }

  function previous() {
    if (!index || locked.current || complete) return
    setSelected('')
    setSubmitError('')
    saveDraft({ page: 'quiz', index: index - 1, answers: answers.slice(0, index) })
  }

  function home() {
    setComplete(false)
    setSubmitError('')
    setSelected('')
    setDraft({ page: 'home', index: 0, answers: [] })
  }

  const question = data?.questions[index]
  return (
    <main className={`liubai-root ${page === 'quiz' ? 'liubai-root-quiz' : ''}`} style={{ '--liubai-quiz-background': `url("${asset(QUIZ_BACKGROUND)}")` }}>
      <DesignStage className="liubai-stage">
        {page === 'splash' && <>
          <Art images={SPLASH_IMAGES} />
          <button className="liubai-splash-enter" onClick={home} aria-label="进入鎏白矿石人格测试" />
        </>}
        {page === 'home' && <>
          <Art images={HOME_IMAGES} />
          <h1 className="liubai-sr-only">鎏白 · 矿石人格测试</h1>
          <button className="liubai-start" onClick={start} aria-label="开始测试">
            <img src={asset(START_IMAGE)} alt="" />
          </button>
        </>}
        {page === 'quiz' && <>
          <Art images={QUIZ_IMAGES} />
          <div className="liubai-progress" aria-label={`第${index + 1}题，共16题`}>
            <span>{String(index + 1).padStart(2, '0')}/16</span>
            <div className="liubai-progress-track" role="progressbar" aria-label="答题进度" aria-valuemin={0} aria-valuemax={16} aria-valuenow={index + 1}>
              <div style={{ width: `${(index + 1) / 16 * 100}%` }} />
            </div>
          </div>
          <section className="liubai-question-card" aria-busy={busy}>
            <h1 className="liubai-question-title" aria-live="polite">{question?.t || '正在加载题目…'}</h1>
            <div className="liubai-options">
              {question?.o.map(([key, text]) => (
                <button key={key} type="button" className={`liubai-option ${selected === key || (!selected && answers[index] === key) ? 'liubai-option-selected' : ''}`}
                  disabled={busy || Boolean(selected) || complete} onClick={() => choose(key)} aria-pressed={selected === key || (!selected && answers[index] === key)}>
                  <span className="liubai-option-letter">{key}</span>
                  <span className="liubai-option-text">{text}</span>
                </button>
              ))}
            </div>
            <div className="liubai-previous-row">
              <button className="liubai-previous" disabled={index === 0 || busy || Boolean(selected) || complete} onClick={previous} aria-label="上一题">
                <img src={asset(PREVIOUS_IMAGE)} alt="" />
              </button>
            </div>
          </section>
        </>}
      </DesignStage>
      {(loadError || auth.blockedMessage) && (
        <div className="liubai-notice" role="alert">
          <span>{loadError || auth.blockedMessage}</span>
          {loadError && <button onClick={() => setReload((value) => value + 1)}>重新加载</button>}
        </div>
      )}
      {message && <div className="liubai-toast" role="status">{message}</div>}
      {(busy || complete || submitError) && (
        <div className="liubai-dialog-mask">
          <div className="liubai-dialog" role="dialog" aria-modal="true" aria-label={complete ? '答题完成' : '提交答卷'}>
            <p role="status">{busy ? '正在提交答卷…' : complete ? '答题完成' : submitError}</p>
            {complete && <button autoFocus onClick={home}>返回首页</button>}
            {submitError && !busy && <>
              <button autoFocus onClick={() => submit(answers)}>重试提交</button>
              <button onClick={() => setSubmitError('')}>返回答题</button>
            </>}
          </div>
        </div>
      )}
    </main>
  )
}
