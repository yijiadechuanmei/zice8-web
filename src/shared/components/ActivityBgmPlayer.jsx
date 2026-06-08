import { useEffect, useMemo, useRef, useState } from 'react'

const buttonStyle = {
  position: 'fixed',
  top: '18px',
  right: '18px',
  zIndex: 60,
  minWidth: '76px',
  border: '1px solid rgba(255, 255, 255, 0.35)',
  borderRadius: '999px',
  background: 'rgba(8, 36, 24, 0.52)',
  color: '#ffffff',
  padding: '8px 12px',
  fontSize: '12px',
  lineHeight: 1,
  backdropFilter: 'blur(6px)',
}

export default function ActivityBgmPlayer({ bgm }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const bgmConfig = useMemo(() => ({
    enabled: Boolean(bgm?.enabled),
    url: String(bgm?.url || '').trim(),
    loop: bgm?.loop !== false,
    autoplay: bgm?.autoplay !== false,
    showControl: bgm?.showControl !== false,
    volume: Number.isFinite(Number(bgm?.volume)) ? Math.min(Math.max(Number(bgm.volume), 0), 1) : 0.6,
  }), [bgm])

  useEffect(() => {
    if (!bgmConfig.enabled || !bgmConfig.url) return undefined

    const audio = new Audio(bgmConfig.url)
    audio.loop = bgmConfig.loop
    audio.preload = 'auto'
    audio.volume = bgmConfig.volume
    audioRef.current = audio

    const syncPlaying = () => setPlaying(!audio.paused)
    const tryPlay = () =>
      audio.play()
        .then(() => setPlaying(true))
        .catch(() => undefined)

    audio.addEventListener('play', syncPlaying)
    audio.addEventListener('pause', syncPlaying)
    audio.addEventListener('ended', syncPlaying)

    const handleFirstGesture = () => {
      if (bgmConfig.autoplay && audio.paused) {
        tryPlay()
      }
    }

    const handleWechatReady = () => {
      if (bgmConfig.autoplay && audio.paused) {
        tryPlay()
      }
    }

    if (bgmConfig.autoplay) {
      tryPlay()
      document.addEventListener('click', handleFirstGesture, { passive: true })
      document.addEventListener('touchstart', handleFirstGesture, { passive: true })
      document.addEventListener('WeixinJSBridgeReady', handleWechatReady)
    }

    return () => {
      document.removeEventListener('click', handleFirstGesture)
      document.removeEventListener('touchstart', handleFirstGesture)
      document.removeEventListener('WeixinJSBridgeReady', handleWechatReady)
      audio.pause()
      audio.src = ''
      audio.removeEventListener('play', syncPlaying)
      audio.removeEventListener('pause', syncPlaying)
      audio.removeEventListener('ended', syncPlaying)
      audioRef.current = null
      setPlaying(false)
    }
  }, [bgmConfig])

  if (!bgmConfig.enabled || !bgmConfig.url || !bgmConfig.showControl) {
    return null
  }

  function togglePlayback() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => undefined)
      return
    }
    audio.pause()
    setPlaying(false)
  }

  return (
    <button
      type="button"
      style={buttonStyle}
      onClick={togglePlayback}
      aria-label={playing ? '关闭背景音乐' : '开启背景音乐'}
    >
      {playing ? '音乐开' : '音乐关'}
    </button>
  )
}
