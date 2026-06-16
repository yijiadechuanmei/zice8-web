import OptionItem from './OptionItem'

export default function QuestionCard({
  question,
  submitting,
  selectedValue,
  onSelect,
}) {
  const options = question?.options || []

  return (
    <section className="rounded-[28px] bg-white px-[28px] py-[28px] shadow-[0_20px_52px_rgba(15,23,42,0.08)]">
      <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-[28px] py-[32px]">
        <p className="text-[32px] leading-[1.7] font-medium text-slate-900">
          {question?.title || '题目加载中...'}
        </p>
      </div>

      <div className="mt-[24px] grid gap-[18px]" role="radiogroup" aria-label="题目选项">
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
