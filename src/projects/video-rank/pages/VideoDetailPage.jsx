import { useEffect, useState } from 'react'
import CommentBox from '../components/CommentBox'
import VideoPlayer from '../components/VideoPlayer'
import { trackEvent } from '../../../shared/analytics'
import { getComments, getVideoDetail, submitComment, submitWatchSegments } from '../api'
import { VIDEO_RANK_VERSION } from '../config'

export default function VideoDetailPage({ activityKey, videoId, userId, debug, onBack, onOpenRank, onProgressSubmitted }) {
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
    setVideo((current) => ({ ...current, ...pickCompletionFields(result), watchRate: result.watchRate, watchedSeconds: result.watchedSeconds, finishTime: result.finishTime, completedAt: result.completedAt }))
    onProgressSubmitted?.()
    return result
  }

  async function handleSubmitComment(content) {
    const createdComment = await submitComment(activityKey, video.id, content)
    trackEvent({ activityKey, eventType: 'submit_comment', page: '/video-rank', extra: { videoId: video.id } })
    setVideo((current) => ({ ...current, ...pickCompletionFields(createdComment) }))
    setComments((current) => [createdComment, ...current])
    onProgressSubmitted?.()
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
          <VideoPlayer key={video.id} activityKey={activityKey} userId={userId} video={video} debug={debug} onSubmitProgress={handleSubmitProgress} />
          <CompletionNotice video={video} />
          <CommentBox comments={comments} loading={commentsLoading} onSubmit={handleSubmitComment} />
        </>
      )}
      <footer className="pt-6 text-center text-xs text-slate-400">{VIDEO_RANK_VERSION}</footer>
    </main>
  )
}

function pickCompletionFields(result) {
  return {
    watchCompleted: Boolean(result.watchCompleted),
    commentCompleted: Boolean(result.commentCompleted),
    legacyCompleted: Boolean(result.legacyCompleted),
    completed: Boolean(result.completed),
    completionPendingComment: Boolean(result.completionPendingComment),
    completionPendingWatch: Boolean(result.completionPendingWatch),
    completedAt: result.completedAt || null,
  }
}

function CompletionNotice({ video }) {
  const message = getCompletionMessage(video)
  if (!message) return null
  return (
    <div className={`mt-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm ${video.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {message}
    </div>
  )
}

function getCompletionMessage(video) {
  if (video.completed) return '本视频已完成，已计入排行榜。'
  if (video.watchCompleted && !video.commentCompleted && !video.legacyCompleted) return '你已看完本视频，请完成留言后计入排行榜。'
  if (video.commentCompleted && !video.watchCompleted) return '留言已提交，请看完视频后计入排行榜。'
  return ''
}
