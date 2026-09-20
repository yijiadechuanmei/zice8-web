import { useEffect, useRef, useState } from 'react'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { trackPageView } from '../../shared/analytics'
import { drawLuckyDraw, getLuckyDrawPublicConfig, getLuckyDrawState } from './api'
import './styles.css'

const DEFAULT_ACTIVITY_KEY = 'lucky_draw_20260920'

function resultCopy(outcome) {
  return outcome === 'won'
    ? { eyebrow: 'LUCKY MOMENT', title: '恭喜你中奖了', message: '幸运正在向你靠近，愿这份惊喜点亮今天。', action: '收下好运' }
    : { eyebrow: 'KEEP SHINING', title: '很遗憾未中奖', message: '这次与幸运擦肩而过，下次一定会如约而至。', action: '知道了' }
}

function readError(error, fallback) {
  const message = String(error?.message || '').trim()
  return message && message !== 'Failed to fetch' ? message : fallback
}

export default function LuckyDrawProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || DEFAULT_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [state, setState] = useState(null)
  const [dialogOutcome, setDialogOutcome] = useState(null)
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [error, setError] = useState('')
  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, publicConfig)

  useWechatShare(activityKey, publicConfig)

  useEffect(() => {
    let active = true
    getLuckyDrawPublicConfig(activityKey)
      .then((config) => { if (active) setPublicConfig(config) })
      .catch((requestError) => { if (active) setError(readError(requestError, '活动配置加载失败，请稍后重试')) })
    return () => { active = false }
  }, [activityKey])

  useEffect(() => {
    if (!authReady) return undefined
    let active = true
    getLuckyDrawState(activityKey)
      .then((nextState) => {
        if (!active) return
        setState(nextState)
        if (nextState.participated) setDialogOutcome(nextState.outcome)
      })
      .catch((requestError) => {
        if (!active) return
        if (requestError?.status === 401 && reauth('lucky-draw-state')) return
        setError(readError(requestError, '抽奖状态加载失败，请刷新重试'))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activityKey, authReady, reauth])

  useEffect(() => {
    document.title = publicConfig?.title || '抽奖'
    trackPageView(activityKey, '/lucky-draw', { activityType: 'lucky_draw_20260920' })
  }, [activityKey, publicConfig?.title])

  async function draw() {
    if (drawing || state?.participated) return
    setDrawing(true)
    setError('')
    try {
      const nextState = await drawLuckyDraw(activityKey)
      setState(nextState)
      setDialogOutcome(nextState.outcome)
    } catch (requestError) {
      if (requestError?.status === 401 && reauth('lucky-draw-draw')) return
      setError(readError(requestError, '抽奖失败，请稍后重试'))
    } finally {
      setDrawing(false)
    }
  }

  const visibleError = blockedMessage || error
  const isLoading = loading && !blockedMessage
  const canDraw = !isLoading && !visibleError && !state?.participated
  return (
    <main className="lucky-draw" aria-label="抽奖">
      <div className="lucky-draw__aurora lucky-draw__aurora--one" />
      <div className="lucky-draw__aurora lucky-draw__aurora--two" />
      <div className="lucky-draw__stars" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ '--i': index }} />)}</div>
      <section className="lucky-draw__content">
        <p className="lucky-draw__eyebrow">A LITTLE LUCK FOR YOU</p>
        <h1>抽奖</h1>
        <p className="lucky-draw__intro">点击按钮，开启你的幸运时刻</p>
        <div className={`lucky-draw__orb ${drawing ? 'is-drawing' : ''}`} aria-hidden="true">
          <span className="lucky-draw__orbit lucky-draw__orbit--one" /><span className="lucky-draw__orbit lucky-draw__orbit--two" />
          <span className="lucky-draw__core">LUCK</span>
        </div>
        {isLoading ? <p className="lucky-draw__status">正在准备幸运时刻…</p> : null}
        {visibleError ? <p className="lucky-draw__error" role="alert">{visibleError}</p> : null}
        {!isLoading ? (
          <button className="lucky-draw__button" type="button" disabled={!canDraw || drawing} onClick={draw}>
            <span>{drawing ? '幸运降临中…' : state?.participated ? '抽奖结果已揭晓' : '立即抽奖'}</span>
          </button>
        ) : null}
        <p className="lucky-draw__rule">每位用户仅有一次抽奖机会</p>
      </section>
      {dialogOutcome ? <ResultDialog outcome={dialogOutcome} onClose={() => setDialogOutcome(null)} /> : null}
    </main>
  )
}

function ResultDialog({ outcome, onClose }) {
  const copy = resultCopy(outcome)
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  return (
    <div className="lucky-dialog" role="presentation" onKeyDown={(event) => { if (event.key === 'Escape') onClose() }} onMouseDown={onClose}>
      <section className={`lucky-dialog__panel lucky-dialog__panel--${outcome}`} role="dialog" aria-modal="true" aria-labelledby="lucky-draw-result-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="lucky-dialog__burst" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <b key={index} style={{ '--i': index }} />)}</div>
        <p>{copy.eyebrow}</p>
        <h2 id="lucky-draw-result-title">{copy.title}</h2>
        <span className="lucky-dialog__seal" aria-hidden="true">{outcome === 'won' ? <SparkleIcon /> : <HeartIcon />}</span>
        <div className="lucky-dialog__line" />
        <small>{copy.message}</small>
        <button ref={closeRef} type="button" onClick={onClose}>{copy.action}</button>
      </section>
    </div>
  )
}

function SparkleIcon() {
  return <svg viewBox="0 0 24 24" focusable="false"><path d="M12 1.5c.72 6.2 3.5 9.05 9.5 10.5-6 1.45-8.78 4.3-9.5 10.5C11.28 16.3 8.5 13.45 2.5 12 8.5 10.55 11.28 7.7 12 1.5Z" fill="currentColor" /></svg>
}

function HeartIcon() {
  return <svg viewBox="0 0 24 24" focusable="false"><path d="M12 20.5S3.5 15.45 3.5 9.6c0-2.42 1.86-4.1 4.18-4.1 1.74 0 3.22.95 4.32 2.35 1.1-1.4 2.58-2.35 4.32-2.35 2.32 0 4.18 1.68 4.18 4.1 0 5.85-8.5 10.9-8.5 10.9Z" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" /></svg>
}
