export default function ProgressBar({ current, total }) {
  const progress = total > 0 ? Math.min(1, current / total) : 0

  return (
    <div className="flex items-center gap-4 px-2">
      <span className="h-px flex-1 border-t border-dashed border-slate-300/90" />
      <div className="whitespace-nowrap text-[22px] font-medium text-slate-600">
        题目 <span className="text-[#2F80FF]">{current}</span>
        <span className="text-slate-500">/{total}</span>
      </div>
      <span className="h-px flex-1 border-t border-dashed border-slate-300/90" />
      <div
        className="absolute left-1/2 top-1/2 hidden h-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2F80FF]"
        style={{ width: `${Math.max(0, progress * 100)}%` }}
        aria-hidden="true"
      />
    </div>
  )
}
