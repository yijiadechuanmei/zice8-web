import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { getCurrentUser } from './api'
import { SILK_ROAD_PRODUCTS, silkRoadAssets } from './config'
import './styles.css'

const DESIGN_WIDTH = 750

function useScale() {
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / DESIGN_WIDTH, 1))
  useEffect(() => {
    const update = () => setScale(Math.min(window.innerWidth / DESIGN_WIDTH, 1))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return scale
}

function Stage({ height, children, className = '' }) {
  const scale = useScale()
  return <div className={`srsl-frame ${className}`} style={{ width: 750 * scale, height: height * scale }}><div className="srsl-stage" style={{ width: 750, height, transform: `scale(${scale})` }}>{children}</div></div>
}

function Home({ onStart, showOrientation }) {
  return <Stage height={1624} className="srsl-home-stage">
    <div style={{ position: 'absolute', width: 750, height: 1448, left: 0, top: 88 }}>
      <img alt="" src={silkRoadAssets.homeBackground} style={{ position: 'absolute', width: 750, height: 1624, left: 0, top: -88 }} />
      <img alt="" src={silkRoadAssets.homeTitle} style={{ position: 'absolute', width: 440, height: 53, left: 155, top: 725 }} />
      <img alt="" src={silkRoadAssets.homeIllustration} style={{ position: 'absolute', width: 295, height: 595, left: 204, top: 87 }} />
      <img alt="" src={silkRoadAssets.homeRibbon} style={{ position: 'absolute', width: 595, height: 87, left: 78, top: 1289 }} />
      <button className="srsl-image-button" type="button" aria-label="开始集宝" onClick={onStart} style={{ position: 'absolute', width: 523, height: 145, left: 113, top: 1121 }}><img alt="开始集宝" src={silkRoadAssets.homeStart} /></button>
    </div>
    {showOrientation && <div className="srsl-orientation">请竖置手机锁定方向后 再横屏观看视频</div>}
  </Stage>
}

function ProductCard({ product, selected, onToggle }) {
  const [flipped, setFlipped] = useState(false)
  return <div className={`srsl-product-card${flipped ? ' is-flipped' : ''}`} role="button" tabIndex={0} onClick={() => setFlipped(!flipped)} onKeyDown={(event) => event.key === 'Enter' && setFlipped(!flipped)}>
    <div className="srsl-product-face">
      <img alt="" src={silkRoadAssets.productCard} style={{ position: 'absolute', width: 337, height: 230, left: 0, top: 0 }} />
      <button className="srsl-add" type="button" aria-label={selected ? `移除${product.name}` : `加入${product.name}`} onClick={(event) => { event.stopPropagation(); onToggle(product.id) }}>
        <img alt="" src={selected ? silkRoadAssets.minusIcon : silkRoadAssets.plusIcon} />
      </button>
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

function ProductList({ products, selectedIds, onToggle, onCart, cart }) {
  const rows = Math.ceil(products.length / 2)
  return <Stage height={626 + rows * 230} className="srsl-list-stage">
    <img alt="" src={silkRoadAssets.cartHeader} style={{ position: 'absolute', width: 750, height: 551, left: 0, top: 0 }} />
    <span className="srsl-progress" style={{ left: 376, top: 467, width: 94, height: 37 }}>{selectedIds.length}/50</span>
    <img alt="" src={silkRoadAssets.cartSectionTitle} style={{ position: 'absolute', width: 319, height: 35, left: 215.5, top: 571 }} />
    <div className="srsl-product-grid" style={{ height: rows * 230 + 20 }}>{products.map((product) => <ProductCard key={product.id} product={product} selected={selectedIds.includes(product.id)} onToggle={onToggle} />)}</div>
    <button className="srsl-image-button srsl-dock" type="button" aria-label={cart ? '去结算' : '查看购物车'} onClick={onCart}><img alt="" src={silkRoadAssets.cartDock} /><span>{selectedIds.length}</span></button>
  </Stage>
}

function Poster({ products, profile, onBack }) {
  const qrRef = useRef(null)
  const height = 1764
  const savePoster = () => {
    const qrCanvas = qrRef.current?.querySelector('canvas')
    if (!qrCanvas) return
    const output = document.createElement('canvas')
    output.width = 750
    output.height = height
    const context = output.getContext('2d')
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      context.drawImage(image, 0, 0, 750, 403)
      context.drawImage(qrCanvas, 77, 136, 106, 106)
      const link = document.createElement('a')
      link.download = '千年丝路带货清单.png'
      link.href = output.toDataURL('image/png')
      link.click()
    }
    image.src = silkRoadAssets.posterFooter
  }
  return <Stage height={height}>
    <img alt="" src={silkRoadAssets.posterHeader} style={{ position: 'absolute', width: 750, height: 769, left: 0, top: 0 }} />
    <button className="srsl-back-hitbox" type="button" aria-label="返回购物车" onClick={onBack} />
    {profile.avatar && <img className="srsl-avatar" alt="" src={profile.avatar} style={{ position: 'absolute', width: 106, height: 106, left: 74, top: 517 }} />}
    <span className="srsl-nickname" style={{ left: 206, top: 520, width: 203, height: 46 }}>{profile.nickname}</span>
    <span className="srsl-poster-selected" style={{ left: 536, top: 475, width: 55, height: 38 }}>{products.length}</span>
    <span className="srsl-poster-score" style={{ left: 464, top: 521, width: 119, height: 64 }}>100</span>
    <div className="srsl-collection">
      <img alt="" src={silkRoadAssets.posterCollection} style={{ position: 'absolute', width: 750, height: 672, left: 0, top: 0 }} />
      <img alt="" src={silkRoadAssets.posterLabel} style={{ position: 'absolute', width: 349, height: 49, left: 200.5, top: 0 }} />
      <div className="srsl-poster-grid">{products.map((product, index) => <div className="srsl-poster-product" key={product.id}>
        <img alt="" src={silkRoadAssets.posterItem} />
        <img alt={product.name} src={product.image} />
        <span className="srsl-poster-product-name">{product.name}</span>
        <span className="srsl-poster-order">{index + 1}</span>
      </div>)}</div>
    </div>
    <div className="srsl-footer"><img alt="" src={silkRoadAssets.posterFooter} /><div ref={qrRef} className="srsl-qr"><QRCodeCanvas value={window.location.href} size={106} includeMargin={false} /></div><button type="button" aria-label="保存海报" onClick={savePoster} /></div>
  </Stage>
}

export default function SilkRoadShoppingList() {
  const [page, setPage] = useState('home')
  const [selectedIds, setSelectedIds] = useState(() => JSON.parse(localStorage.getItem('silk-road-shopping-list-cart') || '[]'))
  const [profile, setProfile] = useState({ nickname: '丝路旅人', avatar: '' })
  const videoRef = useRef(null)
  const selected = useMemo(() => SILK_ROAD_PRODUCTS.filter((product) => selectedIds.includes(product.id)), [selectedIds])

  useEffect(() => { localStorage.setItem('silk-road-shopping-list-cart', JSON.stringify(selectedIds)) }, [selectedIds])
  useEffect(() => { getCurrentUser().then((user) => setProfile({ nickname: user?.nickname || '丝路旅人', avatar: user?.avatar || '' })).catch(() => null) }, [])
  useEffect(() => {
    if (page !== 'orientation') return undefined
    const timer = window.setTimeout(() => setPage('video'), 3000)
    return () => window.clearTimeout(timer)
  }, [page])
  useEffect(() => { if (page === 'video') videoRef.current?.play().catch(() => null) }, [page])

  const toggle = (id) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])
  const videoEnd = () => { videoRef.current?.pause(); setPage('video-end') }
  if (page === 'home' || page === 'orientation') return <main className="srsl-app"><Home onStart={() => setPage('orientation')} showOrientation={page === 'orientation'} /></main>
  if (page === 'video' || page === 'video-end') return <main className="srsl-video"><Stage height={1448}>
    <div style={{ position: 'absolute', width: 1448, height: 824, left: 798, top: 0, transform: 'rotate(90deg)', transformOrigin: '0 0', transformStyle: 'flat' }}>
      <video ref={videoRef} src={silkRoadAssets.video} autoPlay playsInline webkit-playsinline="true" x5-video-player-fullscreen="true" x5-video-player-type="h5" onEnded={videoEnd} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
    {page === 'video' ? <button type="button" className="srsl-skip" onClick={videoEnd}>跳过</button> : <button className="srsl-image-button" type="button" aria-label="进入选购" onClick={() => setPage('shop')} style={{ position: 'absolute', width: 333, height: 78, left: 125, top: 556, transform: 'rotate(90deg)', transformOrigin: '0 0' }}><img alt="" src={silkRoadAssets.orientationHint} /></button>}
  </Stage></main>
  if (page === 'poster') return <main className="srsl-app"><Poster products={selected} profile={profile} onBack={() => setPage('cart')} /></main>
  return <main className="srsl-app"><ProductList products={page === 'cart' ? selected : SILK_ROAD_PRODUCTS} selectedIds={selectedIds} onToggle={toggle} onCart={() => setPage(page === 'cart' ? 'poster' : 'cart')} cart={page === 'cart'} /></main>
}
