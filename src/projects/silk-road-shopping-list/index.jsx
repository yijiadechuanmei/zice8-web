import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { getCurrentUser, getPublicConfig } from './api'
import {
  SILK_ROAD_PRODUCTS,
  SILK_ROAD_SHOPPING_LIST_ACTIVITY_KEY,
  silkRoadAssets,
} from './config'
import './styles.css'

const STAGE = { HOME: 'home', ORIENTATION: 'orientation', VIDEO: 'video', VIDEO_END: 'video-end', SHOP: 'shop', CART: 'cart', POSTER: 'poster' }
const CART_STORAGE_KEY = 'silk-road-shopping-list-cart'

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter((id) => Number.isInteger(id) && id >= 1 && id <= SILK_ROAD_PRODUCTS.length) : []
  } catch {
    return []
  }
}

function getActivityUrl(activityKey) {
  return `https://web.zice8.com/silk_road_shopping_list/${encodeURIComponent(activityKey)}`
}

function waitForQrCanvas(wrapper) {
  return new Promise((resolve, reject) => {
    let tries = 0
    const read = () => {
      const canvas = wrapper?.querySelector('canvas')
      if (canvas) return resolve(canvas)
      tries += 1
      if (tries >= 30) return reject(new Error('二维码尚未生成'))
      window.setTimeout(read, 50)
    }
    read()
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`素材加载失败：${src}`))
    image.src = src
  })
}

function drawCover(context, image, left, top, width, height) {
  const sourceRatio = image.width / image.height
  const targetRatio = width / height
  let sourceWidth = image.width
  let sourceHeight = image.height
  let sourceLeft = 0
  let sourceTop = 0
  if (sourceRatio > targetRatio) {
    sourceWidth = image.height * targetRatio
    sourceLeft = (image.width - sourceWidth) / 2
  } else {
    sourceHeight = image.width / targetRatio
    sourceTop = (image.height - sourceHeight) / 2
  }
  context.drawImage(image, sourceLeft, sourceTop, sourceWidth, sourceHeight, left, top, width, height)
}

async function createPoster({ products, user, qrWrapper }) {
  const qrCanvas = await waitForQrCanvas(qrWrapper)
  const canvas = document.createElement('canvas')
  canvas.width = 1500
  canvas.height = 2880
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建海报')
  context.scale(2, 2)
  context.fillStyle = '#f3e2d3'
  context.fillRect(0, 0, 750, 1440)

  const [header, collection, footer, ...productImages] = await Promise.all([
    loadImage(silkRoadAssets.posterHeader),
    loadImage(silkRoadAssets.posterCollection),
    loadImage(silkRoadAssets.posterFooter),
    ...products.map((item) => loadImage(item.image)),
  ])
  context.drawImage(header, 0, 0, 750, 769)
  context.fillStyle = 'rgba(243, 226, 211, 0.94)'
  context.fillRect(54, 500, 642, 162)
  context.strokeStyle = '#d8bea3'
  context.lineWidth = 2
  context.strokeRect(54, 500, 642, 162)
  context.fillStyle = '#5d4937'
  context.font = '700 30px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillText(user.nickname, 192, 548)
  context.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillStyle = '#7c6450'
  context.fillText('我的丝路带货清单', 192, 588)
  context.fillStyle = '#b73f24'
  context.font = '800 55px Georgia, "PingFang SC", serif'
  context.textAlign = 'right'
  context.fillText(String(products.length), 622, 570)
  context.textAlign = 'left'
  context.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.fillStyle = '#7c6450'
  context.fillText('件丝路珍宝', 630, 570)

  if (user.avatar) {
    try {
      const avatar = await loadImage(user.avatar)
      context.save()
      context.beginPath()
      context.arc(117, 575, 53, 0, Math.PI * 2)
      context.clip()
      drawCover(context, avatar, 64, 522, 106, 106)
      context.restore()
    } catch {
      // 微信头像跨域不可绘制时保留默认头像底色，海报仍可生成。
    }
  }
  context.save()
  context.beginPath()
  context.arc(117, 575, 53, 0, Math.PI * 2)
  context.lineWidth = 4
  context.strokeStyle = '#f5e7d3'
  context.stroke()
  context.restore()

  context.drawImage(collection, 0, 665, 750, 672)
  context.fillStyle = 'rgba(243, 226, 211, 0.93)'
  context.fillRect(38, 748, 674, 455)
  context.strokeStyle = '#d8bea3'
  context.strokeRect(38, 748, 674, 455)
  context.fillStyle = '#6a533e'
  context.font = '700 28px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.fillText('我已集齐的丝路珍宝', 375, 790)
  products.slice(0, 12).forEach((item, index) => {
    const column = index % 4
    const row = Math.floor(index / 4)
    const left = 63 + column * 165
    const top = 815 + row * 122
    context.fillStyle = '#f8edde'
    context.fillRect(left, top, 145, 108)
    context.strokeStyle = '#dec6aa'
    context.strokeRect(left, top, 145, 108)
    drawCover(context, productImages[index], left + 38, top + 10, 68, 65)
    context.fillStyle = '#5c4938'
    context.font = '20px "PingFang SC", "Microsoft YaHei", sans-serif'
    context.fillText(`${index + 1}. ${item.name}`, left + 72, top + 96)
  })
  if (products.length > 12) {
    context.fillStyle = '#8f7053'
    context.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif'
    context.fillText(`另有 ${products.length - 12} 件珍宝，已收进清单`, 375, 1235)
  }
  context.drawImage(footer, 0, 1040, 750, 403)
  context.fillStyle = '#fff'
  context.fillRect(68, 1167, 130, 130)
  context.drawImage(qrCanvas, 74, 1173, 118, 118)
  context.textAlign = 'left'
  return canvas.toDataURL('image/png', 1)
}

function OrientationPanel({ onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 3000)
    return () => window.clearTimeout(timer)
  }, [onDone])
  return (
    <section className="srsl-orientation" aria-live="polite">
      <div className="srsl-phone-orientation" aria-hidden="true"><span /></div>
      <img src={silkRoadAssets.orientationHint} alt="请竖置手机锁定方向后，再横屏观看视频" />
      <strong>3 秒后进入丝路影像</strong>
    </section>
  )
}

function Home({ onStart }) {
  return (
    <section className="srsl-home">
      <img className="srsl-home-bg" src={silkRoadAssets.homeBackground} alt="" />
      <img className="srsl-home-title" src={silkRoadAssets.homeTitle} alt="千年丝路带货清单" />
      <img className="srsl-home-illustration" src={silkRoadAssets.homeIllustration} alt="丝路商队" />
      <img className="srsl-home-ribbon" src={silkRoadAssets.homeRibbon} alt="穿越千年 集齐丝路珍宝" />
      <button className="srsl-image-button srsl-home-start" type="button" onClick={onStart} aria-label="开始集宝">
        <img src={silkRoadAssets.homeStart} alt="开始集宝" />
      </button>
    </section>
  )
}

function VideoStage({ completed, onEnd, onShop }) {
  const videoRef = useRef(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video || completed) return undefined
    video.play().catch(() => undefined)
    return undefined
  }, [completed])
  return (
    <section className="srsl-video-stage">
      <video ref={videoRef} src={silkRoadAssets.video} autoPlay playsInline webkit-playsinline="true" x5-video-player-type="h5" onEnded={onEnd} />
      <div className="srsl-video-portrait-tip"><span>请横屏观看视频</span><small>旋转手机后即可继续</small></div>
      {completed && <button type="button" className="srsl-video-finish" onClick={onShop}>开启丝路带货清单</button>}
    </section>
  )
}

function ProductCard({ product, selected, onToggle }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <article className={`srsl-product-card ${flipped ? 'is-flipped' : ''}`}>
      <button type="button" className="srsl-product-face srsl-product-front" onClick={() => setFlipped(true)} aria-label={`查看${product.name}详情`}>
        <img className="srsl-card-art" src={silkRoadAssets.productCard} alt="" />
        <img className="srsl-product-image" src={product.image} alt={product.name} />
        <span className="srsl-product-name">{product.name}</span>
        <span className={`srsl-plus ${selected ? 'is-selected' : ''}`} onClick={(event) => { event.stopPropagation(); onToggle(product.id) }} role="button" tabIndex={0} aria-label={selected ? `移出${product.name}` : `将${product.name}加入清单`} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggle(product.id) } }}>{selected ? '✓' : '+'}</span>
      </button>
      <button type="button" className="srsl-product-face srsl-product-back" onClick={() => setFlipped(false)} aria-label="返回商品卡">
        <span className="srsl-detail-label">丝路来处</span>
        <strong>{product.name}</strong>
        <p>{product.description}</p>
        <em>点击返回</em>
      </button>
    </article>
  )
}

function Shop({ selectedIds, onToggle, onCart }) {
  return (
    <section className="srsl-shop">
      <header className="srsl-shop-hero"><img src={silkRoadAssets.cartHeader} alt="千年丝路带货清单" /><div className="srsl-shop-progress">已选 <b>{selectedIds.length}</b> / {SILK_ROAD_PRODUCTS.length} 件</div></header>
      <img className="srsl-section-title" src={silkRoadAssets.cartSectionTitle} alt="点击加号选购" />
      <div className="srsl-product-grid">
        {SILK_ROAD_PRODUCTS.map((product) => <ProductCard key={product.id} product={product} selected={selectedIds.includes(product.id)} onToggle={onToggle} />)}
      </div>
      <button type="button" className="srsl-cart-dock" onClick={onCart}>
        <img src={silkRoadAssets.cartDock} alt="" />
        <span className="srsl-cart-count">{selectedIds.length}</span><span className="srsl-cart-text">已选 {selectedIds.length} 件丝路宝物</span><b>查看清单</b>
      </button>
    </section>
  )
}

function Cart({ products, onBack, onToggle, onCheckout }) {
  return (
    <section className="srsl-cart-page">
      <header><button type="button" onClick={onBack}>‹</button><div><span>我的丝路清单</span><small>已选 {products.length} / {SILK_ROAD_PRODUCTS.length} 件</small></div></header>
      {products.length ? <div className="srsl-cart-list">{products.map((product) => <article key={product.id}><img src={product.image} alt={product.name} /><div><strong>{product.name}</strong><p>{product.description}</p></div><button type="button" onClick={() => onToggle(product.id)} aria-label={`移出${product.name}`}>−</button></article>)}</div> : <div className="srsl-empty-cart">尚未选购珍宝<br /><small>回到清单，把心仪的丝路好物加入购物车吧</small></div>}
      <footer><button type="button" onClick={onBack}>继续选购</button><button type="button" disabled={!products.length} onClick={onCheckout}>去结算</button></footer>
    </section>
  )
}

function Poster({ dataUrl, products, user, onBack, onRegenerate }) {
  return (
    <section className="srsl-poster-page"><header><button type="button" onClick={onBack}>‹</button><span>我的丝路海报</span></header><div className="srsl-poster-preview">{dataUrl ? <img src={dataUrl} alt={`${user.nickname}的丝路带货清单海报`} /> : <div className="srsl-poster-building">正在合成海报…</div>}</div><p>已收集 {products.length} 件丝路珍宝</p><button type="button" className="srsl-poster-save" disabled={!dataUrl} onClick={onRegenerate}>{dataUrl ? '长按保存海报 / 重新生成' : '正在生成…'}</button></section>
  )
}

export default function SilkRoadShoppingList({ routeParams }) {
  const activityKey = routeParams?.activityKey || SILK_ROAD_SHOPPING_LIST_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const authConfig = useMemo(() => publicConfig ? { ...publicConfig, oauthScope: 'snsapi_userinfo', requireUserinfo: true } : publicConfig, [publicConfig])
  const { authReady } = useWechatAuth(activityKey, authConfig)
  const [stage, setStage] = useState(STAGE.HOME)
  const [selectedIds, setSelectedIds] = useState(readCart)
  const [user, setUser] = useState({ nickname: '丝路旅人', avatar: '' })
  const [posterUrl, setPosterUrl] = useState('')
  const [posterError, setPosterError] = useState('')
  const qrSourceRef = useRef(null)

  useEffect(() => { getPublicConfig(activityKey).then(setPublicConfig).catch(() => setPublicConfig({})) }, [activityKey])
  useEffect(() => { try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(selectedIds)) } catch { /* ignore unavailable storage */ } }, [selectedIds])
  useEffect(() => { if (authReady) getCurrentUser().then((profile) => setUser({ nickname: profile?.displayName || profile?.nickname || '丝路旅人', avatar: profile?.avatar || '' })).catch(() => undefined) }, [authReady])
  useEffect(() => () => { if (posterUrl) URL.revokeObjectURL(posterUrl) }, [posterUrl])

  const selectedProducts = useMemo(() => SILK_ROAD_PRODUCTS.filter((product) => selectedIds.includes(product.id)), [selectedIds])
  const toggleProduct = useCallback((id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]), [])
  const beginVideo = useCallback(() => {
    setStage(STAGE.ORIENTATION)
    window.screen?.orientation?.lock?.('landscape').catch(() => undefined)
  }, [])
  const enterVideo = useCallback(() => setStage(STAGE.VIDEO), [])
  const generate = useCallback(async () => {
    setPosterError('')
    try { setPosterUrl(await createPoster({ products: selectedProducts, user, qrWrapper: qrSourceRef.current })) } catch (error) { setPosterError(error.message || '海报生成失败') }
  }, [selectedProducts, user])
  useEffect(() => {
    if (stage !== STAGE.POSTER || !selectedProducts.length) return undefined
    const timer = window.setTimeout(() => { void generate() }, 0)
    return () => window.clearTimeout(timer)
  }, [generate, selectedProducts.length, stage])

  return (
    <main className={`srsl-app srsl-stage-${stage}`}>
      <div className="srsl-qr-source" ref={qrSourceRef}><QRCodeCanvas value={getActivityUrl(activityKey)} size={180} level="M" includeMargin /></div>
      {stage === STAGE.HOME && <Home onStart={beginVideo} />}
      {stage === STAGE.ORIENTATION && <OrientationPanel onDone={enterVideo} />}
      {(stage === STAGE.VIDEO || stage === STAGE.VIDEO_END) && <VideoStage completed={stage === STAGE.VIDEO_END} onEnd={() => setStage(STAGE.VIDEO_END)} onShop={() => { window.screen?.orientation?.unlock?.(); setStage(STAGE.SHOP) }} />}
      {stage === STAGE.SHOP && <Shop selectedIds={selectedIds} onToggle={toggleProduct} onCart={() => setStage(STAGE.CART)} />}
      {stage === STAGE.CART && <Cart products={selectedProducts} onBack={() => setStage(STAGE.SHOP)} onToggle={toggleProduct} onCheckout={() => setStage(STAGE.POSTER)} />}
      {stage === STAGE.POSTER && <Poster dataUrl={posterUrl} products={selectedProducts} user={user} onBack={() => setStage(STAGE.CART)} onRegenerate={generate} />}
      {posterError && <div className="srsl-toast" role="status">{posterError}</div>}
    </main>
  )
}
