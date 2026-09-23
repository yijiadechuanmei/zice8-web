import { useEffect, useState } from 'react'
import { ASSETS, QUESTIONS, assetUrl, resolveResult } from './data'
import './style.css'

const DESIGN_WIDTH = 750
const DESIGN_HEIGHT = 1624

function LayerImage({ asset, alt = '' }) {
  const [filename, left, top, width, height] = asset
  return <img className="maotai-c-create-fun-layer" src={assetUrl(filename)} alt={alt} draggable="false" style={{ left, top, width, height }} />
}

function Stage({ children, page }) {
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT))

  useEffect(() => {
    const updateScale = () => {
      const viewport = window.visualViewport
      setScale(Math.min((viewport?.width || window.innerWidth) / DESIGN_WIDTH, (viewport?.height || window.innerHeight) / DESIGN_HEIGHT))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    window.visualViewport?.addEventListener('resize', updateScale)
    return () => {
      window.removeEventListener('resize', updateScale)
      window.visualViewport?.removeEventListener('resize', updateScale)
    }
  }, [])

  return (
    <main className="maotai-c-create-fun-page" aria-label="茅台向C造趣">
      <div className="maotai-c-create-fun-frame" style={{ width: DESIGN_WIDTH * scale, height: DESIGN_HEIGHT * scale }}>
        <section className={`maotai-c-create-fun-stage is-${page}`} style={{ transform: `scale(${scale})` }}>
          <LayerImage asset={[ASSETS.background, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT]} />
          {children}
        </section>
      </div>
    </main>
  )
}

function HomePage({ onStart }) {
  return <Stage page="home">{ASSETS.home.map((asset) => <LayerImage key={asset[0]} asset={asset} />)}<button className="maotai-c-create-fun-home-start" type="button" onClick={onStart} aria-label="开始测试" /></Stage>
}

function QuestionPage({ questionIndex, onSelect }) {
  const question = QUESTIONS[questionIndex]
  const progress = ((questionIndex + 1) / QUESTIONS.length) * 100
  return (
    <Stage page="question">
      <div className="maotai-c-create-fun-progress" aria-label={`第 ${questionIndex + 1} 题，共 ${QUESTIONS.length} 题`}><span>{String(questionIndex + 1).padStart(2, '0')}</span><span className="maotai-c-create-fun-progress-track"><i style={{ width: `${progress}%` }} /></span><span>{String(QUESTIONS.length).padStart(2, '0')}</span></div>
      <section className="maotai-c-create-fun-question-card" aria-labelledby={`question-${question.id}`}>
        <h1 id={`question-${question.id}`}>{question.title}</h1>
        <div className="maotai-c-create-fun-options">
          {Object.entries(question.options).map(([option, text]) => <button key={option} type="button" onClick={() => onSelect(option)}><b>{option}</b><span>{text}</span></button>)}
        </div>
      </section>
      <LayerImage asset={[ASSETS.questionFooter, 35, 1237, 678, 100]} />
    </Stage>
  )
}

function ResultPage({ result, onRestart }) {
  return <Stage page="result">{ASSETS.resultCommon.map((asset) => <LayerImage key={asset[0]} asset={asset} />)}{ASSETS.resultVariants[result].map((asset) => <LayerImage key={asset[0]} asset={asset} />)}<LayerImage asset={ASSETS.resultRestart} /><button className="maotai-c-create-fun-restart" type="button" onClick={onRestart} aria-label="再测一次" /></Stage>
}

export default function MaotaiCCreateFunProject() {
  const [page, setPage] = useState('home')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [result, setResult] = useState('A')

  useEffect(() => { document.title = '茅台向C造趣' }, [])

  const start = () => { setAnswers([]); setQuestionIndex(0); setPage('question') }
  const selectAnswer = (answer) => {
    const nextAnswers = [...answers, answer]
    setAnswers(nextAnswers)
    if (questionIndex === QUESTIONS.length - 1) { setResult(resolveResult(nextAnswers)); setPage('result'); return }
    setQuestionIndex((current) => current + 1)
  }

  if (page === 'question') return <QuestionPage questionIndex={questionIndex} onSelect={selectAnswer} />
  if (page === 'result') return <ResultPage result={result} onRestart={start} />
  return <HomePage onStart={start} />
}
