import CommentBox from '../components/CommentBox'
import VideoPlayer from '../components/VideoPlayer'
import { VIDEO_RANK_VERSION } from '../config'

export default function VideoDetailPage({ video, comments, loading, error, commentsLoading, onBack, onOpenRank, onSubmitProgress, onSubmitComment }) {
  return (
    <main className="mx-auto min-h-screen max-w-[750px] bg-gradient-to-b from-slate-950 via-slate-100 to-slate-100 px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="min-h-11 rounded-full bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50">返回列表</button>
        <button onClick={onOpenRank} className="min-h-11 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-rose-500">排行榜</button>
      </div>
      {loading && <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">视频加载中...</div>}
      {!loading && error && <div className="rounded-3xl bg-white p-8 text-center text-sm text-red-600 shadow-sm">{error}</div>}
      {!loading && !error && !video && <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">视频不存在</div>}
      {!loading && !error && video && (
        <>
          <VideoPlayer key={video.id} video={video} onSubmitProgress={onSubmitProgress} />
          <section className="mt-5 rounded-3xl bg-white p-4 shadow-sm">
            <h1 className="text-2xl font-black leading-tight text-slate-950">{video.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{video.author || '未填写作者'}</p>
          </section>
          <CommentBox comments={comments} loading={commentsLoading} onSubmit={onSubmitComment} />
        </>
      )}
      <footer className="pt-6 text-center text-xs text-slate-400">{VIDEO_RANK_VERSION}</footer>
    </main>
  )
}
