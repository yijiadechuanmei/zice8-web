import { useEffect, useState } from 'react'
import QuestionCard from '../components/QuestionCard'
import QuestionHeader from '../components/QuestionHeader'
import ProgressBar from '../components/ProgressBar'

export default function QuestionPage({
  activityTitle,
  questions,
  currentIndex,
  submitting,
  onAnswer,
  assets,
}) {
  const question = questions[currentIndex] || null
  const [selectedValue, setSelectedValue] = useState(null)

  useEffect(() => {
    setSelectedValue(null)
  }, [question?.id])

  return (
    <section className="relative z-10 flex h-full flex-col text-slate-900">
      <QuestionHeader title={activityTitle} backgroundImageUrl={assets.bannerBackground} />

      <div className="pql-question-content flex-1 px-[32px] pb-[88px] pt-[28px]">
        <div className="pql-progress-shell rounded-[28px] bg-white px-[28px] py-[28px] shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
          <ProgressBar current={Math.min(currentIndex + 1, 5)} total={5} />
        </div>

        <div className="mt-[24px]">
          <QuestionCard
            question={question}
            selectedValue={selectedValue}
            submitting={submitting}
            onSelect={(value) => {
              setSelectedValue(value)
              onAnswer(value)
            }}
          />
        </div>
      </div>
    </section>
  )
}
