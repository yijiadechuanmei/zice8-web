import { useEffect, useRef, useState } from 'react'

const GRAVITY = 132
const MAX_SPIN_SPEED = 48
const REST_DELAY = 0.16
const REST_SPEED = 3
const DROP_LEVEL_SEQUENCE = [0, 0, 1, 1, 2, 2, 0, 1, 2, 0, 2, 1]
const TREE_FRUITS = [3, 4]
const STAGES = [
  { name: '绿种', className: 'seed-green', radius: 6.5 },
  { name: '棕种', className: 'seed-brown', radius: 8.2 },
  { name: '树苗', className: 'sapling', radius: 10.4 },
  { name: '苹果', className: 'apple', radius: 12.3 },
  { name: '梨', className: 'pear', radius: 13.2 },
]

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function createItem(id, level, x, y, options = {}) {
  return {
    id,
    level,
    x,
    y,
    vx: options.vx ?? 0,
    vy: options.vy ?? 0,
    rotation: options.rotation ?? ((id * 29) % 36) - 18,
    angularVelocity: options.angularVelocity ?? (id % 2 === 0 ? -5 : 5),
    restTime: options.restTime ?? 0,
  }
}

function drawCircleItem(context, radius, colors, stroke) {
  const shade = context.createRadialGradient(-radius * 0.34, -radius * 0.4, radius * 0.06, 0, 0, radius)
  colors.forEach(([stop, color]) => shade.addColorStop(stop, color))
  context.fillStyle = shade
  context.strokeStyle = stroke
  context.lineWidth = Math.max(1, radius * 0.06)
  context.beginPath()
  context.arc(0, 0, radius, 0, Math.PI * 2)
  context.fill()
  context.stroke()
}

function drawMergeItem(context, item, boardWidth, boardHeight, logicalHeight, preview = false) {
  const stage = STAGES[item.level]
  const radius = (stage.radius / 100) * boardWidth
  const x = (item.x / 100) * boardWidth
  const y = (item.y / logicalHeight) * boardHeight
  context.save()
  context.translate(x, y)
  context.rotate((item.rotation * Math.PI) / 180)
  context.globalAlpha = preview ? 0.92 : 1
  context.shadowColor = 'rgba(39, 67, 24, 0.24)'
  context.shadowBlur = Math.max(2, radius * 0.2)
  context.shadowOffsetY = Math.max(2, radius * 0.14)

  if (stage.className === 'seed-green') {
    drawCircleItem(context, radius, [
      [0, '#f2f7b9'], [0.17, '#bdd66a'], [0.57, '#80a744'], [1, '#4b742c'],
    ], '#52782e')
    context.fillStyle = 'rgba(58, 92, 28, 0.28)'
    context.beginPath()
    context.arc(radius * 0.3, radius * 0.28, radius * 0.15, 0, Math.PI * 2)
    context.fill()
  } else if (stage.className === 'seed-brown') {
    drawCircleItem(context, radius, [
      [0, '#ffd596'], [0.18, '#be773e'], [0.6, '#8a461f'], [1, '#5e2e19'],
    ], '#713c1d')
    context.strokeStyle = 'rgba(255, 227, 179, 0.3)'
    context.lineWidth = Math.max(1, radius * 0.08)
    for (let offset = -radius; offset <= radius; offset += radius * 0.38) {
      context.beginPath()
      context.moveTo(offset, -radius * 0.72)
      context.lineTo(offset + radius * 0.85, radius * 0.72)
      context.stroke()
    }
  } else if (stage.className === 'sapling') {
    context.fillStyle = 'rgba(70, 63, 22, 0.26)'
    context.beginPath()
    context.ellipse(0, radius * 0.65, radius * 0.84, radius * 0.16, 0, 0, Math.PI * 2)
    context.fill()
    context.strokeStyle = '#75441f'
    context.lineWidth = Math.max(4, radius * 0.28)
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(0, radius * 0.56)
    context.lineTo(-radius * 0.08, -radius * 0.6)
    context.stroke()
    context.fillStyle = '#7ea53e'
    for (const [leafX, leafY, leafAngle] of [[-0.52, -0.24, -0.6], [0.45, 0.05, 0.48], [0.18, -0.7, -0.1]]) {
      context.save()
      context.translate(leafX * radius, leafY * radius)
      context.rotate(leafAngle)
      context.beginPath()
      context.ellipse(0, 0, radius * 0.48, radius * 0.23, 0, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }
  } else if (stage.className === 'apple') {
    drawCircleItem(context, radius, [
      [0, '#fff0c7'], [0.14, '#f77f60'], [0.58, '#df4934'], [1, '#ad2920'],
    ], '#922c20')
    context.strokeStyle = '#75421e'
    context.lineWidth = Math.max(2, radius * 0.11)
    context.beginPath()
    context.moveTo(0, -radius * 0.84)
    context.lineTo(radius * 0.08, -radius * 1.28)
    context.stroke()
    context.fillStyle = '#638c32'
    context.beginPath()
    context.ellipse(radius * 0.28, -radius * 1.04, radius * 0.34, radius * 0.14, -0.45, 0, Math.PI * 2)
    context.fill()
  } else {
    const pear = context.createRadialGradient(-radius * 0.3, -radius * 0.42, radius * 0.06, 0, radius * 0.1, radius * 1.08)
    pear.addColorStop(0, '#f5f7b1')
    pear.addColorStop(0.2, '#dbe670')
    pear.addColorStop(0.64, '#a9c344')
    pear.addColorStop(1, '#759b2c')
    context.fillStyle = pear
    context.strokeStyle = '#6b832b'
    context.lineWidth = Math.max(1, radius * 0.07)
    context.beginPath()
    context.moveTo(0, -radius * 0.9)
    context.bezierCurveTo(radius * 0.64, -radius * 0.76, radius * 0.57, -radius * 0.1, radius * 0.72, radius * 0.42)
    context.bezierCurveTo(radius * 0.76, radius * 1.05, radius * 0.34, radius * 1.14, 0, radius * 1.14)
    context.bezierCurveTo(-radius * 0.34, radius * 1.14, -radius * 0.76, radius * 1.05, -radius * 0.72, radius * 0.42)
    context.bezierCurveTo(-radius * 0.57, -radius * 0.1, -radius * 0.64, -radius * 0.76, 0, -radius * 0.9)
    context.fill()
    context.stroke()
    context.strokeStyle = '#70431e'
    context.lineWidth = Math.max(2, radius * 0.1)
    context.beginPath()
    context.moveTo(0, -radius * 0.8)
    context.lineTo(radius * 0.06, -radius * 1.18)
    context.stroke()
  }
  context.restore()
}

function MergeCanvas({ boardRef, itemsRef, previewXRef, nextDropLevelRef, isCompleteRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined
    let frameId = 0
    let width = 0
    let height = 0
    let pixelRatio = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(width * pixelRatio))
      canvas.height = Math.max(1, Math.round(height * pixelRatio))
    }

    const draw = () => {
      if (!width || !height) resize()
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, width, height)
      const boardRect = boardRef.current?.getBoundingClientRect()
      const logicalHeight = boardRect?.width ? (boardRect.height / boardRect.width) * 100 : 160
      for (const item of itemsRef.current) {
        drawMergeItem(context, item, width, height, logicalHeight)
      }
      if (!isCompleteRef.current) {
        const level = nextDropLevelRef.current
        drawMergeItem(context, {
          level,
          x: previewXRef.current,
          y: STAGES[level].radius + 3,
          rotation: 0,
        }, width, height, logicalHeight, true)
      }
      frameId = window.requestAnimationFrame(draw)
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    frameId = window.requestAnimationFrame(draw)
    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frameId)
    }
  }, [boardRef, isCompleteRef, itemsRef, nextDropLevelRef, previewXRef])

  return <canvas ref={canvasRef} className="lyfg-merge-canvas" aria-hidden="true" />
}

function HarvestFruit({ type, unlocked }) {
  return <i className={`lyfg-harvest-fruit lyfg-harvest-fruit--${type} ${unlocked ? 'is-unlocked' : ''}`} />
}

export default function FruitMergeGame({ onBack }) {
  const boardRef = useRef(null)
  const itemsRef = useRef([])
  const nextIdRef = useRef(1)
  const dropSequenceRef = useRef(0)
  const treeFruitIndexRef = useRef(0)
  const isHoldingRef = useRef(false)
  const isCompleteRef = useRef(false)
  const harvestedRef = useRef([])
  const boardHeightRef = useRef(160)
  const previewTargetXRef = useRef(50)
  const previewXRef = useRef(50)
  const nextDropLevelRef = useRef(0)
  const [nextDropLevel, setNextDropLevel] = useState(0)
  const [isHolding, setIsHolding] = useState(false)
  const [harvestedLevels, setHarvestedLevels] = useState([])
  const [dropCount, setDropCount] = useState(0)

  const isComplete = harvestedLevels.includes(3) && harvestedLevels.includes(4)
  const nextStage = STAGES[nextDropLevel]

  const updateNextDropLevel = (level) => {
    nextDropLevelRef.current = level
    setNextDropLevel(level)
  }

  const getDropPosition = (event) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return 50
    const radius = STAGES[nextDropLevelRef.current].radius
    return clamp(((event.clientX - rect.left) / rect.width) * 100, radius + 1, 99 - radius)
  }

  const updateDropPosition = (event, immediate = false) => {
    const nextX = getDropPosition(event)
    previewTargetXRef.current = nextX
    if (immediate) previewXRef.current = nextX
    return nextX
  }

  const dropItem = (x) => {
    if (isCompleteRef.current) return
    const level = nextDropLevelRef.current
    const radius = STAGES[level].radius
    const item = createItem(nextIdRef.current, level, x, radius + 3)
    nextIdRef.current += 1
    itemsRef.current = [...itemsRef.current, item]
    setDropCount((current) => current + 1)
    const sequenceIndex = dropSequenceRef.current + 1
    dropSequenceRef.current = sequenceIndex
    updateNextDropLevel(DROP_LEVEL_SEQUENCE[sequenceIndex % DROP_LEVEL_SEQUENCE.length])
  }

  const handlePointerDown = (event) => {
    if (isCompleteRef.current) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    isHoldingRef.current = true
    setIsHolding(true)
    updateDropPosition(event, true)
  }

  const handlePointerMove = (event) => {
    if (!isHoldingRef.current) return
    event.preventDefault()
    updateDropPosition(event)
  }

  const handlePointerUp = (event) => {
    if (!isHoldingRef.current) return
    event.preventDefault()
    const x = updateDropPosition(event)
    isHoldingRef.current = false
    setIsHolding(false)
    dropItem(x)
  }

  const restart = () => {
    itemsRef.current = []
    nextIdRef.current = 1
    dropSequenceRef.current = 0
    treeFruitIndexRef.current = 0
    harvestedRef.current = []
    isHoldingRef.current = false
    isCompleteRef.current = false
    previewTargetXRef.current = 50
    previewXRef.current = 50
    updateNextDropLevel(0)
    setIsHolding(false)
    setHarvestedLevels([])
    setDropCount(0)
  }

  useEffect(() => {
    const updateBoardMetrics = () => {
      const rect = boardRef.current?.getBoundingClientRect()
      if (!rect?.width || !rect?.height) return
      boardHeightRef.current = (rect.height / rect.width) * 100
    }
    updateBoardMetrics()
    const observer = new ResizeObserver(updateBoardMetrics)
    if (boardRef.current) observer.observe(boardRef.current)
    window.addEventListener('orientationchange', updateBoardMetrics)
    return () => {
      observer.disconnect()
      window.removeEventListener('orientationchange', updateBoardMetrics)
    }
  }, [])

  useEffect(() => {
    let frameId = 0
    let previousTime = performance.now()

    const constrainToBoard = (item, fieldHeight) => {
      const radius = STAGES[item.level].radius
      if (item.x - radius < 0) {
        item.x = radius
        if (item.vx < 0) item.vx = -item.vx * 0.2
      } else if (item.x + radius > 100) {
        item.x = 100 - radius
        if (item.vx > 0) item.vx = -item.vx * 0.2
      }
      if (item.y - radius < 0) {
        item.y = radius
        if (item.vy < 0) item.vy = 0
      }
      if (item.y + radius > fieldHeight) {
        item.y = fieldHeight - radius
        if (item.vy > 0) item.vy = 0
      }
    }

    const updatePhysics = (now) => {
      const elapsed = Math.min((now - previousTime) / 1000, 0.025)
      previousTime = now
      const follow = 1 - Math.exp(-22 * elapsed)
      previewXRef.current += (previewTargetXRef.current - previewXRef.current) * follow

      if (itemsRef.current.length) {
        const fieldHeight = boardHeightRef.current
        const currentItems = itemsRef.current.map((item) => ({ ...item }))
        for (const item of currentItems) {
          if (item.restTime >= REST_DELAY) continue
          const radius = STAGES[item.level].radius
          item.vy += GRAVITY * elapsed
          item.x += item.vx * elapsed
          item.y += item.vy * elapsed
          item.rotation += item.angularVelocity * elapsed
          item.vx *= 0.996
          item.angularVelocity *= Math.exp(-4.8 * elapsed)
          if (Math.abs(item.angularVelocity) < 1.2) item.angularVelocity = 0

          if (item.y + radius > fieldHeight) {
            item.y = fieldHeight - radius
            const impactSpeed = Math.abs(item.vy)
            item.vy = impactSpeed > 12 ? -impactSpeed * 0.2 : 0
            item.angularVelocity = impactSpeed > 15
              ? clamp(item.angularVelocity + item.vx * 0.22, -MAX_SPIN_SPEED, MAX_SPIN_SPEED)
              : item.angularVelocity * 0.4
            item.vx *= Math.exp(-18 * elapsed)
            item.angularVelocity *= Math.exp(-16 * elapsed)
            if (Math.abs(item.vx) < REST_SPEED) item.vx = 0
            if (Math.abs(item.angularVelocity) < REST_SPEED) item.angularVelocity = 0
            item.restTime = item.vx === 0 && item.vy === 0 && item.angularVelocity === 0
              ? item.restTime + elapsed
              : 0
          } else {
            item.restTime = 0
          }
          constrainToBoard(item, fieldHeight)
        }

        const removedIds = new Set()
        const mergedItems = []
        for (let leftIndex = 0; leftIndex < currentItems.length; leftIndex += 1) {
          const left = currentItems[leftIndex]
          if (removedIds.has(left.id)) continue
          for (let rightIndex = leftIndex + 1; rightIndex < currentItems.length; rightIndex += 1) {
            const right = currentItems[rightIndex]
            if (removedIds.has(right.id)) continue
            const leftRadius = STAGES[left.level].radius
            const rightRadius = STAGES[right.level].radius
            const dx = right.x - left.x
            const dy = right.y - left.y
            const distance = Math.hypot(dx, dy)
            const minimumDistance = leftRadius + rightRadius
            if (distance >= minimumDistance) continue

            const fallbackDirection = left.id < right.id ? 1 : -1
            const normalX = distance > 0.001 ? dx / distance : fallbackDirection
            const normalY = distance > 0.001 ? dy / distance : 0
            const overlap = minimumDistance - Math.max(distance, 0.001)
            const leftResting = left.restTime >= REST_DELAY
            const rightResting = right.restTime >= REST_DELAY
            const leftOffset = rightResting ? overlap : leftResting ? 0 : overlap * 0.5
            const rightOffset = leftResting ? overlap : rightResting ? 0 : overlap * 0.5
            left.x -= normalX * leftOffset
            left.y -= normalY * leftOffset
            right.x += normalX * rightOffset
            right.y += normalY * rightOffset

            let nextLevel = null
            if (left.level === right.level && left.level < 2) nextLevel = left.level + 1
            else if (left.level === 2 && right.level === 2) {
              nextLevel = TREE_FRUITS[treeFruitIndexRef.current % TREE_FRUITS.length]
              treeFruitIndexRef.current += 1
            }

            if (nextLevel !== null) {
              const merged = createItem(nextIdRef.current, nextLevel, (left.x + right.x) / 2, (left.y + right.y) / 2, {
                vy: Math.min(left.vy, right.vy) * 0.18,
                vx: (left.vx + right.vx) * 0.15,
                rotation: (left.rotation + right.rotation) / 2,
                angularVelocity: clamp((left.angularVelocity + right.angularVelocity) * 0.12, -16, 16),
              })
              nextIdRef.current += 1
              removedIds.add(left.id)
              removedIds.add(right.id)
              mergedItems.push(merged)
              if (nextLevel >= 3 && !harvestedRef.current.includes(nextLevel)) {
                const nextHarvested = [...harvestedRef.current, nextLevel]
                harvestedRef.current = nextHarvested
                isCompleteRef.current = nextHarvested.includes(3) && nextHarvested.includes(4)
                setHarvestedLevels(nextHarvested)
              }
              break
            }

            const relativeVelocity = (right.vx - left.vx) * normalX + (right.vy - left.vy) * normalY
            if (relativeVelocity < -6) {
              left.restTime = 0
              right.restTime = 0
              const impulse = (-relativeVelocity * 0.44) / 2
              left.vx -= impulse * normalX
              left.vy -= impulse * normalY
              right.vx += impulse * normalX
              right.vy += impulse * normalY
              const tangentVelocity = (right.vx - left.vx) * -normalY + (right.vy - left.vy) * normalX
              const spinImpulse = clamp(tangentVelocity * 0.18, -22, 22)
              left.angularVelocity = clamp(left.angularVelocity - spinImpulse, -MAX_SPIN_SPEED, MAX_SPIN_SPEED)
              right.angularVelocity = clamp(right.angularVelocity + spinImpulse, -MAX_SPIN_SPEED, MAX_SPIN_SPEED)
            }
            constrainToBoard(left, fieldHeight)
            constrainToBoard(right, fieldHeight)
          }
        }

        const nextItems = [...currentItems.filter((item) => !removedIds.has(item.id)), ...mergedItems]
        for (const item of nextItems) constrainToBoard(item, fieldHeight)
        itemsRef.current = nextItems
      }
      frameId = window.requestAnimationFrame(updatePhysics)
    }

    frameId = window.requestAnimationFrame(updatePhysics)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  return (
    <main className="lyfg-page lyfg-merge-page">
      <section className="lyfg-game-shell lyfg-merge-shell">
        <header className="lyfg-header lyfg-merge-header">
          <button className="lyfg-back-button" type="button" onClick={onBack}>← 游戏选择</button>
          <p className="lyfg-eyebrow"><span /> 绿园消保 · 合成果园 <span /></p>
          <div className="lyfg-title-lockup">
            <span className="lyfg-title-mark lyfg-title-mark--seed" aria-hidden="true"><i /></span>
            <div><h1>合成水果</h1><p>FRUIT MERGE</p></div>
          </div>
        </header>
        <section className="lyfg-merge-guide" aria-label="合成规则">
          <div className="lyfg-merge-recipe">
            {STAGES.slice(0, 3).map((stage) => <span key={stage.className} className={`lyfg-recipe-step lyfg-recipe-step--${stage.className}`}><i /><b>×2</b></span>)}
            <em>→</em><span className="lyfg-recipe-fruits"><i className="lyfg-recipe-apple" /><i className="lyfg-recipe-pear" /></span>
          </div>
          <p>树苗两两合成：第一次得苹果，第二次得梨</p>
        </section>
        <section className="lyfg-drop-stage-wrap">
          <div
            ref={boardRef}
            className={`lyfg-merge-board lyfg-drop-stage ${isHolding ? 'is-holding' : ''}`}
            role="img"
            aria-label="合成水果掉落区，按住并移动顶部物体，松手落下"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="lyfg-merge-sky"><span /><span /><span /></div>
            <div className="lyfg-drop-rope" aria-hidden="true" />
            <MergeCanvas
              boardRef={boardRef}
              itemsRef={itemsRef}
              previewXRef={previewXRef}
              nextDropLevelRef={nextDropLevelRef}
              isCompleteRef={isCompleteRef}
            />
            <span className="lyfg-drop-instruction" aria-hidden="true">按住移动 · 松手落下</span>
          </div>
          <p className="lyfg-merge-board-hint"><span>顶部待投</span>{nextStage.name} · 已投放 {dropCount} 次</p>
        </section>
        <section className="lyfg-harvest-strip" aria-label="果实收获进度">
          <div><span>收获进度</span><strong><HarvestFruit type="apple" unlocked={harvestedLevels.includes(3)} /><HarvestFruit type="pear" unlocked={harvestedLevels.includes(4)} /></strong></div>
          <button type="button" onClick={restart}>重新开始</button>
        </section>
        {isComplete ? <div className="lyfg-merge-success" role="dialog" aria-modal="true"><span><HarvestFruit type="apple" unlocked /><b>+</b><HarvestFruit type="pear" unlocked /></span><h2>两种水果收获完成！</h2><p>你已合成苹果与梨，下一步可进入消保答题。</p><button type="button" onClick={restart}>再玩一次</button></div> : null}
      </section>
    </main>
  )
}
