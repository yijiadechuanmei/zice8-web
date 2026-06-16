function ProgressBar({ current, total }) {
  const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="h-2.5 overflow-hidden rounded-full bg-blue-100/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500 shadow-[0_6px_14px_rgba(59,130,246,0.24)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>题目 {current}</span>
        <span>共 {total} 题</span>
      </div>
    </div>
  )
}

function AnswerButtonGroup({ options, disabled, onSelect }) {
  return (
    <div className="grid gap-4">
      {options.map((option, index) => (
        <button
          key={`${option.label}-${index}`}
          className="flex min-h-20 cursor-pointer items-center gap-4 rounded-3xl border border-blue-100 bg-white px-5 py-4 text-left text-lg font-semibold text-slate-900 shadow-[0_18px_44px_rgba(59,130,246,0.12)] transition active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={disabled}
          onClick={() => onSelect(option.value)}
        >
          <span className="h-5 w-5 flex-none rounded-full border-2 border-slate-300" aria-hidden="true" />
          <span className="flex-1">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

export default function QuestionCard({
  question,
  current,
  total,
  submitting,
  onAnswer,
}) {
  return (
    <>
      <ProgressBar current={current} total={total} />
      <section className="mt-4 rounded-[28px] bg-gradient-to-b from-white to-blue-50 px-6 py-8 shadow-inner shadow-blue-100">
        <p className="text-lg leading-8 font-semibold text-slate-900 md:text-2xl">{question?.title || '题目加载中...'}</p>
      </section>
      <AnswerButtonGroup
        options={question?.options || []}
        disabled={submitting || !question}
        onSelect={onAnswer}
      />
    </>
  )
}
