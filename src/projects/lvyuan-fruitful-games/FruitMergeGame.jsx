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

function MergeItem({ item, boardHeight, preview = false }) {
  const stage = STAGES[item.level]
  return (
    <span
      className={`lyfg-merge-item lyfg-merge-item--${stage.className} ${preview ? 'is-preview' : 'is-settled'}`}
      style={{
        left: `${item.x}%`,
        top: `${(item.y / boardHeight) * 100}%`,
        width: `${stage.radius * 2}%`,
        '--lyfg-rotation': `${item.rotation ?? 0}deg`,
      }}
      aria-label={stage.name}
    >
      {stage.className === 'sapling' ? <i><b /><b /><b /></i> : null}
      {stage.className === 'apple' || stage.className === 'pear' ? <i /> : null}
    </span>
  )
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
  const harvestedRef = useRef([])
  const boardHeightRef = useRef(160)
  const previewTargetXRef = useRef(50)
  const previewXRef = useRef(50)
  const [items, setItems] = useState([])
  const [nextDropLevel, setNextDropLevel] = useState(0)
  const [previewX, setPreviewX] = useState(50)
  const [isHolding, setIsHolding] = useState(false)
  const [harvestedLevels, setHarvestedLevels] = useState([])
  const [dropCount, setDropCount] = useState(0)
  const [boardHeight, setBoardHeight] = useState(160)

  const isComplete = harvestedLevels.includes(3) && harvestedLevels.includes(4)
  const nextStage = STAGES[nextDropLevel]

  const getDropPosition = (event) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return 50
    const radius = STAGES[nextDropLevel].radius
    return clamp(((event.clientX - rect.left) / rect.width) * 100, radius + 1, 99 - radius)
  }

  const updateDropPosition = (event, immediate = false) => {
    const nextX = getDropPosition(event)
    previewTargetXRef.current = nextX
    if (immediate) {
      previewXRef.current = nextX
      setPreviewX(nextX)
    }
    return nextX
  }

  const dropItem = (x) => {
    if (isComplete) return
    const level = nextDropLevel
    const radius = STAGES[level].radius
    const item = createItem(nextIdRef.current, level, x, radius + 3)
    nextIdRef.current += 1
    const nextItems = [...itemsRef.current, item]
    itemsRef.current = nextItems
    setItems(nextItems)
    setDropCount((current) => current + 1)
    const sequenceIndex = dropSequenceRef.current + 1
    dropSequenceRef.current = sequenceIndex
    setNextDropLevel(DROP_LEVEL_SEQUENCE[sequenceIndex % DROP_LEVEL_SEQUENCE.length])
  }

  const handlePointerDown = (event) => {
    if (isComplete) return
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
    previewTargetXRef.current = 50
    previewXRef.current = 50
    setItems([])
    setNextDropLevel(0)
    setPreviewX(50)
    setIsHolding(false)
    setHarvestedLevels([])
    setDropCount(0)
  }

  useEffect(() => {
    const updateBoardMetrics = () => {
      const rect = boardRef.current?.getBoundingClientRect()
      if (!rect?.width || !rect?.height) return
      const nextHeight = (rect.height / rect.width) * 100
      boardHeightRef.current = nextHeight
      setBoardHeight(nextHeight)
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

    const updatePhysics = (now) => {
      const elapsed = Math.min((now - previousTime) / 1000, 0.025)
      previousTime = now
      const follow = 1 - Math.exp(-22 * elapsed)
      const nextPreviewX = previewXRef.current + (previewTargetXRef.current - previewXRef.current) * follow
      if (Math.abs(nextPreviewX - previewXRef.current) > 0.01) {
        previewXRef.current = nextPreviewX
        setPreviewX(nextPreviewX)
      }

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

          if (item.x - radius < 0) {
            item.x = radius
            const impactSpeed = Math.abs(item.vx)
            item.vx = impactSpeed * 0.42
            if (impactSpeed > 9) item.angularVelocity = clamp(item.angularVelocity + item.vy * 0.035, -MAX_SPIN_SPEED, MAX_SPIN_SPEED)
          } else if (item.x + radius > 100) {
            item.x = 100 - radius
            const impactSpeed = Math.abs(item.vx)
            item.vx = -impactSpeed * 0.42
            if (impactSpeed > 9) item.angularVelocity = clamp(item.angularVelocity - item.vy * 0.035, -MAX_SPIN_SPEED, MAX_SPIN_SPEED)
          }

          if (item.y + radius > fieldHeight) {
            item.y = fieldHeight - radius
            const impactSpeed = Math.abs(item.vy)
            item.vy = impactSpeed > 12 ? -impactSpeed * 0.2 : 0
            if (impactSpeed > 15) {
              item.angularVelocity = clamp(item.angularVelocity + item.vx * 0.22, -MAX_SPIN_SPEED, MAX_SPIN_SPEED)
            } else {
              item.angularVelocity *= 0.4
            }

            item.vx *= Math.exp(-18 * elapsed)
            item.angularVelocity *= Math.exp(-16 * elapsed)
            if (Math.abs(item.vx) < REST_SPEED) item.vx = 0
            if (Math.abs(item.angularVelocity) < REST_SPEED) item.angularVelocity = 0
            if (item.vx === 0 && item.vy === 0 && item.angularVelocity === 0) {
              item.restTime += elapsed
            } else {
              item.restTime = 0
            }
          } else {
            item.restTime = 0
          }
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
            const distance = Math.hypot(dx, dy) || 0.001
            const minimumDistance = leftRadius + rightRadius
            if (distance >= minimumDistance) continue

            const normalX = dx / distance
            const normalY = dy / distance
            const overlap = minimumDistance - distance
            const leftResting = left.restTime >= REST_DELAY
            const rightResting = right.restTime >= REST_DELAY
            const leftOffset = rightResting ? overlap : leftResting ? 0 : overlap * 0.5
            const rightOffset = leftResting ? overlap : rightResting ? 0 : overlap * 0.5
            left.x -= normalX * leftOffset
            left.y -= normalY * leftOffset
            right.x += normalX * rightOffset
            right.y += normalY * rightOffset

            let nextLevel = null
            if (left.level === right.level && left.level < 2) {
              nextLevel = left.level + 1
            } else if (left.level === 2 && right.level === 2) {
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
          }
        }

        const nextItems = [...currentItems.filter((item) => !removedIds.has(item.id)), ...mergedItems]
        itemsRef.current = nextItems
        setItems(nextItems)
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
            <div>
              <h1>合成水果</h1>
              <p>FRUIT MERGE</p>
            </div>
          </div>
        </header>

        <section className="lyfg-merge-guide" aria-label="合成规则">
          <div className="lyfg-merge-recipe">
            {STAGES.slice(0, 3).map((stage) => (
              <span key={stage.className} className={`lyfg-recipe-step lyfg-recipe-step--${stage.className}`}><i /><b>×2</b></span>
            ))}
            <em>→</em>
            <span className="lyfg-recipe-fruits"><i className="lyfg-recipe-apple" /><i className="lyfg-recipe-pear" /></span>
          </div>
          <p>树苗两两合成：第一次得苹果，第二次得梨</p>
        </section>

        <section className="lyfg-drop-stage-wrap">
          <div
            ref={boardRef}
            className={`lyfg-merge-board lyfg-drop-stage ${isHolding ? 'is-holding' : ''}`}
            aria-label="合成水果掉落区，按住并移动顶部物体，松手落下"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="lyfg-merge-sky"><span /><span /><span /></div>
            <div className="lyfg-drop-rope" aria-hidden="true" />
            {!isComplete ? <MergeItem item={{ level: nextDropLevel, x: previewX, y: STAGES[nextDropLevel].radius + 3 }} boardHeight={boardHeight} preview /> : null}
            {items.map((item) => <MergeItem key={item.id} item={item} boardHeight={boardHeight} />)}
            <span className="lyfg-drop-instruction" aria-hidden="true">按住移动 · 松手落下</span>
          </div>
          <p className="lyfg-merge-board-hint"><span>顶部待投</span>{nextStage.name} · 已投放 {dropCount} 次</p>
        </section>

        <section className="lyfg-harvest-strip" aria-label="果实收获进度">
          <div>
            <span>收获进度</span>
            <strong><HarvestFruit type="apple" unlocked={harvestedLevels.includes(3)} /><HarvestFruit type="pear" unlocked={harvestedLevels.includes(4)} /></strong>
          </div>
          <button type="button" onClick={restart}>重新开始</button>
        </section>

        {isComplete ? (
          <div className="lyfg-merge-success" role="dialog" aria-modal="true">
            <span><HarvestFruit type="apple" unlocked /><b>+</b><HarvestFruit type="pear" unlocked /></span>
            <h2>两种水果收获完成！</h2>
            <p>你已合成苹果与梨，下一步可进入消保答题。</p>
            <button type="button" onClick={restart}>再玩一次</button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
