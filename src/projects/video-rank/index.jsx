/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL, getToken, removeToken, setToken } from '../../shared/api/request'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import DebugPanel from './components/DebugPanel'
import ProfileModal from './components/ProfileModal'
import SnapshotUserNotice from './components/SnapshotUserNotice'
import { VIDEO_RANK_PAGE, VIDEO_RANK_SPLASH_AUTO_ENTER_MS, VIDEO_RANK_SPLASH_IMAGE_URL } from './config'
import { getBootstrap, getMe, getPublicConfig, getRank, getVideos, trackVideoView, updateParticipantProfile } from './api'
import HomePage from './pages/HomePage'
import RankPage from './pages/RankPage'
import SplashPage from './pages/SplashPage'
import VideoDetailPage from './pages/VideoDetailPage'

const PENDING_ACTION_KEY = 'zice8_video_rank_pending_action'

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
  const [page, setPage] = useState(VIDEO_RANK_PAGE.SPLASH)
  const [splashShown, setSplashShown] = useState(true)
  const [selectedVideoId, setSelectedVideoId] = useState(null)
  const [error, setError] = useState('')
  const [profileModalVisible, setProfileModalVisible] = useState(false)
  const [pendingAction, setPendingAction] = useState(() => readPendingAction())
  const [snapshotMessage, setSnapshotMessage] = useState('')
  const [snapshotNoticeVisible, setSnapshotNoticeVisible] = useState(false)
  const [videoListLoadedBeforeAuth, setVideoListLoadedBeforeAuth] = useState(false)
  const [hasToken, setHasToken] = useState(Boolean(getToken()))
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
  const { authReady, blockedMessage, autoAuthStarted } = useWechatAuth(activityKey, publicConfig)
  const updateDebugStatus = useCallback((patch) => {
    setDebugStatus((current) => ({ ...current, ...patch }))
  }, [])

  useWechatShare(activityKey, bootstrap?.activity || publicConfig, updateDebugStatus)

  useEffect(() => {
    if (!activityKey) return
    trackPageView(activityKey, '/video-rank')
  }, [activityKey])

  useEffect(() => {
    if (!activityKey) return setError('缺少 activity_key')
    if (getQueryParam('snapshot_user') === '1') {
      setSnapshotMessage('当前为微信快照页，仅可浏览部分内容。请点击右下角「使用完整服务」后授权进入完整活动。')
      setSnapshotNoticeVisible(true)
    }
    updateDebugStatus({ publicConfigStatus: 'loading' })
    getPublicConfig(activityKey)
      .then((config) => {
        setPublicConfig(config)
        if (config.videos?.length) {
          setVideos(config.videos)
          setVideoListLoadedBeforeAuth(!getToken())
        }
        updateDebugStatus({ publicConfigStatus: 'success' })
      })
      .catch((err) => {
        updateDebugStatus({ publicConfigStatus: 'failed', publicConfigError: err.message })
        setError(err.message)
      })
  }, [activityKey])

  useEffect(() => {
    if (!authReady || !activityKey) return
    if (!getToken()) {
      setBootstrap({ activity: publicConfig, participant: null, profileCompleted: false })
      setMe(null)
      setHasToken(false)
      updateDebugStatus({ authMeStatus: 'guest', bootstrapStatus: 'guest' })
      return
    }
    updateDebugStatus({ authMeStatus: 'loading', bootstrapStatus: 'loading' })
    Promise.all([getMe(), getBootstrap(activityKey)])
      .then(([meData, boot]) => {
        if (boot?.snapshotUser) {
          setSnapshotMessage('当前为微信快照页，仅可浏览部分内容。请点击右下角「使用完整服务」后授权进入完整活动。')
          setSnapshotNoticeVisible(true)
          setBootstrap({ activity: publicConfig, participant: null, profileCompleted: false })
          setMe({ ...meData, snapshotUser: true })
          setHasToken(false)
          updateDebugStatus({ authMeStatus: 'snapshot', bootstrapStatus: 'snapshot' })
          return
        }
        setMe(meData)
        setBootstrap(boot)
        setHasToken(true)
        updateDebugStatus({ authMeStatus: 'success', bootstrapStatus: 'success' })
      })
      .catch((err) => {
        updateDebugStatus({ authMeStatus: 'failed', bootstrapStatus: 'failed', authError: err.message })
        removeToken()
        setHasToken(false)
        setBootstrap({ activity: publicConfig, participant: null, profileCompleted: false })
      })
  }, [authReady, activityKey, publicConfig])

  useEffect(() => {
    if (!bootstrap || !activityKey) return
    loadVideos()
  }, [bootstrap, activityKey])

  useEffect(() => {
    if (!bootstrap || !hasToken || snapshotMessage || !pendingAction) return
    if (!bootstrap.profileCompleted) {
      if (page !== VIDEO_RANK_PAGE.HOME) return
      setProfileModalVisible(true)
      return
    }
    continuePendingAction(pendingAction)
  }, [bootstrap, hasToken, snapshotMessage, pendingAction, page])

  useEffect(() => {
    if (!bootstrap || !hasToken || snapshotMessage || pendingAction) return
    if (page !== VIDEO_RANK_PAGE.HOME) return
    if (!bootstrap.profileCompleted) setProfileModalVisible(true)
  }, [bootstrap, hasToken, snapshotMessage, pendingAction, page])

  useEffect(() => {
    const title = bootstrap?.activity?.title || publicConfig?.title
    if (title) document.title = title
  }, [bootstrap?.activity?.title, publicConfig?.title])

  async function loadVideos() {
    setVideosLoading(true)
    try {
      const list = getToken() ? await getVideos(activityKey) : (publicConfig?.videos || [])
      setVideos(list)
    } finally {
      setVideosLoading(false)
    }
  }

  async function handleProfileSubmit(data) {
    const result = await updateParticipantProfile(activityKey, data)
    setBootstrap({ ...bootstrap, participant: result.participant, profileCompleted: true })
    setProfileModalVisible(false)
    trackEvent({ activityKey, eventType: 'submit_profile', page: '/video-rank' })
    if (pendingAction) continuePendingAction(pendingAction)
  }

  function openVideo(video) {
    if (!video.unlocked) {
      window.alert('视频暂未解锁')
      return
    }
    if (!ensureParticipation({ type: 'openVideo', videoId: video.id })) return
    trackEvent({ activityKey, eventType: 'open_video', page: '/video-rank', extra: { videoId: video.id } })
    recordVideoView(video.id)
    setSelectedVideoId(video.id)
    setPage(VIDEO_RANK_PAGE.DETAIL)
  }

  function recordVideoView(videoId) {
    trackVideoView(activityKey, videoId)
      .then((result) => {
        setVideos((current) => current.map((video) => (video.id === videoId ? { ...video, viewCount: result?.viewCount || 0 } : video)))
      })
      .catch((err) => {
        console.warn('track video view failed', err)
      })
  }

  function backHome() {
    setSelectedVideoId(null)
    setPage(VIDEO_RANK_PAGE.HOME)
  }

  async function openRank() {
    if (!ensureParticipation({ type: 'openRank' })) return
    trackEvent({ activityKey, eventType: 'open_rank', page: '/video-rank' })
    const data = await getRank(activityKey)
    setRanks(data.list)
    setPage(VIDEO_RANK_PAGE.RANK)
  }

  function ensureParticipation(action) {
    if (snapshotMessage) return false
    if (!getToken()) {
      setPendingAction(action)
      startWechatAuthorize(action)
      return false
    }
    if (!bootstrap?.profileCompleted) {
      setPendingAction(action)
      setProfileModalVisible(true)
      return false
    }
    return true
  }

  function startWechatAuthorize(action) {
    savePendingAction(action)
    const redirectUrl = encodeURIComponent(sanitizeUrlForWechat(window.location.href))
    const oauthUrl = `${API_BASE_URL}/wechat/oauth/redirect?activity_key=${encodeURIComponent(activityKey)}&redirect_url=${redirectUrl}`
    window.location.replace(oauthUrl)
  }

  async function continuePendingAction(action) {
    clearPendingAction()
    setPendingAction(null)
    setProfileModalVisible(false)
    if (action.type === 'openVideo' && action.videoId) {
      trackEvent({ activityKey, eventType: 'open_video', page: '/video-rank', extra: { videoId: action.videoId } })
      recordVideoView(action.videoId)
      setSelectedVideoId(action.videoId)
      setPage(VIDEO_RANK_PAGE.DETAIL)
      return
    }
    if (action.type === 'openRank') {
      trackEvent({ activityKey, eventType: 'open_rank', page: '/video-rank' })
      const data = await getRank(activityKey)
      setRanks(data.list)
      setPage(VIDEO_RANK_PAGE.RANK)
    }
  }

  const debugPanel = debugVisible ? (
    <DebugPanel
      activityKey={activityKey}
      status={{
        ...debugStatus,
        authRequiredAction: pendingAction?.type || '-',
        snapshotUser: Boolean(snapshotMessage || me?.snapshotUser || bootstrap?.snapshotUser),
        rawNickname: me?.rawNickname || bootstrap?.user?.rawNickname || '-',
        displayName: me?.displayName || bootstrap?.user?.displayName || '-',
        hasToken,
        profileCompleted: Boolean(bootstrap?.profileCompleted),
        pendingAction: pendingAction ? JSON.stringify(pendingAction) : '-',
        accessMode: publicConfig?.accessMode || '-',
        oauthScope: publicConfig?.oauthScope || '-',
        requireUserinfo: Boolean(publicConfig?.requireUserinfo),
        autoAuthStarted,
        snapshotUserParam: getQueryParam('snapshot_user') === '1',
        videoListLoadedBeforeAuth,
        currentPage: page,
        splashShown,
        splashAutoEnterMs: VIDEO_RANK_SPLASH_AUTO_ENTER_MS,
        splashImageUrl: VIDEO_RANK_SPLASH_IMAGE_URL,
      }}
      bootstrap={bootstrap}
      onClose={() => setDebugVisible(false)}
    />
  ) : null

  if (blockedMessage) return <><div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">{blockedMessage}</div>{debugPanel}</>
  if (error) return <><div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center text-red-600">{error}</div>{debugPanel}</>
  if (!activityKey || !publicConfig || !authReady || !bootstrap) return <><div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">加载中...</div>{debugPanel}</>

  return (
    <>
      {snapshotMessage && <div className="mx-auto max-w-[750px] bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">{snapshotMessage}</div>}
      {page === VIDEO_RANK_PAGE.SPLASH && <SplashPage onEnter={() => { setSplashShown(false); setPage(VIDEO_RANK_PAGE.HOME) }} />}
      {page === VIDEO_RANK_PAGE.HOME && <HomePage bootstrap={bootstrap} videos={videos} loading={videosLoading} debug={debugEnabled} onOpenVideo={openVideo} onOpenRank={openRank} />}
      {page === VIDEO_RANK_PAGE.DETAIL && <VideoDetailPage activityKey={activityKey} videoId={selectedVideoId} userId={me?.id} debug={debugEnabled} onBack={backHome} onOpenRank={openRank} onProgressSubmitted={() => loadVideos().catch(() => {})} />}
      {page === VIDEO_RANK_PAGE.RANK && <RankPage ranks={ranks} me={me} onBack={() => setPage(VIDEO_RANK_PAGE.HOME)} />}
      {profileModalVisible && <ProfileModal initialParticipant={bootstrap.participant} onSubmit={handleProfileSubmit} />}
      {snapshotNoticeVisible && <SnapshotUserNotice onClose={() => setSnapshotNoticeVisible(false)} />}
      {debugPanel}
    </>
  )
}

function readPendingAction() {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_ACTION_KEY) || 'null')
  } catch {
    return null
  }
}

function savePendingAction(action) {
  sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify(action))
}

function clearPendingAction() {
  sessionStorage.removeItem(PENDING_ACTION_KEY)
}
