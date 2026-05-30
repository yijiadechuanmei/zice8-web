/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react'
import { setToken } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import DebugPanel from './components/DebugPanel'
import ProfileModal from './components/ProfileModal'
import { VIDEO_RANK_PAGE } from './config'
import { getBootstrap, getComments, getMe, getPublicConfig, getRank, getVideoDetail, getVideos, submitComment, submitWatchSegments, updateParticipantProfile } from './api'
import HomePage from './pages/HomePage'
import RankPage from './pages/RankPage'
import VideoDetailPage from './pages/VideoDetailPage'

function getDetailVideoIdFromPath() {
  const match = window.location.pathname.match(/^\/video-rank\/detail\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : ''
}

function pushVideoRankPath(path) {
  window.history.pushState({}, '', `${path}${window.location.search || ''}`)
}

export default function VideoRankApp() {
  const tokenFromUrl = getTokenFromUrl()
  if (tokenFromUrl) {
    setToken(tokenFromUrl)
    window.location.replace(sanitizeUrlForWechat(window.location.href))
    return null
  }

  return <VideoRankMain />
}

function VideoRankMain() {
  const activityKey = getQueryParam('activity_key')
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [me, setMe] = useState(null)
  const [videos, setVideos] = useState([])
  const [currentVideo, setCurrentVideo] = useState(null)
  const [comments, setComments] = useState([])
  const [ranks, setRanks] = useState([])
  const [page, setPage] = useState(getDetailVideoIdFromPath() ? VIDEO_RANK_PAGE.DETAIL : VIDEO_RANK_PAGE.HOME)
  const [routeVideoId, setRouteVideoId] = useState(getDetailVideoIdFromPath())
  const [error, setError] = useState('')
  const [videosLoading, setVideosLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const debugEnabled = ['1', 'wx'].includes(getQueryParam('debug'))
  const [debugVisible, setDebugVisible] = useState(debugEnabled)
  const [debugStatus, setDebugStatus] = useState({
    publicConfigStatus: 'idle',
    authMeStatus: 'idle',
    bootstrapStatus: 'idle',
    signatureStatus: 'idle',
    wxScriptLoadStatus: 'idle',
    wxExists: Boolean(window.wx),
    wxConfigStatus: 'idle',
    shareConfigured: false,
  })
  const { authReady, blockedMessage } = useWechatAuth(activityKey, publicConfig)
  const updateDebugStatus = useCallback((patch) => {
    setDebugStatus((current) => ({ ...current, ...patch }))
  }, [])

  useWechatShare(activityKey, bootstrap?.activity || publicConfig, updateDebugStatus)

  useEffect(() => {
    if (!activityKey) return setError('缺少 activity_key')
    updateDebugStatus({ publicConfigStatus: 'loading' })
    getPublicConfig(activityKey)
      .then((config) => {
        setPublicConfig(config)
        updateDebugStatus({ publicConfigStatus: 'success' })
      })
      .catch((err) => {
        updateDebugStatus({ publicConfigStatus: 'failed', publicConfigError: err.message })
        setError(err.message)
      })
  }, [activityKey])

  useEffect(() => {
    if (!authReady || !activityKey) return
    updateDebugStatus({ authMeStatus: 'loading', bootstrapStatus: 'loading' })
    Promise.all([getMe(), getBootstrap(activityKey)])
      .then(([meData, boot]) => {
        setMe(meData)
        setBootstrap(boot)
        updateDebugStatus({ authMeStatus: 'success', bootstrapStatus: 'success' })
      })
      .catch((err) => {
        updateDebugStatus({ authMeStatus: 'failed', bootstrapStatus: 'failed', authError: err.message })
        setError(err.message)
      })
  }, [authReady, activityKey])

  useEffect(() => {
    if (!bootstrap?.profileCompleted || !activityKey) return
    loadVideos()
  }, [bootstrap?.profileCompleted, activityKey])

  useEffect(() => {
    if (!bootstrap?.profileCompleted || !activityKey || !routeVideoId) return
    loadVideoDetail(routeVideoId)
  }, [bootstrap?.profileCompleted, activityKey, routeVideoId])

  useEffect(() => {
    const onPopState = () => {
      const detailId = getDetailVideoIdFromPath()
      setRouteVideoId(detailId)
      setPage(detailId ? VIDEO_RANK_PAGE.DETAIL : VIDEO_RANK_PAGE.HOME)
      if (!detailId) {
        setCurrentVideo(null)
        setComments([])
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  async function loadVideos() {
    setVideosLoading(true)
    try {
      const list = await getVideos(activityKey)
      setVideos(list)
    } finally {
      setVideosLoading(false)
    }
  }

  async function handleProfileSubmit(data) {
    const result = await updateParticipantProfile(activityKey, data)
    setBootstrap({ ...bootstrap, participant: result.participant, profileCompleted: true })
  }

  function openVideo(video) {
    pushVideoRankPath(`/video-rank/detail/${encodeURIComponent(video.id)}`)
    setPage(VIDEO_RANK_PAGE.DETAIL)
    setRouteVideoId(video.id)
  }

  async function loadVideoDetail(videoId) {
    setPage(VIDEO_RANK_PAGE.DETAIL)
    setDetailLoading(true)
    setCommentsLoading(true)
    setDetailError('')
    setComments([])
    try {
      const detail = await getVideoDetail(activityKey, videoId)
      setCurrentVideo(detail)
      const commentData = await getComments(activityKey, videoId)
      setComments(commentData.list || [])
    } catch (err) {
      setCurrentVideo(null)
      setDetailError(err.message || '视频加载失败')
    } finally {
      setDetailLoading(false)
      setCommentsLoading(false)
    }
  }

  function backHome() {
    pushVideoRankPath('/video-rank')
    setRouteVideoId('')
    setCurrentVideo(null)
    setComments([])
    setPage(VIDEO_RANK_PAGE.HOME)
  }

  async function openRank() {
    const data = await getRank(activityKey)
    setRanks(data.list)
    pushVideoRankPath('/video-rank')
    setRouteVideoId('')
    setPage(VIDEO_RANK_PAGE.RANK)
  }

  async function handleSubmitProgress(segments) {
    const result = await submitWatchSegments(activityKey, currentVideo.id, segments)
    setCurrentVideo({ ...currentVideo, completed: result.completed, watchRate: result.watchRate, finishTime: result.finishTime })
    loadVideos().catch(() => {})
    return result
  }

  async function handleSubmitComment(content) {
    const createdComment = await submitComment(activityKey, currentVideo.id, content)
    setComments((current) => [createdComment, ...current])
    setCommentsLoading(true)
    try {
      const data = await getComments(activityKey, currentVideo.id)
      setComments(data.list || [])
    } catch {
      // The submitted comment is already shown locally; the next detail load will retry the refresh.
    } finally {
      setCommentsLoading(false)
    }
  }

  const debugPanel = debugVisible ? <DebugPanel activityKey={activityKey} status={debugStatus} bootstrap={bootstrap} onClose={() => setDebugVisible(false)} /> : null

  if (blockedMessage) return <><div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">{blockedMessage}</div>{debugPanel}</>
  if (error) return <><div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center text-red-600">{error}</div>{debugPanel}</>
  if (!activityKey || !publicConfig || !authReady || !bootstrap) return <><div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">加载中...</div>{debugPanel}</>

  return (
    <>
      {page === VIDEO_RANK_PAGE.HOME && <HomePage bootstrap={bootstrap} videos={videos} loading={videosLoading} onOpenVideo={openVideo} onOpenRank={openRank} />}
      {page === VIDEO_RANK_PAGE.DETAIL && <VideoDetailPage video={currentVideo} comments={comments} loading={detailLoading} error={detailError} commentsLoading={commentsLoading} onBack={backHome} onOpenRank={openRank} onSubmitProgress={handleSubmitProgress} onSubmitComment={handleSubmitComment} />}
      {page === VIDEO_RANK_PAGE.RANK && <RankPage ranks={ranks} me={me} onBack={() => setPage(VIDEO_RANK_PAGE.HOME)} />}
      {!bootstrap.profileCompleted && <ProfileModal initialParticipant={bootstrap.participant} onSubmit={handleProfileSubmit} />}
      {debugPanel}
    </>
  )
}
