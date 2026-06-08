import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Countdown from '../components/Countdown'
import DesignStage from '../components/DesignStage'
import OptionItem from '../components/OptionItem'
import QuizButton from '../components/QuizButton'
import { quizAssets } from '../assets'

const EMPTY_PREVIEW_SELECTED_OPTIONS = []
const NOOP = () => {}

export default function QuestionPage({
  current,
  feedback,
  submitting,
  onAnswer,
  onTimeout,
  showToast = NOOP,
  previewMode = false,
  previewSelectedOptions = EMPTY_PREVIEW_SELECTED_OPTIONS,
}) {
  const question = current?.currentQuestion
  const [selected, setSelected] = useState([])
  const [questionLocked, setQuestionLocked] = useState(false)
  const timeoutTriggeredRef = useRef(false)
  const previewSelectedKey = previewSelectedOptions.join('|')

  useEffect(() => {
    setSelected(previewMode ? previewSelectedOptions : [])
    setQuestionLocked(false)
    timeoutTriggeredRef.current = false
  }, [previewMode, previewSelectedKey, question?.questionId])

  useEffect(() => {
    if (!submitting && !feedback) {
      setQuestionLocked(false)
    }
  }, [feedback, submitting, question?.questionId])

  useEffect(() => {
    if (!feedback) return
    if (feedback.isTimeout) {
      showToast('时间到')
      return
    }
    showToast(feedback.isCorrect ? '回答正确' : '回答错误')
  }, [feedback, showToast])

  const totalQuestions = current?.totalQuestions || current?.questionCount || 0
  const questionSort = question?.questionSort || current?.currentQuestionSort || 1
  const progressText = `第 ${questionSort} 题 / 共${totalQuestions || '-'} 题`
  const locked = submitting || questionLocked || Boolean(feedback)
  const correctOptions = useMemo(() => new Set(feedback?.correctOptions || []), [feedback])
  const progressWidth = `${totalQuestions ? (questionSort / totalQuestions) * 100 : 0}%`

  const handleTimeout = useCallback(() => {
    if (!question || locked || timeoutTriggeredRef.current) return
    timeoutTriggeredRef.current = true
    setQuestionLocked(true)
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
    const value = option.id || option.label
    if (question.type === 'single') {
      setSelected([value])
      if (previewMode) return
      setQuestionLocked(true)
      onAnswer(question.questionId, [value])
      return
    }
    setSelected((items) => (items.includes(value) ? items.filter((item) => item !== value) : [...items, value]))
  }

  function optionState(option) {
    if (!feedback) return ''
    const value = option.id || option.label
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

          <div className="absolute left-[24px] top-[118px] h-[1204px] w-[700px]">
            <img className="absolute inset-0 h-full w-full object-fill" src={quizAssets.question.panelMask} alt="" aria-hidden="true" />
            <img className="absolute right-[60px] top-[40px] h-[110px] w-[110px] object-contain" src={quizAssets.question.countdownBg} alt="" aria-hidden="true" />

            <div className="absolute right-[60px] top-[40px] h-[110px] w-[110px]">
                    <Countdown
                key={question.questionId}
                seconds={current.remainingSeconds ?? question.timeLimitSeconds ?? 10}
                active={!locked}
                paused={questionLocked || submitting || Boolean(feedback)}
                onTimeout={handleTimeout}
                className="absolute left-0 top-0 h-[110px] w-[110px] rounded-none bg-transparent text-[#2f7a42]"
                numberClassName="text-[48px] leading-none"
                labelClassName="hidden"
              />
            </div>

            <div className="relative z-10 h-full w-full px-[60px] pt-[70px]">
              <header className="relative h-[130px]">
                <div className="mx-auto h-[70px] w-[430px] text-center text-[42px] leading-none font-bold text-[#111111]">
                  {progressText}
                </div>
                <div className="absolute bottom-0 left-0 h-[28px] w-[580px] rounded-full border-[3px] border-[#06320f] bg-[#001905] shadow-[0_0_0_2px_#2f6b32]">
                  <div className="h-full w-full overflow-hidden rounded-full">
                    <i className="block h-full rounded-r-none bg-[#5a9650]" style={{ width: progressWidth }} />
                  </div>
                </div>
              </header>

              <section className="mt-[48px] min-h-[120px] w-full text-[#3f7f3f]">
                <h2 className="text-[34px] leading-[1.45] font-bold text-[#3f7f3f]">
                  {`【${question.type === 'multiple' ? '多选题' : '单选题'}】${question.title}`}
                </h2>
              </section>

              <section className="mt-[42px] flex w-full flex-col items-center gap-[30px]">
                {(question.options || []).map((option, index) => {
                  const value = option.id || option.label
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

                {question.type === 'multiple' && !feedback ? (
                  <QuizButton
                    className="mt-[4px] min-h-[72px] text-[26px]"
                    disabled={submitting || selected.length === 0}
                    onClick={() => {
                      if (previewMode || locked) return
                      setQuestionLocked(true)
                      onAnswer(question.questionId, selected)
                    }}
                  >
                    {submitting ? '提交中...' : '提交答案'}
                  </QuizButton>
                ) : null}

              </section>
            </div>
          </div>
        </DesignStage>
      </section>
    </main>
  )
}
