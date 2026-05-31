/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react'

function getSubmitInterval(duration) {
  if (duration <= 30) return 3000
  if (duration <= 60) return 5000
  if (duration <= 120) return 8000
  return 10000
}

function mergeSegments(segments, duration) {
  const normalized = segments
    .filter((item) => Number.isFinite(item?.start) && Number.isFinite(item?.end))
    .map((item) => ({ start: Math.floor(item.start), end: Math.floor(item.end) }))
    .filter((item) => item.start >= 0 && item.end > item.start)
    .map((item) => ({ start: item.start, end: Math.min(item.end, duration) }))
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const merged = []
  for (const item of normalized) {
    const last = merged[merged.length - 1]
    if (!last || item.start > last.end) merged.push({ ...item })
    else last.end = Math.max(last.end, item.end)
  }
  return merged
}

function calculateWatchedSeconds(segments) {
  return segments.reduce((total, item) => total + item.end - item.start, 0)
}

function formatSubmitTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('zh-CN', { hour12: false })
}

export default function VideoPlayer({ video, debug, onSubmitProgress }) {
  const duration = Math.max(Number(video.duration) || 0, 0)
  const submitInterval = getSubmitInterval(duration)
  const videoRef = useRef(null)
  const segmentStartRef = useRef(null)
  const lastTimeRef = useRef(0)
  const pendingRef = useRef([])
  const localSegmentsRef = useRef([])
  const submittingRef = useRef(false)
  const flushAgainRef = useRef(false)
  const flushAgainReasonRef = useRef('queued')
  const confirmedProgressRef = useRef(video.watchRate || 0)
  const completedRef = useRef(Boolean(video.completed))
  const lastSubmitTimeRef = useRef(0)
  const [confirmedProgress, setConfirmedProgress] = useState(video.watchRate || 0)
  const [localProgress, setLocalProgress] = useState(video.watchRate || 0)
  const [completed, setCompleted] = useState(Boolean(video.completed))
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSubmitTime, setLastSubmitTime] = useState(0)
  const [submitStatus, setSubmitStatus] = useState('idle')

  const displayProgress = Math.max(confirmedProgress, localProgress)

  function updatePendingCount() {
    setPendingCount(pendingRef.current.length)
  }

  function getActiveSegment(currentTime) {
    const start = segmentStartRef.current
    const end = Math.floor(currentTime)
    return start !== null && end > start ? { start, end } : null
  }

  function updateLocalProgress(currentTime) {
    if (!duration) return
    const activeSegment = getActiveSegment(currentTime)
    const segments = activeSegment ? [...localSegmentsRef.current, activeSegment] : localSegmentsRef.current
    const watchedSeconds = calculateWatchedSeconds(mergeSegments(segments, duration))
    setLocalProgress(Math.min(watchedSeconds / duration, 1))
  }

  function closeSegment(currentTime) {
    const activeSegment = getActiveSegment(currentTime)
    if (activeSegment) {
      pendingRef.current.push(activeSegment)
      localSegmentsRef.current.push(activeSegment)
    }
    segmentStartRef.current = null
    updatePendingCount()
    updateLocalProgress(currentTime)
  }

  async function flush(reason = 'interval') {
    const immediate = ['pause', 'ended', 'hidden', 'unmount'].includes(reason)
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
      confirmedProgressRef.current = result.watchRate || 0
      completedRef.current = Boolean(result.completed)
      lastSubmitTimeRef.current = Date.now()
      setConfirmedProgress(confirmedProgressRef.current)
      setLocalProgress((current) => Math.max(current, confirmedProgressRef.current))
      setCompleted(completedRef.current)
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

    const startSegment = () => {
      if (completedRef.current) return
      segmentStartRef.current = Math.floor(el.currentTime)
      lastTimeRef.current = el.currentTime
      updateLocalProgress(el.currentTime)
    }
    const onTimeUpdate = () => {
      if (!el.paused && el.currentTime - lastTimeRef.current > 6) {
        closeSegment(lastTimeRef.current)
        segmentStartRef.current = Math.floor(el.currentTime)
      }
      if (!el.paused && segmentStartRef.current === null && !completedRef.current) {
        segmentStartRef.current = Math.floor(el.currentTime)
      }
      lastTimeRef.current = el.currentTime
      updateLocalProgress(el.currentTime)
    }
    const onSeeking = () => closeSegment(lastTimeRef.current)
    const onSeeked = () => {
      if (!el.paused && !completedRef.current) segmentStartRef.current = Math.floor(el.currentTime)
      lastTimeRef.current = el.currentTime
      updateLocalProgress(el.currentTime)
    }
    const onPause = () => {
      closeSegment(el.currentTime)
      flush('pause')
    }
    const onEnded = () => {
      closeSegment(el.currentTime)
      flush('ended')
    }
    const onVisibilityChange = () => {
      if (document.hidden) {
        closeSegment(el.currentTime)
        flush('hidden')
      }
    }

    el.addEventListener('play', startSegment)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('seeking', onSeeking)
    el.addEventListener('seeked', onSeeked)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const timer = window.setInterval(() => {
      if (el.paused || completedRef.current) return
      closeSegment(el.currentTime)
      if (!completedRef.current) segmentStartRef.current = Math.floor(el.currentTime)
      flush('interval')
    }, submitInterval)

    return () => {
      closeSegment(el.currentTime)
      flush('unmount')
      window.clearInterval(timer)
      el.removeEventListener('play', startSegment)
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('seeking', onSeeking)
      el.removeEventListener('seeked', onSeeked)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [video.id])

  if (!video.videoUrl) {
    return (
      <div className="overflow-hidden rounded-3xl bg-black shadow-sm">
        <div className="flex aspect-video w-full items-center justify-center bg-black px-6 text-center text-sm text-slate-300">暂无视频地址</div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-black shadow-sm">
      <video ref={videoRef} src={video.videoUrl} poster={video.cover || undefined} controls playsInline webkit-playsinline="true" className="aspect-video w-full bg-black" />
      <div className="bg-white p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-600">进度 {Math.round((displayProgress || 0) * 100)}%</span>
          <span className={completed ? 'font-semibold text-emerald-600' : 'text-slate-500'}>{completed ? '已完成' : '观看满 90% 完成'}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-rose-600" style={{ width: `${Math.min(displayProgress * 100, 100)}%` }} />
        </div>
        {debug && (
          <div className="mt-3 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">
            <p>duration: {duration}</p>
            <p>submitInterval: {submitInterval}</p>
            <p>confirmedProgress: {confirmedProgress.toFixed(4)}</p>
            <p>localProgress: {localProgress.toFixed(4)}</p>
            <p>displayProgress: {displayProgress.toFixed(4)}</p>
            <p>pendingSegments: {pendingCount}</p>
            <p>lastSubmitTime: {formatSubmitTime(lastSubmitTime)}</p>
            <p>submitStatus: {submitStatus}</p>
            <p>completed: {String(completed)}</p>
          </div>
        )}
      </div>
    </div>
  )
}
