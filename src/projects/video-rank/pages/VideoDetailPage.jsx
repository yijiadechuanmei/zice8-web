import { useEffect, useState } from 'react'
import CommentBox from '../components/CommentBox'
import VideoPlayer from '../components/VideoPlayer'
import { getComments, getVideoDetail, submitComment, submitWatchSegments } from '../api'
import { VIDEO_RANK_VERSION } from '../config'

export default function VideoDetailPage({ activityKey, videoId, debug, onBack, onOpenRank, onProgressSubmitted }) {
  const [video, setVideo] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function loadDetail() {
      if (!activityKey || !videoId) return
      setLoading(true)
      setCommentsLoading(true)
      setError('')
      setVideo(null)
      setComments([])
      try {
        const detail = await getVideoDetail(activityKey, videoId)
        const commentData = await getComments(activityKey, videoId)
        if (!active) return
        setVideo(detail)
        setComments(commentData.list || [])
      } catch (err) {
        if (!active) return
        setError(err.message || '视频加载失败')
      } finally {
        if (active) {
          setLoading(false)
          setCommentsLoading(false)
        }
      }
    }

    loadDetail()
    return () => {
      active = false
    }
  }, [activityKey, videoId])

  async function handleSubmitProgress(segments) {
    const result = await submitWatchSegments(activityKey, video.id, segments)
    setVideo({ ...video, completed: result.completed, watchRate: result.watchRate, finishTime: result.finishTime })
    onProgressSubmitted?.()
    return result
  }

  async function handleSubmitComment(content) {
    const createdComment = await submitComment(activityKey, video.id, content)
    setComments((current) => [createdComment, ...current])
    setCommentsLoading(true)
    try {
      const data = await getComments(activityKey, video.id)
      setComments(data.list || [])
    } catch {
      // The submitted comment is already shown locally; the next detail load will retry the refresh.
    } finally {
      setCommentsLoading(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-[750px] bg-gradient-to-b from-slate-950 via-slate-100 to-slate-100 px-4 py-5">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onBack} className="min-h-11 rounded-full bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-200 hover:bg-slate-50">返回列表</button>
        <button onClick={onOpenRank} className="min-h-11 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-rose-500">排行榜</button>
      </div>
      {loading && <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">视频加载中...</div>}
      {!loading && error && <div className="rounded-2xl bg-white p-8 text-center text-sm text-red-600 shadow-sm">{error}</div>}
      {!loading && !error && !video && <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">视频不存在</div>}
      {!loading && !error && video && (
        <>
          <VideoPlayer key={video.id} video={video} debug={debug} onSubmitProgress={handleSubmitProgress} />
          <CommentBox comments={comments} loading={commentsLoading} onSubmit={handleSubmitComment} />
        </>
      )}
      <footer className="pt-6 text-center text-xs text-slate-400">{VIDEO_RANK_VERSION}</footer>
    </main>
  )
}
