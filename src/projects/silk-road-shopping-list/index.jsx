import { useEffect, useMemo, useRef, useState } from 'react'
import { DeleteOutlined } from '@ant-design/icons'
import { createPortal } from 'react-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { setToken } from '../../shared/api/request'
import { getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import { getCurrentUser } from './api'
import { SILK_ROAD_PRODUCTS, silkRoadAssets } from './config'
import './styles.css'

const DESIGN_WIDTH = 750

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

function Home({ onStart, showOrientation }) {
  return <Stage height={1624} className="srsl-home-stage">
    <div style={{ position: 'absolute', width: 750, height: 1448, left: 0, top: 88 }}>
      <img className="srsl-home-background" alt="" src={silkRoadAssets.homeBackground} style={{ position: 'absolute', width: 750, height: 1624, left: 0, top: -88 }} />
      <img className="srsl-home-title" alt="" src={silkRoadAssets.homeTitle} style={{ position: 'absolute', width: 440, height: 53, left: 155, top: 725 }} />
      <img className="srsl-home-illustration" alt="" src={silkRoadAssets.homeIllustration} style={{ position: 'absolute', width: 295, height: 595, left: 204, top: 87 }} />
      <img className="srsl-home-ribbon" alt="" src={silkRoadAssets.homeRibbon} style={{ position: 'absolute', width: 595, height: 87, left: 78, top: 1289 }} />
      <button className="srsl-image-button srsl-home-start" type="button" aria-label="开始集宝" onClick={onStart} style={{ position: 'absolute', width: 523, height: 145, left: 113, top: 1121 }}><img alt="开始集宝" src={silkRoadAssets.homeStart} /></button>
    </div>
    {showOrientation && <div className="srsl-orientation">请竖置手机锁定方向后 再横屏观看视频</div>}
  </Stage>
}

function VideoPanel({ mode, videoRef, onEnd, onShop }) {
  return <div className={`srsl-video-panel${mode === 'orientation' ? ' is-preparing' : ''}`}>
    <Stage height={1448} fitViewport>
      <div style={{ position: 'absolute', width: 1448, height: 824, left: 798, top: 0, transform: 'rotate(90deg)', transformOrigin: '0 0', transformStyle: 'flat' }}>
        <video ref={videoRef} src={silkRoadAssets.video} playsInline webkit-playsinline="true" x5-video-player-fullscreen="true" x5-video-player-type="h5" x-webkit-airplay="allow" airplay="allow" preload="auto" onEnded={onEnd} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      {mode === 'video' ? <button type="button" className="srsl-skip" onClick={onEnd}>跳过</button> : mode === 'video-end' ? <button className="srsl-image-button" type="button" aria-label="进入选购" onClick={onShop} style={{ position: 'absolute', width: 333, height: 78, left: 125, top: 556, transform: 'rotate(90deg)', transformOrigin: '0 0' }}><img alt="" src={silkRoadAssets.orientationHint} /></button> : null}
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
  <Stage height={626 + rows * 230} className="srsl-list-stage">
    <img alt="" src={silkRoadAssets.cartHeader} style={{ position: 'absolute', width: 750, height: 551, left: 0, top: 0 }} />
    <span className="srsl-progress" style={{ left: 376, top: 467, width: 94, height: 37 }}>{selectedIds.length}/50</span>
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

function Poster({ products, profile, onBack }) {
  const qrRef = useRef(null)
  const [posterImage, setPosterImage] = useState('')
  const [posterError, setPosterError] = useState('')
  const rows = Math.max(1, Math.ceil(products.length / 4))
  const collectionHeight = Math.max(592, 29 + 42 + rows * 213)
  const footerTop = 699 + collectionHeight - 70
  const height = footerTop + 403
  const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
  const drawCover = (context, image, left, top, width, targetHeight) => {
    const scale = Math.max(width / image.width, targetHeight / image.height)
    const sourceWidth = width / scale
    const sourceHeight = targetHeight / scale
    context.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, left, top, width, targetHeight)
  }
  const waitForQrCanvas = () => new Promise((resolve, reject) => {
    let remainingAttempts = 30
    const findCanvas = () => {
      const canvas = qrRef.current?.querySelector('canvas')
      if (canvas) {
        resolve(canvas)
        return
      }
      remainingAttempts -= 1
      if (remainingAttempts <= 0) {
        reject(new Error('二维码尚未生成'))
        return
      }
      window.setTimeout(findCanvas, 50)
    }
    findCanvas()
  })
  const savePoster = async () => {
    setPosterError('')
    try {
      const qrCanvas = await waitForQrCanvas()
      const output = document.createElement('canvas')
      output.width = 750
      output.height = height
      const context = output.getContext('2d')
      const [header, collection, label, item, footer, avatar, ...productImages] = await Promise.all([
        loadImage(silkRoadAssets.posterHeader),
        loadImage(silkRoadAssets.posterCollection),
        loadImage(silkRoadAssets.posterLabel),
        loadImage(silkRoadAssets.posterItem),
        loadImage(silkRoadAssets.posterFooter),
        profile.avatar ? loadImage(profile.avatar).catch(() => null) : Promise.resolve(null),
        ...products.map((product) => loadImage(product.posterImage)),
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
    context.fillText(profile.nickname, 206, 550)
    context.fillStyle = '#f3e2d3'
    context.font = '22px PingFang SC, Microsoft YaHei, sans-serif'
    context.textAlign = 'center'
    context.fillText(String(products.length), 563, 501)
    context.fillStyle = '#000'
    context.font = 'bold 53px Arial, sans-serif'
    context.textAlign = 'right'
    context.fillText('100', 583, 574)
    drawCover(context, collection, 0, 699, 750, collectionHeight)
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
      setPosterImage(output.toDataURL('image/png'))
    } catch {
      setPosterError('海报生成失败，请重试')
    }
  }
  return <Stage height={height}>
    <img alt="" src={silkRoadAssets.posterHeader} style={{ position: 'absolute', width: 750, height: 769, left: 0, top: 0 }} />
    <button className="srsl-back-hitbox" type="button" aria-label="返回购物车" onClick={onBack} />
    {profile.avatar && <img className="srsl-avatar" alt="" src={profile.avatar} style={{ position: 'absolute', width: 106, height: 106, left: 74, top: 517 }} />}
    <span className="srsl-nickname" style={{ left: 206, top: 520, width: 203, height: 46 }}>{profile.nickname}</span>
    <span className="srsl-poster-selected" style={{ left: 536, top: 475, width: 55, height: 38 }}>{products.length}</span>
    <span className="srsl-poster-score" style={{ left: 464, top: 521, width: 119, height: 64 }}>100</span>
    <div className="srsl-collection" style={{ height: collectionHeight, backgroundImage: `url(${silkRoadAssets.posterCollection})` }}>
      <img className="srsl-poster-label" alt="" src={silkRoadAssets.posterLabel} style={{ position: 'absolute', width: 349, height: 49, left: 200.5, top: 0 }} />
      <div className="srsl-poster-grid" style={{ height: 42 + rows * 213 }}>{products.map((product, index) => <div className="srsl-poster-product" key={product.id}>
        <img alt="" src={silkRoadAssets.posterItem} />
        <img alt={product.name} src={product.image} />
        <span className="srsl-poster-product-name">{product.name}</span>
        <span className="srsl-poster-order">{index + 1}</span>
      </div>)}</div>
    </div>
    <div className="srsl-footer" style={{ top: footerTop }}><img alt="" src={silkRoadAssets.posterFooter} /><div ref={qrRef} className="srsl-qr"><QRCodeCanvas value={window.location.href} size={106} includeMargin={false} /></div><button type="button" aria-label="保存海报" onClick={savePoster} /></div>
    {posterError && <span className="srsl-poster-error">{posterError}</span>}
    {posterImage && createPortal(<div className="srsl-poster-preview" role="dialog" aria-modal="true" aria-label="生成的海报">
      <button type="button" aria-label="关闭海报" onClick={() => setPosterImage('')}>×</button>
      <img alt="千年丝路带货清单海报" src={posterImage} />
    </div>, document.body)}
  </Stage>
}

export default function SilkRoadShoppingList() {
  const tokenFromUrl = getTokenFromUrl()
  const shouldRedirectAfterAuth = Boolean(tokenFromUrl)
  if (tokenFromUrl) setToken(tokenFromUrl)
  const [page, setPage] = useState('home')
  const [selectedIds, setSelectedIds] = useState(() => JSON.parse(localStorage.getItem('silk-road-shopping-list-cart') || '[]'))
  const [cartOpen, setCartOpen] = useState(false)
  const [profile, setProfile] = useState({ nickname: '丝路旅人', avatar: '' })
  const videoRef = useRef(null)
  const selected = useMemo(() => SILK_ROAD_PRODUCTS.filter((product) => selectedIds.includes(product.id)), [selectedIds])

  useEffect(() => { localStorage.setItem('silk-road-shopping-list-cart', JSON.stringify(selectedIds)) }, [selectedIds])
  useEffect(() => {
    if (shouldRedirectAfterAuth) return undefined
    getCurrentUser().then((user) => setProfile({ nickname: user?.nickname || '丝路旅人', avatar: user?.avatar || '' })).catch(() => null)
    return undefined
  }, [shouldRedirectAfterAuth])
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
  if (shouldRedirectAfterAuth) {
    window.location.replace(sanitizeUrlForWechat(window.location.href))
    return null
  }
  if (page === 'home' || page === 'orientation' || page === 'video' || page === 'video-end') return <main className={`srsl-intro-screen${page === 'video' || page === 'video-end' ? ' is-video' : ''}`}>
    {(page === 'home' || page === 'orientation') && <Home onStart={startVideo} showOrientation={page === 'orientation'} />}
    {page !== 'home' && <VideoPanel key="video-panel" mode={page} videoRef={videoRef} onEnd={videoEnd} onShop={() => setPage('shop')} />}
  </main>
  if (page === 'poster') return <main className="srsl-app"><Poster products={selected} profile={profile} onBack={() => { setPage('shop'); setCartOpen(true) }} /></main>
  return <main className="srsl-app"><ProductList products={SILK_ROAD_PRODUCTS} selectedIds={selectedIds} onToggle={toggle} onOpenCart={() => setCartOpen(true)} onCheckout={checkout} />{cartOpen && <CartDrawer products={selected} onClose={() => setCartOpen(false)} onRemove={toggle} onCheckout={checkout} />}</main>
}
