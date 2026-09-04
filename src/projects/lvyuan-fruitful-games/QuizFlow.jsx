import { useEffect, useMemo, useState } from 'react'
import { getLvyuanFruitfulGamesAsset } from './config'
import { LVYUAN_QUESTION_BANK } from './questionBank'
import Ih5Stage from './Ih5Stage'

const OPTION_ASSETS = ['quizOptionA', 'quizOptionB', 'quizOptionC', 'quizOptionD']
const LETTERS = ['A', 'B', 'C', 'D']
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
  const question = questions[step]

  useEffect(() => {
    if (status !== 'success') return undefined
    const timer = window.setTimeout(() => setStatus('poster'), 1500)
    return () => window.clearTimeout(timer)
  }, [status])

  const answer = (optionIndex) => {
    if (optionIndex !== question.answer) { setStatus('wrong'); return }
    if (step === questions.length - 1) setStatus('success')
    else setStep((current) => current + 1)
  }

  const retry = () => { setStep(0); setStatus('quiz') }

  if (status === 'poster') return <main className="lyfg-page lyfg-ih5-page"><Ih5Stage label="消保称号海报">
    {image('posterBackground', 'lyfg-ih5-background')}{image('posterPanel', 'lyfg-quiz-poster-panel')}
    <div className="lyfg-quiz-poster-title">消保小天使</div>
    <button className="lyfg-ih5-action lyfg-quiz-poster-left" type="button" onClick={onBack}>{image('posterLeftAction', 'lyfg-ih5-fill-image', '返回游戏')}</button>
    <button className="lyfg-ih5-action lyfg-quiz-poster-right" type="button" onClick={onBack}>{image('posterRightAction', 'lyfg-ih5-fill-image', '完成')}</button>
    {image('posterFooter', 'lyfg-quiz-poster-footer')}
  </Ih5Stage></main>

  if (status === 'wrong') return <main className="lyfg-page lyfg-ih5-page"><Ih5Stage label="答题失败">
    {image('quizWrongBackground', 'lyfg-ih5-background')}{image('quizWrongTitle', 'lyfg-quiz-wrong-title')}{image('quizWrongPanel', 'lyfg-quiz-wrong-panel')}
    <button className="lyfg-ih5-action lyfg-quiz-wrong-retry" type="button" onClick={retry}>{image('quizWrongRetry', 'lyfg-ih5-fill-image', '重新答题')}</button>
    <button className="lyfg-ih5-action lyfg-quiz-wrong-back" type="button" onClick={onBack}>{image('quizWrongBack', 'lyfg-ih5-fill-image', '返回游戏')}</button>
  </Ih5Stage></main>

  return <main className="lyfg-page lyfg-ih5-page"><Ih5Stage label="消保知识答题">
    {image('quizBackground', 'lyfg-ih5-background')}{image('quizTitle', 'lyfg-quiz-title')}{image('quizPanel', 'lyfg-quiz-panel')}{image('quizQuestionCard', 'lyfg-quiz-question-card')}
    <div className="lyfg-quiz-progress">第 {step + 1} / 3 题</div><div className="lyfg-quiz-question">{question.question}</div>
    <div className="lyfg-quiz-options">{question.options.map((option, index) => <button key={`${question.id}-${index}`} type="button" onClick={() => answer(index)}>
      {image(OPTION_ASSETS[index], 'lyfg-ih5-fill-image')}<span><b>{LETTERS[index]}</b>{option}</span>
    </button>)}</div>
    {status === 'success' ? <div className="lyfg-quiz-success" role="status">{image('quizSuccess', '', '三题全部答对')}</div> : null}
  </Ih5Stage></main>
}
