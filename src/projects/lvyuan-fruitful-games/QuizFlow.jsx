import { useEffect, useMemo, useState } from 'react'
import { getLvyuanFruitfulGamesAsset } from './config'
import { LVYUAN_QUESTION_BANK } from './questionBank'
import Ih5Stage from './Ih5Stage'

const OPTION_ASSETS = ['quizOptionA', 'quizOptionB', 'quizOptionC', 'quizOptionD']
const image = (asset, className, alt = '') => <img className={className} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />

function selectQuestions() {
  const pool = [...LVYUAN_QUESTION_BANK]
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1)); [pool[index], pool[target]] = [pool[target], pool[index]]
  }
  return pool.slice(0, 3)
}

export default function QuizFlow({ onBack }) {
  const questions = useMemo(selectQuestions, [])
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState('quiz')
  const [successVisible, setSuccessVisible] = useState(false)
  const [shareVisible, setShareVisible] = useState(false)
  const [answerFeedback, setAnswerFeedback] = useState(null)
  const question = questions[step]

  useEffect(() => {
    if (status !== 'success' || !successVisible) return undefined
    const timer = window.setTimeout(() => setStatus('poster'), 1500)
    return () => window.clearTimeout(timer)
  }, [status, successVisible])

  useEffect(() => {
    if (!shareVisible) return undefined
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setShareVisible(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [shareVisible])

  useEffect(() => {
    if (!answerFeedback) return undefined
    const timer = window.setTimeout(() => {
      if (!answerFeedback.correct) {
        setAnswerFeedback(null)
        setStatus('wrong')
        return
      }
      setAnswerFeedback(null)
      if (step === questions.length - 1) setStatus('success')
      else setStep((current) => current + 1)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [answerFeedback, questions.length, step])

  const answer = (optionIndex) => {
    if (answerFeedback) return
    setAnswerFeedback({ correct: optionIndex === question.answer })
  }

  if (status === 'poster') return <main className="lyfg-page lyfg-ih5-page">
    <Ih5Stage label="消保称号海报">
      {image('posterBackground', 'lyfg-ih5-background')}{image('posterPanel', 'lyfg-quiz-poster-panel')}
      <div className="lyfg-quiz-poster-title">消保小天使</div>
      <div className="lyfg-quiz-poster-actions">
        <button className="lyfg-ih5-action lyfg-quiz-poster-left" type="button" onClick={() => setShareVisible(true)} aria-label="分享给朋友">{image('posterLeftAction', 'lyfg-ih5-fill-image', '分享')}</button>
        <button className="lyfg-ih5-action lyfg-quiz-poster-footer" type="button" onClick={onBack} aria-label="返回果园">{image('posterFooter', 'lyfg-ih5-fill-image', '返回果园')}</button>
      </div>
    </Ih5Stage>
    {shareVisible ? <div className="lyfg-quiz-share-guide" role="dialog" aria-modal="true" aria-label="分享提示" onClick={() => setShareVisible(false)}>
      <svg className="lyfg-quiz-share-guide-arrow" viewBox="0 0 72 104" aria-hidden="true">
        <path d="M12 94C12 52 30 25 61 12" />
        <path d="M40 9L63 11L58 34" />
      </svg>
      <div className="lyfg-quiz-share-guide-copy">点击右上角三个点<br />分享给你的好友</div>
    </div> : null}
  </main>

  if (status === 'wrong') return <main className="lyfg-page lyfg-ih5-page"><Ih5Stage label="答题失败">
    {image('quizWrongBackground', 'lyfg-ih5-background')}{image('quizWrongTitle', 'lyfg-quiz-wrong-title')}{image('quizWrongPanel', 'lyfg-quiz-wrong-panel')}
    <button className="lyfg-ih5-action lyfg-quiz-wrong-retry" type="button" onClick={onBack}>{image('quizWrongRetry', 'lyfg-ih5-fill-image', '再来一局')}</button>
    <button className="lyfg-ih5-action lyfg-quiz-wrong-back" type="button" onClick={onBack}>{image('quizWrongBack', 'lyfg-ih5-fill-image', '返回游戏')}</button>
  </Ih5Stage></main>

  return <main className="lyfg-page lyfg-ih5-page"><Ih5Stage label="消保知识答题">
    {image('quizBackground', 'lyfg-ih5-background')}{image('quizTitle', 'lyfg-quiz-title')}{image('quizPanel', 'lyfg-quiz-panel')}{image('quizQuestionCard', 'lyfg-quiz-question-card')}
    <div className="lyfg-quiz-question">{question.question}</div>
    <div className="lyfg-quiz-options">{question.options.map((option, index) => <button key={`${question.id}-${index}`} type="button" onClick={() => answer(index)}>
      {image(OPTION_ASSETS[index], 'lyfg-ih5-fill-image')}<span>{option}</span>
    </button>)}</div>
    {answerFeedback ? <div className={`lyfg-quiz-answer-toast ${answerFeedback.correct ? 'is-correct' : 'is-wrong'}`} role="alert" aria-live="assertive"><span>{answerFeedback.correct ? '回答正确' : '回答错误'}</span></div> : null}
    {status === 'success' ? <div className="lyfg-quiz-success" role="status"><img src={getLvyuanFruitfulGamesAsset('quizSuccess')} alt="三题全部答对" draggable="false" onLoad={() => setSuccessVisible(true)} /></div> : null}
  </Ih5Stage></main>
}
