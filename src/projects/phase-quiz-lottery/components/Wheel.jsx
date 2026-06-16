import { useEffect, useMemo, useRef, useState } from 'react'

const DEFAULT_SIZE = 520
const DEFAULT_COLORS = ['#f9fcff', '#eaf3ff']

function getNormalizedTargetRotation(targetIndex, segmentCount) {
  const segmentAngle = 360 / segmentCount
  return (360 - targetIndex * segmentAngle) % 360
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
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const rotationRef = useRef(0)
  const [rotation, setRotation] = useState(() =>
    Number.isInteger(targetIndex) ? getNormalizedTargetRotation(targetIndex, segments.length) : 0,
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
    const segmentAngle = (Math.PI * 2) / segments.length
    const baseStart = -Math.PI / 2 - segmentAngle / 2

    segments.forEach((segment, index) => {
      const startAngle = baseStart + index * segmentAngle
      const endAngle = startAngle + segmentAngle
      context.beginPath()
      context.moveTo(radius, radius)
      context.arc(radius, radius, radius - 8, startAngle, endAngle)
      context.closePath()
      context.fillStyle = segment.background || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
      context.fill()

      context.save()
      context.translate(radius, radius)
      context.rotate(startAngle + segmentAngle / 2)
      context.textAlign = 'center'
      context.fillStyle = segment.textColor || '#2675f5'
      context.font = '700 28px sans-serif'
      String(segment.label || '')
        .split('\n')
        .forEach((line, lineIndex) => {
          context.fillText(line, radius * 0.6, -26 + lineIndex * 30)
        })
      context.restore()
    })
  }, [segments])

  useEffect(() => {
    if (!Number.isInteger(targetIndex) || !spinKey) return
    const currentRotation = rotationRef.current
    const normalizedCurrent = ((currentRotation % 360) + 360) % 360
    const normalizedTarget = getNormalizedTargetRotation(targetIndex, segments.length)
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
  }, [onFinish, reducedMotion, segments.length, spinKey, targetIndex])

  const drawCount = draw?.alreadyDrawn ? 0 : canDraw ? 1 : 0
  const buttonLabel = draw?.alreadyDrawn
    ? draw?.won
      ? '已开奖'
      : draw?.soldOut
        ? '已抽完'
        : '已完成'
    : drawing
      ? '抽奖中...'
      : '立即抽奖'

  return (
    <>
      <div className="inline-flex min-h-12 items-center justify-center rounded-full bg-blue-50 px-6 text-lg font-bold text-slate-800 shadow-sm">
        抽奖次数 {drawCount} 次
      </div>
      <div className="pql-wheel-frame">
        <img className="pql-wheel-frame__ring" src={assets.wheelBaseRing} alt="" aria-hidden="true" />
        <img className="pql-wheel-frame__pointer" src={assets.wheelPointer} alt="" aria-hidden="true" />
        <div className="pql-wheel-frame__canvas">
          <div className="relative" style={{ width: DEFAULT_SIZE, height: DEFAULT_SIZE }}>
            <div
              className="overflow-hidden rounded-full"
              style={{ width: DEFAULT_SIZE, height: DEFAULT_SIZE, transform: `rotate(${rotation}deg)` }}
            >
              <canvas ref={canvasRef} className="block rounded-full" />
              {segments.map((segment, index) => {
                const angle = -90 + (360 / segments.length) * index
                const radius = DEFAULT_SIZE * 0.32
                const x = Math.cos((angle * Math.PI) / 180) * radius
                const y = Math.sin((angle * Math.PI) / 180) * radius
                return (
                  <div
                    key={`${segment.label}-${index}`}
                    className="pointer-events-none absolute h-[92px] w-[92px] -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
                  >
                    {segment.imageUrl ? (
                      <img className="h-[88px] w-[88px] object-contain" src={segment.imageUrl} alt="" aria-hidden="true" />
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <button
          className="absolute left-1/2 top-[55%] z-[4] h-[164px] w-[164px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_30%_24%,#fde68a_0%,#fb923c_72%,#ea580c_100%)] text-3xl leading-tight font-extrabold text-white shadow-[0_22px_44px_rgba(251,146,60,0.34)] ring-8 ring-white/80 disabled:cursor-not-allowed disabled:opacity-60 md:h-[246px] md:w-[246px] md:text-5xl"
          type="button"
          disabled={!canDraw || drawing || Boolean(draw?.alreadyDrawn)}
          onClick={onDraw}
        >
          <img
            className="pointer-events-none absolute inset-[-12px] h-[calc(100%+24px)] w-[calc(100%+24px)] object-contain opacity-60"
            src={assets.wheelCenterGlow}
            alt=""
            aria-hidden="true"
          />
          <span className="relative z-[1] whitespace-pre-line">{buttonLabel}</span>
        </button>
      </div>
      <div className="mt-10">
        <button
          className="min-h-14 w-full rounded-full border-2 border-blue-500 bg-white px-6 py-4 text-lg font-bold text-blue-500 shadow-sm transition"
          type="button"
          onClick={onOpenPrize}
        >
          查看我的奖品
        </button>
      </div>
    </>
  )
}
