import { useEffect, useMemo, useRef, useState } from 'react'
import { request } from '../../shared/api/request'
import { getVisitorId, trackPageView } from '../../shared/analytics'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { ASSETS, MAOTAI_C_CREATE_FUN_ACTIVITY_KEY, QUESTIONS, assetUrl } from './data'
import './style.css'

const DESIGN_WIDTH = 750
const DESIGN_HEIGHT = 1624
const RESULT_STORAGE_KEY = `${MAOTAI_C_CREATE_FUN_ACTIVITY_KEY}:completed-result`

function createSessionId() {
  if (typeof window.crypto?.randomUUID === 'function') return `maotai_${window.crypto.randomUUID()}`
  return `maotai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`
}

function readStoredResult() {
  try {
    const result = localStorage.getItem(RESULT_STORAGE_KEY)
    return ['A', 'B', 'C', 'D'].includes(result) ? result : null
  } catch {
    return null
  }
}

function saveStoredResult(result) {
  try {
    localStorage.setItem(RESULT_STORAGE_KEY, result)
  } catch {
    // Storage can be unavailable in private browsing; the completed view still works for this visit.
  }
}

function LayerImage({ asset, alt = '', className = '' }) {
  const [filename, left, top, width, height] = asset
  return <img className={`maotai-c-create-fun-layer ${className}`.trim()} src={assetUrl(filename)} alt={alt} draggable="false" style={{ left, top, width, height }} />
}

function Stage({ children, page, sceneKey = page }) {
  const readViewport = () => {
    const viewport = window.visualViewport
    return { width: viewport?.width || window.innerWidth, height: viewport?.height || window.innerHeight }
  }
  const [viewport, setViewport] = useState(readViewport)

  useEffect(() => {
    const updateScale = () => setViewport(readViewport())
    updateScale()
    window.addEventListener('resize', updateScale)
    window.visualViewport?.addEventListener('resize', updateScale)
    return () => {
      window.removeEventListener('resize', updateScale)
      window.visualViewport?.removeEventListener('resize', updateScale)
    }
  }, [])

  const scale = viewport.width / DESIGN_WIDTH
  const scaledHeight = DESIGN_HEIGHT * scale
  const top = (viewport.height - scaledHeight) / 2

  return (
    <main className="maotai-c-create-fun-page" aria-label="茅台向C造趣">
      <div className="maotai-c-create-fun-frame" style={{ width: viewport.width, height: viewport.height }}>
        <section className={`maotai-c-create-fun-stage is-${page}`} style={{ top, transform: `scale(${scale})` }}>
          <LayerImage asset={[ASSETS.background, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT]} className="maotai-c-create-fun-background" />
          <div key={`${page}-${sceneKey}`} className="maotai-c-create-fun-scene">{children}</div>
        </section>
      </div>
    </main>
  )
}

function HomePage({ onStart, disabled }) {
  return (
    <Stage page="home">
      {ASSETS.home.map((asset, index) => <LayerImage key={asset[0]} asset={asset} className={`maotai-c-create-fun-home-layer maotai-c-create-fun-home-layer-${index}`} />)}
      <button className="maotai-c-create-fun-home-start" type="button" onClick={onStart} disabled={disabled} aria-label="开始测试" />
    </Stage>
  )
}

function QuestionPage({ questionIndex, selectedAnswer, isTransitioning, onSelect, onSubmit }) {
  const question = QUESTIONS[questionIndex]
  const progress = ((questionIndex + 1) / QUESTIONS.length) * 100
  return (
    <Stage page="question" sceneKey={questionIndex}>
      <div className={`maotai-c-create-fun-progress${isTransitioning ? ' is-leaving' : ''}`} aria-label={`第 ${questionIndex + 1} 题，共 ${QUESTIONS.length} 题`}><span>{String(questionIndex + 1).padStart(2, '0')}</span><span className="maotai-c-create-fun-progress-track"><i style={{ width: `${progress}%` }} /></span><span>{String(QUESTIONS.length).padStart(2, '0')}</span></div>
      <section className={`maotai-c-create-fun-question-card${isTransitioning ? ' is-leaving' : ''}`} aria-labelledby={`question-${question.id}`}>
        <h1 id={`question-${question.id}`}>{question.title}</h1>
        <div className="maotai-c-create-fun-options">
          {Object.entries(question.options).map(([option, text], index) => <button key={option} className={`maotai-c-create-fun-option maotai-c-create-fun-option-${index}${selectedAnswer === option ? ' is-selected' : ''}`} type="button" onClick={() => onSelect(option)} aria-pressed={selectedAnswer === option}><b>{option}</b><span>{text}</span></button>)}
        </div>
      </section>
      <LayerImage asset={[ASSETS.questionFooter, 35, 1237, 678, 100]} className={`maotai-c-create-fun-question-footer${selectedAnswer ? ' is-ready' : ''}${isTransitioning ? ' is-leaving' : ''}`} />
      <button className={`maotai-c-create-fun-question-submit${isTransitioning ? ' is-leaving' : ''}`} type="button" onClick={onSubmit} disabled={!selectedAnswer || isTransitioning} aria-label="提交本题" />
    </Stage>
  )
}

function ResultPage({ result }) {
  return (
    <Stage page="result">
      {ASSETS.resultCommon.map((asset, index) => <LayerImage key={asset[0]} asset={asset} className={`maotai-c-create-fun-result-layer maotai-c-create-fun-result-common-${index}`} />)}
      {ASSETS.resultVariants[result].map((asset, index) => <LayerImage key={asset[0]} asset={asset} className={`maotai-c-create-fun-result-layer maotai-c-create-fun-result-variant-${index}`} />)}
      <LayerImage asset={ASSETS.resultRestart} className="maotai-c-create-fun-result-restart-image" />
    </Stage>
  )
}

export default function MaotaiCCreateFunProject() {
  const [page, setPage] = useState('home')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [result, setResult] = useState('A')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [publicConfig, setPublicConfig] = useState(null)
  const [sessionReady, setSessionReady] = useState(false)
  const answerLocked = useRef(false)
  const sessionId = useRef(null)
  const debugMode = new URLSearchParams(window.location.search).has('debug')

  const shareActivity = useMemo(() => {
    if (!publicConfig) return null
    return {
      title: publicConfig.title || '茅台向C造趣',
      shareTitle: publicConfig.shareTitle || publicConfig.title || '茅台向C造趣',
      shareDesc: publicConfig.shareDesc ?? '',
      shareImage: publicConfig.shareImage || '',
    }
  }, [publicConfig])

  useWechatShare(MAOTAI_C_CREATE_FUN_ACTIVITY_KEY, shareActivity)

  useEffect(() => {
    let active = true
    request(`/activities/${MAOTAI_C_CREATE_FUN_ACTIVITY_KEY}/public-config`, { skipAuth: true })
      .then((config) => { if (active) setPublicConfig(config) })
      .catch(() => { if (active) setPublicConfig(null) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    trackPageView(MAOTAI_C_CREATE_FUN_ACTIVITY_KEY, '/maotai-c-create-fun', {
      activityType: 'maotai_c_create_fun_20260923',
    })
  }, [])

  useEffect(() => {
    setSessionReady(false)
    const storedResult = debugMode ? null : readStoredResult()
    answerLocked.current = false
    sessionId.current = null
    setIsTransitioning(false)
    setSelectedAnswer(null)
    setQuestionIndex(0)
    if (storedResult) {
      setResult(storedResult)
      setPage('result')
    } else {
      setPage('home')
    }
    setSessionReady(true)
  }, [debugMode])

  useEffect(() => {
    document.title = publicConfig?.title || '茅台向C造趣'
  }, [publicConfig])

  const start = () => {
    if (!sessionReady) return
    answerLocked.current = false
    sessionId.current = createSessionId()
    setIsTransitioning(false)
    setSelectedAnswer(null)
    setQuestionIndex(0)
    setPage('question')
  }

  const submitAnswer = async () => {
    if (!selectedAnswer || answerLocked.current || !sessionReady) return
    answerLocked.current = true
    const currentSessionId = sessionId.current
    if (!currentSessionId) {
      answerLocked.current = false
      return
    }
    setIsTransitioning(true)
    const base = `/maotai-c-create-fun/activities/${encodeURIComponent(MAOTAI_C_CREATE_FUN_ACTIVITY_KEY)}`
    const session = { visitorId: getVisitorId(), sessionId: currentSessionId }
    try {
      await request(`${base}/answer`, {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ ...session, questionNo: questionIndex + 1, selectedOption: selectedAnswer }),
      })
      const completed = questionIndex === QUESTIONS.length - 1
        ? await request(`${base}/complete`, { method: 'POST', skipAuth: true, body: JSON.stringify(session) })
        : null
      window.setTimeout(() => {
        setSelectedAnswer(null)
        if (completed?.result) {
          // Debug runs must never change the result saved by the formal link.
          if (!debugMode) saveStoredResult(completed.result)
          setResult(completed.result)
          setPage('result')
        } else {
          setQuestionIndex((current) => current + 1)
        }
        setIsTransitioning(false)
        answerLocked.current = false
      }, 220)
    } catch {
      setIsTransitioning(false)
      answerLocked.current = false
    }
  }

  if (page === 'question') return <QuestionPage questionIndex={questionIndex} selectedAnswer={selectedAnswer} isTransitioning={isTransitioning} onSelect={setSelectedAnswer} onSubmit={submitAnswer} />
  if (page === 'result') return <ResultPage result={result} />
  return <HomePage onStart={start} disabled={!sessionReady} />
}
