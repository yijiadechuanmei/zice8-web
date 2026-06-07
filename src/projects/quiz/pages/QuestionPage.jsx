import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Countdown from '../components/Countdown'
import DesignStage from '../components/DesignStage'
import OptionItem from '../components/OptionItem'
import QuizButton from '../components/QuizButton'
import { quizAssets } from '../assets'

const EMPTY_PREVIEW_SELECTED_OPTIONS = []

export default function QuestionPage({
  current,
  feedback,
  submitting,
  onAnswer,
  onTimeout,
  previewMode = false,
  previewSelectedOptions = EMPTY_PREVIEW_SELECTED_OPTIONS,
}) {
  const question = current?.currentQuestion
  const [selected, setSelected] = useState([])
  const timeoutTriggeredRef = useRef(false)
  const previewSelectedKey = previewSelectedOptions.join('|')

  useEffect(() => {
    setSelected(previewMode ? previewSelectedOptions : [])
    timeoutTriggeredRef.current = false
  }, [previewMode, previewSelectedKey, question?.questionId])

  const totalQuestions = current?.totalQuestions || current?.questionCount || 0
  const questionSort = question?.questionSort || current?.currentQuestionSort || 1
  const progressText = `第 ${questionSort} 题 / 共${totalQuestions || '-'} 题`
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
      if (previewMode) return
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
        <DesignStage height={1624}>
          <img className="absolute left-0 top-0 h-[1624px] w-[750px] object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[42px] top-[16px] h-[112px] w-[159px] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[508px] top-[22px] h-[100px] w-[192px] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />
          <img className="absolute left-[24px] top-[124px] h-[1260px] w-[700px] object-contain" src={quizAssets.question.panelMask} alt="" aria-hidden="true" />
          {/* <img className="absolute left-[70px] top-[292px] h-[25px] w-[585px] object-contain" src={quizAssets.question.progressBg} alt="" aria-hidden="true" /> */}
          {/* <img className="absolute left-[-4px] top-[174px] h-[50px] w-[748px] object-contain" src={quizAssets.question.titleOrder} alt="" aria-hidden="true" /> */}
          <img className="absolute left-[582px] top-[140px] h-[114px] w-[98px] object-contain" src={quizAssets.question.countdownBg} alt="" aria-hidden="true" />
          <img className="absolute left-[88px] top-[376px] h-[166px] w-[576px] object-contain" src={quizAssets.question.cardTitle} alt="" aria-hidden="true" />

          <div className="absolute left-0 top-[170px] w-[750px] text-center text-[38px]  text-[#000000]">
            {progressText}
          </div>
          <div className="absolute left-[92px] top-[301px] h-[16px] w-[550px] overflow-hidden rounded-full bg-white/20">
            <i className="block h-full rounded-full bg-gradient-to-r from-[#f7e26d] to-[#ffd657]" style={{ width: progressWidth }} />
          </div>

          <div className="absolute left-[604px] top-[162px] h-[64px] w-[54px]">
            <Countdown
              key={question.questionId}
              seconds={current.remainingSeconds ?? question.timeLimitSeconds ?? 10}
              active={!locked}
              onTimeout={handleTimeout}
              className="absolute left-0 top-0 h-[64px] w-[54px] rounded-none bg-transparent text-[#177245]"
              numberClassName="text-[34px] leading-none"
              labelClassName="hidden"
            />
          </div>

          <div className="absolute left-[105px] top-[400px] w-[540px] text-[#173f2a]">
            <div className="text-[20px] font-extrabold text-[#7b5a0a]">{question.type === 'multiple' ? '多选题' : '单选题'}</div>
            <h2 className="mt-[10px] text-[30px] leading-[1.45] font-bold text-[#173f2a]">{question.title}</h2>
          </div>

          <div className="absolute left-[100px] top-[622px] flex w-[546px] flex-col gap-[16px]">
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
            <div className="absolute left-[100px] top-[1242px] w-[546px]">
              <QuizButton
                className="min-h-[72px] text-[26px]"
                disabled={submitting || selected.length === 0}
                onClick={() => {
                  if (previewMode) return
                  onAnswer(question.questionId, selected)
                }}
              >
                {submitting ? '提交中...' : '提交答案'}
              </QuizButton>
            </div>
          ) : null}

          {feedback ? (
            <div
              className={`absolute left-[100px] top-[1350px] w-[546px] rounded-lg px-[18px] py-[18px] text-center text-[24px] font-extrabold ${
                feedback.isTimeout || !feedback.isCorrect ? 'bg-[#fee2e2] text-[#9f1d1d]' : 'bg-[#eef8cf] text-[#255332]'
              }`}
            >
              {feedback.isTimeout ? '答题超时' : feedback.isCorrect ? '回答正确' : '回答错误'}
            </div>
          ) : null}
        </DesignStage>
      </section>
    </main>
  )
}
