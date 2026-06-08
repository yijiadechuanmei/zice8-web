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
const attemptIntervalMs = 800

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
  const isPlayingRef = useRef(false)
  const userPausedRef = useRef(false)
  const playAttemptMapRef = useRef({})
  const lastPlayAttemptRef = useRef(0)
  const gestureRecoveryDoneRef = useRef(false)
  const styleInjectedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [audioReady, setAudioReady] = useState(false)

  const bgmConfig = useMemo(
    () => ({
      enabled: Boolean(bgm?.enabled),
      url: String(bgm?.url || '').trim(),
      loop: bgm?.loop !== false,
      autoplay: bgm?.autoplay !== false,
      showControl: bgm?.showControl !== false,
      volume: normalizeVolume(bgm?.volume),
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
    `
    document.head.appendChild(styleElement)
    styleInjectedRef.current = true

    return () => {
      styleInjectedRef.current = false
      styleElement.remove()
    }
  }, [])

  useEffect(() => {
    const shouldEnable = bgmConfig.enabled && bgmConfig.url

    setPlaying(false)
    setAudioReady(false)
    isPlayingRef.current = false
    userPausedRef.current = false
    playAttemptMapRef.current = {}
    lastPlayAttemptRef.current = 0
    gestureRecoveryDoneRef.current = false

    if (!shouldEnable) {
      const previousAudio = audioRef.current
      if (previousAudio) {
        previousAudio.pause()
        previousAudio.src = ''
        previousAudio.load()
        audioRef.current = null
      }
      return undefined
    }

    const audio = new Audio()
    audio.src = bgmConfig.url
    audio.loop = bgmConfig.loop
    audio.preload = 'auto'
    audio.volume = bgmConfig.volume
    audio.playsInline = true
    audio.setAttribute('playsinline', 'true')
    audio.setAttribute('webkit-playsinline', 'true')
    audio.setAttribute('x5-playsinline', 'true')
    audio.load()
    audioRef.current = audio

    const tryPlay = async (reason, force = false) => {
      if (!audioRef.current || !bgmConfig.enabled || !bgmConfig.url) {
        return false
      }
      if (isPlayingRef.current) {
        return true
      }
      if (!force && userPausedRef.current) {
        return false
      }

      const now = Date.now()
      const lastReasonAt = playAttemptMapRef.current[reason] || 0
      if (!force && now - lastReasonAt < attemptIntervalMs) {
        return false
      }
      if (!force && now - lastPlayAttemptRef.current < 250) {
        return false
      }

      playAttemptMapRef.current[reason] = now
      lastPlayAttemptRef.current = now

      try {
        await audioRef.current.play()
        setPlaying(true)
        isPlayingRef.current = true
        gestureRecoveryDoneRef.current = true
        return true
      } catch (error) {
        console.warn('[ActivityBgmPlayer] autoplay blocked', reason, error?.message)
        return false
      }
    }

    const handlePlay = () => {
      isPlayingRef.current = true
      setPlaying(true)
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
      tryPlay('first-gesture')
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }
      if (!bgmConfig.autoplay || userPausedRef.current) {
        return
      }
      tryPlay('visibility')
    }

    const handleWechatReady = () => {
      if (!bgmConfig.autoplay || userPausedRef.current) {
        return
      }
      tryPlay('wechat-bridge')
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('loadeddata', handleCanPlay)

    if (bgmConfig.autoplay) {
      void tryPlay('mount')
      window.addEventListener('touchstart', tryGestureRecovery, { passive: true })
      window.addEventListener('click', tryGestureRecovery, { passive: true })
      document.addEventListener('visibilitychange', handleVisibilityChange)

      if (/MicroMessenger/i.test(window.navigator.userAgent)) {
        document.addEventListener('WeixinJSBridgeReady', handleWechatReady)
        if (window.WeixinJSBridge) {
          window.setTimeout(() => {
            void tryPlay('wechat-bridge-existing')
          }, 60)
        }
      }
    }

    return () => {
      window.removeEventListener('touchstart', tryGestureRecovery)
      window.removeEventListener('click', tryGestureRecovery)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('WeixinJSBridgeReady', handleWechatReady)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('loadeddata', handleCanPlay)
      audio.pause()
      audio.src = ''
      audio.load()
      audioRef.current = null
      isPlayingRef.current = false
      setPlaying(false)
      setAudioReady(false)
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
      audio.pause()
      return
    }

    userPausedRef.current = false
    try {
      await audio.play()
      setPlaying(true)
      isPlayingRef.current = true
    } catch (error) {
      console.warn('[ActivityBgmPlayer] autoplay blocked', 'manual', error?.message)
    }
  }

  const iconWrapStyle = {
    ...iconWrapBaseStyle,
    animation: playing ? `${spinAnimationName} 3s linear infinite` : 'none',
    opacity: audioReady ? 1 : 0.8,
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
