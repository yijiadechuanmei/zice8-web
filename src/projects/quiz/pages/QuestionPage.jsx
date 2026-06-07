import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Countdown from '../components/Countdown'
import QuizButton from '../components/QuizButton'
import { quizAssets } from '../assets'

export default function QuestionPage({ current, feedback, submitting, onAnswer, onTimeout }) {
  const question = current?.currentQuestion
  const [selected, setSelected] = useState([])
  const timeoutTriggeredRef = useRef(false)

  useEffect(() => {
    setSelected([])
    timeoutTriggeredRef.current = false
  }, [question?.questionId])

  const totalQuestions = current?.totalQuestions || current?.questionCount || 0
  const questionSort = question?.questionSort || current?.currentQuestionSort || 1
  const progressText = `第 ${questionSort} / ${totalQuestions || '-'} 题`
  const locked = submitting || Boolean(feedback)
  const correctOptions = useMemo(() => new Set(feedback?.correctOptions || []), [feedback])
  const progressWidth = `${totalQuestions ? (questionSort / totalQuestions) * 100 : 0}%`

  const handleTimeout = useCallback(() => {
    if (!question || locked || timeoutTriggeredRef.current) return
    timeoutTriggeredRef.current = true
    onTimeout(question.questionId)
  }, [locked, onTimeout, question])

  if (!question) {
    return (
      <main className="quiz-page quiz-design-page">
        <section className="quiz-design-screen">
          <p className="quiz-muted">当前题目加载中...</p>
        </section>
      </main>
    )
  }

  function toggleOption(option) {
    if (locked) return
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
    <main className="quiz-page quiz-design-page">
      <section className="quiz-design-screen quiz-question-page">
        <div className="quiz-design-stage quiz-question-stage">
          <img className="quiz-design-bg" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="quiz-design-logo-snow" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="quiz-design-logo-event" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-question-mask" src={quizAssets.question.panelMask} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-question-progress-image" src={quizAssets.question.progressBg} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-question-order-image" src={quizAssets.question.titleOrder} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-question-countdown-image" src={quizAssets.question.countdownBg} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-question-title-card-image" src={quizAssets.question.cardTitle} alt="" aria-hidden="true" />

          <div className="quiz-dynamic-layer quiz-question-order-text">{progressText}</div>
          <div className="quiz-dynamic-layer quiz-question-progress">
            <i style={{ width: progressWidth }} />
          </div>

          <div className="quiz-dynamic-layer quiz-question-countdown-wrap">
            <img className="quiz-question-countdown-number-image" src={quizAssets.question.countdownNumber} alt="" aria-hidden="true" />
            <Countdown
              key={question.questionId}
              seconds={current.remainingSeconds ?? question.timeLimitSeconds ?? 10}
              active={!locked}
              onTimeout={handleTimeout}
            />
          </div>

          <div className="quiz-dynamic-layer quiz-question-title-wrap">
            <div className="quiz-question-type">{question.type === 'multiple' ? '多选题' : '单选题'}</div>
            <h2>{question.title}</h2>
          </div>

          <div className="quiz-dynamic-layer quiz-question-options">
            {(question.options || []).map((option, index) => {
              const value = option.label || option.id
              const label = option.label || String.fromCharCode(65 + index)
              return (
                <button
                  className={`quiz-question-option ${selected.includes(value) ? 'is-selected' : ''} ${
                    optionState(option) ? `is-${optionState(option)}` : ''
                  }`}
                  key={option.id || option.label || index}
                  type="button"
                  disabled={locked}
                  onClick={() => toggleOption(option)}
                >
                  <img className="quiz-question-option-bg-image" src={quizAssets.question.optionBg} alt="" aria-hidden="true" />
                  <img className="quiz-question-option-badge-image" src={quizAssets.question.optionBadge} alt="" aria-hidden="true" />
                  <span className="quiz-question-option-label">{label}</span>
                  <span className="quiz-question-option-content">{option.content}</span>
                </button>
              )
            })}
          </div>

          {question.type === 'multiple' && !feedback ? (
            <div className="quiz-dynamic-layer quiz-question-submit-wrap">
              <QuizButton disabled={submitting || selected.length === 0} onClick={() => onAnswer(question.questionId, selected)}>
                {submitting ? '提交中...' : '提交答案'}
              </QuizButton>
            </div>
          ) : null}

          {feedback ? (
            <div className={`quiz-dynamic-layer quiz-feedback quiz-question-feedback ${feedback.isTimeout ? 'is-timeout' : feedback.isCorrect ? 'is-correct' : 'is-wrong'}`}>
              {feedback.isTimeout ? '答题超时' : feedback.isCorrect ? '回答正确' : '回答错误'}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
