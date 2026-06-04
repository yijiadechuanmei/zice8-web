/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react'

const JUMP_THRESHOLD = 6

function getSubmitIntervalSeconds(duration) {
  if (!duration || duration <= 0) return 5
  const interval = Math.floor(duration / 20)
  return Math.max(2, Math.min(8, interval))
}

function formatSubmitTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('zh-CN', { hour12: false })
}

function getPositionStorageKey(activityKey, videoId, userId) {
  return `zice8_video_position_${activityKey}_${videoId}_${userId || 'anonymous'}`
}

function readSavedPosition(storageKey, duration) {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return 0
    const data = JSON.parse(raw)
    const position = Math.floor(Number(data?.position) || 0)
    return Math.max(0, Math.min(position, duration || position))
  } catch {
    return 0
  }
}

export default function VideoPlayer({ activityKey, userId, video, debug, onSubmitProgress }) {
  const submitIntervalSeconds = getSubmitIntervalSeconds(Number(video.duration) || 0)
  const storageKey = getPositionStorageKey(activityKey, video.id, userId)
  const initialSavedPosition = readSavedPosition(storageKey, Number(video.duration) || 0)
  const videoRef = useRef(null)
  const segmentStartRef = useRef(null)
  const lastTimeRef = useRef(0)
  const maxAllowedTimeRef = useRef(Math.max(initialSavedPosition, 0))
  const lastPositionSaveTimeRef = useRef(0)
  const restorePendingRef = useRef(initialSavedPosition > 0)
  const settingCurrentTimeRef = useRef(false)
  const suppressSeekHandlerRef = useRef(false)
  const pendingRef = useRef([])
  const submittingRef = useRef(false)
  const flushAgainRef = useRef(false)
  const flushAgainReasonRef = useRef('queued')
  const completedRef = useRef(Boolean(video.watchCompleted || video.completed))
  const lastSubmitTimeRef = useRef(0)
  const serverWatchedSecondsRef = useRef(Math.floor((video.watchRate || 0) * (video.duration || 0)))
  const serverWatchRateRef = useRef(video.watchRate || 0)
  const maxDisplayWatchRateRef = useRef(video.watchRate || 0)
  const [serverWatchRate, setServerWatchRate] = useState(video.watchRate || 0)
  const [displayWatchRate, setDisplayWatchRate] = useState(video.watchRate || 0)
  const [serverWatchedSeconds, setServerWatchedSeconds] = useState(Math.floor((video.watchRate || 0) * (video.duration || 0)))
  const [watchCompleted, setWatchCompleted] = useState(Boolean(video.watchCompleted || video.completed))
  const [rankingCompleted, setRankingCompleted] = useState(Boolean(video.completed))
  const [completionState, setCompletionState] = useState(() => getCompletionState(video))
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSubmitTime, setLastSubmitTime] = useState(0)
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [localSavedPosition, setLocalSavedPosition] = useState(initialSavedPosition)
  const [maxAllowedTime, setMaxAllowedTime] = useState(Math.max(initialSavedPosition, 0))
  const [currentTime, setCurrentTime] = useState(0)
  const [toast, setToast] = useState('')

  function showToast(message) {
    setToast(message)
    window.setTimeout(() => setToast(''), 1500)
  }

  useEffect(() => {
    const nextWatchCompleted = Boolean(video.watchCompleted || video.completed)
    completedRef.current = nextWatchCompleted
    setWatchCompleted(nextWatchCompleted)
    setRankingCompleted(Boolean(video.completed))
    setCompletionState(getCompletionState(video))
  }, [video.completed, video.watchCompleted, video.commentCompleted, video.legacyCompleted, video.completionPendingComment, video.completionPendingWatch])

  function updatePendingCount() {
    setPendingCount(pendingRef.current.length)
  }

  function savePosition(value, force = false) {
    const duration = Number(video.duration) || 0
    let position = Math.floor(Number(value) || 0)
    position = Math.max(0, Math.min(position, duration || position))
    if (!completedRef.current) position = Math.min(position, Math.floor(maxAllowedTimeRef.current))
    const now = Date.now()
    if (!force && now - lastPositionSaveTimeRef.current < 2000) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ position, updatedAt: now }))
      lastPositionSaveTimeRef.current = now
      setLocalSavedPosition(position)
    } catch {
      // localStorage can be unavailable in private browsing; playback should continue.
    }
  }

  function updateAllowedTime(value) {
    if (completedRef.current) return
    const next = Math.max(maxAllowedTimeRef.current, Number(value) || 0)
    maxAllowedTimeRef.current = next
    setMaxAllowedTime(next)
  }

  function clampForwardSeek(el) {
    if (completedRef.current || settingCurrentTimeRef.current) return false
    if (el.currentTime <= maxAllowedTimeRef.current + 2) return false
    settingCurrentTimeRef.current = true
    el.currentTime = maxAllowedTimeRef.current
    lastTimeRef.current = maxAllowedTimeRef.current
    showToast('请按顺序观看，不能快进')
    window.setTimeout(() => {
      settingCurrentTimeRef.current = false
    }, 0)
    return true
  }

  function closeSegment(currentTime) {
    const start = segmentStartRef.current
    const end = Math.floor(currentTime)
    if (start !== null && end > start) {
      pendingRef.current.push({ start, end })
      updatePendingCount()
    }
    segmentStartRef.current = null
  }

  async function flush(reason = 'interval') {
    const immediate = ['pause', 'ended', 'hidden', 'unmount', 'beforeunload'].includes(reason)
    const now = Date.now()
    if (submittingRef.current) {
      if (pendingRef.current.length) {
        flushAgainRef.current = true
        flushAgainReasonRef.current = immediate ? reason : 'queued'
      }
      return
    }
    if (!pendingRef.current.length) return
    if (completedRef.current && !immediate) return
    if (!immediate && now - lastSubmitTimeRef.current < 1500) return

    const segments = pendingRef.current.splice(0)
    updatePendingCount()
    submittingRef.current = true
    setSubmitStatus('submitting')
    try {
      const result = await onSubmitProgress(segments)
      const nextWatchRate = result.watchRate || 0
      const nextWatchedSeconds = result.watchedSeconds ?? Math.floor(nextWatchRate * (video.duration || 0))
      const nextWatchCompleted = Boolean(result.watchCompleted || result.completed)
      completedRef.current = nextWatchCompleted
      lastSubmitTimeRef.current = Date.now()
      serverWatchRateRef.current = nextWatchRate
      serverWatchedSecondsRef.current = nextWatchedSeconds
      maxDisplayWatchRateRef.current = Math.max(maxDisplayWatchRateRef.current, nextWatchRate)
      setServerWatchRate(nextWatchRate)
      setDisplayWatchRate(maxDisplayWatchRateRef.current)
      setServerWatchedSeconds(nextWatchedSeconds)
      setWatchCompleted(nextWatchCompleted)
      setRankingCompleted(Boolean(result.completed))
      setCompletionState(getCompletionState(result))
      setLastSubmitTime(lastSubmitTimeRef.current)
      setSubmitStatus('success')
    } catch {
      pendingRef.current.unshift(...segments)
      updatePendingCount()
      setSubmitStatus('failed')
    } finally {
      submittingRef.current = false
      if (flushAgainRef.current) {
        flushAgainRef.current = false
        flush(flushAgainReasonRef.current)
      }
    }
  }

  useEffect(() => {
    const el = videoRef.current
    if (!el || !video.videoUrl) return
    let animationFrame = 0

    const updateDisplayProgress = () => {
      if (!el.paused && !completedRef.current && segmentStartRef.current !== null) {
        const currentSegmentSeconds = Math.max(el.currentTime - segmentStartRef.current, 0)
        const duration = Number(video.duration) || 0
        if (duration > 0) {
          const nextRate = Math.min((serverWatchedSecondsRef.current + currentSegmentSeconds) / duration, 1)
          maxDisplayWatchRateRef.current = Math.max(maxDisplayWatchRateRef.current, serverWatchRateRef.current, nextRate)
          setDisplayWatchRate(maxDisplayWatchRateRef.current)
        }
      }
      animationFrame = window.requestAnimationFrame(updateDisplayProgress)
    }

    const restorePositionIfNeeded = () => {
      if (!restorePendingRef.current) return false
      const restorePosition = completedRef.current ? initialSavedPosition : Math.min(initialSavedPosition, maxAllowedTimeRef.current)
      restorePendingRef.current = false
      if (restorePosition <= 0 || restorePosition >= el.duration) return false
      settingCurrentTimeRef.current = true
      suppressSeekHandlerRef.current = true
      el.currentTime = restorePosition
      lastTimeRef.current = restorePosition
      setCurrentTime(restorePosition)
      window.setTimeout(() => {
        settingCurrentTimeRef.current = false
        suppressSeekHandlerRef.current = false
      }, 0)
      return true
    }

    const startSegment = () => {
      if (completedRef.current) return
      restorePositionIfNeeded()
      segmentStartRef.current = Math.floor(el.currentTime)
      lastTimeRef.current = el.currentTime
      updateAllowedTime(el.currentTime)
    }
    const onLoadedMetadata = () => {
      setCurrentTime(el.currentTime)
    }
    const onTimeUpdate = () => {
      setCurrentTime(el.currentTime)
      if (!el.paused && el.currentTime - lastTimeRef.current > JUMP_THRESHOLD) {
        closeSegment(lastTimeRef.current)
        segmentStartRef.current = completedRef.current ? null : Math.floor(el.currentTime)
      }
      if (!el.paused && segmentStartRef.current === null && !completedRef.current) {
        segmentStartRef.current = Math.floor(el.currentTime)
      }
      if (!el.paused) {
        updateAllowedTime(el.currentTime)
        savePosition(el.currentTime)
      }
      lastTimeRef.current = el.currentTime
    }
    const onSeeking = () => {
      if (suppressSeekHandlerRef.current) return
      closeSegment(lastTimeRef.current)
      clampForwardSeek(el)
    }
    const onSeeked = () => {
      if (suppressSeekHandlerRef.current) return
      const blocked = clampForwardSeek(el)
      if (!el.paused && !completedRef.current) segmentStartRef.current = Math.floor(el.currentTime)
      lastTimeRef.current = el.currentTime
      setCurrentTime(el.currentTime)
      if (!blocked) savePosition(el.currentTime, true)
    }
    const onPause = () => {
      closeSegment(el.currentTime)
      savePosition(el.currentTime, true)
      flush('pause')
    }
    const onEnded = () => {
      closeSegment(el.currentTime)
      savePosition(el.currentTime, true)
      flush('ended')
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        closeSegment(el.currentTime)
        savePosition(el.currentTime, true)
        flush('hidden')
      }
    }
    const onBeforeUnload = () => {
      closeSegment(el.currentTime)
      savePosition(el.currentTime, true)
      flush('beforeunload')
    }

    el.addEventListener('loadedmetadata', onLoadedMetadata)
    el.addEventListener('play', startSegment)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('seeking', onSeeking)
    el.addEventListener('seeked', onSeeked)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('beforeunload', onBeforeUnload)
    if (el.readyState >= 1) onLoadedMetadata()
    animationFrame = window.requestAnimationFrame(updateDisplayProgress)
    const timer = window.setInterval(() => {
      if (el.paused || completedRef.current) return
      closeSegment(el.currentTime)
      if (!completedRef.current) segmentStartRef.current = Math.floor(el.currentTime)
      flush('interval')
    }, submitIntervalSeconds * 1000)

    return () => {
      closeSegment(el.currentTime)
      savePosition(el.currentTime, true)
      flush('unmount')
      window.cancelAnimationFrame(animationFrame)
      window.clearInterval(timer)
      el.removeEventListener('loadedmetadata', onLoadedMetadata)
      el.removeEventListener('play', startSegment)
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('seeking', onSeeking)
      el.removeEventListener('seeked', onSeeked)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [video.id])

  if (!video.videoUrl) {
    return (
      <div className="overflow-hidden rounded-2xl bg-black shadow-sm">
        <div className="flex aspect-video w-full items-center justify-center bg-black px-6 text-center text-sm text-slate-300">暂无视频地址</div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-black shadow-sm">
      <div className="relative bg-black">
        <video ref={videoRef} src={video.videoUrl} poster={video.cover || undefined} controls playsInline webkit-playsinline="true" className="aspect-video w-full bg-black" />
        {toast && <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/75 px-4 py-2 text-sm font-semibold text-white">{toast}</div>}
      </div>
      <div className="bg-white p-3 text-sm">
        <h1 className="mb-3 text-xl font-black leading-tight text-slate-950">{video.title}</h1>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-600">已累计观看 {Math.round((displayWatchRate || 0) * 100)}%</span>
          <span className={rankingCompleted ? 'font-semibold text-emerald-600' : watchCompleted ? 'font-semibold text-amber-600' : 'text-slate-500'}>{completionState.playerLabel}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-rose-600" style={{ width: `${Math.min((displayWatchRate || 0) * 100, 100)}%` }} />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">观看进度按实际观看内容累计，快进跳过部分不计入进度，重复观看同一部分不会重复累计。</p>
        {debug && (
          <div className="mt-3 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">
            <p>duration: {video.duration}</p>
            <p>submitIntervalSeconds: {submitIntervalSeconds}</p>
            <p>serverWatchRate: {(serverWatchRate || 0).toFixed(4)}</p>
            <p>displayWatchRate: {(displayWatchRate || 0).toFixed(4)}</p>
            <p>serverWatchedSeconds: {serverWatchedSeconds}</p>
            <p>localSavedPosition: {localSavedPosition}</p>
            <p>maxAllowedTime: {Math.floor(maxAllowedTime)}</p>
            <p>currentTime: {Math.floor(currentTime)}</p>
            <p>allowSeek: {String(watchCompleted)}</p>
            <p>pendingSegments: {pendingCount}</p>
            <p>lastSubmitTime: {formatSubmitTime(lastSubmitTime)}</p>
            <p>submitStatus: {submitStatus}</p>
            <p>watchCompleted: {String(watchCompleted)}</p>
            <p>rankingCompleted: {String(rankingCompleted)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function getCompletionState(video) {
  if (video?.completed) {
    return { playerLabel: '已完成，已计入排行榜' }
  }
  if (video?.watchCompleted && !video?.commentCompleted && !video?.legacyCompleted) {
    return { playerLabel: '已看完，请留言后计入完成' }
  }
  if (video?.commentCompleted && !video?.watchCompleted) {
    return { playerLabel: '已留言，请看完视频后计入完成' }
  }
  return { playerLabel: '累计观看达到 90% 后完成' }
}
