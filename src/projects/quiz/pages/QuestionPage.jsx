import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Countdown from '../components/Countdown'
import OptionItem from '../components/OptionItem'
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
      <main className="quiz-page flex min-h-screen w-full justify-center bg-[#143978] px-4 py-10">
        <section className="w-full max-w-[750px] text-center text-white/80">
          <p>当前题目加载中...</p>
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
    <main className="quiz-page flex min-h-screen w-full justify-center bg-[#143978] pb-7">
      <section className="w-full max-w-[750px]">
        <div className="relative aspect-[750/1624] min-h-screen w-full overflow-hidden bg-[#143978]">
          <img className="absolute inset-0 h-full w-full object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[5.6%] top-[0.985%] h-[6.8966%] w-[21.2%] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[67.7333%] top-[1.3547%] h-[6.1576%] w-[25.6%] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />
          <img className="absolute left-[3.2%] top-[7.6355%] h-[77.5862%] w-[93.2%] object-contain" src={quizAssets.question.panelMask} alt="" aria-hidden="true" />
          <img className="absolute left-[9.3333%] top-[17.9803%] h-[1.6009%] w-[78%] object-contain" src={quizAssets.question.progressBg} alt="" aria-hidden="true" />
          <img className="absolute left-[-0.5333%] top-[10.7143%] h-[3.1404%] w-[99.7333%] object-contain" src={quizAssets.question.titleOrder} alt="" aria-hidden="true" />
          <img className="absolute left-[77.6%] top-[8.6207%] h-[7.0197%] w-[13.0667%] object-contain" src={quizAssets.question.countdownBg} alt="" aria-hidden="true" />
          <img className="absolute left-[11.7333%] top-[23.1527%] h-[10.1601%] w-[76.8%] object-contain" src={quizAssets.question.cardTitle} alt="" aria-hidden="true" />

          <div className="absolute left-0 right-0 top-[11.3929%] text-center text-[clamp(14px,2.4vw,24px)] font-extrabold text-[#fff7d1]">
            {progressText}
          </div>
          <div className="absolute left-[12.2%] top-[18.5345%] h-[0.9852%] w-[73.2%] overflow-hidden rounded-full bg-white/20">
            <i className="block h-full rounded-full bg-gradient-to-r from-[#f7e26d] to-[#ffd657]" style={{ width: progressWidth }} />
          </div>

          <div className="absolute left-[79.2%] top-[10.0369%] h-[4.4335%] w-[9.8667%]">
            <img className="absolute inset-0 h-full w-full" src={quizAssets.question.countdownNumber} alt="" aria-hidden="true" />
            <Countdown
              key={question.questionId}
              seconds={current.remainingSeconds ?? question.timeLimitSeconds ?? 10}
              active={!locked}
              onTimeout={handleTimeout}
              className={`absolute inset-0 h-full w-full rounded-none bg-transparent text-[#fff9d9] ${current.remainingSeconds <= 3 ? 'text-[#ffe3e3]' : ''}`}
              numberClassName="text-[clamp(18px,3.2vw,34px)] leading-none"
              labelClassName="hidden"
            />
          </div>

          <div className="absolute left-[14%] top-[24.6%] w-[72%] text-[#173f2a]">
            <div className="text-[clamp(12px,2vw,20px)] font-extrabold text-[#7b5a0a]">{question.type === 'multiple' ? '多选题' : '单选题'}</div>
            <h2 className="mt-2.5 text-[clamp(16px,2.9vw,30px)] leading-[1.5] font-bold text-[#173f2a]">{question.title}</h2>
          </div>

          <div className="absolute left-[13.3333%] top-[38.3%] flex w-[72.8%] flex-col gap-3">
            {(question.options || []).map((option, index) => {
              const value = option.label || option.id
              const label = option.label || String.fromCharCode(65 + index)
              return (
                <OptionItem
                  key={option.id || option.label || index}
                  option={{ ...option, label }}
                  disabled={locked}
                  locked={locked}
                  selected={selected.includes(value)}
                  state={optionState(option)}
                  onClick={() => toggleOption(option)}
                />
              )
            })}
          </div>

          {question.type === 'multiple' && !feedback ? (
            <div className="absolute left-[13.3333%] top-[76.5%] w-[72.8%]">
              <QuizButton className="min-h-[clamp(48px,8vw,72px)]" disabled={submitting || selected.length === 0} onClick={() => onAnswer(question.questionId, selected)}>
                {submitting ? '提交中...' : '提交答案'}
              </QuizButton>
            </div>
          ) : null}

          {feedback ? (
            <div
              className={`absolute left-[13.3333%] top-[83.2%] w-[72.8%] rounded-lg px-3 py-3 text-center text-[clamp(14px,2.35vw,24px)] font-extrabold ${
                feedback.isTimeout || !feedback.isCorrect ? 'bg-[#fee2e2] text-[#9f1d1d]' : 'bg-[#eef8cf] text-[#255332]'
              }`}
            >
              {feedback.isTimeout ? '答题超时' : feedback.isCorrect ? '回答正确' : '回答错误'}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
