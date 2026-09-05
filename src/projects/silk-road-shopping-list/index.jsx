import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeleteOutlined, DownloadOutlined, SyncOutlined } from '@ant-design/icons'
import { createPortal } from 'react-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getCurrentUser, getPublicConfig } from './api'
import { SILK_ROAD_PRODUCTS, SILK_ROAD_SHOPPING_LIST_ACTIVITY_KEY, silkRoadAssets } from './config'
import './styles.css'

const DESIGN_WIDTH = 750
const PRODUCT_LIST_BOTTOM_GUTTER = 150
const PRODUCT_CARD_HEIGHT = 340

function getShoppingScore(quantity) {
  const count = Math.min(Math.max(quantity, 0), 28)
  const bands = [
    [0, 7, 0, 30],
    [8, 14, 30, 60],
    [15, 21, 60, 80],
    [22, 28, 80, 100],
  ]
  const [minCount, maxCount, minScore, maxScore] = bands.find(([, maxCount]) => count <= maxCount)
  return Math.round(minScore + ((count - minCount) / (maxCount - minCount)) * (maxScore - minScore))
}

const POSTER_TIERS = [
  {
    max: 7,
    title: '丝路新手·大漠小白',
    height: 1624,
    backgrounds: [{ src: silkRoadAssets.posterNovice, height: 1624 }],
    avatar: { left: 49, top: 555, size: 106 },
    nickname: { left: 167, top: 561, width: 153, height: 46, fontSize: 24, align: 'left' },
    quantity: { left: 158, top: 722, width: 119, height: 64, fontSize: 53 },
    score: { left: 163, top: 851, width: 119, height: 64, fontSize: 53 },
    titleBox: { left: 47, top: 1025, width: 257, height: 46, fontSize: 25 },
    lists: [{ left: 384, top: 641, width: 320, height: 644, rotate: 4 }],
    product: {
      width: 320, height: 92, step: 92, offsetLeft: 4,
      image: { left: 3, top: -18, width: 89, height: 126 },
      name: { left: 93, top: 16, width: 148, height: 46, fontSize: 25 },
      check: { left: 260, top: 25, size: 26 },
    },
    qr: { left: 72, top: 1295, outer: 154, inner: 141 },
  },
  {
    max: 14,
    title: '丝路学徒·长安常客',
    height: 1624,
    backgrounds: [{ src: silkRoadAssets.posterApprentice, height: 1624 }],
    avatar: { left: 49, top: 555, size: 106 },
    nickname: { left: 167, top: 561, width: 153, height: 46, fontSize: 24, align: 'left' },
    quantity: { left: 158, top: 722, width: 119, height: 64, fontSize: 53 },
    score: { left: 163, top: 851, width: 119, height: 64, fontSize: 53 },
    titleBox: { left: 47, top: 1025, width: 257, height: 46, fontSize: 25 },
    lists: [{ left: 384, top: 590, width: 320, height: 884, rotate: 3 }],
    product: {
      width: 320, height: 63, step: 63, offsetLeft: 4,
      image: { left: 26, top: -12, width: 66, height: 93 },
      name: { left: 93, top: 16, width: 148, height: 46, fontSize: 22 },
      check: { left: 260, top: 25, size: 26 },
    },
    qr: { left: 72, top: 1295, outer: 154, inner: 141 },
  },
  {
    max: 21,
    title: '丝路行家·西市VIP',
    height: 1900,
    backgrounds: [{ src: silkRoadAssets.posterExpert, height: 1900 }],
    avatar: { left: 62, top: 633, size: 106 },
    nickname: { left: 41, top: 759, width: 153, height: 46, fontSize: 24, align: 'center' },
    quantity: { left: 36, top: 965, width: 119, height: 64, fontSize: 45 },
    score: { left: 36, top: 1163, width: 119, height: 64, fontSize: 45 },
    titleBox: { left: 32, top: 1346, width: 175, height: 46, fontSize: 20 },
    lists: [
      { left: 255, top: 722, width: 203, height: 884, rotate: 0 },
      { left: 501, top: 722, width: 203, height: 884, rotate: 0 },
    ],
    product: {
      width: 203, height: 63, step: 76, offsetLeft: 4,
      image: { left: -3, top: -12, width: 66, height: 93 },
      name: { left: 55, top: 16, width: 102, height: 46, fontSize: 20 },
      check: { left: 161, top: 25, size: 26 },
    },
    qr: { left: 53, top: 1520, outer: 134, inner: 124 },
  },
  {
    max: 28,
    title: '丝路宗师·凿空之王',
    height: 2098,
    backgrounds: [
      { src: silkRoadAssets.posterExpert, height: 1900 },
      { src: silkRoadAssets.posterMasterOverlay, height: 2098 },
    ],
    avatar: { left: 49, top: 583, size: 106 },
    nickname: { left: 28, top: 687, width: 153, height: 46, fontSize: 24, align: 'center' },
    quantity: { left: 11, top: 895, width: 119, height: 64, fontSize: 45 },
    score: { left: 28, top: 1105, width: 119, height: 64, fontSize: 45 },
    titleBox: { left: 16, top: 1324, width: 175, height: 46, fontSize: 20 },
    lists: [
      { left: 237, top: 650, width: 223, height: 1193, rotate: 1 },
      { left: 501, top: 650, width: 223, height: 1193, rotate: 1 },
    ],
    product: {
      width: 203, height: 63, step: 85, offsetLeft: 4,
      image: { left: -3, top: -12, width: 66, height: 93 },
      name: { left: 65, top: 16, width: 102, height: 46, fontSize: 20 },
      check: { left: 176, top: 25, size: 26 },
    },
    qr: { left: 41, top: 1633, outer: 134, inner: 124 },
  },
]

function getPosterTier(quantity) {
  return POSTER_TIERS.find(({ max }) => quantity <= max) || POSTER_TIERS[POSTER_TIERS.length - 1]
}

function getPosterColumns(products, tier) {
  if (tier.lists.length === 1) return [products]
  return [
    products.filter((_, index) => index % 2 === 0),
    products.filter((_, index) => index % 2 === 1),
  ]
}

function fitPosterText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text
  let value = text
  while (value && context.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1)
  return `${value}…`
}

function loadPosterImage(src, label, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error(`${label}地址缺失`))
      return
    }
    const image = new Image()
    image.referrerPolicy = 'no-referrer'
    let settled = false
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      callback(value)
    }
    const timer = window.setTimeout(() => finish(reject, new Error(`${label}加载超时`)), timeout)
    image.crossOrigin = 'anonymous'
    image.onload = () => finish(resolve, image)
    image.onerror = () => finish(reject, new Error(`${label}加载失败`))
    image.src = src
  })
}

function waitForPosterQr(qrRef) {
  return new Promise((resolve, reject) => {
    let remainingAttempts = 30
    const findCanvas = () => {
      const canvas = qrRef.current?.querySelector('canvas')
      if (canvas?.width && canvas?.height) {
        resolve(canvas)
        return
      }
      remainingAttempts -= 1
      if (remainingAttempts <= 0) {
        reject(new Error('二维码生成超时'))
        return
      }
      window.setTimeout(findCanvas, 50)
    }
    findCanvas()
  })
}

function useScale(designHeight, fitViewport) {
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / DESIGN_WIDTH, fitViewport ? window.innerHeight / designHeight : 1, 1))
  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / DESIGN_WIDTH, fitViewport ? window.innerHeight / designHeight : 1, 1))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [designHeight, fitViewport])
  return scale
}

function Stage({ height, children, className = '', fitViewport = false }) {
  const scale = useScale(height, fitViewport)
  return <div className={`srsl-frame ${className}`} style={{ width: 750 * scale, height: height * scale }}><div className="srsl-stage" style={{ width: 750, height, transform: `scale(${scale})` }}>{children}</div></div>
}

function flyProductToCart(image, sourceElement) {
  const sourceImage = sourceElement.closest('.srsl-product-card')?.querySelector('.srsl-product-image')
  const dock = document.querySelector('.srsl-dock')
  if (!sourceImage || !dock || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const sourceRect = sourceImage.getBoundingClientRect()
  const dockRect = dock.getBoundingClientRect()
  const size = Math.max(48, Math.min(74, sourceRect.width * .72))
  const startLeft = sourceRect.left + (sourceRect.width - size) / 2
  const startTop = sourceRect.top + (sourceRect.height - size) / 2
  const distanceX = dockRect.left + dockRect.width * .1 - (startLeft + size / 2)
  const distanceY = dockRect.top + dockRect.height * .58 - (startTop + size / 2)
  const arc = Math.min(150, Math.max(56, Math.abs(distanceY) * .2))
  const flyer = document.createElement('img')
  flyer.className = 'srsl-product-flyer'
  flyer.alt = ''
  flyer.src = image
  flyer.style.width = `${size}px`
  flyer.style.height = `${size}px`
  flyer.style.left = `${startLeft}px`
  flyer.style.top = `${startTop}px`
  document.body.appendChild(flyer)
  if (typeof flyer.animate !== 'function') {
    flyer.remove()
    return
  }
  const animation = flyer.animate([
    { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translate3d(${distanceX * .54}px, ${distanceY * .26 - arc}px, 0) scale(.78) rotate(8deg)`, opacity: 1, offset: .48 },
    { transform: `translate3d(${distanceX}px, ${distanceY}px, 0) scale(.24) rotate(18deg)`, opacity: .15 },
  ], { duration: 720, easing: 'cubic-bezier(.28, .7, .22, 1)', fill: 'forwards' })
  const removeFlyer = () => flyer.remove()
  animation.oncancel = removeFlyer
  animation.onfinish = () => {
    removeFlyer()
    dock.animate?.([
      { transform: 'translate3d(-50%, -100%, 0) scale(1)' },
      { transform: 'translate3d(-50%, -100%, 0) scale(1.055)', offset: .42 },
      { transform: 'translate3d(-50%, -100%, 0) scale(1)' },
    ], { duration: 360, easing: 'ease-out' })
  }
}

function Sandstorm() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return undefined

    const width = DESIGN_WIDTH
    const height = 1624
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const random = (min, max) => Math.random() * (max - min) + min
    const colors = ['232, 191, 126', '214, 154, 79', '181, 113, 49']
    let pixelRatio = 1
    let particles = []
    let frameId = 0
    let previousTime = performance.now()
    let time = 0
    const defaultWind = 1.18
    let wind = defaultWind
    let targetWind = defaultWind
    let nextGustAt = 0

    const resetParticle = (particle, initial = false) => {
      particle.x = initial ? random(-30, width) : width + random(10, width * .15)
      particle.y = random(height * .12, height)
    }

    const createParticle = (type) => {
      const particle = type === 0
        ? { type, size: random(.45, 1.15), ratio: random(.7, 1.3), speed: random(28, 74), alpha: random(.13, .38), rotateSpeed: random(-.25, .25), wave: random(7, 20) }
        : type === 1
          ? { type, size: random(1.1, 2.3), ratio: random(.65, 1.4), speed: random(82, 156), alpha: random(.22, .55), rotateSpeed: random(-.45, .45), wave: random(16, 42) }
          : { type, size: random(2.5, 5.5), ratio: random(.55, 1.35), speed: random(175, 290), alpha: random(.12, .32), rotateSpeed: random(-.7, .7), wave: random(28, 70), blur: random(.3, 1.8) }
      particle.rotation = random(-.35, .35)
      particle.waveSpeed = random(.45, 1.35)
      particle.offset = random(0, Math.PI * 2)
      resetParticle(particle, true)
      return particle
    }

    const createParticles = () => {
      const compact = window.innerWidth < 600
      const counts = compact ? [350, 150, 34] : [540, 220, 56]
      particles = counts.flatMap((count, type) => Array.from({ length: count }, () => createParticle(type)))
    }

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * pixelRatio
      canvas.height = height * pixelRatio
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      createParticles()
    }

    const drawGroundDust = () => {
      const gradient = context.createLinearGradient(0, height * .48, 0, height)
      gradient.addColorStop(0, 'rgba(213, 145, 64, 0)')
      gradient.addColorStop(.72, `rgba(213, 145, 64, ${.042 * wind})`)
      gradient.addColorStop(1, `rgba(205, 130, 50, ${.11 * wind})`)
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)
    }

    const drawParticle = (particle) => {
      context.save()
      context.translate(particle.x, particle.y)
      context.rotate(particle.rotation)
      if (particle.type === 2) {
        context.shadowBlur = particle.blur * 2
        context.shadowColor = 'rgba(255, 215, 145, .4)'
      }
      context.fillStyle = `rgba(${colors[particle.type]}, ${particle.alpha})`
      context.beginPath()
      context.ellipse(0, 0, particle.size * particle.ratio, particle.size * random(.55, .9), 0, 0, Math.PI * 2)
      context.fill()
      context.restore()
    }

    const updateParticle = (particle, delta) => {
      particle.x -= particle.speed * wind * delta
      particle.y += (particle.speed * .19 + Math.sin(time * particle.waveSpeed + particle.offset) * particle.wave) * wind * delta
      particle.rotation += particle.rotateSpeed * delta
      if (particle.x < -particle.size * 6 || particle.y > height + 32) resetParticle(particle)
    }

    const render = (delta) => {
      time += delta
      if (time >= nextGustAt) {
        targetWind = random(.98, 1.48)
        nextGustAt = time + random(2.6, 5.8)
      }
      wind += (targetWind - wind) * Math.min(delta * 1.8, 1)
      context.clearRect(0, 0, width, height)
      drawGroundDust()
      particles.forEach((particle) => {
        updateParticle(particle, delta)
        drawParticle(particle)
      })
    }

    const animate = (now) => {
      const delta = Math.min((now - previousTime) / 1000, .04)
      previousTime = now
      render(delta)
      frameId = window.requestAnimationFrame(animate)
    }

    resize()
    if (reducedMotion) render(0)
    else frameId = window.requestAnimationFrame(animate)
    window.addEventListener('resize', resize)
    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <div className="srsl-sandstorm" aria-hidden="true"><canvas ref={canvasRef} /></div>
}

function OrientationPrompt() {
  return <div className="srsl-orientation-prompt" role="status" aria-live="polite">
    <div className="srsl-orientation-phone" aria-hidden="true"><span /></div>
    <div className="srsl-orientation-copy">请竖置手机锁定方向后<br />再横屏观看视频</div>
  </div>
}

function Home({ onStart }) {
  return <Stage height={1624} className="srsl-home-stage">
    <div style={{ position: 'absolute', width: 750, height: 1448, left: 0, top: 88 }}>
      <img className="srsl-home-background" alt="" src={silkRoadAssets.homeBackground} style={{ position: 'absolute', width: 750, height: 1624, left: 0, top: -88 }} />
      <img className="srsl-home-title" alt="" src={silkRoadAssets.homeTitle} style={{ position: 'absolute', width: 440, height: 53, left: 155, top: 725 }} />
      <img className="srsl-home-illustration" alt="" src={silkRoadAssets.homeIllustration} style={{ position: 'absolute', width: 295, height: 595, left: 204, top: 87 }} />
      <img className="srsl-home-ribbon" alt="" src={silkRoadAssets.homeRibbon} style={{ position: 'absolute', width: 595, height: 25, left: 78, top: 1289 }} />
      <button className="srsl-image-button srsl-home-start" type="button" aria-label="开始集宝" onClick={onStart} style={{ position: 'absolute', width: 523, height: 145, left: 113, top: 1121 }}><img alt="开始集宝" src={silkRoadAssets.homeStart} /></button>
    </div>
    <Sandstorm />
  </Stage>
}

function VideoPanel({ mode, videoRef, onEnd, onShop }) {
  const [progress, setProgress] = useState(0)
  const progressRef = useRef(null)
  const draggingProgressRef = useRef(false)
  const updateProgress = (event) => {
    const video = event.currentTarget
    const duration = Number(video.duration)
    setProgress(Number.isFinite(duration) && duration > 0 ? Math.min(video.currentTime / duration, 1) : 0)
  }
  const seekToPointer = (event) => {
    const video = videoRef.current
    const track = progressRef.current
    const duration = Number(video?.duration)
    if (!video || !track || !Number.isFinite(duration) || duration <= 0) return
    const rect = track.getBoundingClientRect()
    const isVertical = rect.height > rect.width
    const position = isVertical ? (event.clientY - rect.top) / rect.height : (event.clientX - rect.left) / rect.width
    const ratio = Math.min(Math.max(position, 0), 1)
    video.currentTime = ratio * duration
    setProgress(ratio)
  }
  const handleProgressKeyDown = (event) => {
    const video = videoRef.current
    const duration = Number(video?.duration)
    if (!video || !Number.isFinite(duration) || duration <= 0) return
    const step = 5 / duration
    let nextProgress
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') nextProgress = Math.min(progress + step, 1)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') nextProgress = Math.max(progress - step, 0)
    else if (event.key === 'Home') nextProgress = 0
    else if (event.key === 'End') nextProgress = 1
    else return
    event.preventDefault()
    video.currentTime = nextProgress * duration
    setProgress(nextProgress)
  }
  return <div className={`srsl-video-panel${mode === 'orientation' ? ' is-preparing' : ''}`}>
    <Stage height={1448}>
      <div style={{ position: 'absolute', width: 1448, height: 750, left: 750, top: 0, transform: 'rotate(90deg)', transformOrigin: '0 0', transformStyle: 'flat' }}>
        <video ref={videoRef} src={silkRoadAssets.video} playsInline webkit-playsinline="true" x5-video-player-fullscreen="true" x5-video-player-type="h5" x-webkit-airplay="allow" airplay="allow" preload="auto" onDurationChange={updateProgress} onTimeUpdate={updateProgress} onEnded={onEnd} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        {mode === 'video' && <div ref={progressRef} className="srsl-video-progress" role="slider" tabIndex={0} aria-label="视频播放进度，可拖动调整" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)} aria-valuetext={`${Math.round(progress * 100)}%`} style={{ '--srsl-video-progress': `${progress * 100}%` }} onPointerDown={(event) => { event.preventDefault(); draggingProgressRef.current = true; event.currentTarget.setPointerCapture?.(event.pointerId); seekToPointer(event) }} onPointerMove={(event) => { if (draggingProgressRef.current) seekToPointer(event) }} onPointerUp={(event) => { draggingProgressRef.current = false; event.currentTarget.releasePointerCapture?.(event.pointerId) }} onPointerCancel={(event) => { draggingProgressRef.current = false; event.currentTarget.releasePointerCapture?.(event.pointerId) }} onKeyDown={handleProgressKeyDown} />}
      </div>
      {mode === 'video' ? <button type="button" className="srsl-skip" onClick={onEnd}>跳过</button> : mode === 'video-end' ? <button className="srsl-image-button srsl-shop-entry" type="button" aria-label="进入选购" onClick={onShop} style={{ position: 'absolute', width: 333, height: 78, left: '50%', top: '50%', transform: 'translate(-50%, -50%) rotate(90deg)', transformOrigin: '50% 50%' }}><img alt="" src={silkRoadAssets.orientationHint} /></button> : null}
    </Stage>
  </div>
}

function ProductCard({ product, selected, onToggle }) {
  const [flipped, setFlipped] = useState(false)
  return <div className={`srsl-product-card${flipped ? ' is-flipped' : ''}`} role="button" tabIndex={0} onClick={() => setFlipped(!flipped)} onKeyDown={(event) => event.key === 'Enter' && setFlipped(!flipped)}>
    <div className="srsl-product-face">
      <img alt="" src={silkRoadAssets.productCard} style={{ position: 'absolute', width: 337, height: PRODUCT_CARD_HEIGHT, left: 0, top: 0 }} />
      {!flipped && <button className="srsl-add" type="button" aria-label={selected ? `移除${product.name}` : `加入${product.name}`} onClick={(event) => { event.stopPropagation(); onToggle(product, event.currentTarget) }}>
        <img alt="" src={selected ? silkRoadAssets.minusIcon : silkRoadAssets.plusIcon} />
      </button>}
      <img className="srsl-product-image" alt={product.name} src={product.image} style={{ position: 'absolute', width: 127, height: 180, left: 98, top: 22 }} />
      <span className="srsl-product-name">{product.name}</span>
    </div>
    <div className="srsl-product-face srsl-product-detail">
      <img alt="" src={silkRoadAssets.productCard} style={{ position: 'absolute', width: 337, height: PRODUCT_CARD_HEIGHT, left: 0, top: 0 }} />
      <img alt="" src={silkRoadAssets.detailTitle} style={{ position: 'absolute', width: 115, height: 58, left: 109, top: 28 }} />
      <img alt="" src={silkRoadAssets.detailIcon} style={{ position: 'absolute', width: 35, height: 35, left: 17.5, top: 15.5 }} />
      <span className="srsl-detail-name">{product.name}</span>
      <div className="srsl-detail-description">
        <p><b>原产地：</b>{product.origin}</p>
        <p><b>传入时间：</b>{product.transferTime}</p>
        <p><b>记载：</b>{product.record}</p>
      </div>
      {flipped && <button className="srsl-add" type="button" aria-label={selected ? `移除${product.name}` : `加入${product.name}`} onClick={(event) => { event.stopPropagation(); onToggle(product, event.currentTarget) }}>
        <img alt="" src={selected ? silkRoadAssets.minusIcon : silkRoadAssets.plusIcon} />
      </button>}
    </div>
  </div>
}

function ProductList({ products, selectedIds, onToggle, onOpenCart, onCheckout }) {
  const rows = Math.ceil(products.length / 2)
  const handleToggle = (product, sourceElement) => {
    if (!selectedIds.includes(product.id)) flyProductToCart(product.image, sourceElement)
    onToggle(product.id)
  }
  const dock = <div className="srsl-dock">
    <img alt="" src={silkRoadAssets.cartDock} />
    <span className="srsl-dock-badge-count">{selectedIds.length}</span>
    <span className="srsl-dock-selected-count">{selectedIds.length}</span>
    <button type="button" className="srsl-dock-cart-hitbox" aria-label="查看购物车" onClick={onOpenCart} />
    <button type="button" className="srsl-dock-checkout-hitbox" aria-label="去结算" onClick={onCheckout} />
  </div>
  return <>
  <Stage height={646 + rows * PRODUCT_CARD_HEIGHT + PRODUCT_LIST_BOTTOM_GUTTER} className="srsl-list-stage">
    <img alt="" src={silkRoadAssets.cartHeader} style={{ position: 'absolute', width: 750, height: 551, left: 0, top: 0 }} />
    <span className="srsl-progress" style={{ left: 410, top: 464, width: 60, height: 43 }}>{selectedIds.length}</span>
    <img alt="" src={silkRoadAssets.cartSectionTitle} style={{ position: 'absolute', width: 255, height: 28, left: 247.5, top: 612 }} />
    <span className="srsl-card-detail-hint">点击卡片查看详情</span>
    <div className="srsl-product-grid" style={{ top: 646, height: rows * PRODUCT_CARD_HEIGHT + 20 }}>{products.map((product) => <ProductCard key={product.id} product={product} selected={selectedIds.includes(product.id)} onToggle={handleToggle} />)}</div>
  </Stage>
  {createPortal(dock, document.body)}
  </>
}

function CartDrawer({ products, onClose, onRemove, onCheckout }) {
  return <div className="srsl-cart-drawer-layer" role="dialog" aria-modal="true" aria-label="已选商品">
    <button className="srsl-cart-backdrop" type="button" aria-label="关闭购物车" onClick={onClose} />
    <section className="srsl-cart-drawer">
      <div className="srsl-cart-drawer-handle" />
      <h2>已选商品</h2>
      <p className="srsl-cart-drawer-count">共 {products.length} 件</p>
      <div className="srsl-cart-drawer-list">{products.map((product) => <article key={product.id}>
        <img alt={product.name} src={product.image} />
        <strong>{product.name}</strong>
        <span>x1</span>
        <button type="button" aria-label={`移除${product.name}`} onClick={() => onRemove(product.id)}><DeleteOutlined /></button>
      </article>)}</div>
      <footer><span>已选 <b>{products.length}</b> 件</span><button type="button" onClick={onCheckout}>去结算 ›</button></footer>
    </section>
  </div>
}

function Poster({ products, profile, onBack, onReselect }) {
  const qrRef = useRef(null)
  const [posterImage, setPosterImage] = useState('')
  const [posterError, setPosterError] = useState('')
  const tier = getPosterTier(products.length)
  const columns = useMemo(() => getPosterColumns(products, tier), [products, tier])
  const score = getShoppingScore(products.length)
  const composePoster = useCallback(async () => {
    const qrCanvas = await waitForPosterQr(qrRef)
    const output = document.createElement('canvas')
    output.width = 750
    output.height = tier.height
    const context = output.getContext('2d')
    if (!context) throw new Error('当前浏览器不支持海报合成')
    context.fillStyle = '#f3e2d3'
    context.fillRect(0, 0, output.width, output.height)
    const [backgrounds, checkImage, avatar, productImages] = await Promise.all([
      Promise.all(tier.backgrounds.map((layer, index) => loadPosterImage(layer.src, `第${index + 1}层海报背景`))),
      loadPosterImage(silkRoadAssets.posterCheck, '商品勾选图标'),
      profile.avatar ? loadPosterImage(profile.avatar, '微信头像', 1500).catch(() => null) : Promise.resolve(null),
      Promise.all(products.map((product, index) => loadPosterImage(product.posterImage, `第${index + 1}件商品“${product.name}”图片`))),
    ])
    backgrounds.forEach((background, index) => {
      context.drawImage(background, 0, 0, 750, tier.backgrounds[index].height)
    })
    if (avatar) {
      const { left, top, size } = tier.avatar
      context.fillStyle = '#fff'
      context.beginPath()
      context.arc(left + size / 2, top + size / 2, size / 2, 0, Math.PI * 2)
      context.fill()
      context.save()
      context.beginPath()
      context.arc(left + size / 2, top + size / 2, size / 2 - 2, 0, Math.PI * 2)
      context.clip()
      context.drawImage(avatar, left + 2, top + 2, size - 4, size - 4)
      context.restore()
    }
    const nickname = profile.nickname || '丝路旅人'
    const nicknameBox = tier.nickname
    context.fillStyle = '#3b4b42'
    context.font = `bold ${nicknameBox.fontSize}px PingFang SC, Microsoft YaHei, sans-serif`
    context.textAlign = nicknameBox.align
    context.textBaseline = 'middle'
    const nicknameX = nicknameBox.align === 'center' ? nicknameBox.left + nicknameBox.width / 2 : nicknameBox.left
    context.fillText(fitPosterText(context, nickname, nicknameBox.width), nicknameX, nicknameBox.top + nicknameBox.height / 2)

    const drawNumber = (value, box) => {
      context.fillStyle = '#000'
      context.font = `bold ${box.fontSize}px Arial, sans-serif`
      context.textAlign = 'right'
      context.textBaseline = 'middle'
      context.fillText(String(value), box.left + box.width, box.top + box.height / 2)
    }
    drawNumber(products.length, tier.quantity)
    drawNumber(score, tier.score)

    const titleBox = tier.titleBox
    context.fillStyle = '#fff'
    context.font = `${titleBox.fontSize}px PingFang SC, Microsoft YaHei, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(tier.title, titleBox.left + titleBox.width / 2, titleBox.top + titleBox.height / 2)

    const productImagesById = new Map(products.map((product, index) => [product.id, productImages[index]]))
    columns.forEach((columnProducts, columnIndex) => {
      const list = tier.lists[columnIndex]
      context.save()
      context.translate(list.left, list.top)
      context.rotate((list.rotate * Math.PI) / 180)
      columnProducts.forEach((product, rowIndex) => {
        const itemLeft = tier.product.offsetLeft
        const itemTop = rowIndex * tier.product.step
        const imageBox = tier.product.image
        const nameBox = tier.product.name
        const checkBox = tier.product.check
        context.drawImage(productImagesById.get(product.id), itemLeft + imageBox.left, itemTop + imageBox.top, imageBox.width, imageBox.height)
        context.fillStyle = '#5c3819'
        context.font = `${nameBox.fontSize}px PingFang SC, Microsoft YaHei, sans-serif`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(fitPosterText(context, product.name, nameBox.width), itemLeft + nameBox.left + nameBox.width / 2, itemTop + nameBox.top + nameBox.height / 2)
        context.strokeStyle = '#5c3819'
        context.lineWidth = 2
        context.strokeRect(itemLeft + checkBox.left, itemTop + checkBox.top, checkBox.size, checkBox.size)
        context.drawImage(checkImage, itemLeft + checkBox.left, itemTop + checkBox.top, checkBox.size, checkBox.size)
      })
      context.restore()
    })

    const qrLeft = tier.qr.left + (tier.qr.outer - tier.qr.inner) / 2
    const qrTop = tier.qr.top + (tier.qr.outer - tier.qr.inner) / 2
    context.fillStyle = '#fff'
    context.fillRect(qrLeft, qrTop, tier.qr.inner, tier.qr.inner)
    context.drawImage(qrCanvas, qrLeft, qrTop, tier.qr.inner, tier.qr.inner)
    const dataUrl = (() => {
      try {
        return output.toDataURL('image/png')
      } catch (error) {
        throw new Error(`海报转成图片失败：${error instanceof Error ? error.message : 'Canvas 导出异常'}`, { cause: error })
      }
    })()
    if (!dataUrl.startsWith('data:image/png')) throw new Error('海报转成图片失败：未生成 PNG 数据')
    return dataUrl
  }, [columns, products, profile.avatar, profile.nickname, score, tier])

  const savePoster = useCallback(async () => {
    try {
      setPosterImage(await composePoster())
    } catch (error) {
      console.error('[silk-road-shopping-list] poster composition failed', error)
      setPosterError(error instanceof Error ? error.message : '海报生成失败：未知异常')
    }
  }, [composePoster])

  useEffect(() => {
    let active = true
    composePoster().then((image) => {
      if (active) setPosterImage(image)
    }).catch((error) => {
      console.error('[silk-road-shopping-list] automatic poster composition failed', error)
      if (active) setPosterError(error instanceof Error ? error.message : '海报生成失败：未知异常')
    })
    return () => { active = false }
  }, [composePoster])
  return <Stage height={tier.height} className="srsl-final-poster-stage">
    {tier.backgrounds.map((background, index) => <img className="srsl-final-background" alt="" src={background.src} key={background.src} referrerPolicy="no-referrer" style={{ position: 'absolute', width: 750, height: background.height, left: 0, top: 0, zIndex: index }} />)}
    <button className="srsl-back-hitbox" type="button" aria-label="返回购物车" onClick={onBack} />
    {profile.avatar && <div className="srsl-final-avatar" style={{ left: tier.avatar.left, top: tier.avatar.top, width: tier.avatar.size, height: tier.avatar.size }}><img alt="" src={profile.avatar} referrerPolicy="no-referrer" /></div>}
    <span className="srsl-final-nickname" style={{ left: tier.nickname.left, top: tier.nickname.top, width: tier.nickname.width, height: tier.nickname.height, fontSize: tier.nickname.fontSize, textAlign: tier.nickname.align, justifyContent: tier.nickname.align === 'center' ? 'center' : 'flex-start' }}>{profile.nickname || '丝路旅人'}</span>
    <span className="srsl-final-number" style={{ left: tier.quantity.left, top: tier.quantity.top, width: tier.quantity.width, height: tier.quantity.height, fontSize: tier.quantity.fontSize }}>{products.length}</span>
    <span className="srsl-final-number" style={{ left: tier.score.left, top: tier.score.top, width: tier.score.width, height: tier.score.height, fontSize: tier.score.fontSize }}>{score}</span>
    <span className="srsl-final-title" style={{ left: tier.titleBox.left, top: tier.titleBox.top, width: tier.titleBox.width, height: tier.titleBox.height, fontSize: tier.titleBox.fontSize }}>{tier.title}</span>
    {columns.map((columnProducts, columnIndex) => {
      const list = tier.lists[columnIndex]
      return <div className="srsl-final-product-list" key={list.left} style={{ left: list.left, top: list.top, width: list.width, height: list.height, transform: `rotate(${list.rotate}deg)` }}>
        {columnProducts.map((product, rowIndex) => <div className="srsl-final-product" key={product.id} style={{ left: tier.product.offsetLeft, top: rowIndex * tier.product.step, width: tier.product.width, height: tier.product.height }}>
          <img className="srsl-final-product-image" alt={product.name} src={product.image} style={{ left: tier.product.image.left, top: tier.product.image.top, width: tier.product.image.width, height: tier.product.image.height }} />
          <span className="srsl-final-product-name" style={{ left: tier.product.name.left, top: tier.product.name.top, width: tier.product.name.width, height: tier.product.name.height, fontSize: tier.product.name.fontSize }}>{product.name}</span>
          <span className="srsl-final-product-check" style={{ left: tier.product.check.left, top: tier.product.check.top, width: tier.product.check.size, height: tier.product.check.size }}><img alt="" src={silkRoadAssets.posterCheck} /></span>
        </div>)}
      </div>
    })}
    <div ref={qrRef} className="srsl-final-qr" style={{ left: tier.qr.left, top: tier.qr.top, width: tier.qr.outer, height: tier.qr.outer, padding: (tier.qr.outer - tier.qr.inner) / 2 }}><QRCodeCanvas value={window.location.href} size={tier.qr.inner} includeMargin={false} /></div>
    {posterError && createPortal(<div className="srsl-poster-error" role="alert">海报生成失败：{posterError}</div>, document.body)}
    {createPortal(<div className="srsl-poster-actions" role="group" aria-label="海报操作">
      <button className="srsl-poster-save" type="button" onClick={() => { setPosterError(''); savePoster() }}><DownloadOutlined />保存海报</button>
      <button className="srsl-poster-reselect" type="button" onClick={onReselect}><SyncOutlined />重新选购</button>
    </div>, document.body)}
    {posterImage && createPortal(<div className="srsl-poster-preview" role="dialog" aria-modal="true" aria-label="生成的海报">
      <button type="button" aria-label="关闭海报" onClick={() => setPosterImage('')}>×</button>
      <img alt="千年丝路带货清单海报" src={posterImage} />
      <p className="srsl-poster-save-hint">长按图片保存到手机</p>
    </div>, document.body)}
  </Stage>
}

export default function SilkRoadShoppingList() {
  const [publicConfig, setPublicConfig] = useState(null)
  const [page, setPage] = useState('home')
  const [selectedIds, setSelectedIds] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [profile, setProfile] = useState({ nickname: '丝路旅人', avatar: '' })
  const videoRef = useRef(null)
  const selected = useMemo(() => SILK_ROAD_PRODUCTS.filter((product) => selectedIds.includes(product.id)), [selectedIds])
  const authConfig = useMemo(() => publicConfig ? { ...publicConfig, oauthScope: 'snsapi_userinfo', requireUserinfo: true } : null, [publicConfig])
  const { authReady, reauth } = useWechatAuth(SILK_ROAD_SHOPPING_LIST_ACTIVITY_KEY, authConfig)
  useWechatShare(SILK_ROAD_SHOPPING_LIST_ACTIVITY_KEY, publicConfig)

  useEffect(() => { localStorage.removeItem('silk-road-shopping-list-cart') }, [])
  useEffect(() => {
    let active = true
    getPublicConfig(SILK_ROAD_SHOPPING_LIST_ACTIVITY_KEY).then((config) => {
      if (active) setPublicConfig(config || {})
    }).catch(() => {
      if (active) setPublicConfig({})
    })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!authReady) return undefined
    let active = true
    getCurrentUser().then((user) => {
      if (active) setProfile({ nickname: user?.nickname || '丝路旅人', avatar: user?.avatar || '' })
    }).catch((error) => {
      if (active && Number(error?.status) === 401) reauth('current-user-unauthorized')
    })
    return () => { active = false }
  }, [authReady, reauth])
  useEffect(() => {
    if (page !== 'orientation') return undefined
    const timer = window.setTimeout(() => setPage('video'), 3000)
    return () => window.clearTimeout(timer)
  }, [page])
  useEffect(() => {
    if (page !== 'video') return
    const video = videoRef.current
    if (!video) return
    video.muted = false
    video.volume = 1
    video.play().catch(() => {
      video.muted = true
      video.play().catch(() => null)
    })
  }, [page])

  const toggle = (id) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])
  const videoEnd = () => { videoRef.current?.pause(); setPage('video-end') }
  const startVideo = () => setPage('orientation')
  const checkout = () => {
    setCartOpen(false)
    setPage('poster')
  }
  if (page === 'home' || page === 'orientation' || page === 'video' || page === 'video-end') return <main className={`srsl-intro-screen${page === 'video' || page === 'video-end' ? ' is-video' : ''}`}>
    {(page === 'home' || page === 'orientation') && <Home onStart={startVideo} />}
    {page === 'orientation' && <OrientationPrompt />}
    {page !== 'home' && <VideoPanel key="video-panel" mode={page} videoRef={videoRef} onEnd={videoEnd} onShop={() => setPage('shop')} />}
  </main>
  if (page === 'poster') return <main className="srsl-app"><Poster products={selected} profile={profile} onBack={() => { setPage('shop'); setCartOpen(true) }} onReselect={() => { localStorage.removeItem('silk-road-shopping-list-cart'); setSelectedIds([]); setCartOpen(false); setPage('shop') }} /></main>
  return <main className="srsl-app"><ProductList products={SILK_ROAD_PRODUCTS} selectedIds={selectedIds} onToggle={toggle} onOpenCart={() => setCartOpen(true)} onCheckout={checkout} />{cartOpen && <CartDrawer products={selected} onClose={() => setCartOpen(false)} onRemove={toggle} onCheckout={checkout} />}</main>
}
