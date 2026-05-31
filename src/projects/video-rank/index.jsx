/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react'
import { setToken } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import DebugPanel from './components/DebugPanel'
import ProfileModal from './components/ProfileModal'
import { VIDEO_RANK_PAGE } from './config'
import { getBootstrap, getMe, getPublicConfig, getRank, getVideos, updateParticipantProfile } from './api'
import HomePage from './pages/HomePage'
import RankPage from './pages/RankPage'
import VideoDetailPage from './pages/VideoDetailPage'

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
  const [ranks, setRanks] = useState([])
  const [page, setPage] = useState(VIDEO_RANK_PAGE.HOME)
  const [selectedVideoId, setSelectedVideoId] = useState(null)
  const [error, setError] = useState('')
  const [videosLoading, setVideosLoading] = useState(false)
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
    const title = bootstrap?.activity?.title || publicConfig?.title
    if (title) document.title = title
  }, [bootstrap?.activity?.title, publicConfig?.title])

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
    setSelectedVideoId(video.id)
    setPage(VIDEO_RANK_PAGE.DETAIL)
  }

  function backHome() {
    setSelectedVideoId(null)
    setPage(VIDEO_RANK_PAGE.HOME)
  }

  async function openRank() {
    const data = await getRank(activityKey)
    setRanks(data.list)
    setPage(VIDEO_RANK_PAGE.RANK)
  }

  const debugPanel = debugVisible ? <DebugPanel activityKey={activityKey} status={debugStatus} bootstrap={bootstrap} onClose={() => setDebugVisible(false)} /> : null

  if (blockedMessage) return <><div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">{blockedMessage}</div>{debugPanel}</>
  if (error) return <><div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center text-red-600">{error}</div>{debugPanel}</>
  if (!activityKey || !publicConfig || !authReady || !bootstrap) return <><div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">加载中...</div>{debugPanel}</>

  return (
    <>
      {page === VIDEO_RANK_PAGE.HOME && <HomePage bootstrap={bootstrap} videos={videos} loading={videosLoading} debug={debugEnabled} onOpenVideo={openVideo} onOpenRank={openRank} />}
      {page === VIDEO_RANK_PAGE.DETAIL && <VideoDetailPage activityKey={activityKey} videoId={selectedVideoId} userId={me?.id} debug={debugEnabled} onBack={backHome} onOpenRank={openRank} onProgressSubmitted={() => loadVideos().catch(() => {})} />}
      {page === VIDEO_RANK_PAGE.RANK && <RankPage ranks={ranks} me={me} onBack={() => setPage(VIDEO_RANK_PAGE.HOME)} />}
      {!bootstrap.profileCompleted && <ProfileModal initialParticipant={bootstrap.participant} onSubmit={handleProfileSubmit} />}
      {debugPanel}
    </>
  )
}
