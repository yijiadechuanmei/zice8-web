import { useEffect, useMemo, useRef, useState } from 'react'

export default function QuizBgmPlayer({ config }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const bgmConfig = useMemo(() => ({
    enabled: Boolean(config?.enabled),
    url: String(config?.url || '').trim(),
    loop: config?.loop !== false,
    autoplay: config?.autoplay !== false,
    showControl: config?.showControl !== false,
  }), [config])

  useEffect(() => {
    if (!bgmConfig.enabled || !bgmConfig.url) return undefined

    const audio = new Audio(bgmConfig.url)
    audio.loop = bgmConfig.loop
    audio.preload = 'auto'
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
      className="quiz-bgm-toggle"
      onClick={togglePlayback}
      aria-label={playing ? '关闭背景音乐' : '开启背景音乐'}
    >
      {playing ? '音乐开' : '音乐关'}
    </button>
  )
}
