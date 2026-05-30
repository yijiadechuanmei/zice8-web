import CommentBox from '../components/CommentBox'
import VideoPlayer from '../components/VideoPlayer'

export default function VideoDetailPage({ video, comments, onBack, onOpenRank, onSubmitProgress, onSubmitComment }) {
  return (
    <main className="mx-auto min-h-screen max-w-[750px] bg-slate-100 px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">返回列表</button>
        <button onClick={onOpenRank} className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">排行榜</button>
      </div>
      <section className="mb-4">
        <h1 className="text-2xl font-black text-slate-950">{video.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{video.author || '未填写作者'}</p>
      </section>
      <VideoPlayer video={video} onSubmitProgress={onSubmitProgress} />
      <CommentBox comments={comments} onSubmit={onSubmitComment} />
    </main>
  )
}
