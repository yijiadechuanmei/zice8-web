import { useEffect, useMemo, useRef } from 'react'

const DEFAULT_SIZE = 520
const DEFAULT_COLORS = ['#EEF6FF', '#F7FAFF']
const WHEEL_SLOT_COUNT = 4

function getNormalizedTargetRotation(targetIndex, segmentCount) {
  const segmentAngle = 360 / segmentCount
  return (360 - targetIndex * segmentAngle) % 360
}

function normalizeSegments(segments) {
  const fixedSegments = Array.from({ length: WHEEL_SLOT_COUNT }, (_, index) => (
    segments?.[index] || { label: '谢谢参与', background: DEFAULT_COLORS[index % DEFAULT_COLORS.length] }
  ))
  return fixedSegments
}

function getSegmentFill(context, segment, index) {
  if (segment?.prize) {
    const gradient = context.createLinearGradient(0, 0, DEFAULT_SIZE, DEFAULT_SIZE)
    gradient.addColorStop(0, '#FFE7A3')
    gradient.addColorStop(0.52, '#D9ECFF')
    gradient.addColorStop(1, '#2F80FF')
    return gradient
  }
  return segment.background || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3
}

export default function Wheel({
  segments,
  targetIndex,
  drawing,
  draw,
  canDraw,
  spinKey,
  assets,
  onDraw,
  onOpenPrize,
  onFinish,
}) {
  const wheelSegments = useMemo(() => normalizeSegments(segments), [segments])
  const remainingDrawCount = draw?.alreadyDrawn ? 0 : canDraw ? 1 : 0
  const drawButtonText = drawing ? '抽奖中' : '立即抽奖'
  const initialRotation = Number.isInteger(targetIndex) ? getNormalizedTargetRotation(targetIndex, WHEEL_SLOT_COUNT) : 0
  const canvasRef = useRef(null)
  const wheelDiscRef = useRef(null)
  const frameRef = useRef(0)
  const rotationRef = useRef(initialRotation)

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = DEFAULT_SIZE * dpr
    canvas.height = DEFAULT_SIZE * dpr
    canvas.style.width = `${DEFAULT_SIZE}px`
    canvas.style.height = `${DEFAULT_SIZE}px`
    context.scale(dpr, dpr)
    context.clearRect(0, 0, DEFAULT_SIZE, DEFAULT_SIZE)

    const radius = DEFAULT_SIZE / 2
    const segmentAngle = (Math.PI * 2) / WHEEL_SLOT_COUNT
    const baseStart = -Math.PI / 2 - segmentAngle / 2

    wheelSegments.forEach((segment, index) => {
      const startAngle = baseStart + index * segmentAngle
      const endAngle = startAngle + segmentAngle
      context.beginPath()
      context.moveTo(radius, radius)
      context.arc(radius, radius, radius - 4, startAngle, endAngle)
      context.closePath()
      context.fillStyle = getSegmentFill(context, segment, index)
      context.fill()
      context.strokeStyle = '#D8E7FF'
      context.lineWidth = 2
      context.stroke()

      context.save()
      context.translate(radius, radius)
      context.rotate(startAngle + segmentAngle / 2)
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillStyle = segment.prize ? '#0F172A' : '#2F80FF'
      context.font = segment.prize ? '800 26px sans-serif' : '700 26px sans-serif'
      String(segment.label || '')
        .split('\n')
        .forEach((line, lineIndex) => {
          context.fillText(line, radius * 0.54, lineIndex * 30)
        })
      context.restore()
    })
  }, [wheelSegments])

  useEffect(() => {
    if (!wheelDiscRef.current) return
    wheelDiscRef.current.style.transform = `rotate(${rotationRef.current}deg)`
  }, [])

  useEffect(() => {
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= WHEEL_SLOT_COUNT || !spinKey) return
    const currentRotation = rotationRef.current
    const normalizedCurrent = ((currentRotation % 360) + 360) % 360
    const normalizedTarget = getNormalizedTargetRotation(targetIndex, WHEEL_SLOT_COUNT)
    let delta = normalizedTarget - normalizedCurrent
    if (delta < 0) delta += 360
    const finalRotation = currentRotation + (reducedMotion ? 1 : 6) * 360 + delta
    const start = performance.now()

    window.cancelAnimationFrame(frameRef.current)
    function tick(now) {
      const progress = Math.min(1, (now - start) / 4600)
      const nextRotation = currentRotation + (finalRotation - currentRotation) * easeOutCubic(progress)
      rotationRef.current = nextRotation
      if (wheelDiscRef.current) {
        wheelDiscRef.current.style.transform = `rotate(${nextRotation}deg)`
      }
      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick)
        return
      }
      onFinish?.()
    }

    frameRef.current = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameRef.current)
  }, [onFinish, reducedMotion, spinKey, targetIndex])

  return (
    <>
      <div className="mt-[18px] text-[26px] font-bold text-slate-700">剩余抽奖次数：{remainingDrawCount}</div>
      <div className="pql-wheel-frame mt-[20px]">
        <img className="pql-wheel-frame__ring" src={assets.wheelRing} alt="" aria-hidden="true" />
        <img className="pql-wheel-frame__pointer" src={assets.wheelPointer} alt="" aria-hidden="true" />
        <div className="pql-wheel-frame__canvas">
          <div className="relative" style={{ width: DEFAULT_SIZE, height: DEFAULT_SIZE }}>
            <div
              ref={wheelDiscRef}
              className="pql-wheel-frame__disc overflow-hidden rounded-full"
              style={{ width: DEFAULT_SIZE, height: DEFAULT_SIZE, transform: `rotate(${initialRotation}deg)` }}
            >
              <canvas ref={canvasRef} className="block rounded-full" />
            </div>
          </div>
        </div>
        <button
          className="absolute left-1/2 top-1/2 z-[4] flex h-[156px] w-[156px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          disabled={!canDraw || drawing || Boolean(draw?.alreadyDrawn)}
          onClick={onDraw}
          aria-label={drawButtonText}
        >
          <img className="h-full w-full object-contain" src={assets.wheelCenterButton} alt="" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-[30px]">
        <button
          className="min-h-[88px] w-full rounded-full bg-slate-100 px-6 py-4 text-[28px] font-bold text-slate-800"
          type="button"
          onClick={onOpenPrize}
        >
          查看我的奖品
        </button>
      </div>
    </>
  )
}
