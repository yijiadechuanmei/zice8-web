import { useEffect, useRef, useState } from 'react'

const clamp = (value, max) => Math.max(-max, Math.min(max, value))
const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

export default function CropDialog({ source, busy, onCancel, onConfirm }) {
  const frameRef = useRef(null)
  const pointers = useRef(new Map())
  const gesture = useRef(null)
  const viewRef = useRef({ zoom: 1, x: 0, y: 0 })
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 })

  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const measure = () => {
      const rect = frame.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [])

  const baseScale = size.width && size.height ? Math.max(size.width / source.width, size.height / source.height) : 0
  const bounds = (zoom) => ({
    x: Math.max(0, (source.width * baseScale * zoom - size.width) / 2),
    y: Math.max(0, (source.height * baseScale * zoom - size.height) / 2),
  })
  const updateView = (zoom, x, y) => {
    const limit = bounds(zoom)
    const next = { zoom, x: clamp(x, limit.x), y: clamp(y, limit.y) }
    viewRef.current = next
    setView(next)
  }
  const imageWidth = source.width * baseScale * view.zoom
  const imageHeight = source.height * baseScale * view.zoom
  const limit = bounds(view.zoom)
  const x = clamp(view.x, limit.x)
  const y = clamp(view.y, limit.y)

  const startGesture = () => {
    const points = [...pointers.current.values()]
    const current = viewRef.current
    if (points.length === 1) {
      gesture.current = { mode: 'pan', point: points[0], ...current }
    } else if (points.length >= 2) {
      gesture.current = { mode: 'pinch', center: midpoint(points[0], points[1]), distance: distance(points[0], points[1]), ...current }
    } else {
      gesture.current = null
    }
  }
  const pointerDown = (event) => {
    if (busy) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    startGesture()
  }
  const pointerMove = (event) => {
    if (busy || !pointers.current.has(event.pointerId)) return
    event.preventDefault()
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const points = [...pointers.current.values()]
    const start = gesture.current
    if (points.length === 1 && start?.mode === 'pan') {
      updateView(start.zoom, start.x + points[0].x - start.point.x, start.y + points[0].y - start.point.y)
    } else if (points.length >= 2 && start?.mode === 'pinch' && start.distance > 0) {
      const center = midpoint(points[0], points[1])
      const zoom = Math.max(1, Math.min(3, start.zoom * distance(points[0], points[1]) / start.distance))
      const ratio = zoom / start.zoom
      const frame = frameRef.current.getBoundingClientRect()
      const frameCenterX = frame.left + frame.width / 2
      const frameCenterY = frame.top + frame.height / 2
      updateView(zoom,
        center.x - frameCenterX - (start.center.x - frameCenterX - start.x) * ratio,
        center.y - frameCenterY - (start.center.y - frameCenterY - start.y) * ratio)
    }
  }
  const pointerEnd = (event) => {
    pointers.current.delete(event.pointerId)
    startGesture()
  }
  const confirm = () => {
    if (!size.width || busy) return
    onConfirm({ frameWidth: size.width, frameHeight: size.height, imageWidth, imageHeight, x, y })
  }

  return <div className="wm-crop-dialog" role="dialog" aria-modal="true" aria-label="裁切生活照">
    <div className="wm-crop-box">
      <h2>裁切生活照</h2>
      <p>单指移动、双指缩放，裁切比例与列表照片一致</p>
      <div className="wm-crop-frame" ref={frameRef}
        onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
        {size.width > 0 && <img src={source.url} alt="待裁切的生活照" draggable="false" style={{ width: imageWidth, height: imageHeight, left: (size.width - imageWidth) / 2 + x, top: (size.height - imageHeight) / 2 + y }} />}
      </div>
      <div className="wm-crop-actions"><button type="button" onClick={onCancel} disabled={busy}>取消</button><button type="button" onClick={confirm} disabled={busy}>{busy ? '上传中…' : '确认裁切并上传'}</button></div>
    </div>
  </div>
}
