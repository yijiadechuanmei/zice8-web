export default function VideoCard({ video, onClick }) {
  const percent = Math.round((video.watchRate || 0) * 100)
  const status = !video.unlocked ? '未解锁' : video.completed ? '已完成' : '未完成'
  return (
    <button onClick={() => video.unlocked && onClick(video)} className="w-full overflow-hidden rounded-3xl bg-white text-left shadow-sm disabled:opacity-70" disabled={!video.unlocked}>
      <div className="aspect-video bg-slate-200">
        {video.cover ? <img src={video.cover} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400">视频封面</div>}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-slate-950">{video.title}</h3>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs ${video.completed ? 'bg-emerald-100 text-emerald-700' : video.unlocked ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{status}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{video.author || '未填写作者'} · 第 {video.dayIndex} 天</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-slate-950" style={{ width: `${Math.min(percent, 100)}%` }} /></div>
        <p className="mt-2 text-xs text-slate-500">观看进度 {percent}%</p>
      </div>
    </button>
  )
}
