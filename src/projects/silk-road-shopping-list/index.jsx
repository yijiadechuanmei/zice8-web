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

function drawPosterCover(context, image, left, top, width, height) {
  const scale = Math.max(width / image.width, height / image.height)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  context.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, left, top, width, height)
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
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const windAngle = -Math.PI * 0.17
    const windX = Math.cos(windAngle)
    const windY = Math.sin(windAngle)
    canvas.width = width * pixelRatio
    canvas.height = height * pixelRatio
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    const reset = (particle, initial = false) => {
      const isGust = Math.random() < 0.16
      particle.length = isGust ? 68 + Math.random() * 128 : 8 + Math.random() * 42
      particle.thickness = isGust ? .8 + Math.random() * 1.8 : .35 + Math.random() * 1.2
      particle.speed = isGust ? 92 + Math.random() * 82 : 38 + Math.random() * 118
      particle.opacity = isGust ? .06 + Math.random() * .11 : .12 + Math.random() * .33
      particle.curve = (Math.random() - .5) * (isGust ? 16 : 6)
      particle.wobble = 4 + Math.random() * 22
      particle.frequency = .35 + Math.random() * 1.1
      particle.phase = Math.random() * Math.PI * 2
      particle.x = initial ? Math.random() * (width + particle.length) - particle.length : -particle.length - Math.random() * 150
      particle.y = initial ? Math.random() * (height + 180) - 90 : Math.random() * height + 80
    }

    const particles = Array.from({ length: 92 }, () => {
      const particle = {}
      reset(particle, true)
      return particle
    })
    let frameId = 0
    let previousTime = performance.now()
    let elapsed = 0

    const draw = (time) => {
      const delta = Math.min((time - previousTime) / 1000, .04)
      previousTime = time
      elapsed += delta
      context.clearRect(0, 0, width, height)
      particles.forEach((particle) => {
        particle.x += particle.speed * windX * delta
        particle.y += particle.speed * windY * delta + Math.sin(elapsed * particle.frequency + particle.phase) * particle.wobble * delta
        if (particle.x > width + particle.length || particle.y < -160) reset(particle)

        context.save()
        context.translate(particle.x, particle.y)
        context.rotate(windAngle + Math.sin(elapsed * particle.frequency + particle.phase) * .055)
        context.strokeStyle = `rgba(169, 108, 52, ${particle.opacity})`
        context.lineWidth = particle.thickness
        context.lineCap = 'round'
        context.beginPath()
        context.moveTo(-particle.length, particle.curve)
        context.quadraticCurveTo(-particle.length * .45, -particle.curve, 0, 0)
        context.stroke()
        context.restore()
      })
      frameId = window.requestAnimationFrame(draw)
    }
    frameId = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frameId)
  }, [])
  return <div className="srsl-sandstorm" aria-hidden="true"><canvas ref={canvasRef} /></div>
}

function Home({ onStart, showOrientation }) {
  return <Stage height={1624} className="srsl-home-stage">
    <div style={{ position: 'absolute', width: 750, height: 1448, left: 0, top: 88 }}>
      <img className="srsl-home-background" alt="" src={silkRoadAssets.homeBackground} style={{ position: 'absolute', width: 750, height: 1624, left: 0, top: -88 }} />
      <img className="srsl-home-title" alt="" src={silkRoadAssets.homeTitle} style={{ position: 'absolute', width: 440, height: 53, left: 155, top: 725 }} />
      <img className="srsl-home-illustration" alt="" src={silkRoadAssets.homeIllustration} style={{ position: 'absolute', width: 295, height: 595, left: 204, top: 87 }} />
      <img className="srsl-home-ribbon" alt="" src={silkRoadAssets.homeRibbon} style={{ position: 'absolute', width: 595, height: 87, left: 78, top: 1289 }} />
      <button className="srsl-image-button srsl-home-start" type="button" aria-label="开始集宝" onClick={onStart} style={{ position: 'absolute', width: 523, height: 145, left: 113, top: 1121 }}><img alt="开始集宝" src={silkRoadAssets.homeStart} /></button>
    </div>
    <Sandstorm />
    {showOrientation && <div className="srsl-orientation">请竖置手机锁定方向后 再横屏观看视频</div>}
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
      <footer><span>已选 <b>{products.length}</b> 件</span><button type="button" onClick={onCheckout} disabled={!products.length}>去结算 ›</button></footer>
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
    if (!products.length) throw new Error('未选择商品，无法生成海报')
    const qrCanvas = await waitForPosterQr(qrRef)
    const output = document.createElement('canvas')
    output.width = 750
    output.height = height
    const context = output.getContext('2d')
    if (!context) throw new Error('当前浏览器不支持海报合成')
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
    drawPosterCover(context, collection, 0, 699, 750, collectionHeight)
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
    context.drawImage(footer, 0, footerTop, 750, 403)
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
    if (!selected.length) return
    setCartOpen(false)
    setPage('poster')
  }
  if (page === 'home' || page === 'orientation' || page === 'video' || page === 'video-end') return <main className={`srsl-intro-screen${page === 'video' || page === 'video-end' ? ' is-video' : ''}`}>
    {(page === 'home' || page === 'orientation') && <Home onStart={startVideo} showOrientation={page === 'orientation'} />}
    {page !== 'home' && <VideoPanel key="video-panel" mode={page} videoRef={videoRef} onEnd={videoEnd} onShop={() => setPage('shop')} />}
  </main>
  if (page === 'poster') return <main className="srsl-app"><Poster products={selected} profile={profile} onBack={() => { setPage('shop'); setCartOpen(true) }} onReselect={() => { localStorage.removeItem('silk-road-shopping-list-cart'); setSelectedIds([]); setCartOpen(false); setPage('shop') }} /></main>
  return <main className="srsl-app"><ProductList products={SILK_ROAD_PRODUCTS} selectedIds={selectedIds} onToggle={toggle} onOpenCart={() => setCartOpen(true)} onCheckout={checkout} />{cartOpen && <CartDrawer products={selected} onClose={() => setCartOpen(false)} onRemove={toggle} onCheckout={checkout} />}</main>
}
