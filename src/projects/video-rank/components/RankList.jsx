export default function RankList({ ranks, currentUserId }) {
  return (
    <div className="space-y-3">
      {ranks.map((item) => (
        <div key={item.userId} className={`flex items-center gap-3 rounded-2xl p-4 shadow-sm ${String(item.userId) === String(currentUserId) ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-white'}`}>
          <div className="w-8 text-center text-lg font-black text-slate-950">{item.rank}</div>
          <img src={item.avatar || '/vite.svg'} className="h-11 w-11 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-900">{item.name || item.nickname || '匿名用户'}</p>
            <p className="text-sm text-slate-500">{item.department || '未填写部门'}</p>
          </div>
          <div className="text-right">
            <p className="font-black text-slate-950">{item.finishCount}</p>
            <p className="text-xs text-slate-400">完成</p>
          </div>
        </div>
      ))}
      {!ranks.length && <p className="rounded-2xl bg-white p-6 text-center text-slate-400">暂无排行</p>}
    </div>
  )
}
