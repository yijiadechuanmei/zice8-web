import { useCallback, useEffect, useMemo, useState } from 'react'
import Countdown from '../components/Countdown'
import OptionItem from '../components/OptionItem'
import QuizButton from '../components/QuizButton'

export default function QuestionPage({ current, feedback, submitting, onAnswer, onTimeout }) {
  const question = current?.currentQuestion
  const [selected, setSelected] = useState([])

  useEffect(() => {
    setSelected([])
  }, [question?.questionId])

  const totalQuestions = current?.totalQuestions || current?.questionCount || 0
  const questionSort = question?.questionSort || current?.currentQuestionSort || 1
  const progressText = `第 ${questionSort} / ${totalQuestions || '-'} 题`
  const locked = submitting || Boolean(feedback)
  const correctOptions = useMemo(() => new Set(feedback?.correctOptions || []), [feedback])

  const handleTimeout = useCallback(() => {
    if (!question || locked) return
    onTimeout(question.questionId)
  }, [locked, onTimeout, question])

  if (!question) {
    return (
      <main className="quiz-page">
        <section className="quiz-panel">
          <p className="quiz-muted">当前题目加载中...</p>
        </section>
      </main>
    )
  }

  function toggleOption(option) {
    const value = option.label || option.id
    if (question.type === 'single') {
      setSelected([value])
      onAnswer(question.questionId, [value])
      return
    }
    setSelected((items) => (items.includes(value) ? items.filter((item) => item !== value) : [...items, value]))
  }

  function optionState(option) {
    if (!feedback) return ''
    const value = option.label || option.id
    if (correctOptions.has(value)) return 'correct'
    if ((feedback.selectedOptions || []).includes(value)) return 'wrong'
    return ''
  }

  return (
    <main className="quiz-page">
      <section className="quiz-question-panel">
        <div className="quiz-question-head">
          <div>
            <span>{progressText}</span>
            <div className="quiz-progress"><i style={{ width: `${totalQuestions ? (questionSort / totalQuestions) * 100 : 0}%` }} /></div>
          </div>
          <Countdown seconds={current.remainingSeconds ?? question.timeLimitSeconds ?? 10} active={!locked} onTimeout={handleTimeout} />
        </div>

        <h2>{question.title}</h2>
        <p className="quiz-muted">{question.type === 'multiple' ? '多选题' : '单选题'}</p>

        <div className="quiz-options">
          {(question.options || []).map((option) => {
            const value = option.label || option.id
            return (
              <OptionItem
                key={option.id || option.label}
                option={option}
                locked={locked}
                selected={selected.includes(value)}
                state={optionState(option)}
                onClick={() => toggleOption(option)}
              />
            )
          })}
        </div>

        {question.type === 'multiple' && !feedback ? (
          <QuizButton disabled={submitting || selected.length === 0} onClick={() => onAnswer(question.questionId, selected)}>
            {submitting ? '提交中...' : '提交答案'}
          </QuizButton>
        ) : null}

        {feedback ? (
          <div className={`quiz-feedback ${feedback.isTimeout ? 'is-timeout' : feedback.isCorrect ? 'is-correct' : 'is-wrong'}`}>
            {feedback.isTimeout ? '答题超时' : feedback.isCorrect ? '回答正确' : '回答错误'}
            {feedback.correctOptions?.length ? <small>正确答案：{feedback.correctOptions.join('、')}</small> : null}
          </div>
        ) : null}
      </section>
    </main>
  )
}
