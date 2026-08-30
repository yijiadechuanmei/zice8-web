import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LVYUAN_FRUITFUL_GAMES_ACTIVITY_KEY,
  LVYUAN_FRUITFUL_GAMES_ACTIVITY_TYPE,
  LVYUAN_SNAKE_FRUITS,
  LVYUAN_SNAKE_TARGET_SCORE,
} from './config'
import FruitMergeGame from './FruitMergeGame'
import GameSelector from './GameSelector'
import './styles.css'

const GRID_WIDTH = 15
const GRID_HEIGHT = 18
const JOYSTICK_LIMIT = 42
const SNAKE_SPEED = 4.4
const SNAKE_TURN_RESPONSE = 11
const SEGMENT_DISTANCE = 0.92
const SNAKE_RADIUS = 0.52
const FRUIT_COLLISION_DISTANCE = 0.78
const TRAIL_SAMPLE_DISTANCE = 0.1

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const INITIAL_SNAKE = [
  { x: 7.5, y: 11.5 },
  { x: 6.58, y: 11.5 },
]

const SNAKE_BODY_TEXT = ['消', '保', '知', '识', '守', '护', '权', '益', '安', '心']
const SNAKE_BALL_HUES = [2, 8, 15, 23, 31, 40, 48, 353]

function getRandomFruit(snake) {
  let cell = { x: GRID_WIDTH * 0.25, y: GRID_HEIGHT * 0.25 }
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = {
      x: 1.15 + Math.random() * (GRID_WIDTH - 2.3),
      y: 1.15 + Math.random() * (GRID_HEIGHT - 2.3),
    }
    const isClear = snake.every((part) => Math.hypot(part.x - candidate.x, part.y - candidate.y) > 1.5)
    if (isClear) {
      cell = candidate
      break
    }
  }

  const fruit = LVYUAN_SNAKE_FRUITS[Math.floor(Math.random() * LVYUAN_SNAKE_FRUITS.length)]
  return { ...cell, ...fruit }
}

function normalizeVector(vector, fallback = DIRECTIONS.right) {
  const length = Math.hypot(vector.x, vector.y)
  if (!length) return fallback
  return { x: vector.x / length, y: vector.y / length }
}

function createInitialTrail(segmentCount = INITIAL_SNAKE.length) {
  const head = INITIAL_SNAKE[0]
  const length = Math.ceil(((segmentCount + 2) * SEGMENT_DISTANCE) / TRAIL_SAMPLE_DISTANCE)
  const trail = [head]
  for (let index = 1; index <= length; index += 1) {
    trail.push({ x: head.x - index * TRAIL_SAMPLE_DISTANCE, y: head.y })
  }
  return trail
}

function getTrailPosition(trail, distanceBehindHead) {
  let coveredDistance = 0
  for (let index = 1; index < trail.length; index += 1) {
    const newerPoint = trail[index - 1]
    const olderPoint = trail[index]
    const sectionDistance = Math.hypot(olderPoint.x - newerPoint.x, olderPoint.y - newerPoint.y)
    if (sectionDistance <= Number.EPSILON) continue
    if (coveredDistance + sectionDistance >= distanceBehindHead) {
      const progress = (distanceBehindHead - coveredDistance) / sectionDistance
      return {
        x: newerPoint.x + (olderPoint.x - newerPoint.x) * progress,
        y: newerPoint.y + (olderPoint.y - newerPoint.y) * progress,
      }
    }
    coveredDistance += sectionDistance
  }
  return trail[trail.length - 1]
}

function trimTrail(trail, maximumDistance) {
  let coveredDistance = 0
  for (let index = 1; index < trail.length; index += 1) {
    coveredDistance += Math.hypot(trail[index].x - trail[index - 1].x, trail[index].y - trail[index - 1].y)
    if (coveredDistance >= maximumDistance) return trail.slice(0, index + 1)
  }
  return trail
}

function createSnakeFromTrail(trail, segmentCount) {
  return Array.from({ length: segmentCount }, (_, index) => (
    index === 0 ? trail[0] : getTrailPosition(trail, index * SEGMENT_DISTANCE)
  ))
}

function SnakeBoard({ snake, fruit }) {
  const head = snake[0]

  return (
    <div
      className="lyfg-board"
      role="img"
      aria-label={`贪吃蛇游戏区，当前蛇身长度 ${snake.length}`}
      style={{ '--lyfg-columns': GRID_WIDTH, '--lyfg-rows': GRID_HEIGHT }}
    >
      <div
        className={`lyfg-fruit lyfg-fruit--${fruit.id}`}
        style={{
          '--lyfg-left': `${(fruit.x / GRID_WIDTH) * 100}%`,
          '--lyfg-top': `${(fruit.y / GRID_HEIGHT) * 100}%`,
        }}
        title={`${fruit.label} +${fruit.score}`}
      >
        <span>{fruit.emoji}</span>
      </div>

      {snake.map((part, index) => (
        <span
          key={index}
          className={`lyfg-snake-part ${index === 0 ? 'lyfg-snake-part--head' : ''}`}
          style={{
            '--lyfg-left': `${(part.x / GRID_WIDTH) * 100}%`,
            '--lyfg-top': `${(part.y / GRID_HEIGHT) * 100}%`,
            '--lyfg-body-index': index,
            '--lyfg-ball-hue': SNAKE_BALL_HUES[index % SNAKE_BALL_HUES.length],
          }}
        >
          {index === 0 ? (
            <i className="lyfg-snake-face" aria-hidden="true">
              <span /><span /><b />
            </i>
          ) : index > 1 ? (
            <b className="lyfg-snake-character" aria-hidden="true">
              {SNAKE_BODY_TEXT[(index - 2) % SNAKE_BODY_TEXT.length]}
            </b>
          ) : null}
        </span>
      ))}

      <span className="lyfg-board-sun" aria-hidden="true" />
      <span className="lyfg-board-leaf lyfg-board-leaf--one" aria-hidden="true" />
      <span className="lyfg-board-leaf lyfg-board-leaf--two" aria-hidden="true" />
      <span
        className="lyfg-head-location"
        style={{
          '--lyfg-left': `${(head.x / GRID_WIDTH) * 100}%`,
          '--lyfg-top': `${(head.y / GRID_HEIGHT) * 100}%`,
        }}
        aria-hidden="true"
      />
    </div>
  )
}

function Joystick({ onDirection }) {
  const baseRef = useRef(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  const updateFromPointer = useCallback((event) => {
    const rect = baseRef.current?.getBoundingClientRect()
    if (!rect) return

    const rawX = event.clientX - (rect.left + rect.width / 2)
    const rawY = event.clientY - (rect.top + rect.height / 2)
    const distance = Math.hypot(rawX, rawY)
    const scale = distance > JOYSTICK_LIMIT ? JOYSTICK_LIMIT / distance : 1
    const x = rawX * scale
    const y = rawY * scale
    setKnob({ x, y })

    if (distance > 14) onDirection(normalizeVector({ x: rawX, y: rawY }))
  }, [onDirection])

  const handlePointerDown = (event) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setActive(true)
    updateFromPointer(event)
  }

  const handlePointerMove = (event) => {
    if (!active) return
    event.preventDefault()
    updateFromPointer(event)
  }

  const resetKnob = () => {
    setActive(false)
    setKnob({ x: 0, y: 0 })
  }

  return (
    <div className="lyfg-joystick-wrap">
      <p><span />360° 拖动摇杆 · 自由转向</p>
      <div
        ref={baseRef}
        className={`lyfg-joystick ${active ? 'is-active' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={resetKnob}
        onPointerCancel={resetKnob}
      >
        <span className="lyfg-joystick-direction lyfg-joystick-direction--up">↑</span>
        <span className="lyfg-joystick-direction lyfg-joystick-direction--right">→</span>
        <span className="lyfg-joystick-direction lyfg-joystick-direction--down">↓</span>
        <span className="lyfg-joystick-direction lyfg-joystick-direction--left">←</span>
        <span
          className="lyfg-joystick-knob"
          style={{ transform: `translate3d(${knob.x}px, ${knob.y}px, 0)` }}
        >
          <i />
        </span>
      </div>
    </div>
  )
}

function SnakeGame({ activityKey, onBack }) {
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [fruit, setFruit] = useState(() => getRandomFruit(INITIAL_SNAKE))
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(() => Number(localStorage.getItem(`${activityKey}:snake-best`)) || 0)
  const [gameState, setGameState] = useState('ready')
  const directionRef = useRef(DIRECTIONS.right)
  const targetDirectionRef = useRef(DIRECTIONS.right)
  const snakeRef = useRef(INITIAL_SNAKE)
  const trailRef = useRef(createInitialTrail())
  const fruitRef = useRef(fruit)
  const scoreRef = useRef(0)
  const bestScoreRef = useRef(bestScore)

  useEffect(() => {
    snakeRef.current = snake
  }, [snake])

  useEffect(() => {
    fruitRef.current = fruit
  }, [fruit])

  const chooseDirection = useCallback((vector) => {
    targetDirectionRef.current = normalizeVector(vector, targetDirectionRef.current)
    setGameState((current) => current === 'ready' || current === 'paused' ? 'playing' : current)
  }, [])

  const restartGame = useCallback(() => {
    const nextFruit = getRandomFruit(INITIAL_SNAKE)
    directionRef.current = DIRECTIONS.right
    targetDirectionRef.current = DIRECTIONS.right
    snakeRef.current = INITIAL_SNAKE
    trailRef.current = createInitialTrail()
    fruitRef.current = nextFruit
    scoreRef.current = 0
    setSnake(INITIAL_SNAKE)
    setFruit(nextFruit)
    setScore(0)
    setGameState('playing')
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const keyMap = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      }
      const directionName = keyMap[event.key]
      if (!directionName) return
      event.preventDefault()
      chooseDirection(DIRECTIONS[directionName])
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [chooseDirection])

  useEffect(() => {
    if (gameState !== 'playing') return undefined
    let frameId = 0
    let previousTime = performance.now()

    const moveSnake = (now) => {
      const elapsedSeconds = Math.min((now - previousTime) / 1000, 0.034)
      previousTime = now

      const turnBlend = Math.min(1, elapsedSeconds * SNAKE_TURN_RESPONSE)
      directionRef.current = normalizeVector({
        x: directionRef.current.x + (targetDirectionRef.current.x - directionRef.current.x) * turnBlend,
        y: directionRef.current.y + (targetDirectionRef.current.y - directionRef.current.y) * turnBlend,
      }, targetDirectionRef.current)

      const currentSnake = snakeRef.current
      const currentFruit = fruitRef.current
      const head = currentSnake[0]
      const nextHead = {
        x: head.x + directionRef.current.x * SNAKE_SPEED * elapsedSeconds,
        y: head.y + directionRef.current.y * SNAKE_SPEED * elapsedSeconds,
      }
      const hitsWall = nextHead.x <= SNAKE_RADIUS
        || nextHead.x >= GRID_WIDTH - SNAKE_RADIUS
        || nextHead.y <= SNAKE_RADIUS
        || nextHead.y >= GRID_HEIGHT - SNAKE_RADIUS

      if (hitsWall) {
        setGameState('failed')
        return
      }

      const ateFruit = Math.hypot(nextHead.x - currentFruit.x, nextHead.y - currentFruit.y) < FRUIT_COLLISION_DISTANCE
      const nextLength = currentSnake.length + (ateFruit ? 1 : 0)
      const nextTrail = trimTrail(
        [nextHead, ...trailRef.current],
        (nextLength + 2) * SEGMENT_DISTANCE,
      )
      const nextSnake = createSnakeFromTrail(nextTrail, nextLength)

      snakeRef.current = nextSnake
      trailRef.current = nextTrail
      setSnake(nextSnake)

      if (!ateFruit) {
        frameId = window.requestAnimationFrame(moveSnake)
        return
      }

      const nextScore = scoreRef.current + currentFruit.score
      scoreRef.current = nextScore
      setScore(nextScore)
      if (nextScore > bestScoreRef.current) {
        bestScoreRef.current = nextScore
        setBestScore(nextScore)
        localStorage.setItem(`${activityKey}:snake-best`, String(nextScore))
      }

      if (nextScore >= LVYUAN_SNAKE_TARGET_SCORE) {
        setGameState('success')
        return
      }

      const nextFruit = getRandomFruit(nextSnake)
      fruitRef.current = nextFruit
      setFruit(nextFruit)
      frameId = window.requestAnimationFrame(moveSnake)
    }

    frameId = window.requestAnimationFrame(moveSnake)
    return () => window.cancelAnimationFrame(frameId)
  }, [activityKey, gameState])

  const progress = Math.min(100, (score / LVYUAN_SNAKE_TARGET_SCORE) * 100)
  const overlayVisible = gameState !== 'playing' && gameState !== 'paused'

  return (
    <main
      className="lyfg-page"
      data-activity-type={LVYUAN_FRUITFUL_GAMES_ACTIVITY_TYPE}
      data-activity-key={activityKey}
    >
      <section className="lyfg-game-shell">
        <header className="lyfg-header">
          <button className="lyfg-back-button" type="button" onClick={onBack}>← 游戏选择</button>
          <p className="lyfg-eyebrow"><span /> 绿园消保 · 游戏季 <span /></p>
          <div className="lyfg-title-lockup">
            <span className="lyfg-title-mark" aria-hidden="true">🍏</span>
            <div>
              <h1>硕果盈心</h1>
              <p>FRUITFUL HEART</p>
            </div>
          </div>
        </header>

        <div className="lyfg-status-row">
          <div className="lyfg-score-block">
            <span>本局果实</span>
            <strong>{score}<small> 分</small></strong>
          </div>
          <div className="lyfg-progress-block">
            <div><span>目标</span><b>{LVYUAN_SNAKE_TARGET_SCORE}</b></div>
            <div className="lyfg-progress-track"><i style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="lyfg-best-block">
            <span>最佳</span>
            <strong>{bestScore}</strong>
          </div>
        </div>

        <div className="lyfg-board-frame">
          <div className="lyfg-board-label"><span>贪吃蛇</span><i>{gameState === 'paused' ? '已暂停' : '碰墙即失败'}</i></div>
          <SnakeBoard snake={snake} fruit={fruit} />

          {overlayVisible ? (
            <div className="lyfg-game-overlay">
              <span className="lyfg-overlay-fruit" aria-hidden="true">
                {gameState === 'success' ? '🍎' : gameState === 'failed' ? '🍂' : '🍐'}
              </span>
              <h2>{gameState === 'success' ? '硕果满篮！' : gameState === 'failed' ? '别撞到果园边界' : '收集好果实'}</h2>
              <p>
                {gameState === 'success'
                  ? `已收集 ${score} 分，正式版将进入答题环节`
                  : gameState === 'failed'
                    ? `本局 ${score} 分 · 再试一次吧`
                    : '摇杆指向哪里，贪吃蛇就平滑游向哪里'}
              </p>
              <button type="button" onClick={restartGame}>
                {gameState === 'ready' ? '开始收集' : '再来一局'}
              </button>
            </div>
          ) : null}
        </div>

        <div className="lyfg-control-zone">
          {gameState === 'playing' || gameState === 'paused' ? (
            <button
              className="lyfg-pause-button"
              type="button"
              onClick={() => setGameState((current) => current === 'playing' ? 'paused' : 'playing')}
            >
              {gameState === 'paused' ? '继续' : '暂停'}
            </button>
          ) : null}
          <Joystick onDirection={chooseDirection} />
          <div className="lyfg-fruit-legend" aria-label="果实分值">
            {LVYUAN_SNAKE_FRUITS.map((item) => (
              <span key={item.id}>{item.emoji}<small>+{item.score}</small></span>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default function LvyuanFruitfulGamesProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || LVYUAN_FRUITFUL_GAMES_ACTIVITY_KEY
  const [view, setView] = useState('selector')

  useEffect(() => {
    document.title = '绿园消保 · 硕果盈心'
  }, [])

  if (view === 'snake') {
    return <SnakeGame activityKey={activityKey} onBack={() => setView('selector')} />
  }

  if (view === 'fruit-merge') {
    return <FruitMergeGame onBack={() => setView('selector')} />
  }

  return <GameSelector onSelectSnake={() => setView('snake')} onSelectFruitMerge={() => setView('fruit-merge')} />
}

export {
  LVYUAN_FRUITFUL_GAMES_ACTIVITY_KEY,
  LVYUAN_FRUITFUL_GAMES_ACTIVITY_TYPE,
}
