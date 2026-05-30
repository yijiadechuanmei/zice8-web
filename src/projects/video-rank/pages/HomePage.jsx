import VideoCard from '../components/VideoCard'

export default function HomePage({ bootstrap, videos, onOpenVideo, onOpenRank }) {
  const { activity, user, participant } = bootstrap
  return (
    <main className="mx-auto min-h-screen max-w-[750px] bg-slate-100 px-4 py-5">
      <section className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-lg">
        <p className="text-sm text-amber-200">视频留言排名项目</p>
        <h1 className="mt-2 text-2xl font-black">{activity.title}</h1>
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
          <img src={user.avatar || participant.avatar || '/vite.svg'} className="h-12 w-12 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{user.nickname || participant.name || '微信用户'}</p>
            <p className="text-sm text-slate-300">{participant.name} · {participant.department}</p>
          </div>
          <button onClick={onOpenRank} className="rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950">排行榜</button>
        </div>
      </section>
      <section className="mt-5 space-y-4">
        {videos.map((video) => <VideoCard key={video.id} video={video} onClick={onOpenVideo} />)}
      </section>
    </main>
  )
}
