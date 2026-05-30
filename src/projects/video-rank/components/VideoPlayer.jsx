/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react'

export default function VideoPlayer({ video, onSubmitProgress }) {
  const videoRef = useRef(null)
  const segmentStartRef = useRef(null)
  const lastTimeRef = useRef(0)
  const pendingRef = useRef([])
  const submittingRef = useRef(false)
  const [progress, setProgress] = useState({ completed: video.completed, watchRate: video.watchRate || 0 })

  function closeSegment(currentTime) {
    const start = segmentStartRef.current
    const end = Math.floor(currentTime)
    if (start !== null && end > start) pendingRef.current.push({ start, end })
    segmentStartRef.current = null
  }

  async function flush() {
    if (submittingRef.current || !pendingRef.current.length) return
    const segments = pendingRef.current.splice(0)
    submittingRef.current = true
    try {
      const result = await onSubmitProgress(segments)
      setProgress({ completed: result.completed, watchRate: result.watchRate })
    } catch {
      pendingRef.current.unshift(...segments)
    } finally {
      submittingRef.current = false
    }
  }

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const onPlay = () => {
      segmentStartRef.current = Math.floor(el.currentTime)
      lastTimeRef.current = el.currentTime
    }
    const onTimeUpdate = () => {
      if (!el.paused && el.currentTime - lastTimeRef.current > 6) {
        closeSegment(lastTimeRef.current)
        segmentStartRef.current = Math.floor(el.currentTime)
      }
      lastTimeRef.current = el.currentTime
    }
    const onSeeking = () => closeSegment(lastTimeRef.current)
    const onSeeked = () => {
      if (!el.paused) segmentStartRef.current = Math.floor(el.currentTime)
      lastTimeRef.current = el.currentTime
    }
    const onPause = () => { closeSegment(el.currentTime); flush() }
    const onEnded = () => { closeSegment(el.currentTime); flush() }

    el.addEventListener('play', onPlay)
    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('seeking', onSeeking)
    el.addEventListener('seeked', onSeeked)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    const timer = window.setInterval(() => {
      if (!el.paused) closeSegment(el.currentTime)
      if (!el.paused) segmentStartRef.current = Math.floor(el.currentTime)
      flush()
    }, 10000)
    return () => {
      closeSegment(el.currentTime)
      flush()
      window.clearInterval(timer)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('seeking', onSeeking)
      el.removeEventListener('seeked', onSeeked)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [video.id])

  return (
    <div className="overflow-hidden rounded-3xl bg-black">
      <video ref={videoRef} src={video.videoUrl} poster={video.cover || undefined} controls playsInline webkit-playsinline="true" className="aspect-video w-full bg-black" />
      <div className="flex items-center justify-between bg-white p-3 text-sm">
        <span className="text-slate-600">进度 {Math.round((progress.watchRate || 0) * 100)}%</span>
        <span className={progress.completed ? 'font-semibold text-emerald-600' : 'text-slate-500'}>{progress.completed ? '已完成' : '观看满 90% 完成'}</span>
      </div>
    </div>
  )
}
