import { useEffect, useMemo, useRef, useState } from 'react'

const controlStyle = {
  position: 'fixed',
  top: '18px',
  right: '18px',
  zIndex: 60,
  width: '48px',
  height: '48px',
  borderRadius: '9999px',
  border: '1px solid rgba(255, 255, 255, 0.42)',
  background: 'rgba(8, 36, 24, 0.58)',
  boxShadow: '0 10px 24px rgba(0, 0, 0, 0.18)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
}

const iconWrapBaseStyle = {
  width: '28px',
  height: '28px',
  borderRadius: '9999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transformOrigin: 'center',
}

const iconStyle = {
  width: '18px',
  height: '18px',
  display: 'block',
}

const spinAnimationName = 'activity-bgm-spin'
const pulseAnimationName = 'activity-bgm-pulse'
const attemptIntervalMs = 200
const reasonAttemptLimit = 3

function normalizeVolume(value) {
  const volume = Number(value)
  if (!Number.isFinite(volume)) return 0.6
  if (volume < 0) return 0
  if (volume > 1) return 1
  return volume
}

function MusicNoteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={iconStyle}>
      <path
        d="M15 3.6v10.2a3.4 3.4 0 1 1-1.6-2.9V7.1l-5.8 1.4v7a3.4 3.4 0 1 1-1.6-2.9V6.1c0-.73.5-1.36 1.22-1.54l6.2-1.5A1.6 1.6 0 0 1 15 3.6Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default function ActivityBgmPlayer({ bgm }) {
  const audioRef = useRef(null)
  const tryPlayRef = useRef(async () => false)
  const isPlayingRef = useRef(false)
  const userPausedRef = useRef(false)
  const styleInjectedRef = useRef(false)
  const audioUrlRef = useRef('')
  const audioBlobUrlRef = useRef('')
  const timersRef = useRef([])
  const playAttemptMapRef = useRef({})
  const playAttemptCountRef = useRef({})
  const warnReasonMapRef = useRef({})
  const gestureRecoveryDoneRef = useRef(false)
  const interactionCleanupRef = useRef(() => {})
  const mountedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [waitingGesture, setWaitingGesture] = useState(false)

  const bgmConfig = useMemo(
    () => ({
      enabled: Boolean(bgm?.enabled),
      url: String(bgm?.url || '').trim(),
      loop: bgm?.loop !== false,
      autoplay: bgm?.autoplay !== false,
      showControl: bgm?.showControl !== false,
      volume: normalizeVolume(bgm?.volume),
      preload: bgm?.preload !== false,
      preloadAsBlob: Boolean(bgm?.preloadAsBlob),
    }),
    [bgm],
  )

  useEffect(() => {
    if (typeof document === 'undefined' || styleInjectedRef.current) {
      return undefined
    }

    const styleElement = document.createElement('style')
    styleElement.setAttribute('data-activity-bgm-player', 'true')
    styleElement.textContent = `
      @keyframes ${spinAnimationName} {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes ${pulseAnimationName} {
        0% { transform: scale(1); opacity: 0.94; }
        50% { transform: scale(1.08); opacity: 1; }
        100% { transform: scale(1); opacity: 0.94; }
      }
    `
    document.head.appendChild(styleElement)
    styleInjectedRef.current = true

    return () => {
      styleInjectedRef.current = false
      styleElement.remove()
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    const clearScheduledTimers = () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      timersRef.current = []
    }

    const revokeBlobUrl = () => {
      if (!audioBlobUrlRef.current) return
      URL.revokeObjectURL(audioBlobUrlRef.current)
      audioBlobUrlRef.current = ''
    }

    const clearGestureListeners = () => {
      interactionCleanupRef.current()
      interactionCleanupRef.current = () => {}
    }

    const stopAndResetAudio = () => {
      const audio = audioRef.current
      if (!audio) return
      audio.pause()
      audio.removeAttribute('src')
      try {
        audio.load()
      } catch {
        return
      }
    }

    const resetAttemptState = () => {
      playAttemptMapRef.current = {}
      playAttemptCountRef.current = {}
      warnReasonMapRef.current = {}
      gestureRecoveryDoneRef.current = false
      tryPlayRef.current = async () => false
      isPlayingRef.current = false
      userPausedRef.current = false
      setPlaying(false)
      setAudioReady(false)
      setWaitingGesture(false)
    }

    const shouldEnable = bgmConfig.enabled && bgmConfig.url
    clearScheduledTimers()
    clearGestureListeners()
    revokeBlobUrl()
    resetAttemptState()

    if (!shouldEnable) {
      stopAndResetAudio()
      audioRef.current = null
      audioUrlRef.current = ''
      return () => {
        mountedRef.current = false
      }
    }

    function scheduleTask(callback, delay) {
      const timerId = window.setTimeout(() => {
        timersRef.current = timersRef.current.filter((id) => id !== timerId)
        callback()
      }, delay)
      timersRef.current.push(timerId)
    }

    function getPreferredSource() {
      return audioBlobUrlRef.current || bgmConfig.url
    }

    function prepareAudio(reason, options = {}) {
      const { force = false, useBlobIfReady = true } = options

      if (!bgmConfig.enabled || !bgmConfig.url) {
        return null
      }

      let audio = audioRef.current
      if (!audio) {
        audio = document.createElement('audio')
        audioRef.current = audio
      }

      const preferredSource = useBlobIfReady ? getPreferredSource() : bgmConfig.url
      const shouldResetSource = force || audioUrlRef.current !== preferredSource

      if (shouldResetSource) {
        if (!audio.paused) {
          audio.pause()
        }
        audio.src = preferredSource
        audioUrlRef.current = preferredSource
      }

      audio.preload = 'auto'
      audio.loop = bgmConfig.loop
      audio.volume = bgmConfig.volume
      audio.playsInline = true
      audio.setAttribute('playsinline', 'true')
      audio.setAttribute('webkit-playsinline', 'true')
      audio.setAttribute('x5-playsinline', 'true')
      audio.setAttribute('x5-video-player-type', 'h5')

      if (shouldResetSource || force || bgmConfig.preload) {
        try {
          audio.load()
        } catch (error) {
          console.warn('[ActivityBgmPlayer] audio load failed', reason, error?.message)
        }
      }

      return audio
    }

    function markBlocked(reason) {
      if (!mountedRef.current || !bgmConfig.showControl || userPausedRef.current || playing) {
        return
      }
      if (!gestureRecoveryDoneRef.current) {
        setWaitingGesture(true)
      }
      if (!warnReasonMapRef.current[reason]) {
        warnReasonMapRef.current[reason] = true
      }
    }

    const tryPlay = async (reason, options = {}) => {
      const { forcePrepare = false, manual = false } = options

      if (!bgmConfig.enabled || !bgmConfig.url) {
        return false
      }
      if (userPausedRef.current && !manual) {
        return false
      }

      const currentAttemptCount = playAttemptCountRef.current[reason] || 0
      if (!manual && currentAttemptCount >= reasonAttemptLimit) {
        return false
      }

      const now = Date.now()
      const lastAttemptAt = playAttemptMapRef.current.lastAttemptAt || 0
      if (!manual && now - lastAttemptAt < attemptIntervalMs) {
        return false
      }

      const targetAudio = forcePrepare
        ? prepareAudio(reason, { force: true })
        : audioRef.current || prepareAudio(reason)

      if (!targetAudio) {
        return false
      }

      playAttemptMapRef.current.lastAttemptAt = now
      playAttemptCountRef.current[reason] = currentAttemptCount + 1

      try {
        await targetAudio.play()
        if (!mountedRef.current) {
          return true
        }
        isPlayingRef.current = true
        gestureRecoveryDoneRef.current = true
        setPlaying(true)
        setWaitingGesture(false)
        if (manual) {
          userPausedRef.current = false
        }
        return true
      } catch (error) {
        console.warn(`[ActivityBgmPlayer] play blocked reason=${reason} error=${error?.message || 'unknown'}`)
        markBlocked(reason)
        return false
      }
    }

    tryPlayRef.current = tryPlay

    const audio = prepareAudio('mount', { force: true })
    if (!audio) {
      return () => {
        mountedRef.current = false
      }
    }

    const handlePlay = () => {
      isPlayingRef.current = true
      setPlaying(true)
      setWaitingGesture(false)
    }

    const handlePause = () => {
      isPlayingRef.current = false
      setPlaying(false)
    }

    const handleEnded = () => {
      isPlayingRef.current = false
      setPlaying(false)
    }

    const handleCanPlay = () => {
      setAudioReady(true)
    }

    const tryGestureRecovery = () => {
      if (!bgmConfig.autoplay || gestureRecoveryDoneRef.current || userPausedRef.current) {
        return
      }
      void tryPlay('first-gesture')
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }
      if (!bgmConfig.autoplay || userPausedRef.current) {
        return
      }
      void tryPlay('visible')
    }

    const handlePageShow = () => {
      if (!bgmConfig.autoplay || userPausedRef.current) {
        return
      }
      void tryPlay('pageshow')
    }

    const handleWechatReady = () => {
      if (!bgmConfig.autoplay || userPausedRef.current) {
        return
      }
      prepareAudio('wechat-bridge', { force: true })
      void tryPlay('wechat-bridge', { forcePrepare: true })
    }

    const touchOptions = { capture: true, passive: true, once: true }
    const pointerOptions = { capture: true, once: true }
    const clickOptions = { capture: true, once: true }

    const bindFirstInteractionRecovery = () => {
      window.addEventListener('touchstart', tryGestureRecovery, touchOptions)
      window.addEventListener('pointerdown', tryGestureRecovery, pointerOptions)
      window.addEventListener('click', tryGestureRecovery, clickOptions)
      interactionCleanupRef.current = () => {
        window.removeEventListener('touchstart', tryGestureRecovery, touchOptions)
        window.removeEventListener('pointerdown', tryGestureRecovery, pointerOptions)
        window.removeEventListener('click', tryGestureRecovery, clickOptions)
      }
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadeddata', handleCanPlay)

    if (bgmConfig.preloadAsBlob) {
      fetch(bgmConfig.url, { cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }
          return response.blob()
        })
        .then((blob) => {
          if (!mountedRef.current) {
            return
          }
          revokeBlobUrl()
          const blobUrl = URL.createObjectURL(blob)
          audioBlobUrlRef.current = blobUrl
          if (!isPlayingRef.current) {
            prepareAudio('blob-preload', { force: true })
          }
        })
        .catch((error) => {
          console.warn('[ActivityBgmPlayer] blob preload failed', error?.message)
        })
    }

    if (bgmConfig.autoplay) {
      void tryPlay('mount')
      bindFirstInteractionRecovery()
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('pageshow', handlePageShow)

      if (/MicroMessenger/i.test(window.navigator.userAgent)) {
        document.addEventListener('WeixinJSBridgeReady', handleWechatReady, false)
        if (window.WeixinJSBridge) {
          scheduleTask(() => {
            prepareAudio('wechat-bridge-existing', { force: true })
            void tryPlay('wechat-bridge-existing', { forcePrepare: true })
          }, 0)
          scheduleTask(() => {
            prepareAudio('wechat-bridge-retry-300', { force: true })
            void tryPlay('wechat-bridge-retry-300', { forcePrepare: true })
          }, 300)
          scheduleTask(() => {
            prepareAudio('wechat-bridge-retry-800', { force: true })
            void tryPlay('wechat-bridge-retry-800', { forcePrepare: true })
          }, 800)
        }
      }

      if (window.wx && typeof window.wx.ready === 'function') {
        window.wx.ready(() => {
          if (!userPausedRef.current) {
            prepareAudio('wx-ready', { force: true })
            void tryPlay('wx-ready', { forcePrepare: true })
          }
        })
      }
    }

    return () => {
      mountedRef.current = false
      clearScheduledTimers()
      clearGestureListeners()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      document.removeEventListener('WeixinJSBridgeReady', handleWechatReady, false)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadeddata', handleCanPlay)
      stopAndResetAudio()
      revokeBlobUrl()
      audioRef.current = null
      audioUrlRef.current = ''
      tryPlayRef.current = async () => false
      isPlayingRef.current = false
      setPlaying(false)
      setAudioReady(false)
      setWaitingGesture(false)
    }
  }, [bgmConfig])

  if (!bgmConfig.enabled || !bgmConfig.url || !bgmConfig.showControl) {
    return null
  }

  async function handleTogglePlayback() {
    const audio = audioRef.current
    if (!audio) return

    if (!audio.paused) {
      userPausedRef.current = true
      setWaitingGesture(false)
      audio.pause()
      return
    }

    await tryPlayRef.current('manual', { manual: true, forcePrepare: true })
  }

  const iconWrapStyle = {
    ...iconWrapBaseStyle,
    animation: playing
      ? `${spinAnimationName} 3s linear infinite`
      : waitingGesture
        ? `${pulseAnimationName} 1.8s ease-in-out infinite`
        : 'none',
    opacity: audioReady ? 1 : 0.82,
  }

  return (
    <button
      type="button"
      style={controlStyle}
      onClick={handleTogglePlayback}
      aria-label={playing ? '暂停背景音乐' : '播放背景音乐'}
    >
      <span style={iconWrapStyle}>
        <MusicNoteIcon />
      </span>
    </button>
  )
}
