import { useEffect, useMemo, useRef } from 'react'

const DEFAULT_SIZE = 520
const DEFAULT_COLORS = ['#EEF6FF', '#F7FAFF']
const DEFAULT_WHEEL_SLOT_COUNT = 4
const SEGMENT_LABEL_MAX_WIDTH_RATIO = 0.56
const SEGMENT_LABEL_LINE_HEIGHT = 30

function getNormalizedTargetRotation(targetIndex, segmentCount) {
  const segmentAngle = 360 / segmentCount
  return (360 - targetIndex * segmentAngle) % 360
}

function normalizeSegments(segments) {
  const slotCount = Math.max(DEFAULT_WHEEL_SLOT_COUNT, segments?.length || 0)
  const fixedSegments = Array.from({ length: slotCount }, (_, index) => (
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

function wrapSegmentLabel(context, label, maxWidth) {
  const rawText = String(label || '').trim()
  if (!rawText) return []

  const paragraphs = rawText.split('\n')
  const lines = []

  paragraphs.forEach((paragraph) => {
    const text = paragraph.trim()
    if (!text) {
      lines.push('')
      return
    }

    let currentLine = ''
    for (const char of text) {
      const nextLine = `${currentLine}${char}`
      if (currentLine && context.measureText(nextLine).width > maxWidth) {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = nextLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }
  })

  return lines
}

function getSegmentLabelStyle(segment, segmentCount) {
  const fontSize = segmentCount > DEFAULT_WHEEL_SLOT_COUNT ? 22 : 26
  const weight = segment.prize ? 800 : 700
  return {
    font: `${weight} ${fontSize}px sans-serif`,
    lineHeight: segmentCount > DEFAULT_WHEEL_SLOT_COUNT ? 26 : SEGMENT_LABEL_LINE_HEIGHT,
    maxWidthRatio: segmentCount > DEFAULT_WHEEL_SLOT_COUNT ? 0.48 : SEGMENT_LABEL_MAX_WIDTH_RATIO,
    labelRadiusRatio: segmentCount > DEFAULT_WHEEL_SLOT_COUNT ? 0.58 : 0.54,
  }
}

export default function Wheel({
  segments,
  targetIndex,
  drawing,
  draw,
  spinKey,
  assets,
  onDraw,
  onOpenPrize,
  onFinish,
}) {
  const wheelSegments = useMemo(() => normalizeSegments(segments), [segments])
  const segmentCount = wheelSegments.length
  const remainingDrawCount = draw ? 0 : 1
  const drawButtonText = drawing ? '抽奖中' : '立即抽奖'
  const initialRotation = Number.isInteger(targetIndex) ? getNormalizedTargetRotation(targetIndex, segmentCount) : 0
  const drawClickLockedRef = useRef(false)
  const drawButtonRef = useRef(null)
  const canvasRef = useRef(null)
  const wheelDiscRef = useRef(null)
  const frameRef = useRef(0)
  const onFinishRef = useRef(onFinish)
  const rotationRef = useRef(initialRotation)
  const drawButtonDisabled = drawing || Boolean(draw)

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
    const segmentAngle = (Math.PI * 2) / segmentCount
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
      const labelStyle = getSegmentLabelStyle(segment, segmentCount)
      context.font = labelStyle.font
      const labelLines = wrapSegmentLabel(context, segment.label, radius * labelStyle.maxWidthRatio)
      const totalHeight = Math.max(1, labelLines.length) * labelStyle.lineHeight
      labelLines.forEach((line, lineIndex) => {
        const y = lineIndex * labelStyle.lineHeight - (totalHeight - labelStyle.lineHeight) / 2
        context.fillText(line, radius * labelStyle.labelRadiusRatio, y)
      })
      context.restore()
    })
  }, [segmentCount, wheelSegments])

  useEffect(() => {
    if (!wheelDiscRef.current) return
    wheelDiscRef.current.style.transform = `rotate(${rotationRef.current}deg)`
  }, [])

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  useEffect(() => {
    if (drawing || draw) return
    drawClickLockedRef.current = false
    if (drawButtonRef.current) {
      drawButtonRef.current.disabled = false
    }
  }, [draw, drawing])

  useEffect(() => {
    if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= segmentCount || !spinKey) return
    const currentRotation = rotationRef.current
    const normalizedCurrent = ((currentRotation % 360) + 360) % 360
    const normalizedTarget = getNormalizedTargetRotation(targetIndex, segmentCount)
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
      onFinishRef.current?.()
    }

    frameRef.current = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frameRef.current)
  }, [reducedMotion, segmentCount, spinKey, targetIndex])

  function handleDrawClick() {
    if (drawButtonDisabled || drawClickLockedRef.current) return
    drawClickLockedRef.current = true
    if (drawButtonRef.current) {
      drawButtonRef.current.disabled = true
    }
    onDraw?.()
  }

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
              style={{ width: DEFAULT_SIZE, height: DEFAULT_SIZE }}
            >
              <canvas ref={canvasRef} className="block rounded-full" />
            </div>
          </div>
        </div>
        <button
          ref={drawButtonRef}
          className="absolute left-1/2 top-1/2 z-[4] flex h-[156px] w-[156px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-70"
          type="button"
          disabled={drawButtonDisabled}
          onClick={handleDrawClick}
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
