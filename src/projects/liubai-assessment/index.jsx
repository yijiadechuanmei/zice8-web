import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import DesignStage from '../../shared/components/DesignStage'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { isWechatBrowser } from '../../shared/utils/url'
import { loadLiubaiActivity, submitLiubaiAnswers } from './api'
import ResultPage from './ResultPage'
import { ACTIVITY_KEY, asset, HOME_IMAGES, PREVIOUS_IMAGE, QUIZ_BACKGROUND, QUIZ_IMAGES, SPLASH_IMAGES, START_IMAGE } from './config'
import './styles.css'

const RESULT_PARAM = 'result'
const RESULT_COUNT = 14

function resultIdFromUrl() {
  const value = Number(new URLSearchParams(window.location.search).get(RESULT_PARAM))
  return Number.isInteger(value) && value >= 1 && value <= RESULT_COUNT ? value : null
}

function resultShareUrl(resultId) {
  const url = new URL(window.location.href)
  url.searchParams.set(RESULT_PARAM, String(resultId))
  return url.toString()
}

function removeResultFromUrl() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(RESULT_PARAM)) return
  url.searchParams.delete(RESULT_PARAM)
  window.history.replaceState(null, '', url.toString())
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
  const [flow, setFlow] = useState(() => {
    const sharedResultId = resultIdFromUrl()
    return sharedResultId
      ? { page: 'result', answers: [], index: 15, resultId: sharedResultId }
      : { page: 'splash', answers: [], index: 0, resultId: null }
  })
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [qrcodeVisible, setQrcodeVisible] = useState(false)
  const [shareVisible, setShareVisible] = useState(false)
  const locked = useRef(false)
  const advanceTimer = useRef(null)
  const requestAbort = useRef(null)
  const swipeStart = useRef(null)
  const viewport = useRef(null)
  const { page, answers, index, resultId } = flow
  const share = useMemo(() => data ? {
    ...data.activity,
    shareLink: resultId ? resultShareUrl(resultId) : undefined,
  } : null, [data, resultId])
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
    // Remove progress left by earlier versions; this flow stays in memory only.
    try { sessionStorage.removeItem(`liubai-assessment:v1:${activityKey}`) } catch { /* Storage may be unavailable. */ }
  }, [activityKey])

  useEffect(() => {
    viewport.current?.scrollTo({ top: 0 })
  }, [page])

  useEffect(() => {
    if (page !== 'splash') return undefined
    const timer = window.setTimeout(() => setFlow({ page: 'home', index: 0, answers: [], resultId: null }), 1500)
    return () => window.clearTimeout(timer)
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

  function start() {
    if (!data) {
      setMessage(loadError || '题目正在加载，请稍候')
      return
    }
    const next = { page: 'quiz', answers: [], index: 0, resultId: null }
    setFlow(next)
  }

  async function submit(finalAnswers) {
    locked.current = true
    setBusy(true)
    setSubmitError('')
    const controller = new AbortController()
    requestAbort.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    try {
      const response = await submitLiubaiAnswers(activityKey, finalAnswers, data.questionVersion, controller.signal)
      setFlow({ page: 'result', index: 15, answers: finalAnswers, resultId: response.result.id })
    } catch (error) {
      setSubmitError(error.name === 'AbortError' ? '提交超时，请重试' : (error.message || '提交失败，请重试'))
    } finally {
      window.clearTimeout(timeout)
      requestAbort.current = null
      locked.current = false
      setBusy(false)
    }
  }

  function choose(key) {
    if (locked.current || page !== 'quiz') return
    locked.current = true
    setSelected(key)
    const nextAnswers = [...answers.slice(0, index), key]
    advanceTimer.current = window.setTimeout(() => {
      setSelected('')
      if (index === 15) {
        setFlow({ page: 'quiz', index, answers: nextAnswers })
        void submit(nextAnswers)
      } else {
        setFlow({ page: 'quiz', index: index + 1, answers: nextAnswers })
        locked.current = false
      }
    }, 260)
  }

  function previous() {
    if (!index || locked.current || page !== 'quiz') return
    setSelected('')
    setSubmitError('')
    setFlow({ page: 'quiz', index: index - 1, answers: answers.slice(0, index) })
  }

  function home() {
    removeResultFromUrl()
    setSubmitError('')
    setSelected('')
    setFlow({ page: 'home', index: 0, answers: [], resultId: null })
  }

  function beginSwipe(event) {
    if (!event.isPrimary) return
    swipeStart.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function finishSwipe(event) {
    const origin = swipeStart.current
    swipeStart.current = null
    if (!origin) return
    const deltaY = origin.y - event.clientY
    const deltaX = Math.abs(origin.x - event.clientX)
    if (deltaY >= 40 && deltaY > deltaX) home()
  }

  function resultAction(action) {
    if (action === 'restart') return home()
    if (action === 'product') return setMessage('商品入口暂未开放')
    if (action === 'follow') return setQrcodeVisible(true)
    setShareVisible(true)
  }

  const question = data?.questions[index]
  return (
    <main ref={viewport} className={`liubai-root ${page === 'quiz' ? 'liubai-root-quiz' : ''} ${page === 'result' ? 'liubai-root-result' : ''}`} style={{ '--liubai-quiz-background': `url("${asset(QUIZ_BACKGROUND)}")` }}>
      <DesignStage className="liubai-stage" height={page === 'result' ? 1821 : 1448}>
        <div key={page} className={`liubai-page liubai-page-${page}`}>
          {page === 'splash' && <Art images={SPLASH_IMAGES} />}
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
            <section key={index} className="liubai-question-card" aria-busy={busy}>
              <h1 className="liubai-question-title" aria-live="polite">{question?.t || '正在加载题目…'}</h1>
              <div className="liubai-options">
                {question?.o.map(([key, text]) => (
                  <button key={key} type="button" className={`liubai-option ${selected === key || (!selected && answers[index] === key) ? 'liubai-option-selected' : ''}`}
                    disabled={busy || Boolean(selected)} onClick={() => choose(key)} aria-pressed={selected === key || (!selected && answers[index] === key)}>
                    <span className="liubai-option-letter">{key}</span>
                    <span className="liubai-option-text">{text}</span>
                  </button>
                ))}
              </div>
              <div className="liubai-previous-row">
                <button className="liubai-previous" disabled={index === 0 || busy || Boolean(selected)} onClick={previous} aria-label="上一题">
                  <img src={asset(PREVIOUS_IMAGE)} alt="" />
                </button>
              </div>
            </section>
          </>}
          {page === 'result' && <ResultPage resultId={resultId} onAction={resultAction} />}
        </div>
      </DesignStage>
      {page === 'splash' && (
        <button className="liubai-splash-enter" onClick={home} aria-label="进入开始页"
          onPointerDown={beginSwipe} onPointerUp={finishSwipe} onPointerCancel={() => { swipeStart.current = null }}
          onWheel={(event) => { if (event.deltaY > 30) home() }} />
      )}
      {loadError && (
        <div className="liubai-notice" role="alert">
          <span>{loadError}</span>
          {loadError && <button onClick={() => setReload((value) => value + 1)}>重新加载</button>}
        </div>
      )}
      {message && <div className="liubai-toast" role="status">{message}</div>}
      {qrcodeVisible && (
        <div className="liubai-qr-mask" role="dialog" aria-modal="true" aria-label="鎏白微信公众号二维码" onClick={() => setQrcodeVisible(false)}>
          <div className="liubai-qr-dialog" onClick={(event) => event.stopPropagation()}>
            <img src={asset('gzh.jpg')} alt="鎏白微信公众号二维码" />
            <p>长按识别二维码，关注鎏白微信公众号</p>
            <button type="button" onClick={() => setQrcodeVisible(false)}>关闭</button>
          </div>
        </div>
      )}
      {shareVisible && createPortal(
        <div className="liubai-share-mask" role="button" tabIndex={0} aria-label="关闭分享提示" onClick={() => setShareVisible(false)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setShareVisible(false) }}>
          <span className="liubai-share-guide" onClick={(event) => event.stopPropagation()}>
            <span className="liubai-share-dots" aria-hidden="true"><i /><i /><i /></span>
            <span>点击右上角三个点<br />分享给你的好友</span>
          </span>
        </div>
      , document.body)}
      {(busy || submitError) && (
        <div className="liubai-dialog-mask">
          <div className="liubai-dialog" role="dialog" aria-modal="true" aria-label="提交答卷">
            <p role="status">{busy ? '正在提交答卷…' : submitError}</p>
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
