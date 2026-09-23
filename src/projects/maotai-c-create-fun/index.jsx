import { useEffect, useRef, useState } from 'react'
import { ASSETS, QUESTIONS, assetUrl, resolveResult } from './data'
import './style.css'

const DESIGN_WIDTH = 750
const DESIGN_HEIGHT = 1624

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
        <section key={`${page}-${sceneKey}`} className={`maotai-c-create-fun-stage is-${page}`} style={{ top, transform: `scale(${scale})` }}>
          <LayerImage asset={[ASSETS.background, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT]} className="maotai-c-create-fun-background" />
          {children}
        </section>
      </div>
    </main>
  )
}

function HomePage({ onStart }) {
  return (
    <Stage page="home">
      {ASSETS.home.map((asset, index) => <LayerImage key={asset[0]} asset={asset} className={`maotai-c-create-fun-home-layer maotai-c-create-fun-home-layer-${index}`} />)}
      <button className="maotai-c-create-fun-home-start" type="button" onClick={onStart} aria-label="开始测试" />
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

function ResultPage({ result, onRestart }) {
  return (
    <Stage page="result">
      {ASSETS.resultCommon.map((asset, index) => <LayerImage key={asset[0]} asset={asset} className={`maotai-c-create-fun-result-layer maotai-c-create-fun-result-common-${index}`} />)}
      {ASSETS.resultVariants[result].map((asset, index) => <LayerImage key={asset[0]} asset={asset} className={`maotai-c-create-fun-result-layer maotai-c-create-fun-result-variant-${index}`} />)}
      <LayerImage asset={ASSETS.resultRestart} className="maotai-c-create-fun-result-restart-image" />
      <button className="maotai-c-create-fun-restart" type="button" onClick={onRestart} aria-label="再测一次" />
    </Stage>
  )
}

export default function MaotaiCCreateFunProject() {
  const [page, setPage] = useState('home')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [result, setResult] = useState('A')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const answerLocked = useRef(false)

  useEffect(() => { document.title = '茅台向C造趣' }, [])

  const start = () => { answerLocked.current = false; setIsTransitioning(false); setAnswers([]); setSelectedAnswer(null); setQuestionIndex(0); setPage('question') }
  const submitAnswer = () => {
    if (!selectedAnswer || answerLocked.current) return
    answerLocked.current = true
    const nextAnswers = [...answers, selectedAnswer]
    setIsTransitioning(true)
    window.setTimeout(() => {
      setAnswers(nextAnswers)
      setSelectedAnswer(null)
      if (questionIndex === QUESTIONS.length - 1) {
        setResult(resolveResult(nextAnswers))
        setPage('result')
      } else {
        setQuestionIndex((current) => current + 1)
      }
      setIsTransitioning(false)
      answerLocked.current = false
    }, 220)
  }

  if (page === 'question') return <QuestionPage questionIndex={questionIndex} selectedAnswer={selectedAnswer} isTransitioning={isTransitioning} onSelect={setSelectedAnswer} onSubmit={submitAnswer} />
  if (page === 'result') return <ResultPage result={result} onRestart={start} />
  return <HomePage onStart={start} />
}
