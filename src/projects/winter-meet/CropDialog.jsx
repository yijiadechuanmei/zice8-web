import { useEffect, useRef, useState } from 'react'

export default function CropDialog({ source, busy, onCancel, onConfirm }) {
  const frameRef = useRef(null)
  const dragRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

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
  const imageWidth = source.width * baseScale * zoom
  const imageHeight = source.height * baseScale * zoom
  const maxX = Math.max(0, (imageWidth - size.width) / 2)
  const maxY = Math.max(0, (imageHeight - size.height) / 2)
  const clamp = (value, max) => Math.max(-max, Math.min(max, value))
  const x = clamp(offset.x, maxX)
  const y = clamp(offset.y, maxY)

  const move = (event) => {
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId || busy) return
    setOffset({ x: clamp(drag.x + event.clientX - drag.startX, maxX), y: clamp(drag.y + event.clientY - drag.startY, maxY) })
  }

  const confirm = () => {
    if (!size.width || busy) return
    onConfirm({ frameWidth: size.width, frameHeight: size.height, imageWidth, imageHeight, x, y })
  }

  return <div className="wm-crop-dialog" role="dialog" aria-modal="true" aria-label="裁切生活照">
    <div className="wm-crop-box">
      <h2>裁切生活照</h2>
      <p>拖动照片调整位置，裁切比例与展示照片一致</p>
      <div className="wm-crop-frame" ref={frameRef}
        onPointerDown={(event) => { if (busy) return; event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y } }}
        onPointerMove={move}
        onPointerUp={() => { dragRef.current = null }}
        onPointerCancel={() => { dragRef.current = null }}>
        {size.width > 0 && <img src={source.url} alt="待裁切的生活照" draggable="false" style={{ width: imageWidth, height: imageHeight, left: (size.width - imageWidth) / 2 + x, top: (size.height - imageHeight) / 2 + y }} />}
      </div>
      <label className="wm-crop-zoom">缩放 <input type="range" min="1" max="2.5" step="0.01" value={zoom} disabled={busy} onChange={(event) => setZoom(Number(event.target.value))} aria-label="照片缩放" /></label>
      <div className="wm-crop-actions"><button type="button" onClick={onCancel} disabled={busy}>取消</button><button type="button" onClick={confirm} disabled={busy}>{busy ? '上传中…' : '确认裁切并上传'}</button></div>
    </div>
  </div>
}
