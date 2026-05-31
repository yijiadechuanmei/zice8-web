import VideoCard from '../components/VideoCard'
import { VIDEO_RANK_VERSION } from '../config'

export default function HomePage({ bootstrap, videos, loading, debug, onOpenVideo, onOpenRank }) {
  const { activity } = bootstrap
  const bannerImage = activity.cover || activity.shareImage

  return (
    <main className="mx-auto min-h-screen max-w-[750px] bg-gradient-to-b from-rose-50 via-white to-slate-100 px-4 pb-8">
      <section className="-mx-4 overflow-hidden bg-slate-950 text-white shadow-lg">
        <div className="relative aspect-[16/9] min-h-52">
          {bannerImage ? (
            <img src={bannerImage} alt={activity.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,#fb7185_0,#be123c_32%,#111827_72%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          <div className="absolute bottom-4 right-4">
            <button onClick={onOpenRank} className="min-h-11 rounded-full bg-rose-600 px-5 text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-rose-500">排行榜</button>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-rose-600">活动视频</p>
            <h2 className="text-xl font-black text-slate-950">选择视频观看留言</h2>
          </div>
          <p className="text-sm text-slate-500">{videos.length} 个视频</p>
        </div>
        {loading && <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">视频加载中...</div>}
        {!loading && !videos.length && <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">暂无视频</div>}
        {!loading && Boolean(videos.length) && (
          <div className="grid grid-cols-2 gap-3">
            {videos.map((video) => <VideoCard key={video.id} video={video} debug={debug} onClick={onOpenVideo} />)}
          </div>
        )}
      </section>
      <footer className="pt-6 text-center text-xs text-slate-400">{VIDEO_RANK_VERSION}</footer>
    </main>
  )
}
