import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { getVisitorId, trackPageView } from '../../shared/analytics'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import { enableMobileDebug } from '../../shared/debug/mobileDebug'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl, isWechatBrowser } from '../../shared/utils/url'
import { setToken } from '../../shared/api/request'
import {
  answerQuiz,
  checkinLocation,
  finishQuiz,
  getBootstrap,
  getMine,
  getPublicConfig,
  getRank,
  getRecording,
  resetDebugData,
  saveProfile,
  startQuiz,
  submitRecording,
  submitShareScreenshot,
  voteRecording,
} from './api'
import { LONG_MARCH_STUDY_ACTIVITY_KEY, longMarchStudyAssets } from './config'
import './styles.css'

const PAGE = {
  HOME: 'home',
  QUIZ: 'quiz',
  QUIZ_RESULT: 'quizResult',
  CHECKIN: 'checkin',
  CHECKIN_RESULT: 'checkinResult',
  RADIO: 'radio',
  UPLOAD: 'upload',
  HONORS: 'honors',
  RANK: 'rank',
  MINE: 'mine',
  POSTER: 'poster',
}

const DEBUG_RESET_CONFIRM_TOKEN = 'RESET_LONG_MARCH_2026'
const DEBUG_RESET_ALL_CONFIRM_TEXT = '重置全部'
const RADIO_STAGE_WIDTH = 750
const RADIO_STAGE_HEIGHT = 1448
const IVX_STAGE_WIDTH = 750
const IVX_STAGE_HEIGHT = 1448
const POSTER_STAGE_WIDTH = 750
const POSTER_STAGE_HEIGHT = 1448
const RADIO_RECORDING_QUERY = 'radio_recording_id'
const INVITER_QUERY = 'inviter'
const CHECKIN_POSTER_LOCATION_ALIASES = [
  ['jiujianlou', 'jiujian', 'nine-room', '九间楼', '盘县会议会址', '会议会址'],
  ['beimen', 'north_gate', 'north-gate', '北门', '城楼', '镇远楼'],
  ['square', 'plaza', 'guangchang', '红军广场', '红色广场', '广场'],
  ['martyrs', 'lieshi', '陵园', '烈士陵园', '烈士'],
]
const MODAL_FRAME_SPECS = {
  rules: { width: 685, height: 958 },
  profile: { width: 686, height: 794 },
}
const NOTICE_PANEL_SPEC = { width: 685, height: 584 }
const LONG_MARCH_RANK_TEST_ROWS = Array.from({ length: 50 }, (_, index) => {
  const rank = index + 1
  return {
    id: `long-march-rank-test-${rank}`,
    rank,
    name: `昵称${String(rank).padStart(2, '0')}`,
    nickname: `昵称${String(rank).padStart(2, '0')}`,
    avatar: '',
    totalPoints: Math.max(9999 - index * 137, 120),
    titleBadge: rank <= 3 ? '红色先锋' : '长征之星',
  }
})

function getWx() {
  return typeof window !== 'undefined' ? window.wx : null
}

function useStageFit(baseWidth = 750, baseHeight = 1448) {
  const resolve = useCallback(() => {
    if (typeof window === 'undefined') {
      return { scaleX: 1, scaleY: 1, width: baseWidth, height: baseHeight }
    }
    const width = Math.min(window.innerWidth, baseWidth)
    const scale = width / baseWidth
    return {
      scaleX: scale,
      scaleY: scale,
      width,
      height: baseHeight * scale,
    }
  }, [baseHeight, baseWidth])
  const [stageFit, setStageFit] = useState(() => resolve())

  useEffect(() => {
    const update = () => setStageFit(resolve())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [resolve])

  return stageFit
}

function useModalFit(spec, viewportPadding = 32) {
  const resolve = useCallback(() => {
    if (!spec || typeof window === 'undefined') return { scale: 1, width: spec?.width || 0, height: spec?.height || 0 }
    const viewportWidth = window.innerWidth || spec.width
    const scale = Math.min((viewportWidth - viewportPadding) / spec.width, 1)
    const safeScale = Math.max(scale, 0.1)
    return {
      scale: safeScale,
      width: spec.width * safeScale,
      height: spec.height * safeScale,
    }
  }, [spec, viewportPadding])
  const [fit, setFit] = useState(() => resolve())

  useEffect(() => {
    const update = () => setFit(resolve())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [resolve])

  return fit
}

function IvxStage({ title, className = '', background, onBack, children }) {
  const { scaleX, width, height } = useStageFit(IVX_STAGE_WIDTH, IVX_STAGE_HEIGHT)
  return (
    <div className="lm-ivx-viewport" style={{ width, height }}>
      <section
        className={`lm-ivx-stage ${className}`}
        style={{
          backgroundImage: background ? `url(${background})` : undefined,
          transform: `scale(${scaleX})`,
          '--lm-ivx-ui-scale': scaleX ? 1 / scaleX : 1,
        }}
      >
        {onBack ? (
          <button className="lm-ivx-back" type="button" onClick={onBack} aria-label="返回">
            <img src={longMarchStudyAssets.shared.backIcon} alt="" />
          </button>
        ) : null}
        {title ? <div className="lm-ivx-title">{title}</div> : null}
        {children}
      </section>
    </div>
  )
}

function loadPosterImage(src, { verifyCanvas = false } = {}) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('missing image source'))
      return
    }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.referrerPolicy = 'no-referrer'
    image.onload = () => {
      if (verifyCanvas) {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = 1
          canvas.height = 1
          canvas.getContext('2d').drawImage(image, 0, 0, 1, 1)
          canvas.toDataURL('image/png')
        } catch (error) {
          reject(error)
          return
        }
      }
      resolve(image)
    }
    image.onerror = () => reject(new Error(`image load failed: ${src}`))
    image.src = src
  })
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('截图读取失败'))
    reader.readAsDataURL(file)
  })
}

async function readUploadImageDataUrl(file) {
  const originalDataUrl = await readFileAsDataUrl(file)
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const maxSide = 1440
      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height
      if (!width || !height) {
        resolve(originalDataUrl)
        return
      }
      const scale = Math.min(1, maxSide / width, maxSide / height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const context = canvas.getContext('2d')
      if (!context) {
        resolve(originalDataUrl)
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const compressed = canvas.toDataURL('image/jpeg', 0.82)
      resolve(compressed.length < originalDataUrl.length ? compressed : originalDataUrl)
    }
    image.onerror = () => resolve(originalDataUrl)
    image.src = originalDataUrl
  })
}

function normalizeLocationText(value) {
  return String(value || '').toLowerCase().replace(/[\s_－—-]+/g, '')
}

function getCheckinPosterImage(location, fallbackIndex = 0) {
  const posters = longMarchStudyAssets.checkinPoster.locations
  const text = normalizeLocationText(`${location?.key || ''}${location?.title || ''}${location?.name || ''}${location?.locationTitle || ''}`)
  const matchedIndex = CHECKIN_POSTER_LOCATION_ALIASES.findIndex((aliases) =>
    aliases.some((alias) => text.includes(normalizeLocationText(alias))),
  )
  return posters[matchedIndex >= 0 ? matchedIndex : fallbackIndex % posters.length] || posters[0]
}

function drawTextFit(ctx, text, x, y, width, fontSize, options = {}) {
  const value = String(text || '')
  const minSize = options.minSize || 18
  let size = fontSize
  do {
    ctx.font = `${options.weight || 400} ${size}px ${options.family || 'Arial, sans-serif'}`
    if (ctx.measureText(value).width <= width || size <= minSize) break
    size -= 1
  } while (size > minSize)
  ctx.fillStyle = options.color || '#fff'
  ctx.textAlign = options.align || 'center'
  ctx.textBaseline = options.baseline || 'middle'
  const textX = options.align === 'left' ? x : options.align === 'right' ? x + width : x + width / 2
  ctx.fillText(value, textX, y)
}

function drawAvatarPlaceholder(ctx, x, y, size) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = '#f7efe2'
  ctx.fill()
  ctx.clip()
  ctx.fillStyle = '#d7b27a'
  ctx.beginPath()
  ctx.arc(x + size / 2, y + 32, 18, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + size / 2, y + 83, 42, Math.PI, 0)
  ctx.fill()
  ctx.restore()
}

export default function LongMarchStudyApp({ routeParams }) {
  const activityKey = routeParams?.activityKey || LONG_MARCH_STUDY_ACTIVITY_KEY
  const visitorId = useMemo(() => getVisitorId(), [])
  const debugEnabled = useMemo(() => ['1', 'mobile'].includes(getQueryParam('debug')), [])
  const initialRadioRecordingId = useMemo(() => getQueryParam(RADIO_RECORDING_QUERY) || '', [])
  const inviterCode = useMemo(() => getQueryParam(INVITER_QUERY) || '', [])
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [page, setPage] = useState(PAGE.HOME)
  const [deepLinkRecordingId, setDeepLinkRecordingId] = useState(initialRadioRecordingId)
  const [showProfile, setShowProfile] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [mineFlowModal, setMineFlowModal] = useState('')
  const [poster, setPoster] = useState(null)
  const [posterReturnPage, setPosterReturnPage] = useState(PAGE.MINE)
  const [toast, setToast] = useState('')
  const [radioNotice, setRadioNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [quizState, setQuizState] = useState(null)
  const [quizResult, setQuizResult] = useState(null)
  const [checkinResult, setCheckinResult] = useState(null)
  const [mine, setMine] = useState(null)
  const [shareStatus, setShareStatus] = useState({})

  useEffect(() => {
    if (window.location.pathname.startsWith('/long-march-study/')) {
      const canonicalPath = `/long_march_study/${encodeURIComponent(activityKey)}`
      window.history.replaceState(
        null,
        '',
        `${canonicalPath}${window.location.search}${window.location.hash}`,
      )
    }
  }, [activityKey])

  useEffect(() => {
    const token = getTokenFromUrl()
    if (token) setToken(token)
  }, [])

  useEffect(() => {
    if (getQueryParam('debug') === '1' || getQueryParam('debug') === 'mobile') {
      enableMobileDebug()
    }
  }, [])

  useEffect(() => {
    getPublicConfig(activityKey)
      .then(setPublicConfig)
      .catch((error) => setToast(error.message || '活动配置加载失败'))
  }, [activityKey])

  const { authReady, blockedMessage } = useWechatAuth(activityKey, publicConfig)

  const refresh = useCallback(async () => {
    if (!authReady) return
    setLoading(true)
    try {
      const data = await getBootstrap(activityKey, visitorId, { debugContinuousCheckin: debugEnabled })
      setBootstrap(data)
    } catch (error) {
      setToast(error.message || '活动加载失败')
    } finally {
      setLoading(false)
    }
  }, [activityKey, authReady, debugEnabled, visitorId])

  useEffect(() => {
    const timer = window.setTimeout(() => refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    if (!bootstrap || !deepLinkRecordingId) return
    const timer = window.setTimeout(() => setPage(PAGE.RADIO), 0)
    return () => window.clearTimeout(timer)
  }, [bootstrap, deepLinkRecordingId])

  useEffect(() => {
    trackPageView(activityKey, '/long-march-study', { pageKey: page })
  }, [activityKey, page])

  const config = bootstrap?.config || {}
  const profile = bootstrap?.profile

  const buildActivityShareUrl = useCallback((input = {}) => {
    if (typeof window === 'undefined') return ''
    const options = typeof input === 'string' ? { memberCode: input } : input
    const memberCode = options.memberCode ?? profile?.memberCode
    const url = new URL(window.location.href)
    url.pathname = `/long_march_study/${encodeURIComponent(activityKey)}`
    url.hash = ''
    url.searchParams.delete('token')
    url.searchParams.delete('code')
    url.searchParams.delete('state')
    url.searchParams.delete(RADIO_RECORDING_QUERY)
    url.searchParams.set('share', '1')
    if (memberCode) url.searchParams.set(INVITER_QUERY, memberCode)
    if (options.source) url.searchParams.set('share_source', options.source)
    if (options.locationKey) url.searchParams.set('share_location', options.locationKey)
    return url.toString()
  }, [activityKey, profile?.memberCode])

  const shareActivity = useMemo(() => {
    const activity = bootstrap?.activity || publicConfig || {}
    return {
      ...activity,
      shareTitle: activity.shareTitle || '重走长征路 共筑爱国魂',
      shareDesc: activity.shareDesc || '完成红色任务，赢取积分与荣誉',
      shareImage: activity.shareImage,
      shareLink: buildActivityShareUrl(),
    }
  }, [bootstrap, buildActivityShareUrl, publicConfig])
  const handleWechatShareStatus = useCallback((nextStatus) => {
    setShareStatus((current) => ({ ...current, ...nextStatus }))
  }, [])
  useWechatShare(activityKey, shareActivity, handleWechatShareStatus)

  const bgm = config.bgm || { enabled: false }

  const clearRuntimeState = useCallback(() => {
    setPage(PAGE.HOME)
    setDeepLinkRecordingId('')
    setShowProfile(false)
    setShowTasks(false)
    setShowRules(false)
    setPoster(null)
    setPosterReturnPage(PAGE.MINE)
    setRadioNotice('')
    setQuizState(null)
    setQuizResult(null)
    setCheckinResult(null)
    setMine(null)
  }, [])

  const clearRadioRecordingDeepLink = useCallback(() => {
    setDeepLinkRecordingId('')
    const url = new URL(window.location.href)
    url.searchParams.delete(RADIO_RECORDING_QUERY)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  const openJourney = () => {
    if (!profile) {
      setShowProfile(true)
      return
    }
    setShowTasks(true)
  }

  const openMine = async () => {
    if (!profile) {
      setShowProfile(true)
      return
    }
    try {
      const data = await getMine(activityKey, visitorId)
      setMine(data)
      setPage(PAGE.MINE)
    } catch (error) {
      setToast(error.message || '我的信息加载失败')
    }
  }

  const openRank = async () => {
    try {
      const data = await getRank(activityKey, visitorId)
      setBootstrap((current) => ({ ...current, rank: data }))
      setPage(PAGE.RANK)
    } catch (error) {
      setToast(error.message || '排行榜加载失败')
    }
  }

  const openHonors = async () => {
    if (!profile) {
      setShowProfile(true)
      return
    }
    try {
      const data = await getMine(activityKey, visitorId)
      setMine(data)
      setPage(PAGE.HONORS)
    } catch (error) {
      setToast(error.message || '我的海报加载失败')
    }
  }

  const showPoster = async (input = {}) => {
    const options = typeof input === 'string' ? { source: input } : input
    if (!profile && !mine?.profile) {
      setShowProfile(true)
      return
    }
    let currentMine = mine
    if (!currentMine) {
      try {
        currentMine = await getMine(activityKey, visitorId)
        setMine(currentMine)
      } catch {
        currentMine = null
      }
    }
    const honorSnapshot = options.honor?.snapshot || {}
    const currentProfile = currentMine?.profile || bootstrap?.profile || profile || honorSnapshot
    const currentWechat = currentMine?.wechat || {}
    const checkins = currentMine?.checkins || []
    const selectedCheckin = options.checkin
      || (options.locationKey ? checkins.find((item) => item.locationKey === options.locationKey) : null)
      || checkinResult?.checkin
      || checkins[0]
      || null
    if (!selectedCheckin && !['honor', 'share'].includes(options.source)) {
      setToast('完成打卡后可查看海报')
      return
    }
    const snapshot = {
      name: currentProfile?.name || honorSnapshot.name || '',
      nickname: currentWechat?.nickname || honorSnapshot.nickname || currentProfile?.name || '',
      avatar: currentWechat?.avatar || honorSnapshot.avatar || '',
      challengeDays: currentProfile?.challengeDays ?? honorSnapshot.challengeDays ?? 0,
      totalPoints: currentProfile?.totalPoints ?? honorSnapshot.totalPoints ?? 0,
      honorTitle: options.honor?.title || honorSnapshot.honorTitle || '',
      locationKey: selectedCheckin?.locationKey || honorSnapshot.locationKey || '',
      locationTitle: selectedCheckin?.locationTitle || honorSnapshot.locationTitle || '',
      source: options.source || 'journey',
    }
    setPoster(snapshot)
    setPosterReturnPage(options.returnPage || (options.source === 'checkin' ? PAGE.CHECKIN_RESULT : ['honors', 'honor'].includes(options.source) ? PAGE.HONORS : PAGE.MINE))
    setPage(PAGE.POSTER)
  }

  const resetDebugScope = async (scope) => {
    try {
      await resetDebugData(activityKey, {
        visitorId,
        confirmToken: DEBUG_RESET_CONFIRM_TOKEN,
        scope,
      })
      clearRuntimeState()
      await refresh()
      setToast(scope === 'activity' ? '全部调试数据已重置' : '我的调试数据已重置')
    } catch (error) {
      setToast(error.message || '重置失败')
    }
  }

  const resetAllDebugData = async () => {
    const firstConfirmed = window.confirm('确认重置本活动全部用户数据？该操作会清空全部长征研学档案、积分、答题、打卡、录音、投票和荣誉。')
    if (!firstConfirmed) return
    const secondConfirmed = window.prompt(`二次确认：请输入“${DEBUG_RESET_ALL_CONFIRM_TEXT}”`)
    if (secondConfirmed !== DEBUG_RESET_ALL_CONFIRM_TEXT) {
      setToast('二次确认未通过')
      return
    }
    await resetDebugScope('activity')
  }

  if (blockedMessage) return <MessageScreen title={blockedMessage} />
  if (loading && !bootstrap) return <MessageScreen title="研学活动加载中" />

  return (
    <main className="lm-page">
      {page === PAGE.HOME ? (
        <HomePage
          onStart={openJourney}
          onRules={() => setShowRules(true)}
          onMine={openMine}
          onRank={openRank}
        />
      ) : null}
      {page === PAGE.QUIZ ? (
        <QuizPage
          activityKey={activityKey}
          visitorId={visitorId}
          quizState={quizState}
          setQuizState={setQuizState}
          onResult={(result) => {
            setQuizResult(result)
            setBootstrap((current) => ({ ...current, profile: result.profile }))
            setPage(PAGE.QUIZ_RESULT)
          }}
          onBack={() => setPage(PAGE.HOME)}
          onToast={setToast}
        />
      ) : null}
      {page === PAGE.QUIZ_RESULT ? (
        <QuizResultPage result={quizResult} onRank={() => setPage(PAGE.RANK)} onBack={() => setPage(PAGE.HOME)} />
      ) : null}
      {page === PAGE.CHECKIN ? (
        <CheckinPage
          config={config}
          nextCheckin={bootstrap?.nextCheckin}
          today={bootstrap?.today}
          debugContinuousCheckin={debugEnabled}
          onBack={() => setPage(PAGE.HOME)}
          onCheckin={async (location) => {
            try {
              const result = await checkinLocation(activityKey, location.key, {
                visitorId,
                debugContinuousCheckin: debugEnabled,
              })
              setCheckinResult(result)
              setBootstrap((current) => ({
                ...current,
                profile: result.profile,
                today: {
                  ...(current?.today || {}),
                  checkinDone: true,
                  checkin: result.checkin,
                },
                nextCheckin: result.nextCheckin,
              }))
              setPage(PAGE.CHECKIN_RESULT)
            } catch (error) {
              setToast(error.message || '打卡失败')
            }
          }}
        />
      ) : null}
      {page === PAGE.CHECKIN_RESULT ? (
        <CheckinResultPage
          result={checkinResult}
          profile={bootstrap?.profile}
          mine={mine}
          onPoster={() => showPoster('checkin')}
          onRank={() => setPage(PAGE.RANK)}
          onBack={() => setPage(PAGE.CHECKIN)}
        />
      ) : null}
      {page === PAGE.RADIO ? (
        <RadioPage
          activityKey={activityKey}
          visitorId={visitorId}
          config={config}
          recordings={bootstrap?.recordings}
          onUpload={() => {
            if (bootstrap?.today?.recordingSubmitted) {
              setRadioNotice('今日录音已提交')
              return
            }
            setPage(PAGE.UPLOAD)
          }}
          initialRecordingId={deepLinkRecordingId}
          isSharedRecording={Boolean(deepLinkRecordingId)}
          onSharedHome={() => {
            clearRadioRecordingDeepLink()
            setPage(PAGE.HOME)
          }}
          onBack={() => {
            clearRadioRecordingDeepLink()
            setPage(PAGE.HOME)
          }}
          onVote={async (recording) => {
            try {
              const data = await voteRecording(activityKey, recording.id, { visitorId })
              setToast('已送出红星')
              setBootstrap((current) => ({
                ...current,
                recordings: {
                  ...current.recordings,
                  myVoteRecordingId: data.vote.recordingId,
                  all: current.recordings.all.map((item) => item.id === data.recording.id ? data.recording : item),
                  featured: current.recordings.featured.map((item) => item.id === data.recording.id ? data.recording : item),
                },
              }))
            } catch (error) {
              setToast(error.message || '投票失败')
            }
          }}
        />
      ) : null}
      {page === PAGE.UPLOAD ? (
        <UploadPage
          activityKey={activityKey}
          visitorId={visitorId}
          scripts={config.radioScripts || []}
          wechatConfigStatus={shareStatus.wxConfigStatus}
          onDone={async () => {
            await refresh()
            setPage(PAGE.RADIO)
          }}
          onBack={() => setPage(PAGE.RADIO)}
          onToast={setToast}
        />
      ) : null}
      {page === PAGE.HONORS ? (
        <HonorsPage
          honors={mine?.honors || bootstrap?.honors || []}
          checkins={mine?.checkins || []}
          locations={config.locations || []}
          onBack={() => setPage(PAGE.HOME)}
          onGenerate={async () => {
            await showPoster({ source: 'honors' })
          }}
          onOpen={(honor) => showPoster({ source: 'honor', honor })}
          onOpenCheckin={(checkin) => showPoster({ source: 'honors', checkin })}
        />
      ) : null}
      {page === PAGE.RANK ? <RankPage rank={bootstrap?.rank} onBack={() => setPage(PAGE.HOME)} /> : null}
      {page === PAGE.MINE ? (
        <MinePage
          mine={mine}
          activityUrl={buildActivityShareUrl()}
          activityKey={activityKey}
          visitorId={visitorId}
          shareScreenshot={bootstrap?.today?.shareScreenshot}
          onScreenshotSubmitted={async (screenshot) => {
            setBootstrap((current) => ({
              ...current,
              today: {
                ...(current?.today || {}),
                shareScreenshot: screenshot,
              },
            }))
            try {
              const data = await getMine(activityKey, visitorId)
              setMine(data)
            } catch {
              // keep mine page available even if mine refresh fails
            }
          }}
          onToast={setToast}
          onFlow={setMineFlowModal}
          onHonors={openHonors}
          onRank={openRank}
          onBack={() => setPage(PAGE.HOME)}
        />
      ) : null}
      {page === PAGE.POSTER ? (
        <PosterPage
          poster={poster}
          locations={config.locations || []}
          activityUrl={buildActivityShareUrl({
            source: poster?.source || 'poster',
            locationKey: poster?.locationKey,
          })}
          onBack={() => setPage(posterReturnPage)}
        />
      ) : null}

      {showProfile ? (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          onSubmit={async (payload) => {
            try {
              const data = await saveProfile(activityKey, { ...payload, visitorId, inviterCode })
              setBootstrap((current) => ({ ...current, profile: data.profile }))
              setShowProfile(false)
              setShowTasks(true)
            } catch (error) {
              setToast(error.message || '资料提交失败')
            }
          }}
        />
      ) : null}
      {showTasks ? (
        <TaskModal
          onClose={() => setShowTasks(false)}
          onSelect={async (nextPage) => {
            setShowTasks(false)
            if (nextPage === PAGE.QUIZ) setQuizState(null)
            if (nextPage === 'sharePoster') {
              await showPoster({ source: 'share', returnPage: PAGE.HOME })
              return
            }
            if (nextPage === PAGE.HONORS) {
              await openHonors()
              return
            }
            setPage(nextPage)
          }}
        />
      ) : null}
      {showRules ? <RulesModal rules={config.rules || []} onClose={() => setShowRules(false)} /> : null}
      {mineFlowModal ? <MineFlowModal type={mineFlowModal} mine={mine} onClose={() => setMineFlowModal('')} /> : null}
      {toast ? <Toast text={toast} onClose={() => setToast('')} /> : null}
      <RadioNoticeModal message={radioNotice} onClose={() => setRadioNotice('')} />
      {debugEnabled ? (
        <DebugPanel
          activityKey={activityKey}
          page={page}
          visitorId={visitorId}
          identityKey={bootstrap?.identityKey}
          profile={profile}
          authReady={authReady}
          shareStatus={shareStatus}
          onResetMine={() => resetDebugScope('me')}
          onResetAll={resetAllDebugData}
          onLogState={() => console.log('[long-march-study debug state]', {
            activityKey,
            visitorId,
            page,
            bootstrap,
            profile,
            shareStatus,
          })}
        />
      ) : null}
      <ActivityBgmPlayer bgm={bgm} activityKey={activityKey} />
    </main>
  )
}

function DebugPanel({
  activityKey,
  page,
  visitorId,
  identityKey,
  profile,
  authReady,
  shareStatus,
  onResetMine,
  onResetAll,
  onLogState,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const shareLabel = shareStatus.shareConfigured
    ? '已配置'
    : shareStatus.wxConfigStatus === 'failed'
      ? '配置失败'
      : '初始化中'
  const userLabel = profile ? `已记录：${profile.name}` : '未提交资料'

  return (
    <div className={`lm-debug-panel ${collapsed ? 'is-collapsed' : ''}`}>
      <button className="lm-debug-header" type="button" onClick={() => setCollapsed((current) => !current)}>
        <span className="lm-debug-title">DEBUG</span>
        <span className="lm-debug-summary">{page} · {shareLabel}</span>
        <span className="lm-debug-toggle">{collapsed ? '展开' : '收起'}</span>
      </button>
      {!collapsed ? (
        <>
          <div className="lm-debug-meta">
            <div>activityKey: {activityKey}</div>
            <div>page: {page}</div>
            <div>visitorId: {visitorId}</div>
            <div>identity: {identityKey || '-'}</div>
            <div>用户记录: {userLabel}</div>
            <div>微信授权: {authReady ? 'ready' : 'pending'}</div>
            <div>微信分享: {shareLabel}</div>
            <div>shareTitle: {shareStatus.shareTitle || '-'}</div>
          </div>
          <div className="lm-debug-actions">
            <button type="button" onClick={onResetMine}>重置我的数据</button>
            <button className="is-danger" type="button" onClick={onResetAll}>重置全部数据</button>
            <button className="is-dark" type="button" onClick={onLogState}>console.log 状态</button>
          </div>
        </>
      ) : null}
    </div>
  )
}

function HomePage({ onStart, onRules, onMine, onRank }) {
  return (
    <section
      className="lm-home"
      style={{ backgroundImage: `url(${longMarchStudyAssets.home.background})` }}
    >
      <img className="lm-home-title-image" src={longMarchStudyAssets.home.title} alt="重走长征路 共筑爱国魂" />
      <div className="lm-home-side-actions" aria-label="首页快捷入口">
        <button type="button" onClick={onRules} aria-label="活动规则">
          <img src={longMarchStudyAssets.home.rulesButton} alt="" />
        </button>
        <button type="button" onClick={onMine} aria-label="我的">
          <img src={longMarchStudyAssets.home.mineButton} alt="" />
        </button>
        <button type="button" onClick={onRank} aria-label="排行榜">
          <img src={longMarchStudyAssets.home.rankButton} alt="" />
        </button>
      </div>
      <button className="lm-home-start" type="button" onClick={onStart} aria-label="开启研学之旅">
        <img src={longMarchStudyAssets.home.startButton} alt="" />
      </button>
    </section>
  )
}

function ProfileModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  return (
    <Modal title="填写研学信息" onClose={onClose} variant="profile">
      <div className="lm-profile-form">
        <label className="lm-field">
          <span className="lm-field-label">姓名</span>
          <input placeholder="姓名（必填）" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="lm-field">
          <span className="lm-field-label">电话</span>
          <input placeholder="电话（必填）" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" />
        </label>
      </div>
      <button className="lm-profile-submit" type="button" onClick={() => onSubmit({ name, phone })}>提&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;交</button>
    </Modal>
  )
}

function TaskModal({ onClose, onSelect }) {
  const tasks = longMarchStudyAssets.tasks
  return (
    <div className="lm-task-choice-mask">
      <section className="lm-task-choice" aria-label="玩法选择">
        <img className="lm-task-choice-bg" src={tasks.background} alt="" />
        <button className="lm-task-choice-back" type="button" onClick={onClose} aria-label="返回">
          <img src={longMarchStudyAssets.shared.backIcon} alt="" />
        </button>
        <img className="lm-task-choice-title" src={tasks.title} alt="玩法选择" />
        <img className="lm-task-choice-route" src={tasks.route} alt="" />
        <button className="lm-task-choice-card is-quiz" type="button" onClick={() => onSelect(PAGE.QUIZ)} aria-label="每日红色答题">
          <img src={tasks.quiz} alt="" />
        </button>
        <button className="lm-task-choice-card is-checkin" type="button" onClick={() => onSelect(PAGE.CHECKIN)} aria-label="云上打卡·红色足迹">
          <img src={tasks.checkin} alt="" />
        </button>
        <button className="lm-task-choice-card is-radio" type="button" onClick={() => onSelect(PAGE.RADIO)} aria-label="云上红色电台">
          <img src={tasks.radio} alt="" />
        </button>
        <button className="lm-task-choice-card is-honors" type="button" onClick={() => onSelect('sharePoster')} aria-label="分享传播">
          <img src={tasks.honors} alt="" />
        </button>
      </section>
    </div>
  )
}

function QuizPage({ activityKey, visitorId, quizState, setQuizState, onResult, onBack, onToast }) {
  const [index, setIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const questions = quizState?.questions || []
  const question = questions[index]
  const questionCount = questions.length || 5
  const progressPercent = `${Math.min(index + 1, questionCount) / questionCount * 100}%`

  useEffect(() => {
    if (quizState) return
    const timer = window.setTimeout(() => {
      setBusy(true)
      startQuiz(activityKey, { visitorId })
        .then((data) => setQuizState(data.attempt))
        .catch((error) => {
          onToast(error.message || '今日答题不可用')
        })
        .finally(() => setBusy(false))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activityKey, onToast, quizState, setQuizState, visitorId])

  const submitAnswer = async () => {
    if (!question || !selectedOptionId || submitting || feedback) return
    setSubmitting(true)
    try {
      const data = await answerQuiz(activityKey, quizState.id, {
        visitorId,
        questionId: question.id,
        selectedOptionId,
      })
      setQuizState(data.attempt)
      setFeedback(data.answer)
    } catch (error) {
      onToast(error.message || '提交答案失败')
    } finally {
      setSubmitting(false)
    }
  }

  const nextQuestion = async () => {
    setFeedback(null)
    setSelectedOptionId('')
    if (index + 1 >= questionCount) {
      const result = await finishQuiz(activityKey, quizState.id, { visitorId })
      onResult(result)
      return
    }
    setIndex(index + 1)
  }

  if (busy || !quizState || !question) {
    return (
      <section className="lm-quiz-page" style={{ backgroundImage: `url(${longMarchStudyAssets.quiz.background})` }}>
        <div className="lm-quiz-loading">题目加载中...</div>
      </section>
    )
  }

  return (
    <section className="lm-quiz-page" style={{ backgroundImage: `url(${longMarchStudyAssets.quiz.background})` }}>
      <div className="lm-quiz-stage">
        <button className="lm-quiz-back" type="button" onClick={onBack} aria-label="返回">
          <img src={longMarchStudyAssets.shared.backIcon} alt="" />
        </button>
        <h1 className="lm-quiz-title">每日红色答题</h1>
        <div className="lm-quiz-progress-text">
          <span>答题进度</span>
          <strong>{index + 1}</strong>
          <span>/{questionCount}</span>
        </div>
        <div className="lm-quiz-progress-bar"><span style={{ width: progressPercent }} /></div>
        <img className="lm-quiz-card-bg" src={longMarchStudyAssets.quiz.card} alt="" />
        <div className="lm-quiz-content">
          <div className="lm-quiz-tag">单选题</div>
          <h2 className="lm-quiz-question">{index + 1}、{question.title}</h2>
          <div className="lm-quiz-options">
            {question.options.map((option, optionIndex) => {
              const letter = String.fromCharCode(65 + optionIndex)
              const isSelected = selectedOptionId === option.id
              const isCorrect = feedback?.answerId === option.id
              const isWrongSelected = feedback && isSelected && !feedback.correct
              return (
                <button
                  key={option.id}
                  className={`lm-quiz-option ${isSelected ? 'is-selected' : ''} ${isCorrect ? 'is-correct' : ''} ${isWrongSelected ? 'is-wrong' : ''}`}
                  type="button"
                  disabled={Boolean(feedback) || submitting}
                  onClick={() => setSelectedOptionId(option.id)}
                >
                  {isWrongSelected ? <span className="lm-quiz-option-mark is-wrong">×</span> : null}
                  {isCorrect ? <span className="lm-quiz-option-mark is-correct">✓</span> : null}
                  <span>{letter}.{option.text}</span>
                </button>
              )
            })}
          </div>
          <button
            className="lm-quiz-submit"
            type="button"
            disabled={!selectedOptionId || submitting || Boolean(feedback)}
            onClick={submitAnswer}
          >
            提&nbsp;&nbsp;&nbsp;&nbsp;交
          </button>
        </div>
      </div>
      {feedback ? (
        <QuizFeedbackModal question={question} feedback={feedback} onNext={nextQuestion} />
      ) : null}
    </section>
  )
}

function QuizFeedbackModal({ question, feedback, onNext }) {
  const answerIndex = (question?.options || []).findIndex((option) => option.id === feedback?.answerId)
  const answerLetter = answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : (feedback?.answerId || '').toUpperCase()
  return (
    <div className="lm-quiz-modal-mask">
      <section className="lm-quiz-feedback-panel" style={{ backgroundImage: `url(${longMarchStudyAssets.quiz.feedbackPanel})` }}>
        <div className="lm-quiz-feedback-status">{feedback.correct ? '回答正确' : '回答错误'}</div>
        <div className="lm-quiz-feedback-answer">
          <span>正确答案：</span><strong>{answerLetter}</strong>
        </div>
        <div className="lm-quiz-analysis">
          <strong>知识解析卡：</strong>
          <p>{feedback.analysis}</p>
        </div>
        <button className="lm-quiz-feedback-next" type="button" onClick={onNext}>下一题</button>
      </section>
    </div>
  )
}

function QuizResultPage({ result, onRank, onBack }) {
  const data = result?.result
  return (
    <div className="lm-quiz-modal-mask">
      <section className="lm-quiz-success-panel" style={{ backgroundImage: `url(${longMarchStudyAssets.quiz.successPanel})` }}>
        <h2>闯关成功</h2>
        <img src={longMarchStudyAssets.quiz.successMedal} alt="" />
        <div className="lm-quiz-success-correct">
          <span>答对：</span>
          <strong>{data?.correctCount || 0}</strong>
          <span>题</span>
        </div>
        <div className="lm-quiz-success-label">获得</div>
        <div className="lm-quiz-success-points-box" />
        <div className="lm-quiz-success-points"><strong>{data?.pointsEarned || 0}</strong><span>积分</span></div>
        <button className="lm-quiz-result-rank" type="button" onClick={onRank}>排行榜</button>
        <button className="lm-quiz-result-back" type="button" onClick={onBack}>返回首页</button>
      </section>
    </div>
  )
}

function CheckinPage({ config, nextCheckin, today, debugContinuousCheckin = false, onCheckin, onBack }) {
  const [pendingCheckin, setPendingCheckin] = useState(null)
  const [checkinNotice, setCheckinNotice] = useState('')
  const locations = config.locations || []
  const assets = longMarchStudyAssets.checkin
  const visualLocations = [
    { className: 'is-one', asset: assets.locationOne, activeAsset: assets.locationOneActive, detail: assets.detailOne },
    { className: 'is-two', asset: assets.locationTwo, activeAsset: assets.locationTwoActive, detail: assets.detailTwo },
    { className: 'is-three', asset: assets.locationThree, activeAsset: assets.locationThreeActive, detail: assets.detailThree },
    { className: 'is-four', asset: assets.locationFour, activeAsset: assets.locationFourActive, detail: assets.detailFour },
  ].map((item, index) => ({ ...item, location: locations[index] })).filter((item) => item.location)
  const pendingVisual = pendingCheckin
    ? visualLocations.find((item) => item.location.key === pendingCheckin.location.key)
    : null
  const nextLocationIndex = visualLocations.findIndex((item) => item.location.key === nextCheckin?.key)
  const todayCheckinIndex = visualLocations.findIndex((item) => item.location.key === today?.checkin?.locationKey)
  const completedThroughIndex = nextLocationIndex >= 0 ? nextLocationIndex - 1 : todayCheckinIndex

  return (
    <IvxStage title="云上打卡" className="lm-checkin-page" onBack={onBack}>
      <img className="lm-checkin-bg" src={assets.background} alt="" />
      <img className="lm-checkin-silhouette" src={assets.silhouette} alt="" />
      {visualLocations.map(({ location, className, asset, activeAsset }, index) => {
        const isNext = nextCheckin?.key === location.key
        const isCompleted = completedThroughIndex >= 0 && index <= completedThroughIndex
        const canCheckin = isNext && !isCompleted && (!today?.checkinDone || debugContinuousCheckin)
        const isUnlocked = canCheckin || isCompleted
        const lockedNotice = (today?.checkinDone && !debugContinuousCheckin) || !nextCheckin ? '今日打卡已完成' : '请先解锁今日地标'
        return (
          <button
            key={location.key}
            className={`lm-checkin-location ${className} ${isNext ? 'is-next' : ''} ${isCompleted ? 'is-completed' : ''}`}
            type="button"
            onClick={() => canCheckin || isCompleted ? setPendingCheckin({ location, completed: isCompleted }) : setCheckinNotice(lockedNotice)}
            aria-label={`打卡${location.title}`}
          >
            <img className="lm-checkin-location-card" src={isUnlocked ? asset : activeAsset} alt="" />
            <span>{location.title}</span>
          </button>
        )
      })}
      <button className="lm-checkin-home-button" type="button" onClick={onBack} aria-label="返回首页">
        <img src={assets.homeButton} alt="" />
      </button>
      {pendingCheckin ? (
        <CheckinConfirmModal
          completed={pendingCheckin.completed}
          image={pendingVisual?.detail || assets.detailOne}
          onConfirm={() => {
            const location = pendingCheckin.location
            setPendingCheckin(null)
            if (pendingCheckin.completed) return
            onCheckin(location)
          }}
          onClose={() => setPendingCheckin(null)}
        />
      ) : null}
      {checkinNotice ? <CheckinDoneModal message={checkinNotice} onClose={() => setCheckinNotice('')} /> : null}
    </IvxStage>
  )
}

function CheckinConfirmModal({ completed, image, onConfirm, onClose }) {
  return (
    <div className="lm-checkin-modal-mask" onClick={onClose}>
      <section className="lm-checkin-confirm-modal" onClick={(event) => event.stopPropagation()}>
        <img src={image} alt="" />
        <button type="button" onClick={onConfirm}>{completed ? '返回' : '点击打卡'}</button>
      </section>
    </div>
  )
}

function CheckinDoneModal({ message = '今日打卡已完成', onClose }) {
  return (
    <div className="lm-checkin-modal-mask">
      <section className="lm-checkin-done-modal" style={{ backgroundImage: `url(${longMarchStudyAssets.quiz.dailyDonePanel})` }}>
        <p>{message}</p>
        <button type="button" onClick={onClose}>返回</button>
      </section>
    </div>
  )
}

function CheckinResultPage({ result, profile, mine, onPoster, onRank, onBack }) {
  const { scaleX, width, height } = useStageFit(750, 1624)
  const displayName = mine?.wechat?.nickname || result?.wechat?.nickname || result?.profile?.nickname || result?.profile?.name || profile?.name || '昵称'
  const avatar = mine?.wechat?.avatar || result?.wechat?.avatar || ''
  const points = result?.checkin?.pointsEarned ?? 0

  return (
    <div className="lm-checkin-success-viewport" style={{ width, height }}>
      <section
        className="lm-checkin-success-page"
        style={{
          transform: `scale(${scaleX})`,
        }}
      >
        <img className="lm-checkin-success-bg" src={longMarchStudyAssets.checkin.successBackground} alt="" />
        <div className="lm-checkin-success-wrap">
          <img className="lm-checkin-success-panel" src={longMarchStudyAssets.checkin.successPanel} alt="" />
          <div className="lm-checkin-success-title">打卡成功！</div>
          <div className="lm-checkin-success-avatar">
            {avatar ? <img src={avatar} alt="头像" /> : null}
          </div>
          <div className="lm-checkin-success-name">{displayName}</div>
          <div className="lm-checkin-success-earned">获得</div>
          <div className="lm-checkin-success-score">{points}</div>
          <div className="lm-checkin-success-unit">积分</div>
          <button className="lm-checkin-success-poster" type="button" onClick={onPoster}>领取海报</button>
          <button className="lm-checkin-success-rank" type="button" onClick={onRank}>排行榜</button>
          <button className="lm-checkin-success-back" type="button" onClick={onBack}>返回</button>
        </div>
      </section>
    </div>
  )
}

function RadioShell({ title = '云上红色电台', onBack, children }) {
  const { scaleX, width, height } = useStageFit(RADIO_STAGE_WIDTH, RADIO_STAGE_HEIGHT)
  return (
    <div className="lm-radio-viewport" style={{ width, height }}>
      <section
        className="lm-radio-page"
        style={{
          transform: `scale(${scaleX})`,
        }}
      >
        <img className="lm-radio-bg" src={longMarchStudyAssets.radio.background} alt="" />
        <button className="lm-radio-back" type="button" onClick={onBack} aria-label="返回">
          <img src={longMarchStudyAssets.shared.backIcon} alt="" />
        </button>
        <div className="lm-radio-title">{title}</div>
        {children}
      </section>
    </div>
  )
}

function RadioPage({
  activityKey,
  recordings,
  onUpload,
  onVote,
  onBack,
  initialRecordingId = '',
  isSharedRecording = false,
  onSharedHome,
}) {
  const [tab, setTab] = useState('featured')
  const [selectedRecordingId, setSelectedRecordingId] = useState(initialRecordingId)
  const [sharedRecordingState, setSharedRecordingState] = useState({ id: '', recording: null, failed: false })
  const rows = tab === 'featured' ? recordings?.featured || [] : recordings?.all || []
  const allRows = [...(recordings?.featured || []), ...(recordings?.all || [])]
  const selectedRecording = selectedRecordingId
    ? allRows.find((item) => item.id === selectedRecordingId)
      || (sharedRecordingState.id === selectedRecordingId ? sharedRecordingState.recording : null)
    : null
  const selectedFromShare = Boolean(isSharedRecording && selectedRecordingId && selectedRecordingId === initialRecordingId)
  const sharedLoading = Boolean(
    selectedFromShare &&
    selectedRecordingId &&
    !selectedRecording &&
    sharedRecordingState.id !== selectedRecordingId,
  )

  useEffect(() => {
    if (!selectedFromShare || !selectedRecordingId || selectedRecording) return undefined
    let cancelled = false
    getRecording(activityKey, selectedRecordingId)
      .then((result) => {
        if (!cancelled) {
          setSharedRecordingState({ id: selectedRecordingId, recording: result?.recording || null, failed: !result?.recording })
        }
      })
      .catch(() => {
        if (!cancelled) setSharedRecordingState({ id: selectedRecordingId, recording: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [activityKey, selectedFromShare, selectedRecording, selectedRecordingId])

  if (selectedRecording) {
    return (
      <RadioDetailPage
        recording={selectedRecording}
        isSharedEntry={selectedFromShare}
        myVote={recordings?.myVoteRecordingId}
        onVote={onVote}
        onBack={selectedFromShare ? onSharedHome : () => setSelectedRecordingId('')}
      />
    )
  }

  if (selectedFromShare && sharedLoading) {
    return <RadioShell onBack={onSharedHome}><div className="lm-radio-empty">录音加载中</div></RadioShell>
  }

  return (
    <RadioShell onBack={onBack}>
      <div className="lm-radio-panel">
        <div className="lm-radio-tabs">
          <button className={tab === 'featured' ? 'is-active' : ''} type="button" onClick={() => setTab('featured')}>精选板块</button>
          <button className={tab === 'all' ? 'is-active' : ''} type="button" onClick={() => setTab('all')}>全部录音</button>
        </div>
        <RecordingList
          rows={rows}
          myVote={recordings?.myVoteRecordingId}
          onOpen={(recording) => setSelectedRecordingId(recording.id)}
          onVote={onVote}
        />
      </div>
      <button className="lm-radio-bottom-button" type="button" onClick={onUpload}>点击参赛</button>
    </RadioShell>
  )
}

function useUrlAudioPlayer() {
  const audioRef = useRef(null)
  const [playingId, setPlayingId] = useState('')
  const [progress, setProgress] = useState({ id: '', currentTime: 0, duration: 0 })

  useEffect(() => {
    const audio = new Audio()
    const updateProgress = () => {
      setProgress((current) => ({
        id: current.id,
        currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        duration: Number.isFinite(audio.duration) ? audio.duration : current.duration,
      }))
    }
    const clearPlaying = () => {
      updateProgress()
      setPlayingId('')
    }
    audioRef.current = audio
    audio.addEventListener('ended', clearPlaying)
    audio.addEventListener('error', clearPlaying)
    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('loadedmetadata', updateProgress)
    return () => {
      audio.pause()
      audio.removeEventListener('ended', clearPlaying)
      audio.removeEventListener('error', clearPlaying)
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('loadedmetadata', updateProgress)
      audioRef.current = null
    }
  }, [])

  const toggleAudio = useCallback(async (recording, onMissing) => {
    if (!recording?.audioUrl) {
      onMissing?.()
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (playingId === recording.id && !audio.paused) {
      audio.pause()
      setPlayingId('')
      return
    }
    audio.pause()
    audio.src = recording.audioUrl
    audio.currentTime = 0
    setProgress({ id: recording.id, currentTime: 0, duration: recording.durationSec || 0 })
    try {
      await audio.play()
      setPlayingId(recording.id)
    } catch {
      setPlayingId('')
      onMissing?.('音频播放失败')
    }
  }, [playingId])

  return { playingId, progress, toggleAudio }
}

function RecordingList({ rows, myVote, onOpen, onVote }) {
  const { playingId, toggleAudio } = useUrlAudioPlayer()

  if (!rows.length) {
    return <div className="lm-radio-empty">暂无审核通过的录音</div>
  }
  return (
    <div className="lm-radio-recordings">
      {rows.map((recording, index) => (
        <article
          className="lm-radio-row"
          key={recording.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(recording)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpen(recording)
            }
          }}
        >
          <div className="lm-radio-row-rank">
            <img src={longMarchStudyAssets.radio.rankBadge} alt="" />
            <span>{String(index + 1).padStart(2, '0')}</span>
          </div>
          <button
            className="lm-radio-row-play"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              toggleAudio(recording)
            }}
            aria-label={playingId === recording.id ? '暂停音频' : '播放音频'}
          >
            <img src={playingId === recording.id ? longMarchStudyAssets.radio.pause : longMarchStudyAssets.radio.play} alt="" />
          </button>
          {recording.avatar ? (
            <img className="lm-radio-row-avatar" src={recording.avatar} alt="头像" />
          ) : (
            <div className="lm-radio-row-avatar lm-avatar-placeholder" aria-hidden="true" />
          )}
          <div className="lm-radio-row-main">
            <strong>{recording.authorName || recording.title || '昵称'}</strong>
            <small>{recording.audioUrl ? recording.title || '点击查看录音详情' : recording.mediaId ? '微信录音待同步' : '录音审核中'}</small>
          </div>
          <div className="lm-radio-row-votes">
            <span aria-hidden="true" />
            <em>{recording.voteCount || 0}</em>
          </div>
          <button
            className="lm-radio-row-vote"
            type="button"
            disabled={Boolean(myVote)}
            onClick={(event) => {
              event.stopPropagation()
              onVote(recording)
            }}
          >
            {myVote === recording.id ? '已送出' : '送红星'}
          </button>
        </article>
      ))}
    </div>
  )
}

function RadioDetailPage({ recording, isSharedEntry, myVote, onVote, onBack }) {
  const { playingId, progress, toggleAudio } = useUrlAudioPlayer()
  const isPlaying = playingId === recording.id
  const duration = progress.id === recording.id ? progress.duration : recording.durationSec || 0
  const currentTime = progress.id === recording.id ? progress.currentTime : 0
  const progressPercent = duration > 0 ? `${Math.min(100, Math.max(0, currentTime / duration * 100))}%` : '0%'
  const authorName = recording.authorName || '昵称'
  const requestText = '我正在参与云上红色电台活动\n请为我点亮红星'

  return (
    <RadioShell title="云上红色电台" onBack={onBack}>
      <section className="lm-radio-detail-panel">
        <h2>我的参赛作品</h2>
        <article className="lm-radio-detail-card">
          {recording.avatar ? <img className="lm-radio-detail-avatar" src={recording.avatar} alt="头像" /> : <div className="lm-radio-detail-avatar lm-avatar-placeholder" />}
          <div className="lm-radio-detail-name">{authorName}</div>
          <button
            className="lm-radio-detail-play"
            type="button"
            onClick={() => toggleAudio(recording)}
            aria-label={isPlaying ? '暂停音频' : '播放音频'}
          >
            <img src={isPlaying ? longMarchStudyAssets.radio.pause : longMarchStudyAssets.radio.play} alt="" />
          </button>
          <div className="lm-radio-detail-copy">{requestText}</div>
          <div className="lm-radio-detail-progress">
            <span style={{ width: progressPercent }} />
          </div>
          <div className="lm-radio-detail-stars">
            <span aria-hidden="true" />
            <em>{recording.voteCount || 0}</em>
          </div>
          <button
            className="lm-radio-detail-share"
            type="button"
            disabled={Boolean(myVote)}
            onClick={() => onVote(recording)}
          >
            {myVote === recording.id ? '已送出' : '送红星'}
          </button>
        </article>
      </section>
      <button className="lm-radio-detail-bottom" type="button" onClick={onBack}>
        {isSharedEntry ? '前往活动首页' : '返回'}
      </button>
    </RadioShell>
  )
}

function RadioNoticeFrame({ children, className = '', ariaLabel = '提示' }) {
  const modalFit = useModalFit(NOTICE_PANEL_SPEC, 16)
  const content = (
    <div className="lm-radio-notice-mask" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div className="lm-radio-notice-frame" style={{ width: modalFit.width, height: modalFit.height }}>
        <section
          className={`lm-radio-notice-panel ${className}`.trim()}
          style={{
            backgroundImage: `url(${longMarchStudyAssets.radio.noticePanel})`,
            transform: `scale(${modalFit.scale})`,
          }}
        >
          {children}
        </section>
      </div>
    </div>
  )
  return typeof document === 'undefined' ? content : createPortal(content, document.body)
}

function RadioNoticeModal({ message, onClose }) {
  if (!message) return null
  return (
    <RadioNoticeFrame>
      <p>{message}</p>
      <button className="lm-radio-notice-image-button" type="button" onClick={onClose} aria-label="返回首页">
        <img src={longMarchStudyAssets.radio.noticeButton} alt="" />
      </button>
    </RadioNoticeFrame>
  )
}

function formatWxError(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error.errMsg) return error.errMsg
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function UploadPage({ activityKey, visitorId, scripts, wechatConfigStatus, onDone, onBack, onToast }) {
  const [recording, setRecording] = useState(false)
  const [localId, setLocalId] = useState('')
  const [mediaId, setMediaId] = useState('')
  const [recordDurationSec, setRecordDurationSec] = useState(0)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')
  const startedAtRef = useRef(0)
  const activeScript = scripts[0]
  const hasRecording = Boolean(localId || mediaId)

  useEffect(() => {
    const wx = getWx()
    if (wx?.onVoicePlayEnd) {
      wx.onVoicePlayEnd({
        success: (res) => {
          if (!res?.localId || res.localId === localId) {
            setPreviewPlaying(false)
          }
        },
      })
    }
    if (wx?.onVoiceRecordEnd) {
      wx.onVoiceRecordEnd({
        complete: (res) => {
          if (res?.localId) {
            setLocalId(res.localId)
            setRecordDurationSec(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))
            setRecording(false)
          }
        },
      })
    }
    return undefined
  }, [localId])

  const start = () => {
    if (recording) return
    const wx = getWx()
    if (isWechatBrowser() && (!wx?.startRecord || wechatConfigStatus !== 'success')) {
      onToast(wechatConfigStatus === 'failed' ? '微信录音初始化失败，请刷新页面后重试' : '微信录音初始化中，请稍后再试')
      return
    }
    startedAtRef.current = Date.now()
    setLocalId('')
    setMediaId('')
    setRecordDurationSec(0)
    setPreviewPlaying(false)
    if (wx?.startRecord) {
      wx.startRecord({
        success: () => {
          setRecording(true)
          onToast('录音已开始')
        },
        cancel: () => {
          onToast('用户拒绝录音授权')
        },
        fail: (error) => {
          const message = formatWxError(error) || '开始录音失败'
          onToast(message)
        },
      })
      return
    }
    setLocalId(`debug-local-${Date.now()}`)
    setRecording(true)
    onToast('当前非微信环境，已进入调试录音模式')
  }

  const stop = () => {
    if (!recording) return
    const wx = getWx()
    const nextDuration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
    if (wx?.stopRecord) {
      wx.stopRecord({
        success: (res) => {
          setLocalId(res.localId)
          setRecordDurationSec(nextDuration)
          setRecording(false)
          onToast(res.localId ? '录音已完成' : '录音结束但未获取到音频')
        },
        fail: (error) => {
          const message = formatWxError(error) || '停止录音失败'
          setRecording(false)
          onToast(message)
        },
      })
      return
    }
    setLocalId(`debug-local-${Date.now()}`)
    setRecordDurationSec(nextDuration)
    setRecording(false)
    onToast('调试录音已完成')
  }

  const playPreview = () => {
    const wx = getWx()
    if (wx?.playVoice && localId) {
      wx.playVoice({
        localId,
        fail: (error) => {
          const message = formatWxError(error) || '播放录音失败'
          setPreviewPlaying(false)
          onToast(message)
        },
      })
      setPreviewPlaying(true)
      return
    }
    const message = localId ? '当前环境暂不支持试听微信录音' : '请先完成录音'
    onToast(message)
  }

  const pausePreview = () => {
    const wx = getWx()
    if (wx?.pauseVoice && localId) wx.pauseVoice({ localId })
    setPreviewPlaying(false)
  }

  const resetRecording = () => {
    const wx = getWx()
    if (wx?.stopVoice && localId) wx.stopVoice({ localId })
    setRecording(false)
    setLocalId('')
    setMediaId('')
    setRecordDurationSec(0)
    setPreviewPlaying(false)
  }

  const upload = async () => {
    if (uploading) return
    if (!localId && !mediaId) {
      onToast('请先完成录音')
      return
    }
    const submit = async (nextMediaId) => {
      await submitRecording(activityKey, {
        visitorId,
        title: activeScript?.title || '我的红色电台',
        scriptKey: activeScript?.key,
        mediaId: nextMediaId,
        durationSec: recordDurationSec,
      })
      setNotice('录音审核中\n审核通过后即可获得积分')
    }

    const wx = getWx()
    setUploading(true)
    if (wx?.uploadVoice && localId && !mediaId) {
      wx.uploadVoice({
        localId,
        isShowProgressTips: 1,
        success: async (res) => {
          try {
            const nextMediaId = res.serverId
            setMediaId(nextMediaId)
            if (!nextMediaId) throw new Error('微信上传未返回 serverId')
            await submit(nextMediaId)
          } catch (error) {
            if ((error.message || '').includes('今日录音已提交') || (error.message || '').includes('只能上传一次')) {
              setNotice('今日录音已提交')
              return
            }
            onToast(error.message || '上传失败')
          } finally {
            setUploading(false)
          }
        },
        fail: (error) => {
          const message = formatWxError(error) || '微信录音上传失败'
          setUploading(false)
          onToast(message)
        },
      })
      return
    }

    try {
      if (wx && localId && !mediaId && !wx.uploadVoice) {
        throw new Error('微信上传接口未就绪，请刷新页面后重试')
      }
      if (!wx && localId && !mediaId) {
        throw new Error('请在微信内完成录音上传')
      }
      await submit(mediaId || localId || `debug-media-${Date.now()}`)
    } catch (error) {
      if ((error.message || '').includes('今日录音已提交') || (error.message || '').includes('只能上传一次')) {
        setNotice('今日录音已提交')
        return
      }
      onToast(error.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const primaryRecordAction = () => {
    if (recording) {
      stop()
      return
    }
    if (hasRecording) {
      upload()
      return
    }
    start()
  }

  return (
    <RadioShell onBack={onBack}>
      <div className="lm-radio-record-visual">
        {!recording && !hasRecording ? (
          <button className="is-base" type="button" onClick={start} aria-label="开始录音">
            <img src={longMarchStudyAssets.radio.recordBase} alt="" />
          </button>
        ) : null}
        {recording ? (
          <>
            <img className="is-mic" src={longMarchStudyAssets.radio.recordMic} alt="" />
            <img className="is-wave" src={longMarchStudyAssets.radio.recordWave} alt="" />
            <button className="lm-radio-record-hit" type="button" onClick={stop} aria-label="暂停录音" />
          </>
        ) : null}
        {!recording && hasRecording ? (
          <>
            <button className="is-people" type="button" onClick={previewPlaying ? pausePreview : playPreview} aria-label={previewPlaying ? '暂停试听' : '播放试听'}>
              <img src={longMarchStudyAssets.radio.recordPeople} alt="" />
            </button>
            <button className="is-note" type="button" onClick={resetRecording} aria-label="取消录音">
              <img src={longMarchStudyAssets.radio.recordNote} alt="" />
            </button>
          </>
        ) : null}
      </div>
      <div className="lm-radio-record-status">
        {recording ? '录音中，点击暂停完成录制' : hasRecording ? '录音已完成，可以试听或上传' : '请点击开始录音'}
      </div>
      <button className="lm-radio-confirm-button" type="button" onClick={primaryRecordAction} disabled={uploading}>
        {uploading ? '上传中' : recording ? '暂停录音' : hasRecording ? '确认上传' : '开始录音'}
      </button>
      <button className="lm-radio-return-button" type="button" onClick={onBack}>返回</button>
      <RadioNoticeModal
        message={notice}
        onClose={async () => {
          const shouldDone = notice.includes('审核中')
          setNotice('')
          if (shouldDone) await onDone()
        }}
      />
    </RadioShell>
  )
}

function HonorsPage({ honors, checkins, locations = [], onOpen, onOpenCheckin, onBack }) {
  const firstHonor = honors[0]
  const hasHonor = Boolean(firstHonor)
  const posterThumbnails = longMarchStudyAssets.checkinPoster.locations
  const checkinByLocation = new Map((checkins || []).map((checkin) => [checkin.locationKey, checkin]))
  const locationPosterItems = (locations || []).slice(0, posterThumbnails.length).map((location, index) => ({
    id: location.key || `location-${index + 1}`,
    title: location.title || location.name || `打卡海报${index + 1}`,
    thumbnail: getCheckinPosterImage(location, index),
    checkin: checkinByLocation.get(location.key),
  }))
  const extraCheckinItems = (checkins || [])
    .filter((checkin) => !locationPosterItems.some((item) => item.id === checkin.locationKey))
    .map((checkin, index) => ({
      id: checkin.id || checkin.locationKey || `checkin-${index + 1}`,
      title: checkin.locationTitle || `打卡海报${locationPosterItems.length + index + 1}`,
      thumbnail: getCheckinPosterImage(checkin, locationPosterItems.length + index),
      checkin,
    }))
  const fallbackItems = !locationPosterItems.length && !extraCheckinItems.length
    ? posterThumbnails.map((thumbnail, index) => ({
        id: `poster-placeholder-${index + 1}`,
        title: `打卡海报${index + 1}`,
        thumbnail,
        checkin: null,
      }))
    : []
  const posterItems = [...locationPosterItems, ...extraCheckinItems, ...fallbackItems]
  const honorTitle = firstHonor?.title || '长征研学徽章'
  return (
    <IvxStage title="我的荣誉" className="lm-honors-page" background={longMarchStudyAssets.radio.background} onBack={onBack}>
      <section className="lm-honors-card" aria-label="我的荣誉">
        <h2>我的荣誉</h2>
        <button
          className={`lm-honors-badge-row ${hasHonor ? 'is-earned' : 'is-locked'}`}
          type="button"
          onClick={hasHonor ? () => onOpen(firstHonor) : undefined}
          disabled={!hasHonor}
          aria-label={hasHonor ? `查看${honorTitle}` : `${honorTitle}未获得`}
        >
          <img src={longMarchStudyAssets.honors.badge} alt="" />
          <strong>{hasHonor ? `已获得${honorTitle}` : '未获得长征研学徽章'}</strong>
        </button>
      </section>
      <div className="lm-honors-earned-label">{hasHonor ? '已获得' : '未获得'}</div>
      <section className="lm-honors-poster-card" aria-label="我的海报">
        <img className="lm-honors-poster-panel" src={longMarchStudyAssets.honors.posterPanel} alt="" aria-hidden="true" />
        <h2>我的海报</h2>
        <div className="lm-honors-poster-list">
          {posterItems.map((item) => {
            const canOpen = Boolean(item.checkin)
            return (
              <button
                key={item.id}
                className={canOpen ? 'is-earned' : 'is-locked'}
                type="button"
                onClick={canOpen ? () => onOpenCheckin(item.checkin) : undefined}
                disabled={!canOpen}
                aria-label={canOpen ? `查看${item.title}` : `${item.title}未获得`}
              >
                <span className="lm-honors-poster-thumb">
                  <img src={item.thumbnail} alt="" />
                </span>
                <span className="lm-honors-poster-action">{canOpen ? '点击转发' : '未获得'}</span>
              </button>
            )
          })}
        </div>
      </section>
    </IvxStage>
  )
}

function RankPage({ rank, onBack }) {
  const rows = normalizeRankRows(rank?.rows)
  return (
    <IvxStage title="积分排行榜" className="lm-rank-page" background={longMarchStudyAssets.radio.background} onBack={onBack}>
      <section className="lm-rank-panel">
        <h2>积分排行榜</h2>
        <div className="lm-rank-list">
          {rows.map((row) => (
            <div className="lm-rank-row" key={row.id || `rank-${row.rank}`}>
              <div className="lm-rank-row-no">
                {row.rank <= 3 ? <img src={longMarchStudyAssets.radio.rankBadge} alt="" aria-hidden="true" /> : null}
                <span>{String(row.rank).padStart(2, '0')}</span>
              </div>
              {row.avatar ? (
                <img className="lm-rank-avatar" src={row.avatar} alt="" />
              ) : (
                <div className="lm-rank-avatar lm-rank-avatar-default" aria-hidden="true" />
              )}
              <strong>{row.nickname || row.name || '昵称'}</strong>
              <em>积分：{row.totalPoints || 0}</em>
            </div>
          ))}
        </div>
      </section>
      <button className="lm-rank-home-button" type="button" onClick={onBack}>返回首页</button>
    </IvxStage>
  )
}

function normalizeRankRows(rows = []) {
  const normalizedRows = Array.isArray(rows)
    ? rows.map((row, index) => ({
        ...row,
        id: row.id || `long-march-rank-${index + 1}`,
        rank: Number(row.rank || index + 1),
        nickname: row.nickname || row.displayName || row.name || '',
        avatar: row.avatar || row.displayAvatar || '',
        totalPoints: Number(row.totalPoints || row.points || 0),
      }))
    : []

  const existingIds = new Set(normalizedRows.map((row) => row.id))
  const fillerRows = LONG_MARCH_RANK_TEST_ROWS
    .filter((row) => !existingIds.has(row.id))
    .slice(0, Math.max(50 - normalizedRows.length, 0))

  return [...normalizedRows, ...fillerRows]
    .slice(0, 50)
    .map((row, index) => ({ ...row, rank: index + 1 }))
}

function MinePage({
  mine,
  activityUrl,
  activityKey,
  visitorId,
  shareScreenshot,
  onScreenshotSubmitted,
  onToast,
  onFlow,
  onHonors,
  onRank,
  onBack,
}) {
  const [qrOpen, setQrOpen] = useState(false)
  const [screenshotOpen, setScreenshotOpen] = useState(false)
  const profile = mine?.profile
  const avatar = mine?.wechat?.avatar || profile?.avatar || ''
  const nickname = mine?.wechat?.nickname || profile?.nickname || profile?.name || '昵称'
  const phone = profile?.phone || '18851257958'
  const qrValue = activityUrl || (typeof window !== 'undefined' ? window.location.href : '')
  const mineButtons = [
    { key: 'ledger', image: longMarchStudyAssets.mine.ledgerButton, label: `积分流水 ${mine?.ledgers?.length || 0}`, onClick: () => onFlow('ledger') },
    { key: 'quiz', image: longMarchStudyAssets.mine.quizButton, label: `答题流水 ${mine?.quizAttempts?.length || 0}`, onClick: () => onFlow('quiz') },
    { key: 'honors', image: longMarchStudyAssets.mine.honorsButton, label: '我的荣誉', onClick: onHonors },
    { key: 'poster', image: longMarchStudyAssets.mine.posterButton, label: '我的海报', onClick: onHonors },
    { key: 'rank', image: longMarchStudyAssets.mine.rankButton, label: '积分排行榜', onClick: onRank },
    { key: 'shareScreenshot', image: longMarchStudyAssets.mine.shareScreenshotButton, label: '提交截图', onClick: () => setScreenshotOpen(true) },
  ]

  return (
    <IvxStage title="我的" className="lm-mine-page" background={longMarchStudyAssets.radio.background} onBack={onBack}>
      <section className="lm-mine-profile">
        <div className="lm-mine-profile-card">
          <div className="lm-mine-qr-box">
            <button className="lm-mine-qr-button" type="button" onClick={() => setQrOpen(true)} aria-label="放大二维码">
              {qrValue ? <QRCodeCanvas value={qrValue} size={190} includeMargin={false} /> : null}
            </button>
          </div>
          {avatar ? <img className="lm-mine-avatar" src={avatar} alt="微信头像" /> : <div className="lm-mine-avatar lm-mine-avatar-default" aria-hidden="true" />}
          <strong className="lm-mine-name">{nickname}</strong>
          <span className="lm-mine-phone">{phone}</span>
          <img className="lm-mine-score-bar" src={longMarchStudyAssets.mine.scoreBar} alt="" aria-hidden="true" />
          <b className="lm-mine-stat lm-mine-stat-total">{profile?.totalPoints ?? 600}</b>
          <b className="lm-mine-stat lm-mine-stat-remaining">{profile?.remainingPoints ?? 600}</b>
          <b className="lm-mine-stat lm-mine-stat-days">{profile?.challengeDays ?? 600}</b>
        </div>
      </section>
      <section className="lm-mine-menu" aria-label="我的功能">
        {mineButtons.map((item) => (
          <button key={item.key} type="button" onClick={item.onClick} aria-label={item.label}>
            <img src={item.image} alt="" aria-hidden="true" />
          </button>
        ))}
      </section>
      <button className="lm-mine-home-button" type="button" onClick={onBack}>返回首页</button>
      {qrOpen ? (
        <div className="lm-mine-qr-modal" role="dialog" aria-modal="true" aria-label="二维码">
          <button className="lm-mine-qr-mask" type="button" onClick={() => setQrOpen(false)} aria-label="关闭二维码" />
          <div className="lm-mine-qr-large">
            {qrValue ? <QRCodeCanvas value={qrValue} size={360} includeMargin /> : null}
          </div>
        </div>
      ) : null}
      {screenshotOpen ? (
        <ShareScreenshotUploadModal
          activityKey={activityKey}
          visitorId={visitorId}
          shareScreenshot={shareScreenshot}
          onSubmitted={onScreenshotSubmitted}
          onToast={onToast}
          onClose={() => setScreenshotOpen(false)}
        />
      ) : null}
    </IvxStage>
  )
}

function ShareScreenshotUploadModal({ activityKey, visitorId, shareScreenshot, onSubmitted, onToast, onClose }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState(shareScreenshot || null)
  const currentStatus = status || shareScreenshot || null
  const submittedToday = Boolean(currentStatus?.submittedToday) || ['pending', 'approved', 'rejected'].includes(currentStatus?.status)
  const statusText = submittedToday
    ? '每日只可提交1次'
    : currentStatus?.status === 'failed'
      ? currentStatus.rejectReason || '截图提交失败'
      : '请上传分享截图，审核通过后获得积分'

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setStatus({ status: 'failed', rejectReason: '请选择图片文件' })
      return
    }
    setUploading(true)
    try {
      const imageDataUrl = await readUploadImageDataUrl(file)
      const result = await submitShareScreenshot(activityKey, { visitorId, imageDataUrl })
      const screenshot = { ...(result?.screenshot || { status: 'pending' }), submittedToday: true }
      setStatus(screenshot)
      await onSubmitted?.(screenshot)
    } catch (error) {
      const message = error.message || '截图提交失败'
      if (message.includes('每日') || message.includes('今日') || message.includes('只能提交') || message.includes('只能上传')) {
        setStatus({ status: 'pending', submittedToday: true })
        return
      }
      setStatus({ status: 'failed', rejectReason: message })
      onToast?.(message)
    } finally {
      setUploading(false)
    }
  }

  const canUpload = !submittedToday

  return (
    <RadioNoticeFrame className="lm-share-upload-panel" ariaLabel="提交截图">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} />
      <p>{statusText}</p>
      {canUpload ? (
        <button
          className="lm-share-upload-submit"
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <span>{uploading ? '提交中' : '提交'}</span>
        </button>
      ) : null}
      <button className="lm-share-upload-return" type="button" onClick={onClose}>
        <span>返回</span>
      </button>
    </RadioNoticeFrame>
  )
}

function MineFlowModal({ type, mine, onClose }) {
  const isLedger = type === 'ledger'
  const title = isLedger ? '积分流水' : '答题流水'
  const rows = isLedger ? (mine?.ledgers || []) : (mine?.quizAttempts || [])

  return (
    <Modal title={title} onClose={onClose} variant="rules">
      <ol className="lm-rules lm-flow-list">
        {rows.length ? rows.map((item, index) => (
          <li key={item.id || `${type}-${index}`}>
            {isLedger ? (
              <>
                <strong>{item.title || '积分变动'}</strong>
                <span>{formatLongMarchDate(item.occurredAt)} · {item.points >= 0 ? '+' : ''}{item.points || 0}积分</span>
                <em>剩余积分：{item.remainingAfter ?? '-'}，累计积分：{item.balanceAfter ?? '-'}</em>
              </>
            ) : (
              <>
                <strong>{item.finishedAt ? '每日红色答题' : '答题未完成'}</strong>
                <span>{formatLongMarchDate(item.finishedAt || item.startedAt)} · 答题积分 {item.score || 0}</span>
                <em>答对 {item.correctCount || 0}/{item.questionCount || 0} 题，获得 {item.pointsEarned || 0} 积分</em>
              </>
            )}
          </li>
        )) : <li className="is-empty">暂无{title}记录</li>}
      </ol>
    </Modal>
  )
}

function formatLongMarchDate(value) {
  if (!value) return '暂无时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '暂无时间'
  const pad = (number) => String(number).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function RulesModal({ rules, onClose }) {
  return (
    <Modal title="活动规则" onClose={onClose} variant="rules">
      <ol className="lm-rules">{rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
    </Modal>
  )
}

function PosterPage({ poster, locations, activityUrl, onBack }) {
  const { scaleX, width, height } = useStageFit(POSTER_STAGE_WIDTH, POSTER_STAGE_HEIGHT)
  const qrCanvasRef = useRef(null)
  const [posterImage, setPosterImage] = useState('')
  const [error, setError] = useState('')
  const posterAssets = longMarchStudyAssets.checkinPoster
  const isHonorPoster = poster?.source === 'honor'
  const isSharePoster = poster?.source === 'share'
  const certificateName = poster?.name || poster?.nickname || '姓名'
  const posterLocationIndex = Math.max(0, locations.findIndex((item) => item.key === poster?.locationKey))
  const locationImage = getCheckinPosterImage(poster, posterLocationIndex)

  useEffect(() => {
    let cancelled = false
    async function composePoster() {
      setError('')
      setPosterImage('')
      try {
        if (isHonorPoster) {
          const [background, certificate] = await Promise.all([
            loadPosterImage(posterAssets.posterBackground),
            loadPosterImage(longMarchStudyAssets.honors.certificate),
          ])
          let avatar = null
          if (poster?.avatar) {
            try {
              avatar = await loadPosterImage(poster.avatar, { verifyCanvas: true })
            } catch {
              avatar = null
            }
          }
          const canvas = document.createElement('canvas')
          canvas.width = POSTER_STAGE_WIDTH
          canvas.height = POSTER_STAGE_HEIGHT
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(background, 0, -88, 750, 1624)
          ctx.drawImage(certificate, 66, 133, 621, 1140)

          const avatarX = 311
          const avatarY = 450
          const avatarSize = 124
          if (avatar) {
            ctx.save()
            ctx.beginPath()
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
            ctx.restore()
          } else {
            drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarSize)
          }

          drawTextFit(ctx, certificateName, 291, 636, 177, 30, { color: '#000' })

          const qrCanvas = qrCanvasRef.current
          if (qrCanvas) {
            ctx.fillStyle = '#fff'
            ctx.fillRect(530, 1068, 116, 116)
            ctx.drawImage(qrCanvas, 530, 1068, 116, 116)
          }

          const url = canvas.toDataURL('image/png')
          if (!cancelled) setPosterImage(url)
          return
        }

        if (isSharePoster) {
          const sharePoster = await loadPosterImage(posterAssets.share)
          let avatar = null
          if (poster?.avatar) {
            try {
              avatar = await loadPosterImage(poster.avatar, { verifyCanvas: true })
            } catch {
              avatar = null
            }
          }
          const canvas = document.createElement('canvas')
          canvas.width = 689
          canvas.height = 1237
          const ctx = canvas.getContext('2d')
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(sharePoster, 0, 0, 689, 1237)

          const avatarX = 47
          const avatarY = 1125
          const avatarWidth = 85
          const avatarHeight = 86
          if (avatar) {
            ctx.save()
            ctx.beginPath()
            ctx.arc(avatarX + avatarWidth / 2, avatarY + avatarHeight / 2, avatarWidth / 2, 0, Math.PI * 2)
            ctx.clip()
            ctx.drawImage(avatar, avatarX, avatarY, avatarWidth, avatarHeight)
            ctx.restore()
          } else {
            drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarWidth)
          }

          const qrCanvas = qrCanvasRef.current
          if (qrCanvas) {
            ctx.fillStyle = '#fff'
            ctx.fillRect(510, 1125, 85, 85)
            ctx.drawImage(qrCanvas, 510, 1125, 85, 85)
          }

          drawTextFit(ctx, poster?.nickname || poster?.name || '研学用户', 160, 1134, 328, 25, { align: 'left', color: '#fff' })
          drawTextFit(ctx, `闯关天数：${poster?.challengeDays || 0}天`, 160, 1169, 328, 25, { align: 'left', color: '#fff' })
          drawTextFit(ctx, `累计分数：${poster?.totalPoints || 0}`, 160, 1204, 328, 25, { align: 'left', color: '#fff' })

          const url = canvas.toDataURL('image/png')
          if (!cancelled) setPosterImage(url)
          return
        }

        const [background, title, location] = await Promise.all([
          loadPosterImage(posterAssets.background),
          loadPosterImage(posterAssets.title),
          loadPosterImage(locationImage),
        ])
        let avatar = null
        if (poster?.avatar) {
          try {
            avatar = await loadPosterImage(poster.avatar, { verifyCanvas: true })
          } catch {
            avatar = null
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = POSTER_STAGE_WIDTH
        canvas.height = POSTER_STAGE_HEIGHT
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(background, 0, -88, 750, 1624)
        ctx.drawImage(location, 47, 379, location.naturalWidth, location.naturalHeight)
        ctx.drawImage(title, 74, 40, 612, 366)

        const avatarX = 71
        const avatarY = 1328
        const avatarSize = 85
        if (avatar) {
          ctx.save()
          ctx.beginPath()
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
          ctx.restore()
        } else {
          drawAvatarPlaceholder(ctx, avatarX, avatarY, avatarSize)
        }

        const qrCanvas = qrCanvasRef.current
        if (qrCanvas) {
          ctx.fillStyle = '#fff'
          ctx.fillRect(575, 1326, 85, 85)
          ctx.drawImage(qrCanvas, 575, 1326, 85, 85)
        }

        drawTextFit(ctx, poster?.nickname || poster?.name || '研学用户', 185, 1329, 328, 25, { align: 'left', color: '#fff' })
        drawTextFit(ctx, `闯关天数：${poster?.challengeDays || 0}天`, 185, 1364, 328, 25, { align: 'left', color: '#fff' })
        drawTextFit(ctx, `累计分数：${poster?.totalPoints || 0}`, 185, 1399, 328, 25, { align: 'left', color: '#fff' })

        const url = canvas.toDataURL('image/png')
        if (!cancelled) setPosterImage(url)
      } catch {
        if (!cancelled) setError('海报生成失败，请稍后重试')
      }
    }
    composePoster()
    return () => {
      cancelled = true
    }
  }, [activityUrl, certificateName, isHonorPoster, isSharePoster, locationImage, poster, posterAssets.background, posterAssets.posterBackground, posterAssets.share, posterAssets.title])

  return (
    <div className="lm-poster-viewport" style={{ width, height }}>
      <section
        className={`lm-poster-page ${isHonorPoster ? 'is-honor-certificate' : ''} ${isSharePoster ? 'is-share-poster' : ''}`}
        style={{
          transform: `scale(${scaleX})`,
          '--lm-ivx-ui-scale': scaleX ? 1 / scaleX : 1,
        }}
      >
        <button className="lm-poster-back" type="button" onClick={onBack} aria-label="返回">
          <img src={longMarchStudyAssets.shared.backIcon} alt="" />
        </button>
        {isHonorPoster ? <div className="lm-certificate-title">我的证书</div> : null}
        <QRCodeCanvas
          ref={qrCanvasRef}
          className="lm-poster-qrcode-source"
          value={activityUrl}
          size={400}
          level="M"
          marginSize={2}
        />
        <div className="lm-poster-live" aria-hidden={Boolean(posterImage)}>
          {isHonorPoster ? (
            <div className="lm-certificate-poster">
              <img className="lm-certificate-bg" src={posterAssets.posterBackground} alt="" />
              <img className="lm-certificate-image" src={longMarchStudyAssets.honors.certificate} alt="" />
              {poster?.avatar ? <img className="lm-certificate-avatar" src={poster.avatar} alt="头像" crossOrigin="anonymous" /> : <div className="lm-certificate-avatar lm-avatar-placeholder" />}
              <div className="lm-certificate-name">{certificateName}</div>
              <QRCodeCanvas
                className="lm-certificate-qrcode"
                value={activityUrl}
                size={116}
                level="M"
                marginSize={1}
              />
            </div>
          ) : isSharePoster ? (
            <>
              <img className="lm-share-poster-bg" src={longMarchStudyAssets.radio.background} alt="" />
              <div className="lm-share-poster-card">
                <img className="lm-share-poster-image" src={posterAssets.share} alt="" />
                {poster?.avatar ? <img className="lm-share-poster-avatar" src={poster.avatar} alt="头像" crossOrigin="anonymous" /> : <div className="lm-share-poster-avatar lm-avatar-placeholder" />}
                <QRCodeCanvas className="lm-share-poster-qrcode" value={activityUrl} size={400} level="M" marginSize={2} />
                <div className="lm-share-poster-user">
                  <span>{poster?.nickname || poster?.name || '研学用户'}</span>
                  <span>闯关天数：{poster?.challengeDays || 0}天</span>
                  <span>累计分数：{poster?.totalPoints || 0}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <img className="lm-poster-bg" src={posterAssets.background} alt="" />
              <img className="lm-poster-location" src={locationImage} alt="" />
              <img className="lm-poster-title" src={posterAssets.title} alt="" />
              {poster?.avatar ? <img className="lm-poster-avatar" src={poster.avatar} alt="头像" crossOrigin="anonymous" /> : <div className="lm-poster-avatar lm-avatar-placeholder" />}
              <QRCodeCanvas className="lm-poster-qrcode" value={activityUrl} size={400} level="M" marginSize={2} />
              <div className="lm-poster-user">
                <span>{poster?.nickname || poster?.name || '研学用户'}</span>
                <span>闯关天数：{poster?.challengeDays || 0}天</span>
                <span>累计分数：{poster?.totalPoints || 0}</span>
              </div>
            </>
          )}
        </div>
        {posterImage ? <img className={`lm-poster-generated ${isSharePoster ? 'is-share-poster-generated' : ''}`} src={posterImage} alt="长征研学分享海报" /> : null}
        <div className={`lm-poster-save-tip ${isSharePoster ? 'is-share-poster-tip' : ''}`}>长按海报可保存分享海报</div>
        {!posterImage && (!isHonorPoster || error) ? <div className="lm-poster-generating">{error || '海报生成中'}</div> : null}
      </section>
    </div>
  )
}

function Modal({ title, children, onClose, variant = 'default' }) {
  const frameSpec = MODAL_FRAME_SPECS[variant]
  const modalFit = useModalFit(frameSpec)
  const backgroundImage = {
    rules: longMarchStudyAssets.modal.rules,
    profile: longMarchStudyAssets.modal.profile,
  }[variant]
  const showClose = variant !== 'profile'
  const closeText = variant === 'rules' ? '返回' : '关闭'
  const closeOnMask = variant === 'profile'
  const handleMaskClick = (event) => {
    if (closeOnMask && event.target === event.currentTarget) onClose()
  }
  const content = (
    <>
      <header>
        <h2>{title}</h2>
        {showClose ? <button type="button" onClick={onClose}>{closeText}</button> : null}
      </header>
      {children}
    </>
  )

  if (frameSpec) {
    return (
      <div className={`lm-modal-mask lm-modal-mask-${variant}`} onClick={handleMaskClick}>
        <section
          className={`lm-modal-frame lm-modal-frame-${variant}`}
          style={{ width: modalFit.width, height: modalFit.height }}
          onClick={(event) => event.stopPropagation()}
        >
          <div
            className={`lm-modal lm-modal-${variant}`}
            style={{
              ...(backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : {}),
              transform: `scale(${modalFit.scale})`,
            }}
          >
            {content}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={`lm-modal-mask lm-modal-mask-${variant}`} onClick={handleMaskClick}>
      <section
        className={`lm-modal lm-modal-${variant}`}
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        {content}
      </section>
    </div>
  )
}

function Toast({ text, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 2600)
    return () => window.clearTimeout(timer)
  }, [onClose])
  return (
    <div className="lm-toast-mask" role="status" aria-live="polite">
      <div className="lm-toast">{text}</div>
    </div>
  )
}

function MessageScreen({ title }) {
  return <main className="lm-page"><div className="lm-message">{title}</div></main>
}
