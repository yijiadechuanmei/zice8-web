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

function loadPosterImage(src, label, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error(`${label}地址缺失`))
      return
    }
    const image = new Image()
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
      <img className="srsl-home-ribbon" alt="" src={silkRoadAssets.homeRibbon} style={{ position: 'absolute', width: 595, height: 87, left: 78, top: 1289 }} />
      <button className="srsl-image-button srsl-home-start" type="button" aria-label="开始集宝" onClick={onStart} style={{ position: 'absolute', width: 523, height: 145, left: 113, top: 1121 }}><img alt="开始集宝" src={silkRoadAssets.homeStart} /></button>
    </div>
    <Sandstorm />
  </Stage>
}

function VideoPanel({ mode, videoRef, onEnd, onShop }) {
  return <div className={`srsl-video-panel${mode === 'orientation' ? ' is-preparing' : ''}`}>
    <Stage height={1448} fitViewport>
      <div style={{ position: 'absolute', width: 1448, height: 824, left: 798, top: 0, transform: 'rotate(90deg)', transformOrigin: '0 0', transformStyle: 'flat' }}>
        <video ref={videoRef} src={silkRoadAssets.video} playsInline webkit-playsinline="true" x5-video-player-fullscreen="true" x5-video-player-type="h5" x-webkit-airplay="allow" airplay="allow" preload="auto" onEnded={onEnd} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      {mode === 'video' ? <button type="button" className="srsl-skip" onClick={onEnd}>跳过</button> : mode === 'video-end' ? <button className="srsl-image-button srsl-shop-entry" type="button" aria-label="进入选购" onClick={onShop} style={{ position: 'absolute', width: 333, height: 78, left: 125, top: 556, transform: 'rotate(90deg)', transformOrigin: '0 0' }}><img alt="" src={silkRoadAssets.orientationHint} /></button> : null}
    </Stage>
  </div>
}

function ProductCard({ product, selected, onToggle }) {
  const [flipped, setFlipped] = useState(false)
  return <div className={`srsl-product-card${flipped ? ' is-flipped' : ''}`} role="button" tabIndex={0} onClick={() => setFlipped(!flipped)} onKeyDown={(event) => event.key === 'Enter' && setFlipped(!flipped)}>
    <div className="srsl-product-face">
      <img alt="" src={silkRoadAssets.productCard} style={{ position: 'absolute', width: 337, height: 230, left: 0, top: 0 }} />
      {!flipped && <button className="srsl-add" type="button" aria-label={selected ? `移除${product.name}` : `加入${product.name}`} onClick={(event) => { event.stopPropagation(); onToggle(product.id) }}>
        <img alt="" src={selected ? silkRoadAssets.minusIcon : silkRoadAssets.plusIcon} />
      </button>}
      <img alt={product.name} src={product.image} style={{ position: 'absolute', width: 127, height: 180, left: 98, top: 0 }} />
      <span className="srsl-product-name">{product.name}</span>
    </div>
    <div className="srsl-product-face srsl-product-detail">
      <img alt="" src={silkRoadAssets.productCard} style={{ position: 'absolute', width: 337, height: 230, left: 0, top: 0 }} />
      <img alt="" src={silkRoadAssets.detailTitle} style={{ position: 'absolute', width: 115, height: 58, left: 109, top: 36 }} />
      <img alt="" src={silkRoadAssets.detailIcon} style={{ position: 'absolute', width: 35, height: 35, left: 17.5, top: 15.5 }} />
      <span className="srsl-detail-name">{product.name}</span>
      <span className="srsl-detail-description">{product.description}</span>
    </div>
  </div>
}

function ProductList({ products, selectedIds, onToggle, onOpenCart, onCheckout }) {
  const rows = Math.ceil(products.length / 2)
  const dock = <div className="srsl-dock"><img alt="" src={silkRoadAssets.cartDock} /><span>{selectedIds.length}</span><button type="button" className="srsl-dock-cart-hitbox" aria-label="查看购物车" onClick={onOpenCart} /><button type="button" className="srsl-dock-checkout-hitbox" aria-label="去结算" onClick={onCheckout} /></div>
  return <>
  <Stage height={626 + rows * 230 + PRODUCT_LIST_BOTTOM_GUTTER} className="srsl-list-stage">
    <img alt="" src={silkRoadAssets.cartHeader} style={{ position: 'absolute', width: 750, height: 551, left: 0, top: 0 }} />
    <span className="srsl-progress" style={{ left: 410, top: 467, width: 60, height: 37 }}>{selectedIds.length}/50</span>
    <img alt="" src={silkRoadAssets.cartSectionTitle} style={{ position: 'absolute', width: 319, height: 35, left: 215.5, top: 571 }} />
    <div className="srsl-product-grid" style={{ height: rows * 230 + 20 }}>{products.map((product) => <ProductCard key={product.id} product={product} selected={selectedIds.includes(product.id)} onToggle={onToggle} />)}</div>
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
  const score = getShoppingScore(products.length)
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
      // 微信头像来自第三方域名时可能被 Canvas 跨域策略拦住；头像仅作为可选图层。
      profile.avatar ? loadPosterImage(profile.avatar, '微信头像', 1500).catch(() => null) : Promise.resolve(null),
      ...products.map((product, index) => loadPosterImage(product.posterImage, `第${index + 1}件商品“${product.name}”图片`)),
    ])
    context.drawImage(header, 0, 0, 750, 769)
    if (avatar) {
      context.save()
      context.beginPath()
      context.arc(127, 570, 53, 0, Math.PI * 2)
      context.clip()
      context.drawImage(avatar, 74, 517, 106, 106)
      context.restore()
    }
    context.fillStyle = '#3b4b42'
    context.font = 'bold 24px PingFang SC, Microsoft YaHei, sans-serif'
    context.fillText(profile.nickname || '丝路旅人', 206, 550)
    context.fillStyle = '#f3e2d3'
    context.font = '22px PingFang SC, Microsoft YaHei, sans-serif'
    context.textAlign = 'center'
    context.fillText(String(products.length), 563, 501)
    context.fillStyle = '#000'
    context.font = 'bold 53px Arial, sans-serif'
    context.textAlign = 'right'
    context.fillText(String(score), 583, 574)
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
      context.fillStyle = '#3b4b42'
      context.font = '26px PingFang SC, Microsoft YaHei, sans-serif'
      context.textAlign = 'center'
      context.fillText(product.name, left + 85.5, top + 180)
      context.fillStyle = '#866548'
      context.beginPath()
      context.arc(left + 20, top + 20, 20, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = '#f3e2d3'
      context.font = '24px PingFang SC, Microsoft YaHei, sans-serif'
      context.fillText(String(index + 1), left + 20, top + 28)
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
  }, [collectionHeight, footerTop, height, products, profile.avatar, profile.nickname, rows, score])

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
    {profile.avatar && <img className="srsl-avatar" alt="" src={profile.avatar} style={{ position: 'absolute', width: 106, height: 106, left: 74, top: 517 }} />}
    <span className="srsl-nickname" style={{ left: 206, top: 520, width: 203, height: 46 }}>{profile.nickname}</span>
    <span className="srsl-poster-selected" style={{ left: 536, top: 475, width: 55, height: 38 }}>{products.length}</span>
    <span className="srsl-poster-score" style={{ left: 464, top: 521, width: 119, height: 64 }}>{score}</span>
    <div className="srsl-collection" style={{ height: collectionHeight, backgroundImage: `url(${silkRoadAssets.posterCollection})` }}>
      <img className="srsl-poster-label" alt="" src={silkRoadAssets.posterLabel} style={{ position: 'absolute', width: 349, height: 49, left: 200.5, top: 0 }} />
      <div className="srsl-poster-grid" style={{ height: 42 + rows * 213 }}>{products.map((product, index) => <div className="srsl-poster-product" key={product.id}>
        <img alt="" src={silkRoadAssets.posterItem} />
        <img alt={product.name} src={product.image} />
        <span className="srsl-poster-product-name">{product.name}</span>
        <span className="srsl-poster-order">{index + 1}</span>
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
  const { authReady } = useWechatAuth(SILK_ROAD_SHOPPING_LIST_ACTIVITY_KEY, authConfig)
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
    }).catch(() => null)
    return () => { active = false }
  }, [authReady])
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
