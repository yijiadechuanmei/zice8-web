import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_SIZE = 520
const DEFAULT_COLORS = ['#fff8e5', '#f8fbff']
const WHEEL_SLOT_COUNT = 5

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
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const rotationRef = useRef(0)
  const [rotation, setRotation] = useState(() =>
    Number.isInteger(targetIndex) ? getNormalizedTargetRotation(targetIndex, WHEEL_SLOT_COUNT) : 0,
  )

  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    rotationRef.current = rotation
  }, [rotation])

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
      context.fillStyle = segment.background || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
      context.fill()
      context.strokeStyle = '#d8dee8'
      context.lineWidth = 2
      context.stroke()

      context.save()
      context.translate(radius, radius)
      context.rotate(startAngle + segmentAngle / 2)
      context.textAlign = 'center'
      context.fillStyle = '#171717'
      context.font = '700 26px sans-serif'
      String(segment.label || '')
        .split('\n')
        .forEach((line, lineIndex) => {
          context.fillText(line, radius * 0.58, -12 + lineIndex * 30)
        })
      context.restore()
    })
  }, [wheelSegments])

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
      setRotation(nextRotation)
      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick)
        return
      }
      onFinish?.()
    }

    frameRef.current = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameRef.current)
  }, [onFinish, reducedMotion, spinKey, targetIndex])

  const drawCount = draw?.alreadyDrawn ? 0 : canDraw ? 1 : 0
  return (
    <>
      <div className="mt-[26px] inline-flex min-h-[64px] items-center justify-center rounded-full bg-slate-100 px-[28px] text-[28px] font-bold text-slate-800">
        抽奖次数 {drawCount} 次
      </div>
      <div className="pql-wheel-frame mt-[30px]">
        <img className="pql-wheel-frame__ring" src={assets.wheelRing} alt="" aria-hidden="true" />
        <img className="pql-wheel-frame__pointer" src={assets.wheelPointer} alt="" aria-hidden="true" />
        <div className="pql-wheel-frame__canvas">
          <div className="relative" style={{ width: DEFAULT_SIZE, height: DEFAULT_SIZE }}>
            <div
              className="overflow-hidden rounded-full"
              style={{ width: DEFAULT_SIZE, height: DEFAULT_SIZE, transform: `rotate(${rotation}deg)` }}
            >
              <canvas ref={canvasRef} className="block rounded-full" />
            </div>
          </div>
        </div>
        <button
          className="absolute left-1/2 top-1/2 z-[4] flex h-[156px] w-[156px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          disabled={!canDraw || drawing || Boolean(draw?.alreadyDrawn)}
          onClick={onDraw}
          aria-label={drawing ? '抽奖中' : '立即抽奖'}
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
