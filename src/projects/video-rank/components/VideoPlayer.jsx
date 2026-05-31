/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react'

const SUBMIT_INTERVAL = 10000
const JUMP_THRESHOLD = 6

function formatSubmitTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('zh-CN', { hour12: false })
}

export default function VideoPlayer({ video, debug, onSubmitProgress }) {
  const videoRef = useRef(null)
  const segmentStartRef = useRef(null)
  const lastTimeRef = useRef(0)
  const pendingRef = useRef([])
  const submittingRef = useRef(false)
  const flushAgainRef = useRef(false)
  const flushAgainReasonRef = useRef('queued')
  const completedRef = useRef(Boolean(video.completed))
  const lastSubmitTimeRef = useRef(0)
  const [watchRate, setWatchRate] = useState(video.watchRate || 0)
  const [completed, setCompleted] = useState(Boolean(video.completed))
  const [pendingCount, setPendingCount] = useState(0)
  const [lastSubmitTime, setLastSubmitTime] = useState(0)
  const [submitStatus, setSubmitStatus] = useState('idle')

  function updatePendingCount() {
    setPendingCount(pendingRef.current.length)
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
      completedRef.current = Boolean(result.completed)
      lastSubmitTimeRef.current = Date.now()
      setWatchRate(result.watchRate || 0)
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
    }
    const onTimeUpdate = () => {
      if (!el.paused && el.currentTime - lastTimeRef.current > JUMP_THRESHOLD) {
        closeSegment(lastTimeRef.current)
        segmentStartRef.current = completedRef.current ? null : Math.floor(el.currentTime)
      }
      if (!el.paused && segmentStartRef.current === null && !completedRef.current) {
        segmentStartRef.current = Math.floor(el.currentTime)
      }
      lastTimeRef.current = el.currentTime
    }
    const onSeeking = () => closeSegment(lastTimeRef.current)
    const onSeeked = () => {
      if (!el.paused && !completedRef.current) segmentStartRef.current = Math.floor(el.currentTime)
      lastTimeRef.current = el.currentTime
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
    const onBeforeUnload = () => {
      closeSegment(el.currentTime)
      flush('beforeunload')
    }

    el.addEventListener('play', startSegment)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('seeking', onSeeking)
    el.addEventListener('seeked', onSeeked)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('beforeunload', onBeforeUnload)
    const timer = window.setInterval(() => {
      if (el.paused || completedRef.current) return
      closeSegment(el.currentTime)
      if (!completedRef.current) segmentStartRef.current = Math.floor(el.currentTime)
      flush('interval')
    }, SUBMIT_INTERVAL)

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
      <video ref={videoRef} src={video.videoUrl} poster={video.cover || undefined} controls playsInline webkit-playsinline="true" className="aspect-video w-full bg-black" />
      <div className="bg-white p-3 text-sm">
        <h1 className="mb-3 text-xl font-black leading-tight text-slate-950">{video.title}</h1>
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-600">已累计观看 {Math.round((watchRate || 0) * 100)}%</span>
          <span className={completed ? 'font-semibold text-emerald-600' : 'text-slate-500'}>{completed ? '已完成' : '累计观看达到 90% 后完成'}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-rose-600" style={{ width: `${Math.min((watchRate || 0) * 100, 100)}%` }} />
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">观看进度按实际观看内容累计，快进跳过部分不计入进度，重复观看同一部分不会重复累计。</p>
        {debug && (
          <div className="mt-3 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">
            <p>duration: {video.duration}</p>
            <p>submitInterval: {SUBMIT_INTERVAL}</p>
            <p>watchRate: {(watchRate || 0).toFixed(4)}</p>
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
