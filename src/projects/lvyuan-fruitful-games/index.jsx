import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LVYUAN_FRUITFUL_GAMES_ACTIVITY_KEY,
  LVYUAN_FRUITFUL_GAMES_ACTIVITY_TYPE,
  LVYUAN_SNAKE_FRUITS,
  LVYUAN_SNAKE_MATERIALS,
  LVYUAN_SNAKE_TARGET_SCORE,
  getLvyuanFruitfulGamesAsset,
} from './config'
import FruitMergeGame from './FruitMergeGame'
import FruitMergeRules from './FruitMergeRules'
import GameSelector from './GameSelector'
import HomePage from './HomePage'
import Ih5Stage from './Ih5Stage'
import './styles.css'

const GRID_WIDTH = 15
const GRID_HEIGHT = 30
const JOYSTICK_LIMIT = 42
const SNAKE_SPEED = 4.4
const SNAKE_TURN_RESPONSE = 11
const SEGMENT_DISTANCE = 0.92
const SNAKE_RADIUS = 0.52
const FRUIT_COLLISION_DISTANCE = 0.78
const TRAIL_SAMPLE_DISTANCE = 0.1
const PLAY_AREA_INSET = 1.05

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const INITIAL_SNAKE = [{ x: 7.5, y: 15.5 }]

const SNAKE_BODY_TEXT = ['消', '保', '知', '识', '守', '护', '权', '益', '安', '心']
const SNAKE_BALL_HUES = [2, 8, 15, 23, 31, 40, 48, 353]

function getRandomFruit(snake) {
  let cell = { x: GRID_WIDTH * 0.25, y: GRID_HEIGHT * 0.25 }
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = {
      x: PLAY_AREA_INSET + 0.25 + Math.random() * (GRID_WIDTH - (PLAY_AREA_INSET + 0.25) * 2),
      y: PLAY_AREA_INSET + 0.25 + Math.random() * (GRID_HEIGHT - (PLAY_AREA_INSET + 0.25) * 2),
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

function drawSnakeBall(context, x, y, radius, hue, label) {
  const shine = context.createRadialGradient(x - radius * 0.35, y - radius * 0.4, radius * 0.08, x, y, radius)
  shine.addColorStop(0, 'rgba(255,255,255,0.94)')
  shine.addColorStop(0.16, `hsla(${hue}, 100%, 75%, 0.88)`)
  shine.addColorStop(0.5, `hsl(${hue}, 88%, 54%)`)
  shine.addColorStop(1, `hsl(${hue}, 80%, 36%)`)
  context.fillStyle = shine
  context.strokeStyle = `hsla(${hue}, 76%, 26%, 0.82)`
  context.lineWidth = Math.max(1, radius * 0.08)
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  context.fillStyle = 'rgba(7, 40, 20, 0.25)'
  context.beginPath()
  context.ellipse(x + radius * 0.2, y + radius * 0.55, radius * 0.6, radius * 0.16, 0, 0, Math.PI * 2)
  context.fill()
  if (!label) return
  context.fillStyle = '#7a2119'
  context.font = `900 ${Math.max(10, radius * 1.05)}px PingFang SC, Microsoft YaHei, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(label, x, y + 1)
}

function drawSnakeHead(context, x, y, radius, direction) {
  context.save()
  context.translate(x, y)
  context.rotate(Math.atan2(direction.y, direction.x) + Math.PI / 2)
  const skin = context.createRadialGradient(-radius * 0.36, -radius * 0.42, radius * 0.08, 0, 0, radius)
  skin.addColorStop(0, '#fff3e0')
  skin.addColorStop(0.15, '#ff8b6d')
  skin.addColorStop(0.52, '#e5482e')
  skin.addColorStop(1, '#a9261c')
  context.fillStyle = skin
  context.strokeStyle = '#8b291d'
  context.lineWidth = Math.max(1, radius * 0.08)
  context.beginPath()
  context.arc(0, 0, radius * 1.12, 0, Math.PI * 2)
  context.fill()
  context.stroke()
  context.fillStyle = '#76a83e'
  context.beginPath()
  context.ellipse(radius * 0.18, -radius * 1.16, radius * 0.42, radius * 0.18, -0.34, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f7f1d6'
  for (const eyeX of [-radius * 0.42, radius * 0.42]) {
    context.beginPath()
    context.ellipse(eyeX, -radius * 0.2, radius * 0.26, radius * 0.34, 0, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#152b1e'
    context.beginPath()
    context.arc(eyeX, -radius * 0.16, radius * 0.15, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#fff'
    context.beginPath()
    context.arc(eyeX - radius * 0.05, -radius * 0.22, radius * 0.045, 0, Math.PI * 2)
    context.fill()
    context.fillStyle = '#f7f1d6'
  }
  context.strokeStyle = '#6d1d18'
  context.lineWidth = Math.max(1.3, radius * 0.1)
  context.beginPath()
  context.arc(0, radius * 0.2, radius * 0.33, 0.1, Math.PI - 0.1)
  context.stroke()
  context.restore()
}

function drawSnakeMaterial(context, image, x, y, width, height, direction) {
  context.save()
  context.translate(x, y)
  if (direction) context.rotate(Math.atan2(direction.y, direction.x) + Math.PI / 2)
  context.drawImage(image, -width / 2, -height / 2, width, height)
  context.restore()
}

function isLoadedImage(image) {
  return image?.complete && image.naturalWidth > 0
}

function SnakeCanvas({ snakeRef, fruitRef, directionRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined
    let frameId = 0
    let width = 0
    let height = 0
    let pixelRatio = 1
    const headSprite = new Image()
    const bodySprites = LVYUAN_SNAKE_MATERIALS.bodies.map((assetName) => {
      const image = new Image()
      image.src = getLvyuanFruitfulGamesAsset(assetName)
      return image
    })
    headSprite.src = getLvyuanFruitfulGamesAsset(LVYUAN_SNAKE_MATERIALS.head)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(width * pixelRatio))
      canvas.height = Math.max(1, Math.round(height * pixelRatio))
    }

    const draw = (time) => {
      if (!width || !height) resize()
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, width, height)
      const cell = Math.min(width / GRID_WIDTH, height / GRID_HEIGHT)
      const snake = snakeRef.current
      const fruit = fruitRef.current
      const pulse = 1 + Math.sin(time / 175) * 0.06
      const fruitX = (fruit.x / GRID_WIDTH) * width
      const fruitY = (fruit.y / GRID_HEIGHT) * height
      context.save()
      context.translate(fruitX, fruitY)
      context.scale(pulse, pulse)
      context.font = `${Math.max(20, cell * 1.1)}px Apple Color Emoji, PingFang SC, sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.shadowColor = 'rgba(10, 37, 19, 0.34)'
      context.shadowBlur = 3
      context.shadowOffsetY = 2
      context.fillText(fruit.emoji, 0, 0)
      context.restore()

      for (let index = snake.length - 1; index >= 1; index -= 1) {
        const part = snake[index]
        const x = (part.x / GRID_WIDTH) * width
        const y = (part.y / GRID_HEIGHT) * height
        const bodySprite = bodySprites[(index - 1) % bodySprites.length]
        if (isLoadedImage(bodySprite)) {
          drawSnakeMaterial(context, bodySprite, x, y, cell * 1.28, cell * 1.43)
        } else {
          drawSnakeBall(
            context,
            x,
            y,
            cell * SNAKE_RADIUS,
            SNAKE_BALL_HUES[index % SNAKE_BALL_HUES.length],
            SNAKE_BODY_TEXT[(index - 1) % SNAKE_BODY_TEXT.length],
          )
        }
      }
      const head = snake[0]
      const headX = (head.x / GRID_WIDTH) * width
      const headY = (head.y / GRID_HEIGHT) * height
      if (isLoadedImage(headSprite)) {
        drawSnakeMaterial(context, headSprite, headX, headY, cell * 1.42, cell * 1.79, directionRef.current)
      } else {
        drawSnakeHead(context, headX, headY, cell * SNAKE_RADIUS, directionRef.current)
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
  }, [directionRef, fruitRef, snakeRef])

  return <canvas ref={canvasRef} className="lyfg-snake-canvas" aria-hidden="true" />
}

function FloatingJoystick({ joystickRef }) {
  return (
    <div ref={joystickRef} className="lyfg-floating-joystick" aria-hidden="true">
      <span className="lyfg-floating-joystick__ring" />
      <span className="lyfg-floating-joystick__knob"><i /></span>
    </div>
  )
}

function SnakeGame({ activityKey, onBack }) {
  const [snakeLength, setSnakeLength] = useState(INITIAL_SNAKE.length)
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
  const joystickRef = useRef(null)
  const activePointerRef = useRef(null)
  const joystickOriginRef = useRef({ x: 0, y: 0 })

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
    setSnakeLength(INITIAL_SNAKE.length)
    setFruit(nextFruit)
    setScore(0)
    setGameState('playing')
  }, [])

  const updateFloatingJoystick = useCallback((event) => {
    const joystick = joystickRef.current
    if (!joystick) return
    const origin = joystickOriginRef.current
    const rawX = event.clientX - origin.x
    const rawY = event.clientY - origin.y
    const distance = Math.hypot(rawX, rawY)
    const scale = distance > JOYSTICK_LIMIT ? JOYSTICK_LIMIT / distance : 1
    const x = rawX * scale
    const y = rawY * scale
    joystick.querySelector('.lyfg-floating-joystick__knob').style.transform = `translate3d(${x}px, ${y}px, 0)`
    if (distance > 12) chooseDirection(normalizeVector({ x: rawX, y: rawY }))
  }, [chooseDirection])

  const releaseFloatingJoystick = useCallback((event) => {
    if (activePointerRef.current !== event.pointerId) return
    activePointerRef.current = null
    const joystick = joystickRef.current
    if (!joystick) return
    joystick.classList.remove('is-active')
    joystick.querySelector('.lyfg-floating-joystick__knob').style.transform = 'translate3d(0, 0, 0)'
  }, [])

  const handleControlPointerDown = useCallback((event) => {
    if (gameState !== 'playing' || event.target.closest('button')) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointerRef.current = event.pointerId
    joystickOriginRef.current = { x: event.clientX, y: event.clientY }
    const joystick = joystickRef.current
    if (!joystick) return
    joystick.style.left = `${event.clientX}px`
    joystick.style.top = `${event.clientY}px`
    joystick.classList.add('is-active')
    updateFloatingJoystick(event)
  }, [gameState, updateFloatingJoystick])

  const handleControlPointerMove = useCallback((event) => {
    if (activePointerRef.current !== event.pointerId) return
    event.preventDefault()
    updateFloatingJoystick(event)
  }, [updateFloatingJoystick])

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
      const hitsWall = nextHead.x <= PLAY_AREA_INSET
        || nextHead.x >= GRID_WIDTH - PLAY_AREA_INSET
        || nextHead.y <= PLAY_AREA_INSET
        || nextHead.y >= GRID_HEIGHT - PLAY_AREA_INSET

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

      if (!ateFruit) {
        frameId = window.requestAnimationFrame(moveSnake)
        return
      }

      const nextScore = scoreRef.current + currentFruit.score
      setSnakeLength(nextLength)
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

  const overlayVisible = gameState !== 'playing' && gameState !== 'paused'

  return (
    <main
      className="lyfg-page lyfg-ih5-page lyfg-snake-game-page lyfg-ih5-snake-page"
      data-activity-type={LVYUAN_FRUITFUL_GAMES_ACTIVITY_TYPE}
      data-activity-key={activityKey}
      onPointerDown={handleControlPointerDown}
      onPointerMove={handleControlPointerMove}
      onPointerUp={releaseFloatingJoystick}
      onPointerCancel={releaseFloatingJoystick}
    >
      <Ih5Stage label="果园贪吃蛇">
        <img className="lyfg-ih5-snake-background" src={getLvyuanFruitfulGamesAsset('snakeBackground')} alt="" draggable="false" />
        <img className="lyfg-ih5-snake-title" src={getLvyuanFruitfulGamesAsset('snakeTitle')} alt="果园贪吃蛇，等待果子" draggable="false" />
        <button className="lyfg-ih5-snake-back" type="button" onClick={onBack} aria-label="返回游戏选择">‹</button>
        <div className="lyfg-ih5-snake-playfield" role="img" aria-label={`果园贪吃蛇游戏区，当前蛇身长度 ${snakeLength}`}>
          <SnakeCanvas snakeRef={snakeRef} fruitRef={fruitRef} directionRef={directionRef} />
          {overlayVisible ? (
            <div className="lyfg-ih5-snake-overlay">
              <h2>{gameState === 'success' ? '硕果满篮！' : gameState === 'failed' ? '碰到果园边界了' : '收集好果实'}</h2>
              <p>{gameState === 'success' ? `本局获得 ${score} 分` : gameState === 'failed' ? `本局 ${score} 分，再试一次吧` : '按住屏幕拖动摇杆，指引小蛇前行'}</p>
              <button type="button" onClick={restartGame}>{gameState === 'ready' ? '开始游戏' : '再来一局'}</button>
            </div>
          ) : null}
        </div>
        <div className="lyfg-ih5-snake-status" aria-live="polite">{gameState === 'paused' ? '已暂停' : `${score} 分 · 最佳 ${bestScore}`}</div>
        {(gameState === 'playing' || gameState === 'paused') ? <button className="lyfg-ih5-snake-pause" type="button" onClick={() => setGameState((current) => current === 'playing' ? 'paused' : 'playing')}>{gameState === 'paused' ? '继续' : '暂停'}</button> : null}
      </Ih5Stage>
      <FloatingJoystick joystickRef={joystickRef} />
    </main>
  )
}

function ComingSoonNotice() {
  return <div className="lyfg-coming-soon-notice" role="status" aria-live="polite">敬请期待</div>
}

export default function LvyuanFruitfulGamesProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || LVYUAN_FRUITFUL_GAMES_ACTIVITY_KEY
  const [view, setView] = useState('home')
  const [showComingSoon, setShowComingSoon] = useState(false)

  useEffect(() => {
    document.title = '绿园消保 · 硕果盈心'
  }, [])

  useEffect(() => {
    if (!showComingSoon) return undefined
    const timer = window.setTimeout(() => setShowComingSoon(false), 1600)
    return () => window.clearTimeout(timer)
  }, [showComingSoon])

  const openComingSoon = useCallback(() => setShowComingSoon(true), [])

  if (view === 'snake') {
    return <SnakeGame activityKey={activityKey} onBack={() => setView('selector')} />
  }

  if (view === 'fruit-merge') {
    return <FruitMergeGame onBack={() => setView('selector')} />
  }

  if (view === 'fruit-merge-rules') {
    return <><FruitMergeRules onBack={() => setView('selector')} onComingSoon={openComingSoon} />{showComingSoon ? <ComingSoonNotice /> : null}</>
  }

  if (view === 'selector') {
    return <><GameSelector onComingSoon={openComingSoon} onSelectSnake={() => setView('snake')} onSelectFruitMerge={() => setView('fruit-merge-rules')} />{showComingSoon ? <ComingSoonNotice /> : null}</>
  }

  return <HomePage onStart={() => setView('selector')} />
}

export {
  LVYUAN_FRUITFUL_GAMES_ACTIVITY_KEY,
  LVYUAN_FRUITFUL_GAMES_ACTIVITY_TYPE,
}
