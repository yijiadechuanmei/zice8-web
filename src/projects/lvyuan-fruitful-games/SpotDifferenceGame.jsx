import { useEffect, useRef, useState } from 'react'
import { LVYUAN_SPOT_MERGE_MATERIALS, getLvyuanFruitfulGamesAsset } from './config'
import Ih5Stage from './Ih5Stage'

const TYPES = [
  { name: '绿种子', radius: 30 }, { name: '棕种子', radius: 34 }, { name: '树苗', radius: 52 },
  { name: '青苹果', radius: 54 }, { name: '青果', radius: 50 }, { name: '红苹果', radius: 62 },
  { name: '香蕉', radius: 77 }, { name: '梨', radius: 60 },
]
const DROP_SEQUENCE = [0, 1, 0, 1, 1, 0, 0, 1]
const WIDTH = 670
const HEIGHT = 1288
const DROP_Y = 220
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const createBody = (id, type, x, y, options = {}) => ({ id, type, x, y, vx: options.vx || 0, vy: options.vy || 0, angle: options.angle || 0, spin: options.spin || 0 })

function drawSeed(ctx, type, radius) {
  const colors = type === 0 ? ['#edf49c', '#91b63a', '#506f1f'] : ['#f5c579', '#aa672f', '#603216']
  const fill = ctx.createRadialGradient(-radius * .35, -radius * .4, 2, 0, 0, radius)
  fill.addColorStop(0, colors[0]); fill.addColorStop(.55, colors[1]); fill.addColorStop(1, colors[2])
  ctx.fillStyle = fill; ctx.strokeStyle = colors[2]; ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(0, 0, radius * .82, radius, -.32, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,210,.4)'; ctx.beginPath(); ctx.arc(-radius * .08, 0, radius * .55, -1.1, 1.2); ctx.stroke()
}

function GameCanvas({ bodiesRef, previewRef, nextTypeRef, completeRef }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d')
    const images = LVYUAN_SPOT_MERGE_MATERIALS.map((file) => { if (!file) return null; const image = new Image(); image.src = getLvyuanFruitfulGamesAsset(file); return image })
    let frame = 0; let ratio = 1
    const resize = () => { const rect = canvas.getBoundingClientRect(); ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio) }
    const body = (item, alpha = 1) => {
      const radius = TYPES[item.type].radius; const sx = canvas.width / ratio / WIDTH; const sy = canvas.height / ratio / HEIGHT
      ctx.save(); ctx.scale(sx, sy); ctx.globalAlpha = alpha; ctx.translate(item.x, item.y); ctx.rotate(item.angle)
      ctx.shadowColor = 'rgba(74,42,8,.28)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 5
      const image = images[item.type]
      if (image?.complete && image.naturalWidth) { const scale = Math.min((radius * 2) / image.naturalWidth, (radius * 2.35) / image.naturalHeight); ctx.drawImage(image, -image.naturalWidth * scale / 2, -image.naturalHeight * scale / 2, image.naturalWidth * scale, image.naturalHeight * scale) } else drawSeed(ctx, item.type, radius)
      ctx.restore()
    }
    const draw = () => { ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio); bodiesRef.current.forEach((item) => body(item)); if (!completeRef.current) body({ type: nextTypeRef.current, x: previewRef.current, y: DROP_Y, angle: 0 }, .94); frame = requestAnimationFrame(draw) }
    resize(); const observer = new ResizeObserver(resize); observer.observe(canvas); frame = requestAnimationFrame(draw)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [bodiesRef, completeRef, nextTypeRef, previewRef])
  return <canvas ref={canvasRef} className="lyfg-spot-merge-canvas" />
}

export default function SpotDifferenceGame({ onBack, onComplete }) {
  const boardRef = useRef(null); const bodiesRef = useRef([]); const idRef = useRef(1); const sequenceRef = useRef(0); const fruitRef = useRef(0)
  const previewRef = useRef(WIDTH / 2); const targetRef = useRef(WIDTH / 2); const nextTypeRef = useRef(0); const holdingRef = useRef(false); const completeRef = useRef(false)
  const [nextType, setNextType] = useState(0); const [fruitCount, setFruitCount] = useState(0); const [complete, setComplete] = useState(false)
  const pointerX = (event) => { const rect = boardRef.current.getBoundingClientRect(); const radius = TYPES[nextTypeRef.current].radius; return clamp(((event.clientX - rect.left) / rect.width) * WIDTH, radius, WIDTH - radius) }
  const onDown = (event) => { if (completeRef.current) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); holdingRef.current = true; targetRef.current = pointerX(event); previewRef.current = targetRef.current }
  const onMove = (event) => { if (holdingRef.current) { event.preventDefault(); targetRef.current = pointerX(event) } }
  const onUp = (event) => { if (!holdingRef.current) return; event.preventDefault(); holdingRef.current = false; bodiesRef.current = [...bodiesRef.current, createBody(idRef.current++, nextTypeRef.current, pointerX(event), DROP_Y)]; sequenceRef.current += 1; const type = DROP_SEQUENCE[sequenceRef.current % DROP_SEQUENCE.length]; nextTypeRef.current = type; setNextType(type) }
  const restart = () => { bodiesRef.current = []; idRef.current = 1; sequenceRef.current = 0; fruitRef.current = 0; completeRef.current = false; nextTypeRef.current = 0; previewRef.current = WIDTH / 2; targetRef.current = WIDTH / 2; setNextType(0); setFruitCount(0); setComplete(false) }

  useEffect(() => {
    let frame; let then = performance.now(); let completionTimer
    const constrain = (item) => { const radius = TYPES[item.type].radius; if (item.x < radius) { item.x = radius; item.vx = Math.abs(item.vx) * .16; item.spin *= .45 } if (item.x > WIDTH - radius) { item.x = WIDTH - radius; item.vx = -Math.abs(item.vx) * .16; item.spin *= .45 } if (item.y > HEIGHT - radius) { item.y = HEIGHT - radius; item.vy = Math.abs(item.vy) > 80 ? -item.vy * .12 : 0; item.vx *= .68; item.spin *= .25; if (Math.abs(item.vx) < 2) item.vx = 0; if (Math.abs(item.spin) < .12) item.spin = 0 } }
    const tick = (now) => {
      const dt = Math.min((now - then) / 1000, .022); then = now; previewRef.current += (targetRef.current - previewRef.current) * (1 - Math.exp(-24 * dt))
      const items = bodiesRef.current.map((item) => ({ ...item }))
      for (const item of items) { item.vy += 1550 * dt; item.x += item.vx * dt; item.y += item.vy * dt; item.angle += item.spin * dt; item.vx *= Math.exp(-2.4 * dt); item.spin *= Math.exp(-7.2 * dt); if (Math.abs(item.spin) < .025) item.spin = 0; constrain(item) }
      const removed = new Set(); const added = []
      for (let a = 0; a < items.length; a += 1) for (let b = a + 1; b < items.length; b += 1) {
        const left = items[a], right = items[b]; if (removed.has(left.id) || removed.has(right.id)) continue
        const dx = right.x - left.x, dy = right.y - left.y, distance = Math.max(.01, Math.hypot(dx, dy)), minimum = TYPES[left.type].radius + TYPES[right.type].radius
        if (distance >= minimum) continue
        const nx = dx / distance, ny = dy / distance, overlap = minimum - distance; left.x -= nx * overlap / 2; left.y -= ny * overlap / 2; right.x += nx * overlap / 2; right.y += ny * overlap / 2
        let result = -1; if (left.type === right.type && left.type <= 1) result = 2; else if (left.type === 2 && right.type === 2 && fruitRef.current < 5) result = 3 + fruitRef.current
        if (result >= 0) { removed.add(left.id); removed.add(right.id); added.push(createBody(idRef.current++, result, (left.x + right.x) / 2, (left.y + right.y) / 2, { vy: -45, spin: clamp((left.spin + right.spin) * .15, -1.2, 1.2) })); if (result >= 3) { fruitRef.current += 1; setFruitCount(fruitRef.current); if (fruitRef.current === 5) { completeRef.current = true; completionTimer = setTimeout(() => setComplete(true), 900) } } continue }
        const relative = (right.vx - left.vx) * nx + (right.vy - left.vy) * ny; if (relative < -8) { const impulse = -relative * .3; left.vx -= impulse * nx; left.vy -= impulse * ny; right.vx += impulse * nx; right.vy += impulse * ny; if (relative < -140) { left.spin = clamp(left.spin - impulse * .0012, -.55, .55); right.spin = clamp(right.spin + impulse * .0012, -.55, .55) } }
        constrain(left); constrain(right)
      }
      bodiesRef.current = [...items.filter((item) => !removed.has(item.id)), ...added]; frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick); return () => { cancelAnimationFrame(frame); clearTimeout(completionTimer) }
  }, [])

  useEffect(() => {
    if (!complete) return undefined
    const timer = window.setTimeout(onComplete, 900)
    return () => window.clearTimeout(timer)
  }, [complete, onComplete])

  return <main className="lyfg-page lyfg-ih5-page lyfg-spot-merge-page"><Ih5Stage label="乡韵怀旧合成果实">
    <img className="lyfg-ih5-background" src={getLvyuanFruitfulGamesAsset('spotDifferenceGameBackground')} alt="" draggable="false" />
    <button className="lyfg-spot-merge-back" type="button" onClick={onBack}>返回</button><div className="lyfg-spot-merge-progress">硕果 <b>{fruitCount}</b>/5</div>
    <section ref={boardRef} className="lyfg-spot-merge-board" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label="按住移动种子，松手下落">
      <GameCanvas bodiesRef={bodiesRef} previewRef={previewRef} nextTypeRef={nextTypeRef} completeRef={completeRef} /><span className="lyfg-spot-merge-tip">按住移动 · 松手下落 · 当前：{TYPES[nextType].name}</span>
    </section>
    {complete ? <div className="lyfg-spot-merge-success"><div><strong>五果丰收</strong><p>恭喜完成游戏！</p><button type="button" onClick={restart}>再玩一次</button><button type="button" onClick={onBack}>返回选择</button></div></div> : null}
  </Ih5Stage></main>
}
