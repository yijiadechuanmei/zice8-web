import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeleteOutlined, DownloadOutlined, SwapOutlined, SyncOutlined } from '@ant-design/icons'
import { createPortal } from 'react-dom'
import { QRCodeCanvas } from 'qrcode.react'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import { activityAudioService } from '../../shared/audio/activityAudioService'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { trackPageView } from '../../shared/analytics'
import { getCurrentUser, getPublicConfig } from './api'
import { SILK_ROAD_PRODUCTS, SILK_ROAD_SHOPPING_LIST_ASSET_ACTIVITY_KEY, silkRoadAssets } from './config'
import './styles.css'

const DESIGN_WIDTH = 750
const PRODUCT_LIST_BOTTOM_GUTTER = 150
const PRODUCT_CARD_HEIGHT = 420
const POSTER_FIELD_OFFSET = { x: -4, y: -21 }

function fitPosterText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text
  let value = text
  while (value && context.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1)
  return `${value}…`
}

function drawPosterText(context, text, box, { font, color, align = 'left', weight = '' } = {}) {
  context.font = `${weight ? `${weight} ` : ''}${font}`
  context.fillStyle = color
  context.textAlign = align
  context.textBaseline = 'middle'
  const x = align === 'center' ? box.left + box.width / 2 : align === 'right' ? box.left + box.width : box.left
  context.fillText(fitPosterText(context, text, box.width), x, box.top + box.height / 2)
}

function drawPosterLayer(context, image, left, top, width, height, options = {}) {
  const { sourceTop = 0, sourceHeight = image.height, fadeTop = 0 } = options
  if (!fadeTop) {
    context.drawImage(image, 0, sourceTop, image.width, sourceHeight, left, top, width, height)
    return
  }
  const layer = document.createElement('canvas')
  layer.width = width
  layer.height = height
  const layerContext = layer.getContext('2d')
  if (!layerContext) throw new Error('当前浏览器不支持海报图层合成')
  layerContext.drawImage(image, 0, sourceTop, image.width, sourceHeight, 0, 0, width, height)
  layerContext.globalCompositeOperation = 'destination-in'
  const mask = layerContext.createLinearGradient(0, 0, 0, height)
  mask.addColorStop(0, 'rgba(255, 255, 255, 0)')
  mask.addColorStop(Math.min(fadeTop / height, 1), 'rgba(255, 255, 255, 1)')
  mask.addColorStop(1, 'rgba(255, 255, 255, 1)')
  layerContext.fillStyle = mask
  layerContext.fillRect(0, 0, width, height)
  context.drawImage(layer, left, top)
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
  const sourceImage = sourceElement?.closest('.srsl-product-card')?.querySelector('.srsl-product-image')
  const dock = document.querySelector('.srsl-cart-float')
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
      { transform: 'translateX(-50%) scale(1)' },
      { transform: 'translateX(-50%) scale(1.055)', offset: .42 },
      { transform: 'translateX(-50%) scale(1)' },
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

function Home({ onStart }) {
  return <Stage height={1624} className="srsl-home-stage">
    <div style={{ position: 'absolute', width: 750, height: 1448, left: 0, top: 88 }}>
      <img className="srsl-home-background" alt="" src={silkRoadAssets.homeBackground} style={{ position: 'absolute', width: 750, height: 1624, left: 0, top: -88 }} />
      <img className="srsl-home-title" alt="" src={silkRoadAssets.homeTitle} style={{ position: 'absolute', width: 193, height: 567, left: 277, top: 114 }} />
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
  const progressControl = mode === 'video' && <div ref={progressRef} className="srsl-video-progress" role="slider" tabIndex={0} aria-label="视频播放进度，可拖动调整" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)} aria-valuetext={`${Math.round(progress * 100)}%`} style={{ '--srsl-video-progress': `${progress * 100}%` }} onPointerDown={(event) => { event.preventDefault(); draggingProgressRef.current = true; event.currentTarget.setPointerCapture?.(event.pointerId); seekToPointer(event) }} onPointerMove={(event) => { if (draggingProgressRef.current) seekToPointer(event) }} onPointerUp={(event) => { draggingProgressRef.current = false; event.currentTarget.releasePointerCapture?.(event.pointerId) }} onPointerCancel={(event) => { draggingProgressRef.current = false; event.currentTarget.releasePointerCapture?.(event.pointerId) }} onKeyDown={handleProgressKeyDown} />
  return <div className="srsl-video-panel">
    <Stage height={1448}>
      <div style={{ position: 'absolute', width: 750, height: 1624, left: 0, top: -88 }}>
        <video ref={videoRef} src={silkRoadAssets.video} playsInline webkit-playsinline="true" x5-video-player-fullscreen="true" x5-video-player-type="h5" x-webkit-airplay="allow" airplay="allow" preload="auto" onDurationChange={updateProgress} onTimeUpdate={updateProgress} onEnded={onEnd} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      {mode === 'video' ? <button type="button" className="srsl-skip" onClick={onEnd}>跳过</button> : mode === 'video-end' ? <button className="srsl-image-button srsl-shop-entry" type="button" aria-label="进入选购" onClick={onShop} style={{ position: 'absolute', width: 333, height: 78, left: 207, top: 687 }}><img alt="" src={silkRoadAssets.orientationHint} /></button> : null}
    </Stage>
    {progressControl}
  </div>
}

function ProductCard({ product, selected, onToggle }) {
  const [flipped, setFlipped] = useState(selected)
  const cardRef = useRef(null)
  const flipAndSelect = () => {
    if (flipped) return
    setFlipped(true)
    onToggle(product, cardRef.current)
  }
  const swapIcon = <span className="srsl-add srsl-add--decorative" aria-hidden="true"><SwapOutlined className="srsl-flip-icon" /></span>
  return <div ref={cardRef} className={`srsl-product-card${flipped ? ' is-flipped' : ''}`} role="button" tabIndex={0} onClick={flipAndSelect} onKeyDown={(event) => event.key === 'Enter' && flipAndSelect()}>
    <div className="srsl-product-face">
      <img alt="" src={silkRoadAssets.productCard} style={{ position: 'absolute', width: 337, height: PRODUCT_CARD_HEIGHT, left: 0, top: 0 }} />
      {!flipped && swapIcon}
      <img className="srsl-product-image" alt={product.name} src={product.image} style={{ position: 'absolute', width: 156, height: 221, left: 90, top: 24 }} />
      <span className="srsl-product-name">{product.name}</span>
    </div>
    <div className="srsl-product-face srsl-product-detail">
      <img alt="" src={silkRoadAssets.productCard} style={{ position: 'absolute', width: 337, height: PRODUCT_CARD_HEIGHT, left: 0, top: 0 }} />
      <img alt="" src={silkRoadAssets.detailTitle} style={{ position: 'absolute', width: 115, height: 58, left: 109, top: 28 }} />
      <span className="srsl-detail-name">{product.name}</span>
      <div className="srsl-detail-description">
        <p><b>原产地：</b>{product.origin}</p>
        <p><b>传入时间：</b>{product.transferTime}</p>
        <p><b>记载：</b>{product.record}</p>
      </div>
    </div>
  </div>
}

function ProductList({ products, selectedIds, onToggle, onCheckout }) {
  const rows = Math.ceil(products.length / 2)
  const handleToggle = (product, sourceElement) => {
    if (!selectedIds.includes(product.id)) flyProductToCart(product.image, sourceElement)
    onToggle(product.id)
  }
  const dock = <button type="button" className="srsl-cart-float" aria-label="去结算生成海报" onClick={onCheckout}>
    <img alt="去结算生成海报" src={silkRoadAssets.cartFloat} />
  </button>
  return <>
  <Stage height={646 + rows * PRODUCT_CARD_HEIGHT + PRODUCT_LIST_BOTTOM_GUTTER} className="srsl-list-stage">
    <img alt="" src={silkRoadAssets.cartHeader} style={{ position: 'absolute', width: 750, height: 546, left: 0, top: 0 }} />
    <span className="srsl-progress" style={{ left: 410, top: 464, width: 60, height: 43 }}>{selectedIds.length}</span>
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
  const rows = Math.max(1, Math.ceil(products.length / 4))
  const collectionHeight = Math.max(592, 29 + 42 + rows * 213)
  const footerTop = 699 + collectionHeight - 70
  const height = footerTop + 403
  const composePoster = useCallback(async () => {
    const qrCanvas = await waitForPosterQr(qrRef)
    const output = document.createElement('canvas')
    output.width = 750
    output.height = height
    const context = output.getContext('2d')
    if (!context) throw new Error('当前浏览器不支持海报合成')
    // 头图和底图含半透明像素；先铺页面纸张底色，避免导出的 PNG 在深色预览层上透出暗影。
    context.fillStyle = '#f3e2d3'
    context.fillRect(0, 0, output.width, output.height)
    const [header, collection, label, item, footer, avatar, ...productImages] = await Promise.all([
      loadPosterImage(silkRoadAssets.posterHeader, '海报头图'),
      loadPosterImage(silkRoadAssets.posterCollection, '商品列表背景'),
      loadPosterImage(silkRoadAssets.posterLabel, '列表标题图'),
      loadPosterImage(silkRoadAssets.posterItem, '商品卡片底图'),
      loadPosterImage(silkRoadAssets.posterFooter, '海报底图'),
      profile.avatar ? loadPosterImage(profile.avatar, '微信头像', 1500).catch(() => null) : Promise.resolve(null),
      ...products.map((product, index) => loadPosterImage(product.posterImage, `第${index + 1}件商品“${product.name}”图片`)),
    ])
    context.drawImage(header, 0, 0, 750, 769)
    if (avatar) {
      context.save()
      context.beginPath()
      context.arc(127 + POSTER_FIELD_OFFSET.x, 570 + POSTER_FIELD_OFFSET.y, 53, 0, Math.PI * 2)
      context.clip()
      context.drawImage(avatar, 74 + POSTER_FIELD_OFFSET.x, 517 + POSTER_FIELD_OFFSET.y, 106, 106)
      context.restore()
    }
    drawPosterText(context, profile.nickname || '丝路旅人', { left: 206 + POSTER_FIELD_OFFSET.x, top: 520 + POSTER_FIELD_OFFSET.y, width: 203, height: 46 }, {
      font: '24px PingFang SC, Microsoft YaHei, sans-serif',
      color: '#3b4b42',
      weight: 'bold',
    })
    context.save()
    context.shadowColor = 'transparent'
    context.shadowBlur = 0
    context.shadowOffsetX = 0
    context.shadowOffsetY = 0
    context.filter = 'none'
    const collectionEdgeCrop = Math.min(96, Math.floor((collection.height - 1) / 2))
    drawPosterLayer(context, collection, 0, 699, 750, collectionHeight, {
      sourceTop: collectionEdgeCrop,
      sourceHeight: collection.height - collectionEdgeCrop * 2,
      fadeTop: 70,
    })
    context.restore()
    context.strokeStyle = '#e0cab5'
    context.lineWidth = 2
    context.strokeRect(25, 728, 700, 42 + rows * 213)
    products.forEach((product, index) => {
      const column = index % 4
      const row = Math.floor(index / 4)
      const left = 28 + column * 171
      const top = 760 + row * 213
      context.drawImage(item, left, top, 171, 213)
      context.drawImage(productImages[index], left + 14, top - 4, 127, 180)
      context.fillStyle = '#866548'
      context.beginPath()
      context.arc(left + 20, top + 20, 20, 0, Math.PI * 2)
      context.fill()
      drawPosterText(context, product.name, { left, top: top + 150, width: 171, height: 46 }, {
        font: '26px PingFang SC, Microsoft YaHei, sans-serif',
        color: '#3b4b42',
        align: 'center',
      })
      drawPosterText(context, String(index + 1), { left, top, width: 40, height: 40 }, {
        font: '24px PingFang SC, Microsoft YaHei, sans-serif',
        color: '#f3e2d3',
        align: 'center',
      })
    })
    context.drawImage(label, 200.5, 699, 349, 49)
    drawPosterLayer(context, footer, 0, footerTop, 750, 403, { fadeTop: 70 })
    context.drawImage(qrCanvas, 77, footerTop + 136, 106, 106)
    const dataUrl = (() => {
      try {
        return output.toDataURL('image/png')
      } catch (error) {
        throw new Error(`海报转成图片失败：${error instanceof Error ? error.message : 'Canvas 导出异常'}`, { cause: error })
      }
    })()
    if (!dataUrl.startsWith('data:image/png')) throw new Error('海报转成图片失败：未生成 PNG 数据')
    return dataUrl
  }, [collectionHeight, footerTop, height, products, profile.avatar, profile.nickname, rows])

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
  return <Stage height={height}>
    <img alt="" src={silkRoadAssets.posterHeader} style={{ position: 'absolute', width: 750, height: 769, left: 0, top: 0 }} />
    <button className="srsl-back-hitbox" type="button" aria-label="返回购物车" onClick={onBack} />
    <img className="srsl-avatar" alt="" src={profile.avatar || undefined} referrerPolicy="no-referrer" style={{ position: 'absolute', width: 106, height: 106, left: 74 + POSTER_FIELD_OFFSET.x, top: 517 + POSTER_FIELD_OFFSET.y }} />
    <span className="srsl-nickname" style={{ left: 206 + POSTER_FIELD_OFFSET.x, top: 520 + POSTER_FIELD_OFFSET.y, width: 203, height: 46 }}><span className="srsl-text-inner">{profile.nickname || '丝路旅人'}</span></span>
    <div className="srsl-collection" style={{ height: collectionHeight, backgroundImage: `url(${silkRoadAssets.posterCollection})` }}>
      <img className="srsl-poster-label" alt="" src={silkRoadAssets.posterLabel} style={{ position: 'absolute', width: 349, height: 49, left: 200.5, top: 0 }} />
      <div className="srsl-poster-grid" style={{ height: 42 + rows * 213 }}>{products.map((product, index) => <div className="srsl-poster-product" key={product.id}>
        <img alt="" src={silkRoadAssets.posterItem} />
        <img alt={product.name} src={product.image} />
        <span className="srsl-poster-product-name"><span className="srsl-text-inner">{product.name}</span></span>
        <span className="srsl-poster-order"><span className="srsl-text-inner">{index + 1}</span></span>
      </div>)}</div>
    </div>
    <div className="srsl-footer" style={{ top: footerTop }}><img alt="" src={silkRoadAssets.posterFooter} /><div ref={qrRef} className="srsl-qr"><QRCodeCanvas value={window.location.href} size={106} includeMargin={false} /></div></div>
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

export default function SilkRoadShoppingList({ routeParams }) {
  const activityKey = routeParams?.activityKey || SILK_ROAD_SHOPPING_LIST_ASSET_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [page, setPage] = useState('home')
  const [selectedIds, setSelectedIds] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [profile, setProfile] = useState({ nickname: '丝路旅人', avatar: '' })
  const videoRef = useRef(null)
  const bgmWasPlayingBeforeVideoRef = useRef(false)
  const selected = useMemo(() => SILK_ROAD_PRODUCTS.filter((product) => selectedIds.includes(product.id)), [selectedIds])
  const authConfig = useMemo(() => publicConfig ? { ...publicConfig, oauthScope: 'snsapi_userinfo', requireUserinfo: true } : null, [publicConfig])
  const bgmConfig = useMemo(() => publicConfig?.bgmConfig || publicConfig?.mobileConfig?.bgm || {}, [publicConfig])
  const { authReady, reauth } = useWechatAuth(activityKey, authConfig, { compactOAuthRedirect: true })
  useWechatShare(activityKey, publicConfig)

  useEffect(() => {
    trackPageView(activityKey, '/silk-road-shopping-list', {
      activityType: 'silk_road_shopping_list',
    })
  }, [activityKey])

  useEffect(() => { localStorage.removeItem('silk-road-shopping-list-cart') }, [])
  useEffect(() => {
    let active = true
    getPublicConfig(activityKey).then((config) => {
      if (active) setPublicConfig(config || {})
    }).catch(() => {
      if (active) setPublicConfig({})
    })
    return () => { active = false }
  }, [activityKey])
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
    if (page !== 'video') return
    bgmWasPlayingBeforeVideoRef.current = activityAudioService.getState().playing
    activityAudioService.pause('video')
    const video = videoRef.current
    if (video) {
      video.muted = false
      video.volume = 1
      video.play().catch(() => {
        video.muted = true
        video.play().catch(() => null)
      })
    }
    return () => {
      if (!bgmWasPlayingBeforeVideoRef.current) return
      bgmWasPlayingBeforeVideoRef.current = false
      activityAudioService.play('video-resume')
    }
  }, [page])

  const toggle = (id) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])
  const videoEnd = () => { videoRef.current?.pause(); setPage('video-end') }
  const startVideo = () => setPage('video')
  const checkout = () => {
    setCartOpen(false)
    setPage('poster')
  }
  const renderPage = (content) => {
    const videoBgmConfig = page === 'video' ? { ...bgmConfig, autoplay: false, showControl: false } : bgmConfig
    return <>{content}<ActivityBgmPlayer bgm={videoBgmConfig} activityKey={activityKey} /></>
  }
  if (page === 'home' || page === 'video' || page === 'video-end') return renderPage(<main className={`srsl-intro-screen${page === 'video' || page === 'video-end' ? ' is-video' : ''}`}>
    {page === 'home' && <Home onStart={startVideo} />}
    {page !== 'home' && <VideoPanel key="video-panel" mode={page} videoRef={videoRef} onEnd={videoEnd} onShop={() => setPage('shop')} />}
  </main>)
  if (page === 'poster') return renderPage(<main className="srsl-app"><Poster products={selected} profile={profile} onBack={() => { setPage('shop'); setCartOpen(true) }} onReselect={() => { localStorage.removeItem('silk-road-shopping-list-cart'); setSelectedIds([]); setCartOpen(false); setPage('shop') }} /></main>)
  return renderPage(<main className="srsl-app"><ProductList products={SILK_ROAD_PRODUCTS} selectedIds={selectedIds} onToggle={toggle} onCheckout={checkout} />{cartOpen && <CartDrawer products={selected} onClose={() => setCartOpen(false)} onRemove={toggle} onCheckout={checkout} />}</main>)
}
