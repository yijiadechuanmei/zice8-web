import OptionItem from './OptionItem'

export default function QuestionCard({
  question,
  submitting,
  selectedValue,
  onSelect,
}) {
  const options = question?.options || []

  return (
    <section className="rounded-[24px] bg-white px-6 py-6 shadow-[0_16px_36px_rgba(55,94,156,0.10)]">
      <div className="rounded-[18px] border border-[#edf1f7] bg-white px-5 py-6 shadow-[0_8px_18px_rgba(34,73,140,0.05)]">
        <p className="text-[18px] leading-[1.8] font-medium text-slate-900">
          {question?.title || '题目加载中...'}
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        {options.map((option, index) => (
          <OptionItem
            key={`${question?.id || 'question'}-${option.label}-${index}`}
            index={index}
            label={option.label}
            selected={selectedValue === option.value}
            disabled={submitting || !question}
            onSelect={() => onSelect(option.value)}
          />
        ))}
      </div>
    </section>
  )
}
