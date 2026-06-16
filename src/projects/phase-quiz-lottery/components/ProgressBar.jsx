export default function ProgressBar({ current, total }) {
  const safeTotal = total > 0 ? total : 5
  const progress = Math.min(1, Math.max(0, current / safeTotal))

  return (
    <div className="grid gap-[18px]">
      <div className="text-center text-[28px] font-bold text-slate-700">
        题目 <span className="text-slate-900">{current}</span>
        <span className="text-slate-400">/{safeTotal}</span>
      </div>
      <div className="h-[14px] overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-900 transition-all duration-300" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  )
}
