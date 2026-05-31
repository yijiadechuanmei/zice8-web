import { useState } from 'react'

export default function VideoCard({ video, onClick, debug }) {
  const [coverFailed, setCoverFailed] = useState(false)
  const percent = Math.round((video.watchRate || 0) * 100)
  const status = !video.unlocked ? '未解锁' : video.completed ? '已完成' : '未完成'
  const showCover = video.cover && !coverFailed

  function handleClick() {
    if (!video.unlocked) {
      window.alert('视频暂未解锁')
      return
    }
    onClick(video)
  }

  return (
    <button onClick={handleClick} className="w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="aspect-[4/5] bg-slate-200">
        {showCover ? (
          <img src={video.cover} alt={video.title} onError={() => setCoverFailed(true)} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 px-3 text-center text-sm font-semibold text-slate-400">视频封面</div>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-950">{video.title}</h3>
        <p className="mt-1 truncate text-xs text-slate-500">{video.author || '未填写作者'} · 第 {video.dayIndex} 天</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${video.completed ? 'bg-emerald-100 text-emerald-700' : video.unlocked ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>{status}</span>
          <span className="text-xs text-slate-400">{percent}%</span>
        </div>
        {debug && (
          <p className="mt-2 break-words rounded-lg bg-slate-100 px-2 py-1 text-[10px] leading-4 text-slate-500">
            id:{video.id} sort:{video.sort ?? '-'} unlocked:{String(Boolean(video.unlocked))} completed:{String(Boolean(video.completed))}
          </p>
        )}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-rose-600" style={{ width: `${Math.min(percent, 100)}%` }} /></div>
      </div>
    </button>
  )
}
