import { useCallback, useEffect, useMemo, useState } from 'react'
import { setToken } from '../../shared/api/request'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl } from '../../shared/utils/url'
import {
  claimPrize,
  createWish,
  drawPrize,
  getBootstrap,
  getMessages,
  getPublicConfig,
} from './api'
import '../artist-call-lottery/styles.css'
import './styles.css'

const DEFAULT_ACTIVITY_KEY = 'song_wish_lottery_2026'
const ARTIST_CALL_ASSETS_BASE_URL = 'https://assets.zice8.com/artist_call_lottery/artist_call_lottery_2026'
const DESIGN_WIDTH = 750
const DESIGN_STAGE_HEIGHT = 1448
const CAROUSEL_VIEWPORT_WIDTH = 521
const DAMAI_DETAIL_URL = 'https://detail.damai.cn/item.htm?id=1065476560358'
const BARRAGE_TRACK_TOPS = [10, 76, 143, 211, 286, 354, 421]
const BARRAGE_CYCLE_SECONDS = 16

const DESIGN_ASSETS = {
  topBackground: '2ec8ffc98ff52624b323a3f2a4f58a9e_129785_759_494.png',
  contentBackground: 'c84c3fe9c07920e5305b58176609d7a4_251037_751_719.png',
  footerBackground: '2d39e42e7cccc07d341b8ab0d43581d7_23789_750_59.png',
  logo: 'a8e8ec36f1b094220b0a9ce29f8e5ccc_16333_325_46.png',
  drawButton: '3ea0d0eef1f53d92241f9401fa49510e_6630_110_110.png',
  barrageAvatar: 'f34feb9cfaa2a5bac8c3224c917dbd50_9363_57_57.png',
  prizeNotDrawn: 'ee105c305e356373ee7c90217e45cdb1_16054_637_741.png',
  prizeNotWon: '86a282c664a27dc24dbce32e3a5cea62_15610_547_634.png',
  prizeWon: '06812196e8f9cc62e5e96e81064221f7_10674_546_634.png',
  prizeClaimButton: '35e07409f1d1bf0eb106448c3d17e713_1559_230_50.png',
  bottomButton: '8415388794caff3828ea7f22a86f62be_1598_316_74.png',
  carouselSlide01: '3c810886872ae537fc15764fe8b7352a_383962_382_670.png',
  carouselSlide02: '2e7a81061cf271bad435928c9c74facf_337852_450_661.png',
  carouselSlide03: '11f82cd96ccfd8d05326eb99cbd7507c_363939_411_636.png',
  carouselSlide04: '283bbfa23234fa3adacfef1491b66916_435983_429_661.png',
  carouselSlide05: 'ed0fa98ec326f68880e84b9bf87396e8_448123_496_573.png',
  carouselSlide06: '4fa715e5d9c1f3e4ee6558a8e0722f79_347778_377_669.png',
  carouselSlide07: 'af8f59a6472d417f983ddd894cc82567_433033_471_632.png',
  carouselSlide08: 'bec52f647b6fdcc0606ca42ed4d00ea1_311382_475_420.png',
  carouselSlide09: '2f2f4cb7808b9e2e59e0a0ee25872d7e_442407_472_607.png',
  carouselSlide10: 'c6fa111f625079e546cf0e60b441009d_499467_521_561.png',
}

const CAROUSEL_SLIDES = [
  { assetKey: 'carouselSlide02', left: 51, top: 9, width: 450, height: 661 },
  { assetKey: 'carouselSlide01', left: 63, top: 0, width: 382, height: 670 },
  { assetKey: 'carouselSlide03', left: 90, top: 9, width: 411, height: 636 },
  { assetKey: 'carouselSlide04', left: 53, top: 9, width: 429, height: 661 },
  { assetKey: 'carouselSlide05', left: 21, top: 20, width: 496, height: 573 },
  { assetKey: 'carouselSlide06', left: 96, top: 1, width: 377, height: 669 },
  { assetKey: 'carouselSlide07', left: 45, top: 38, width: 471, height: 632 },
  { assetKey: 'carouselSlide08', left: 34, top: 13, width: 475, height: 420 },
  { assetKey: 'carouselSlide09', left: 33, top: 13, width: 472, height: 607 },
  { assetKey: 'carouselSlide10', left: 0, top: 12, width: 521, height: 561 },
]

const PRIZE_STATE_VISUALS = {
  notDrawn: { assetKey: 'prizeNotDrawn', left: 43, top: -18, width: 547, height: 634 },
  notWon: { assetKey: 'prizeNotWon', left: 48, top: -18, width: 547, height: 634 },
  won: { assetKey: 'prizeWon', left: 48, top: -18, width: 547, height: 634 },
}

const PRESET_BARRAGES = [
  { id: 'preset-1', text: '许下想在现场听到的歌吧！' },
  { id: 'preset-2', text: '每许愿 1 次，获得 1 次抽奖机会！' },
  { id: 'preset-3', text: '秘境崇左音乐节现场见！' },
  { id: 'preset-4', text: '我想听一首最爱的歌！' },
]

function getArtistAsset(filename) {
  return `${ARTIST_CALL_ASSETS_BASE_URL}/${filename}`
}

function normalizeActivityKey(routeParams) {
  return routeParams?.activityKey || getQueryParam('activity_key') || DEFAULT_ACTIVITY_KEY
}

function buildRequestId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function mergeConfig(publicConfig, bootstrap) {
  const mobileConfig = publicConfig?.mobileConfig || {}
  const config = bootstrap?.config || {}
  return {
    ...mobileConfig,
    ...config,
    theme: { ...(mobileConfig.theme || {}), ...(config.theme || {}) },
    rules: config.rules || mobileConfig.rules || [],
  }
}

function createSeededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function getBarrageLayouts(barrages, seed, latestUserBarrageId) {
  const random = createSeededRandom(seed)
  const laneTops = [...BARRAGE_TRACK_TOPS].sort(() => random() - 0.5)
  const entryInterval = BARRAGE_CYCLE_SECONDS / Math.max(barrages.length, 1)
  return barrages.map((barrage, index) => ({
    ...barrage,
    top: laneTops[index % laneTops.length],
    animationDelay: barrage.id === latestUserBarrageId
      ? '0s'
      : `${-((index * entryInterval + BARRAGE_CYCLE_SECONDS) % BARRAGE_CYCLE_SECONDS).toFixed(2)}s`,
  }))
}

function useArtboardLayout() {
  const [scale, setScale] = useState(() => Math.min(1, (window.innerWidth || DESIGN_WIDTH) / DESIGN_WIDTH))
  const [contentHeight, setContentHeight] = useState(DESIGN_STAGE_HEIGHT)
  const [contentElement, setContentElement] = useState(null)
  const contentRef = useCallback((node) => setContentElement(node), [])

  useEffect(() => {
    const updateScale = () => setScale(Math.min(1, (window.innerWidth || DESIGN_WIDTH) / DESIGN_WIDTH))
    updateScale()
    window.addEventListener('resize', updateScale)
    window.addEventListener('orientationchange', updateScale)
    return () => {
      window.removeEventListener('resize', updateScale)
      window.removeEventListener('orientationchange', updateScale)
    }
  }, [])

  useEffect(() => {
    if (!contentElement) return undefined
    const updateHeight = () => setContentHeight(contentElement.scrollHeight)
    updateHeight()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(updateHeight)
    observer.observe(contentElement)
    return () => observer.disconnect()
  }, [contentElement])

  return { contentRef, scale, height: contentHeight * scale }
}

function ArtistShowcaseCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [pointerStartX, setPointerStartX] = useState(null)
  const slideCount = CAROUSEL_SLIDES.length

  const goToSlide = useCallback((direction) => {
    if (direction > 0) {
      setIsTransitioning(true)
      setActiveIndex((current) => current + 1)
      return
    }
    if (activeIndex === 0) {
      setIsTransitioning(false)
      setActiveIndex(slideCount)
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        setIsTransitioning(true)
        setActiveIndex(slideCount - 1)
      }))
      return
    }
    setIsTransitioning(true)
    setActiveIndex((current) => current - 1)
  }, [activeIndex, slideCount])

  useEffect(() => {
    const timer = window.setInterval(() => goToSlide(1), 3600)
    return () => window.clearInterval(timer)
  }, [goToSlide])

  return (
    <section
      className="acl-artist-carousel"
      role="button"
      tabIndex={0}
      aria-label="音乐节艺人阵容轮播，轻触或左右滑动浏览"
      onPointerDown={(event) => setPointerStartX(event.clientX)}
      onPointerUp={(event) => {
        if (pointerStartX === null) return
        const offsetX = event.clientX - pointerStartX
        setPointerStartX(null)
        goToSlide(Math.abs(offsetX) < 24 || offsetX < 0 ? 1 : -1)
      }}
      onPointerCancel={() => setPointerStartX(null)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') goToSlide(-1)
        if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') goToSlide(1)
      }}
    >
      <div
        className={`acl-artist-carousel__track${isTransitioning ? '' : ' is-resetting'}`}
        style={{ transform: `translate3d(${-activeIndex * CAROUSEL_VIEWPORT_WIDTH}px, 0, 0)` }}
        onTransitionEnd={() => {
          if (activeIndex === slideCount) {
            setIsTransitioning(false)
            setActiveIndex(0)
          }
        }}
      >
        {[...CAROUSEL_SLIDES, CAROUSEL_SLIDES[0]].map((slide, index) => (
          <div className="acl-artist-carousel__slide" key={`${slide.assetKey}-${index}`}>
            <img
              src={getArtistAsset(DESIGN_ASSETS[slide.assetKey])}
              alt=""
              draggable="false"
              style={{ left: `${slide.left}px`, top: `${slide.top}px`, width: `${slide.width}px`, height: `${slide.height}px` }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function getModalScale(designWidth) {
  return Math.min(1, Math.max(0.1, ((window.innerWidth || designWidth) - 40) / designWidth))
}

function PrizeShelf({ draw, hasDrawn, onClaim }) {
  const state = draw ? 'won' : hasDrawn ? 'notWon' : 'notDrawn'
  const visual = PRIZE_STATE_VISUALS[state]
  return (
    <div className={`acl-prize-status acl-prize-status--${state}`} aria-live="polite">
      <img
        className="acl-prize-status__background"
        src={getArtistAsset(DESIGN_ASSETS[visual.assetKey])}
        alt=""
        style={{ left: `${visual.left}px`, top: `${visual.top}px`, width: `${visual.width}px`, height: `${visual.height}px` }}
      />
      {draw ? (
        <>
          <strong className="acl-prize-status__name">{draw.prizeName || '惊喜礼品'}</strong>
          <div className="acl-prize-status__image">
            {draw.prizeImage ? <img src={draw.prizeImage} alt={draw.prizeName || '奖品'} /> : <span>礼品</span>}
          </div>
          {draw.claim?.redemptionCode ? (
            <div className="acl-prize-status__code">{draw.claim.redemptionCode}</div>
          ) : (
            <button className="acl-prize-status__claim" type="button" onClick={onClaim}>
              <img src={getArtistAsset(DESIGN_ASSETS.prizeClaimButton)} alt="去领取" />
            </button>
          )}
        </>
      ) : null}
    </div>
  )
}

function PrizeModal({ draw, onClose, onClaim }) {
  return (
    <div className="acl-draw-result-mask" role="dialog" aria-modal="true" aria-label={draw?.won ? '抽奖结果：中奖' : '抽奖结果：未中奖'}>
      <div className="acl-draw-result-modal" style={{ transform: `scale(${getModalScale(626)})` }}>
        <PrizeShelf draw={draw?.won ? draw : null} hasDrawn onClaim={onClaim} />
        <button className="acl-draw-result-modal__close" type="button" onClick={onClose} aria-label="关闭抽奖结果">×</button>
      </div>
    </div>
  )
}

function CommonModal({ children, title, labelledBy, layout = 'message', onConfirm, onCancel, confirmText = '确定', confirmDisabled = false }) {
  return (
    <div className="acl-common-mask" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <section className={`acl-common-modal${layout === 'form' ? ' acl-common-modal--form' : ''}`}>
        <h2 id={labelledBy} className="acl-common-modal__title">{title}</h2>
        <div className="acl-common-modal__content">{children}</div>
        <div className="acl-common-modal__actions">
          <button type="button" disabled={confirmDisabled} onClick={onConfirm}>{confirmText}</button>
          {onCancel ? <button type="button" disabled={confirmDisabled} onClick={onCancel}>取消</button> : null}
        </div>
      </section>
    </div>
  )
}

function ClaimModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({ recipientName: '', recipientPhone: '' })
  return (
    <CommonModal title="填写领奖信息" labelledBy="swl-claim-title" layout="form" onConfirm={() => onSubmit(form)} onCancel={onClose} confirmText={submitting ? '提交中...' : '确定'} confirmDisabled={submitting}>
      <label className="acl-field"><span>姓名</span><input value={form.recipientName} onChange={(event) => setForm((prev) => ({ ...prev, recipientName: event.target.value }))} placeholder="请输入姓名" /></label>
      <label className="acl-field"><span>手机号</span><input value={form.recipientPhone} onChange={(event) => setForm((prev) => ({ ...prev, recipientPhone: event.target.value }))} placeholder="请输入手机号" inputMode="tel" /></label>
    </CommonModal>
  )
}

function MessageModal({ title, message, onClose }) {
  return <CommonModal title={title} labelledBy="swl-message-title" onConfirm={onClose}><p className="acl-common-modal__message">{message}</p></CommonModal>
}

export default function SongWishLotteryProject({ routeParams }) {
  const artboard = useArtboardLayout()
  const activityKey = normalizeActivityKey(routeParams)
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [songName, setSongName] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [prizeDraw, setPrizeDraw] = useState(null)
  const [claimDraw, setClaimDraw] = useState(null)
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [barrageSeed] = useState(() => Math.floor(Math.random() * 4294967296))
  const [latestUserBarrageId, setLatestUserBarrageId] = useState('')

  useEffect(() => {
    const token = getTokenFromUrl()
    if (token) setToken(token)
  }, [])

  useEffect(() => {
    let active = true
    getPublicConfig(activityKey).then((config) => active && setPublicConfig(config)).catch((error) => {
      if (active) setMessage({ title: '活动暂不可用', message: error.message || '请稍后再试' })
    })
    return () => { active = false }
  }, [activityKey])

  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, publicConfig)
  const loadBootstrap = useCallback(async () => {
    if (!authReady) return
    setLoading(true)
    try {
      setBootstrap(await getBootstrap(activityKey))
    } catch (error) {
      setMessage({ title: '加载失败', message: error.message || '请稍后再试' })
      if (Number(error?.status) === 401) reauth('song-wish-bootstrap-401')
    } finally {
      setLoading(false)
    }
  }, [activityKey, authReady, reauth])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadBootstrap() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadBootstrap])
  useEffect(() => { trackPageView(activityKey, '/song-wish-lottery', { activityType: 'song_wish_lottery' }) }, [activityKey])
  useEffect(() => {
    const timer = window.setInterval(() => {
      getMessages(activityKey, 20).then((data) => setBootstrap((prev) => prev ? { ...prev, messages: data.messages || [] } : prev)).catch(() => {})
    }, 12000)
    return () => window.clearInterval(timer)
  }, [activityKey])

  const pageConfig = useMemo(() => mergeConfig(publicConfig, bootstrap), [publicConfig, bootstrap])
  useWechatShare(activityKey, publicConfig)
  const chances = bootstrap?.chances || { total: 0, used: 0, remaining: 0, max: 3, wishes: 0 }
  const latestWonDraw = [...(bootstrap?.draws || [])].reverse().find((draw) => draw.won)
  const barrages = useMemo(() => {
    const source = bootstrap?.messages?.length ? bootstrap.messages : PRESET_BARRAGES
    return getBarrageLayouts(source.slice(0, 20).map((item) => ({ ...item, avatar: item.userAvatar || getArtistAsset(DESIGN_ASSETS.barrageAvatar) })), barrageSeed, latestUserBarrageId)
  }, [bootstrap?.messages, barrageSeed, latestUserBarrageId])

  const handleWishSubmit = async () => {
    const normalized = songName.trim()
    if (!normalized) {
      setMessage({ title: '请输入歌曲', message: '写下你最想在现场听到的歌名。' })
      return
    }
    setActionLoading(true)
    try {
      const result = await createWish(activityKey, { songName: normalized })
      setSongName('')
      setLatestUserBarrageId(result.message?.id || '')
      setBootstrap((prev) => ({
        ...prev,
        wishes: [...(prev?.wishes || []), result.wish].filter(Boolean),
        chances: result.chances,
        messages: [result.message, ...(prev?.messages || [])].filter(Boolean).slice(0, 20),
      }))
      trackEvent({ activityKey, eventType: 'song_wish_submit', extra: { activityType: 'song_wish_lottery' } })
    } catch (error) {
      setMessage({ title: '发送失败', message: error.message || '请稍后再试' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDraw = async () => {
    if (chances.total <= 0) {
      setMessage({ title: '先许愿歌曲', message: '发送一首最想听的歌，即可获得 1 次抽奖机会。' })
      return
    }
    if (chances.remaining <= 0) {
      setMessage({ title: '暂无抽奖机会', message: '每人最多许愿 3 首歌并获得 3 次抽奖机会。' })
      return
    }
    setActionLoading(true)
    try {
      const result = await drawPrize(activityKey, { requestId: buildRequestId('song_wish_draw') })
      await loadBootstrap()
      setPrizeDraw(result.draw || { won: false })
      trackEvent({ activityKey, eventType: 'lottery_draw_click', extra: { activityType: 'song_wish_lottery' } })
    } catch (error) {
      setMessage({ title: '抽奖失败', message: error.message || '请稍后再试' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleClaimSubmit = async (form) => {
    if (!claimDraw) return
    setClaimSubmitting(true)
    try {
      const result = await claimPrize(activityKey, claimDraw.id, form)
      const updatedDraw = { ...claimDraw, claim: result.claim }
      setClaimDraw(null)
      setPrizeDraw(updatedDraw)
      await loadBootstrap()
    } catch (error) {
      setMessage({ title: '提交失败', message: error.message || '请确认姓名和手机号后重试' })
    } finally {
      setClaimSubmitting(false)
    }
  }

  if (blockedMessage) return <div className="acl-page acl-centered"><div className="acl-blocked">{blockedMessage}</div></div>
  if (loading && !bootstrap) return <div className="acl-page acl-centered"><div className="acl-loading">活动加载中...</div></div>

  const rules = pageConfig.rules?.length ? pageConfig.rules : [
    '进入活动授权登录后，发送你最想在现场听到的歌曲，即可获得 1 次抽奖资格。',
    '每许愿 1 首歌获得 1 次抽奖资格，每人最多累计 3 次。',
    '每人最多中奖 1 次，中奖信息可在“我的礼品”中查看。',
    '中奖后填写姓名和手机号，凭中奖码到现场兑换实物礼品。',
  ]

  return (
    <main className="acl-page swl-page">
      <div className="acl-page-viewport">
        <div className="acl-page-artboard" style={{ width: `${DESIGN_WIDTH * artboard.scale}px`, height: `${artboard.height}px` }}>
          {/* The callback ref measures the scaled artboard's full content height. */}
          {/* eslint-disable-next-line react-hooks/refs */}
          <div ref={artboard.contentRef} className="acl-page-artboard__content" style={{ '--acl-stage-scale': artboard.scale }}>
            <div className="acl-design-stage">
              <ArtistShowcaseCarousel />
              <img className="acl-design-image acl-design-image--top" src={getArtistAsset(DESIGN_ASSETS.topBackground)} alt="" />
              <img className="acl-design-image acl-design-image--logo" src={getArtistAsset(DESIGN_ASSETS.logo)} alt="" />
              <h1 className="swl-stage-title"><span>{pageConfig.theme?.festivalName || '秘境崇左音乐节'}</span>{pageConfig.theme?.title || '许下想在现场听到的歌'}</h1>
              <img className="acl-design-image acl-design-image--content" src={getArtistAsset(DESIGN_ASSETS.contentBackground)} alt="" />
              <img className="acl-design-image acl-design-image--footer" src={getArtistAsset(DESIGN_ASSETS.footerBackground)} alt="" />

              <section className="acl-barrage-area swl-barrage-area" aria-label="歌曲许愿滚动区">
                {barrages.map((item) => (
                  <div className={`acl-barrage${item.id === latestUserBarrageId ? ' is-user-call' : ''}`} key={item.id} style={{ top: `${item.top}px`, animationDelay: item.animationDelay }}>
                    <span className="acl-barrage__text">{item.text}</span><img src={item.avatar} alt="" />
                  </div>
                ))}
              </section>

              <section className="acl-stage-actions swl-stage-actions" aria-label="歌曲许愿操作">
                <label className="swl-wish-input">
                  <span className="swl-sr-only">歌曲许愿</span>
                  <input value={songName} onChange={(event) => setSongName(event.target.value)} maxLength={120} placeholder={pageConfig.theme?.wishPlaceholder || '输入想听的歌曲'} onKeyDown={(event) => event.key === 'Enter' && handleWishSubmit()} />
                  <button type="button" disabled={actionLoading || chances.wishes >= chances.max} onClick={handleWishSubmit}>{actionLoading ? '发送中' : (pageConfig.theme?.sendButtonText || '发送许愿')}</button>
                </label>
                <div className="swl-chance-copy">已许愿 {Math.min(chances.wishes || 0, chances.max)}/{chances.max}<br />剩余机会 {chances.remaining}</div>
              </section>
              <button className="acl-stage-draw" type="button" onClick={handleDraw} disabled={actionLoading || chances.remaining <= 0} aria-label={`抽奖，剩余 ${chances.remaining} 次`}>
                <img src={getArtistAsset(DESIGN_ASSETS.drawButton)} alt="抽奖" /><span className="acl-stage-draw__count">{chances.remaining}</span>
              </button>
            </div>

            <section className="acl-info-card swl-info-card">
              <h2>活动说明</h2>
              <h3>参与方式</h3>
              {rules.map((rule, index) => <p key={rule}>{index + 1}. {rule}</p>)}
              <h3>抽奖机会</h3>
              <p>每次许愿立即增加 1 次机会；最多许愿 3 次，最多获得 3 次抽奖机会。</p>
            </section>

            <section className="acl-prize-card">
              <h2 className="swl-prize-title">我的礼品</h2>
              <div className="acl-prize-slot"><PrizeShelf draw={latestWonDraw} hasDrawn={(bootstrap?.draws || []).length > 0} onClaim={() => latestWonDraw && setClaimDraw(latestWonDraw)} /></div>
              <p className="swl-prize-note">中奖后填写领奖信息，凭中奖码到现场兑换礼品。</p>
            </section>

            <button className="acl-bottom-link" type="button" onClick={() => window.location.assign(DAMAI_DETAIL_URL)}><img src={getArtistAsset(DESIGN_ASSETS.bottomButton)} alt="查看活动详情" /></button>
          </div>
        </div>
      </div>

      {prizeDraw ? <PrizeModal draw={prizeDraw} onClose={() => setPrizeDraw(null)} onClaim={() => prizeDraw.won && setClaimDraw(prizeDraw)} /> : null}
      {claimDraw ? <ClaimModal submitting={claimSubmitting} onClose={() => setClaimDraw(null)} onSubmit={handleClaimSubmit} /> : null}
      {message ? <MessageModal title={message.title} message={message.message} onClose={() => setMessage(null)} /> : null}
    </main>
  )
}
