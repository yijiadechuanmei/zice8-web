import { useCallback, useEffect, useMemo, useState } from 'react'
import { setToken } from '../../shared/api/request'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import {
  callArtist,
  claimPrize,
  drawPrize,
  getBarrages,
  getBootstrap,
  getDebugAccess,
  getPublicConfig,
  resetDebugData,
  teamUp,
} from './api'
import './styles.css'

const DEFAULT_ACTIVITY_KEY = 'artist_call_lottery_2026'
const DEFAULT_ASSETS_BASE_URL = `https://assets.zice8.com/artist_call_lottery/${DEFAULT_ACTIVITY_KEY}`
const DAMAI_DETAIL_URL = 'https://detail.damai.cn/item.htm?id=1065476560358'
const DEBUG_RESET_TOKEN = 'RESET_ACL_2026'
const DESIGN_WIDTH = 750
const DESIGN_STAGE_HEIGHT = 1448
const CAROUSEL_VIEWPORT_WIDTH = 521
const ARTIST_PICKER_WIDTH = 661
const ARTIST_PICKER_HEIGHT = 487
const IVX_EDITOR_ASSET_BASE_URL = 'https://file3.ih5.cn/v35/edt/u10013600'
const isDebugRequested = new URLSearchParams(window.location.search).get('debug') === '1'
const PRESET_BARRAGES = [
  { id: 'preset-1', text: '为心动的TA打CALL！' },
  { id: 'preset-2', text: '音乐节现场见！' },
  { id: 'preset-3', text: '邀请好友助力，一起抽惊喜礼品' },
  { id: 'preset-4', text: '秘境崇左音乐节冲呀！' },
]

const DESIGN_ASSETS = {
  topBackground: '2ec8ffc98ff52624b323a3f2a4f58a9e_129785_759_494.png',
  contentBackground: 'c84c3fe9c07920e5305b58176609d7a4_251037_751_719.png',
  footerBackground: '2d39e42e7cccc07d341b8ab0d43581d7_23789_750_59.png',
  title: '7e7582285c78ef69f6d2091249ffedb6_42076_448_287.png',
  logo: 'a8e8ec36f1b094220b0a9ce29f8e5ccc_16333_325_46.png',
  callButton: '767c72816a0490af17df4d67c5b27b67_8381_246_57.png',
  partnerButton: 'aedabf88c1be8865603e71ce7a001910_8211_247_57.png',
  drawAction: '3c93de1f605650ea746b8faec0d48285_5983_92_67.png',
  teamCompleteDecor: '2d9c84389f2c826c607eb9bcaf8c7b85_1049_96_67.png',
  drawButton: '3ea0d0eef1f53d92241f9401fa49510e_6630_110_110.png',
  barrageFrame: 'a19c6100a937cf462d5f117323708674_3492_281_37.png',
  barrageAvatar: 'f34feb9cfaa2a5bac8c3224c917dbd50_9363_57_57.png',
  infoTitle: 'ff1b18b4df585400cf9f86eae0f2e323_5297_200_42.png',
  infoSubtitleOne: '63a9c412c6422b93cfe6208ae1c32acc_6843_129_39.png',
  infoLineOne: '802f076f27cf4c72bfe43cb9f27c35af_9282_429_74.png',
  infoLineTwo: 'eab03346d7b4c7a02f7003e535eb15a8_9873_478_75.png',
  infoLineThree: '12adbc7d0b3ad2b73895b5cca3cdfc92_10484_526_75.png',
  infoLineFour: '82460215240ca286b6c4b760be250d07_8863_332_75.png',
  infoSubtitleTwo: '7d8b3c7bc45969cf318f10e2d990377e_6307_129_39.png',
  activityTime: 'b3b00af7493139aa51962758ac02efec_5032_503_25.png',
  infoTime: 'd948debb40f4c6858c7524e8db0a4847_6874_129_38.png',
  infoRules: 'f235bd787614bce3360728768bc3bd82_15476_609_111.png',
  prizeTitle: '1ad08ab0b707ffc0fdea39291497c73b_5720_218_51.png',
  prizeSubtitle: 'd20b503661696539504bb2a1dbea12c5_6670_126_39.png',
  prizeFootnote: 'd13dace08f408687d8952872936cf53b_8948_636_108.png',
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
  bottomButton: '8415388794caff3828ea7f22a86f62be_1598_316_74.png',
  prizeNotDrawn: 'ee105c305e356373ee7c90217e45cdb1_16054_637_741.png',
  prizeNotWon: '86a282c664a27dc24dbce32e3a5cea62_15610_547_634.png',
  prizeWon: '06812196e8f9cc62e5e96e81064221f7_10674_546_634.png',
  prizeClaimButton: '35e07409f1d1bf0eb106448c3d17e713_1559_230_50.png',
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

const ARTIST_PICKER_ASSETS = {
  background: 'aa4de028b64e0b6b87d24ffb851177ca_124530_661_487.png',
  confirm: 'd8c7b8eb337971b19ae09e700abb8f5f_4413_115_39.png',
  close: '4fde127e1cb7941aa45caf540701c388_355_22_21.png',
  selected: '588b70b436fbdade4643a269d8ab7a5d_3578_27_27.png',
}

const ARTIST_PRESENTATIONS = [
  { artistKey: 'yao_xiaotang', name: '姚晓棠', avatar: 'b5870b4fcff839040b898858b2fceaff_9200_59_58.png', '弹窗avatar': 'fcf8185620fc3ffbbbf3dd5aa805e225_21452_104_125.png' },
  { artistKey: 'huang_zihongfan', name: '黄子弘凡', avatar: 'a163c035ec59088ec849829362376bfc_8171_59_58.png', '弹窗avatar': '17c42d1e1ada57ee831837cd57358118_19845_104_125.png' },
  { artistKey: 'en_wang_yien', name: 'en王翊恩', avatar: 'dc463065a7b8c320c59347d6dd9dc61e_7829_59_59.png', '弹窗avatar': '5cdbbba1d75b1b8987c2c692f1f275c6_17811_104_125.png' },
  { artistKey: 'fei_yutao', name: '费宇涛', avatar: '3e59c09470bb26c643af5145b8ced7e3_7763_59_58.png', '弹窗avatar': '6d9aea36007e9709c390a1ee1a2de517_20188_104_125.png' },
  { artistKey: 'benfu_shaonian_ciiu', name: '奔赴少年CIIU', avatar: '6dc8ceacd6781ac1c8d1e9eea01d21f9_9656_59_59.png', '弹窗avatar': '78517097877b8f5714b7eeadd5af1040_26511_104_125.png' },
  { artistKey: 'lin_zhixuan', name: '林志炫', avatar: '992ad38aa03be0ff238c839e6cddc2bb_7867_59_58.png', '弹窗avatar': '2015e2de9743e21a4a4eb01f97eb90ff_21842_104_126.png' },
  { artistKey: 'xie_tianxiao_ok_king', name: '谢天笑 &OK KING', avatar: 'bfa0d977d1a020b9af98e4f80db1db2c_9726_59_58.png', '弹窗avatar': '06271004097b3b1c20ee6aae0e928208_31239_125_126.png' },
  { artistKey: 'xiari_ruqin_qihua', name: '夏日入侵企画', avatar: 'b953a49105be5a6297e39c88d03c8620_9097_59_58.png', '弹窗avatar': '2b4a632ca4752bab03bd8964c9b2aa2b_29763_104_126.png' },
  { artistKey: 'chouju_chutao', name: '丑橘出逃', avatar: '4fc8e8ab5edca226697815632634bc62_10312_58_59.png', '弹窗avatar': 'fe9413bf0c3dbb579a2c2b4c4a323070_29815_104_126.png' },
  { artistKey: 'lingdian_yuedui', name: '零点乐队', avatar: '4fc8e8ab5edca226697815632634bc62_10312_58_59.png', '弹窗avatar': '1271d7bf439b8110ba83866ede36f9d1_21566_104_127.png' },
]

const BARRAGE_TRACK_TOPS = [10, 76, 143, 211, 286, 354, 421]
const BARRAGE_CYCLE_SECONDS = 16
const BARRAGE_ENTRY_JITTER_SECONDS = 0.45

function normalizeArtistName(name) {
  return String(name || '').replace(/\s+/g, '').toLowerCase()
}

function shuffle(items, random = Math.random) {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }
  return shuffled
}

function createSeededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function assignPresetBarrageAvatars(barrages) {
  const avatars = ARTIST_PRESENTATIONS.map((artist) => artist.avatar)
  const shuffledAvatars = shuffle(avatars)

  return barrages.map((barrage, index) => ({
    ...barrage,
    avatar: shuffledAvatars[index % shuffledAvatars.length],
  }))
}

function getBarrageLayouts(barrages, seed, latestUserBarrageId) {
  const random = createSeededRandom(seed)
  const laneTops = shuffle(BARRAGE_TRACK_TOPS, random)
  const entryInterval = BARRAGE_CYCLE_SECONDS / Math.max(barrages.length, 1)

  return barrages.map((barrage, index) => ({
    ...barrage,
    top: laneTops[index % laneTops.length],
    animationDelay: barrage.id === latestUserBarrageId
      ? '0s'
      : `${-((index * entryInterval + (random() * 2 - 1) * BARRAGE_ENTRY_JITTER_SECONDS + BARRAGE_CYCLE_SECONDS) % BARRAGE_CYCLE_SECONDS).toFixed(2)}s`,
  }))
}

function getArtistAsset(filename) {
  return `${DEFAULT_ASSETS_BASE_URL}/${filename}`
}

function getIhxEditorAsset(filename) {
  return `${IVX_EDITOR_ASSET_BASE_URL}/${filename}`
}

function getArtistPresentation(artist) {
  const name = normalizeArtistName(artist?.name || artist?.artistName)
  return ARTIST_PRESENTATIONS.find((item) => normalizeArtistName(item.name) === name) || null
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

  return {
    contentRef,
    scale,
    height: contentHeight * scale,
  }
}

function normalizeActivityKey(routeParams) {
  return routeParams?.activityKey || getQueryParam('activity_key') || DEFAULT_ACTIVITY_KEY
}

function buildRequestId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function buildShareLink(inviteCode) {
  const url = new URL(sanitizeUrlForWechat(window.location.href))
  url.searchParams.delete('inviterUserId')
  if (inviteCode) url.searchParams.set('inviterUserId', inviteCode)
  return url.toString()
}

function updateInviteUrl(inviteCode) {
  if (!inviteCode) return ''
  const url = new URL(sanitizeUrlForWechat(window.location.href))
  url.searchParams.set('inviterUserId', inviteCode)
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
  return url.toString()
}

function clearInviteUrl() {
  const url = new URL(sanitizeUrlForWechat(window.location.href))
  url.searchParams.delete('inviterUserId')
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
  return url.toString()
}

function getModalScale(designWidth) {
  const viewportWidth = window.innerWidth || designWidth
  return Math.min(1, Math.max(0.1, (viewportWidth - 40) / designWidth))
}

function getArtistPickerScale() {
  const availableWidth = Math.max(1, (window.innerWidth || ARTIST_PICKER_WIDTH) - 32)
  const availableHeight = Math.max(1, (window.innerHeight || ARTIST_PICKER_HEIGHT) - 32)
  return Math.min(1, availableWidth / ARTIST_PICKER_WIDTH, availableHeight / ARTIST_PICKER_HEIGHT)
}

function mergeConfig(publicConfig, bootstrap) {
  const mobileConfig = publicConfig?.mobileConfig || {}
  const config = bootstrap?.config || {}
  return {
    ...mobileConfig,
    ...config,
    theme: {
      ...(mobileConfig.theme || {}),
      ...(config.theme || {}),
    },
    rules: config.rules || mobileConfig.rules || [],
  }
}

function ArtistShowcaseCarousel({ getAsset }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [pointerStartX, setPointerStartX] = useState(null)
  const slideCount = CAROUSEL_SLIDES.length
  const visibleIndex = activeIndex % slideCount

  const goToSlide = useCallback((direction) => {
    if (direction > 0) {
      setIsTransitioning(true)
      setActiveIndex((current) => current + 1)
      return
    }

    if (activeIndex === 0) {
      setIsTransitioning(false)
      setActiveIndex(slideCount)
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setIsTransitioning(true)
          setActiveIndex(slideCount - 1)
        })
      })
      return
    }

    setIsTransitioning(true)
    setActiveIndex((current) => current - 1)
  }, [activeIndex, slideCount])

  useEffect(() => {
    const timer = window.setInterval(() => goToSlide(1), 3600)
    return () => window.clearInterval(timer)
  }, [goToSlide])

  const handleTransitionEnd = () => {
    if (activeIndex !== slideCount) return
    setIsTransitioning(false)
    setActiveIndex(0)
  }

  const handlePointerDown = (event) => {
    setPointerStartX(event.clientX)
  }

  const handlePointerUp = (event) => {
    if (pointerStartX === null) return
    const offsetX = event.clientX - pointerStartX
    setPointerStartX(null)
    if (Math.abs(offsetX) < 24) {
      goToSlide(1)
      return
    }
    goToSlide(offsetX > 0 ? -1 : 1)
  }

  return (
    <section
      className="acl-artist-carousel"
      role="button"
      tabIndex={0}
      aria-label={`艺人作品轮播，第 ${visibleIndex + 1} 张，共 ${slideCount} 张。轻触切换，左右滑动浏览。`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setPointerStartX(null)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          goToSlide(-1)
        }
        if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          goToSlide(1)
        }
      }}
    >
      <div
        className={`acl-artist-carousel__track${isTransitioning ? '' : ' is-resetting'}`}
        style={{ transform: `translate3d(${-activeIndex * CAROUSEL_VIEWPORT_WIDTH}px, 0, 0)` }}
        onTransitionEnd={handleTransitionEnd}
      >
        {[...CAROUSEL_SLIDES, CAROUSEL_SLIDES[0]].map((slide, index) => (
          <div className="acl-artist-carousel__slide" key={`${slide.assetKey}-${index}`}>
            <img
              src={getAsset(slide.assetKey)}
              alt=""
              draggable="false"
              style={{
                left: `${slide.left}px`,
                top: `${slide.top}px`,
                width: `${slide.width}px`,
                height: `${slide.height}px`,
              }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function ArtistPicker({ onSelect, onClose, selectedArtistKey, loading }) {
  const [pickedArtistKey, setPickedArtistKey] = useState(() => selectedArtistKey || '')
  const selectedArtist = ARTIST_PRESENTATIONS.find((artist) => artist.artistKey === pickedArtistKey)
  const scale = getArtistPickerScale()

  return (
    <div className="acl-artist-picker-mask" role="dialog" aria-modal="true" aria-label="选择你心动的TA">
      <div
        className="acl-artist-picker-frame"
        style={{ width: `${ARTIST_PICKER_WIDTH * scale}px`, height: `${ARTIST_PICKER_HEIGHT * scale}px` }}
      >
        <section className="acl-artist-picker" style={{ transform: `scale(${scale})` }}>
          <img className="acl-artist-picker__background" src={getIhxEditorAsset(ARTIST_PICKER_ASSETS.background)} alt="" />
          <div className="acl-artist-picker__grid">
            {ARTIST_PRESENTATIONS.map((artist) => {
              const selected = artist.artistKey === pickedArtistKey
              return (
                <button
                  key={artist.artistKey}
                  type="button"
                  className="acl-artist-picker__artist"
                  onClick={() => setPickedArtistKey(artist.artistKey)}
                  disabled={loading}
                  aria-label={`选择${artist.name}`}
                >
                  <img src={getArtistAsset(artist['弹窗avatar'])} alt={artist.name} />
                  {selected ? <img className="acl-artist-picker__selected" src={getIhxEditorAsset(ARTIST_PICKER_ASSETS.selected)} alt="已选择" /> : null}
                </button>
              )
            })}
          </div>
          <button
            className="acl-artist-picker__confirm"
            type="button"
            disabled={!selectedArtist || loading}
            onClick={() => selectedArtist && onSelect(selectedArtist)}
            aria-label="确认选择"
          >
            <img src={getIhxEditorAsset(ARTIST_PICKER_ASSETS.confirm)} alt="确认" />
          </button>
          <button className="acl-artist-picker__close" type="button" onClick={onClose} aria-label="关闭头像选择">
            <img src={getIhxEditorAsset(ARTIST_PICKER_ASSETS.close)} alt="关闭" />
          </button>
        </section>
      </div>
    </div>
  )
}

function PrizeModal({ draw, onClose, onClaim, claim, getAsset }) {
  const won = Boolean(draw?.won)
  const resultDraw = won ? { ...draw, claim: claim || draw?.claim } : null
  return (
    <div className="acl-draw-result-mask" role="dialog" aria-modal="true" aria-label={won ? '抽奖结果：中奖' : '抽奖结果：未中奖'}>
      <div className="acl-draw-result-modal" style={{ transform: `scale(${getModalScale(626)})` }}>
        <PrizeShelf
          draw={resultDraw}
          hasDrawn
          getAsset={getAsset}
          onClaim={onClaim}
        />
        <button className="acl-draw-result-modal__close" type="button" onClick={onClose} aria-label="关闭抽奖结果">
          ×
        </button>
      </div>
    </div>
  )
}

function PrizeShelf({ draw, hasDrawn, getAsset, onClaim }) {
  const state = draw ? 'won' : hasDrawn ? 'notWon' : 'notDrawn'
  const visual = PRIZE_STATE_VISUALS[state]
  const claimCode = draw?.claim?.redemptionCode

  return (
    <div className={`acl-prize-status acl-prize-status--${state}`} aria-live="polite">
      <img
        className="acl-prize-status__background"
        src={getAsset(visual.assetKey)}
        alt=""
        style={{
          left: `${visual.left}px`,
          top: `${visual.top}px`,
          width: `${visual.width}px`,
          height: `${visual.height}px`,
        }}
      />
      {draw ? (
        <>
          <strong className="acl-prize-status__name">{draw.prizeName || '惊喜礼品'}</strong>
          <div className="acl-prize-status__image">
            {draw.prizeImage ? <img src={draw.prizeImage} alt={draw.prizeName || '奖品'} /> : <span>礼品</span>}
          </div>
          {claimCode ? (
            <div className="acl-prize-status__code">{claimCode}</div>
          ) : (
            <button className="acl-prize-status__claim" type="button" onClick={onClaim}>
              <img src={getAsset('prizeClaimButton')} alt="去领取" />
            </button>
          )}
        </>
      ) : null}
    </div>
  )
}

function CommonModal({
  children,
  title,
  labelledBy,
  layout = 'message',
  onConfirm,
  onCancel,
  confirmText = '确定',
  cancelText = '取消',
  confirmDisabled = false,
  cancelDisabled = false,
}) {
  return (
    <div className="acl-common-mask" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <section className={`acl-common-modal${layout === 'form' ? ' acl-common-modal--form' : ''}`}>
        <h2 id={labelledBy} className="acl-common-modal__title">{title}</h2>
        <div className="acl-common-modal__content">{children}</div>
        <div className="acl-common-modal__actions">
          {onConfirm ? (
            <button type="button" disabled={confirmDisabled} onClick={onConfirm}>
              {confirmText}
            </button>
          ) : null}
          {onCancel ? <button type="button" disabled={cancelDisabled} onClick={onCancel}>{cancelText}</button> : null}
        </div>
      </section>
    </div>
  )
}

function ClaimModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({ recipientName: '', recipientPhone: '' })

  return (
    <CommonModal
      title="填写领奖信息"
      labelledBy="acl-claim-title"
      layout="form"
      onConfirm={() => onSubmit(form)}
      onCancel={onClose}
      confirmText={submitting ? '提交中...' : '确定'}
      confirmDisabled={submitting}
      cancelDisabled={submitting}
    >
      <label className="acl-field">
        <span>姓名</span>
        <input
          value={form.recipientName}
          onChange={(event) => setForm((prev) => ({ ...prev, recipientName: event.target.value }))}
          placeholder="请输入姓名"
        />
      </label>
      <label className="acl-field">
        <span>手机号</span>
        <input
          value={form.recipientPhone}
          onChange={(event) => setForm((prev) => ({ ...prev, recipientPhone: event.target.value }))}
          placeholder="请输入手机号"
          inputMode="tel"
        />
      </label>
    </CommonModal>
  )
}

function MessageModal({ title, message, onClose }) {
  return (
    <CommonModal title={title} labelledBy="acl-message-title" onConfirm={onClose} confirmText="确定">
      <p className="acl-common-modal__message">{message}</p>
    </CommonModal>
  )
}

function TeamInviteModal({ invitation, onAccept, onDecline, submitting }) {
  return (
    <CommonModal
      title="组队邀请"
      labelledBy="acl-team-invite-title"
      onConfirm={onAccept}
      onCancel={onDecline}
      confirmText={submitting ? '处理中...' : '同意'}
      cancelText="不同意"
      confirmDisabled={submitting}
      cancelDisabled={submitting}
    >
      <p className="acl-common-modal__message">{invitation?.inviterName || '好友'} 邀请你一起组队，是否同意？</p>
    </CommonModal>
  )
}

function DebugPanel({
  access,
  resetting,
  onResetMine,
  onResetAll,
  onRefresh,
}) {
  if (!isDebugRequested || !access?.canDebug) return null
  return (
    <section className="acl-debug-panel" aria-label="调试面板">
      <strong>Debug</strong>
      <span>当前用户：{access.userId}</span>
      <button type="button" disabled={resetting} onClick={onResetMine}>
        重置自己
      </button>
      {access.allowActivityReset ? (
        <button className="is-danger" type="button" disabled={resetting} onClick={onResetAll}>
          重置全部
        </button>
      ) : null}
      <button type="button" disabled={resetting} onClick={onRefresh}>
        刷新数据
      </button>
    </section>
  )
}

export default function ArtistCallLotteryProject({ routeParams }) {
  const artboard = useArtboardLayout()
  const activityKey = normalizeActivityKey(routeParams)
  const [inviterUserId, setInviterUserId] = useState(() => getQueryParam('inviterUserId') || '')
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [artistPickerOpen, setArtistPickerOpen] = useState(false)
  const [prizeDraw, setPrizeDraw] = useState(null)
  const [claimDraw, setClaimDraw] = useState(null)
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [teamInvitePrompt, setTeamInvitePrompt] = useState(null)
  const [message, setMessage] = useState(null)
  const [debugAccess, setDebugAccess] = useState(null)
  const [debugResetting, setDebugResetting] = useState(false)
  const [presetBarrages] = useState(() => assignPresetBarrageAvatars(PRESET_BARRAGES))
  const [barrageLayoutSeed] = useState(() => Math.floor(Math.random() * 4294967296))
  const [latestUserBarrageId, setLatestUserBarrageId] = useState('')

  useEffect(() => {
    const token = getTokenFromUrl()
    if (token) setToken(token)
  }, [])

  useEffect(() => {
    let active = true
    getPublicConfig(activityKey)
      .then((config) => {
        if (active) setPublicConfig(config)
      })
      .catch((error) => {
        if (active) setMessage({ title: '活动暂不可用', message: error.message || '请稍后再试' })
      })
    return () => {
      active = false
    }
  }, [activityKey])

  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, publicConfig)

  const loadBootstrap = useCallback(async () => {
    if (!authReady) return
    setLoading(true)
    try {
      const data = await getBootstrap(activityKey, inviterUserId)
      setBootstrap(data)
      if (data?.pendingInvitation) setTeamInvitePrompt(data.pendingInvitation)
    } catch (error) {
      setMessage({ title: '加载失败', message: error.message || '请稍后再试' })
      if (Number(error?.status) === 401) reauth('artist-call-bootstrap-401')
    } finally {
      setLoading(false)
    }
  }, [activityKey, authReady, inviterUserId, reauth])

  useEffect(() => {
    loadBootstrap()
  }, [loadBootstrap])

  useEffect(() => {
    if (!isDebugRequested || !authReady || !publicConfig) return
    let active = true
    getDebugAccess(activityKey)
      .then((access) => {
        if (active) setDebugAccess(access)
      })
      .catch((error) => {
        if (Number(error?.status) === 401) reauth('artist-call-debug-access')
        if (active) setDebugAccess(null)
      })
    return () => {
      active = false
    }
  }, [activityKey, authReady, publicConfig, reauth])

  useEffect(() => {
    trackPageView(activityKey, '/artist-call-lottery', { activityType: 'artist_call_lottery' })
  }, [activityKey])

  useEffect(() => {
    if (!activityKey) return undefined
    const timer = window.setInterval(() => {
      getBarrages(activityKey, 20)
        .then((data) => {
          setBootstrap((prev) => (prev ? { ...prev, barrages: data.barrages || [] } : prev))
        })
        .catch(() => {})
    }, 12000)
    return () => window.clearInterval(timer)
  }, [activityKey])

  const pageConfig = useMemo(() => mergeConfig(publicConfig, bootstrap), [publicConfig, bootstrap])
  const shareActivity = useMemo(() => {
    if (!publicConfig) return null
    return {
      ...publicConfig,
      shareLink: buildShareLink(bootstrap?.inviteCode),
    }
  }, [bootstrap?.inviteCode, publicConfig])

  useWechatShare(activityKey, shareActivity)

  const barrages = [...(bootstrap?.barrages || []).slice(0, 2), ...presetBarrages]
  const visibleBarrages = getBarrageLayouts(barrages.slice(0, 6), barrageLayoutSeed, latestUserBarrageId)
  const chances = bootstrap?.chances || { total: 0, used: 0, remaining: 0, max: 2 }
  const draws = bootstrap?.draws || []
  const latestWonDraw = [...draws].reverse().find((draw) => draw.won)
  const hasDrawn = draws.length > 0
  const theme = pageConfig.theme || {}
  const assetsBaseUrl = pageConfig.assetsBaseUrl || DEFAULT_ASSETS_BASE_URL
  const getDesignAsset = (key) => {
    const configured = pageConfig.designAssets?.[key]
    if (configured) return configured
    return `${assetsBaseUrl.replace(/\/$/, '')}/${DESIGN_ASSETS[key]}`
  }
  const getBarrageAvatar = (item) => {
    if (item.avatar) return getArtistAsset(item.avatar)
    const presentation = getArtistPresentation(item)
    return presentation ? getArtistAsset(presentation.avatar) : getDesignAsset('barrageAvatar')
  }
  const handleBottomButtonClick = () => window.location.assign(DAMAI_DETAIL_URL)

  const refreshAfterAction = useCallback(async () => {
    const data = await getBootstrap(activityKey, inviterUserId)
    setBootstrap(data)
    return data
  }, [activityKey, inviterUserId])

  const handleSelectArtist = async (artist) => {
    setActionLoading(true)
    try {
      const result = await callArtist(activityKey, { artistKey: artist.artistKey })
      setBootstrap((prev) => ({
        ...prev,
        myCall: result.call,
        chances: result.chances,
        barrages: [result.barrage, ...(prev?.barrages || [])].filter(Boolean).slice(0, 20),
      }))
      setLatestUserBarrageId(result.barrage?.id || '')
      setArtistPickerOpen(false)
      trackEvent({ activityKey, eventType: 'artist_call_submit', extra: { activityType: 'artist_call_lottery' } })
    } catch (error) {
      setMessage({ title: '打CALL失败', message: error.message || '请稍后再试' })
    } finally {
      setActionLoading(false)
    }
  }

  const handlePartner = () => {
    const pending = bootstrap?.pendingInvitation
    if (pending?.inviterUserId) {
      setTeamInvitePrompt(pending)
      return
    }
    const inviteCode = bootstrap?.inviteCode || bootstrap?.user?.id
    if (!inviteCode) {
      const redirecting = reauth('artist-call-partner-share')
      if (!redirecting) {
        setMessage({ title: '需要登录', message: '请在微信中打开并完成登录后，再邀请好友助力。' })
      }
      return
    }
    updateInviteUrl(inviteCode)
    setMessage({
      title: '邀请助力链接已生成',
      message: '请点击微信右上角分享给朋友，好友打开并完成助力后，你们双方都能额外获得1次抽奖资格。',
    })
  }

  const handleAcceptTeamInvite = async () => {
    const pending = teamInvitePrompt || bootstrap?.pendingInvitation
    if (!pending?.inviterUserId) return
    setActionLoading(true)
    try {
      const result = await teamUp(activityKey, { inviterUserId: pending.inviterUserId })
      setBootstrap((prev) => ({
        ...prev,
        myTeam: result.team,
        pendingInvitation: null,
        chances: result.chances,
      }))
      setTeamInvitePrompt(null)
      setMessage({ title: '组队成功', message: '你和邀请人均已获得1次额外抽奖资格。' })
      trackEvent({ activityKey, eventType: 'artist_call_team_up', extra: { activityType: 'artist_call_lottery' } })
    } catch (error) {
      setTeamInvitePrompt(null)
      setMessage({ title: '组队失败', message: error.message || '请稍后再试' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineTeamInvite = () => {
    setTeamInvitePrompt(null)
    setBootstrap((prev) => (prev ? { ...prev, pendingInvitation: null } : prev))
    setInviterUserId('')
    clearInviteUrl()
  }

  const handleDraw = async () => {
    if (chances.remaining <= 0) {
      setMessage({ title: '暂无抽奖机会', message: '为TA打CALL或邀请好友助力后可获得抽奖机会。' })
      return
    }
    setActionLoading(true)
    try {
      const result = await drawPrize(activityKey, { requestId: buildRequestId('artist_call_draw') })
      await refreshAfterAction()
      if (result.draw?.won) {
        setPrizeDraw(result.draw)
      } else {
        setPrizeDraw(result.draw || { won: false })
      }
      trackEvent({ activityKey, eventType: 'lottery_draw_click', extra: { activityType: 'artist_call_lottery' } })
    } catch (error) {
      if (error.message === '您已中奖') {
        setMessage({ title: '您已中奖', message: '您已获得奖品，不能重复中奖。' })
        return
      }
      setMessage({ title: '抽奖失败', message: error.message || '请稍后再试' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleDebugReset = async (scope) => {
    if (!debugAccess?.canDebug) return
    if (scope === 'activity' && !debugAccess.allowActivityReset) return
    if (scope === 'activity') {
      const confirmed = window.confirm('确认重置 artist_call_lottery_2026 全部数据？只会清空当前抽奖项目的数据。')
      if (!confirmed) return
    }
    setDebugResetting(true)
    try {
      await resetDebugData(activityKey, {
        confirmToken: DEBUG_RESET_TOKEN,
        scope,
      })
      const data = await getBootstrap(activityKey, '')
      setBootstrap(data)
      setMessage({
        title: '重置完成',
        message: scope === 'activity' ? '当前抽奖项目全部数据已重置。' : '你的当前抽奖项目数据已重置。',
      })
    } catch (error) {
      setMessage({ title: '重置失败', message: error.message || '请稍后再试' })
      if (Number(error?.status) === 401) reauth('artist-call-debug-reset')
    } finally {
      setDebugResetting(false)
    }
  }

  const handleClaimSubmit = async (form) => {
    if (!claimDraw) return
    setClaimSubmitting(true)
    try {
      const result = await claimPrize(activityKey, claimDraw.id, form)
      setClaimDraw(null)
      const updatedDraw = { ...claimDraw, claim: result.claim }
      setPrizeDraw(updatedDraw)
      await refreshAfterAction()
    } catch (error) {
      setMessage({ title: '提交失败', message: error.message || '请确认姓名和手机号后重试' })
    } finally {
      setClaimSubmitting(false)
    }
  }

  if (blockedMessage) {
    return (
      <div className="acl-page acl-centered">
        <div className="acl-blocked">{blockedMessage}</div>
      </div>
    )
  }

  if (loading && !bootstrap) {
    return (
      <div className="acl-page acl-centered">
        <div className="acl-loading">活动加载中...</div>
      </div>
    )
  }

  return (
    <main className="acl-page">
      <div className="acl-page-viewport">
        <div className="acl-page-artboard" style={{ width: `${DESIGN_WIDTH * artboard.scale}px`, height: `${artboard.height}px` }}>
          <div
            ref={artboard.contentRef}
            className="acl-page-artboard__content"
            style={{ '--acl-stage-scale': artboard.scale }}
          >
            <div className="acl-design-stage">
        <ArtistShowcaseCarousel getAsset={getDesignAsset} />
        <img className="acl-design-image acl-design-image--top" src={getDesignAsset('topBackground')} alt="" />
        <img className="acl-design-image acl-design-image--title" src={getDesignAsset('title')} alt="为心动的TA打CALL" />
        <img className="acl-design-image acl-design-image--logo" src={getDesignAsset('logo')} alt="" />
        <img className="acl-design-image acl-design-image--content" src={getDesignAsset('contentBackground')} alt="" />
        <img className="acl-design-image acl-design-image--footer" src={getDesignAsset('footerBackground')} alt="" />

        <section className="acl-barrage-area" aria-label="弹幕区">
          {visibleBarrages.map((item) => (
            <div
              className={`acl-barrage${item.id === latestUserBarrageId ? ' is-user-call' : ''}`}
              key={item.id}
              style={{
                top: `${item.top}px`,
                animationDelay: item.animationDelay,
              }}
            >
              <span className="acl-barrage__text">{item.text}</span>
              <img src={getBarrageAvatar(item)} alt="" />
            </div>
          ))}
        </section>

        <section className="acl-stage-actions" aria-label="活动操作">
          <button
            className="acl-image-btn acl-image-btn--call"
            type="button"
            onClick={() => bootstrap?.myCall
              ? setMessage({ title: '已完成打CALL', message: bootstrap.myCall.commentText || '你已获得1次抽奖资格。' })
              : setArtistPickerOpen(true)}
            disabled={actionLoading}
          >
            <img src={getDesignAsset('callButton')} alt={bootstrap?.myCall ? '已打CALL' : '为TA打CALL'} />
          </button>
          <button
            className="acl-image-btn acl-image-btn--partner"
            type="button"
            onClick={() => bootstrap?.myTeam
              ? setMessage({ title: '已完成助力', message: '你已获得邀请助力额外抽奖资格。' })
              : handlePartner()}
            disabled={actionLoading}
          >
            <img src={getDesignAsset('partnerButton')} alt={bootstrap?.myTeam ? '已助力' : '邀请助力'} />
          </button>
          <img
            className="acl-stage-actions__decor"
            src={getDesignAsset(bootstrap?.myTeam ? 'teamCompleteDecor' : 'drawAction')}
            alt={bootstrap?.myTeam ? '已组队' : ''}
          />
        </section>

        <button
          className="acl-stage-draw"
          type="button"
          onClick={handleDraw}
          disabled={actionLoading || chances.remaining <= 0}
          aria-label={`抽奖，剩余 ${chances.remaining} 次`}
        >
          <img src={getDesignAsset('drawButton')} alt="" />
          <span className="acl-stage-draw__count" aria-hidden="true">{chances.remaining}</span>
        </button>

      </div>

      <section className="acl-info-card">
        <img src={getDesignAsset('infoTitle')} alt="活动说明" />
        <img className="acl-info-subtitle" src={getDesignAsset('infoSubtitleOne')} alt="活动参与方式" />
        <img className="acl-info-line" src={getDesignAsset('infoLineOne')} alt="" />
        <img className="acl-info-line" src={getDesignAsset('infoLineTwo')} alt="" />
        <img className="acl-info-line" src={getDesignAsset('infoLineThree')} alt="" />
        <img className="acl-info-line" src={getDesignAsset('infoLineFour')} alt="" />
        <img className="acl-info-subtitle acl-info-subtitle--second" src={getDesignAsset('infoSubtitleTwo')} alt="兑奖说明" />
        <div className="acl-info-activity-time">
          <img src={getDesignAsset('activityTime')} alt="活动时间" />
        </div>
        <img className="acl-info-time" src={getDesignAsset('infoTime')} alt="活动时间" />
        <img className="acl-info-rules" src={getDesignAsset('infoRules')} alt="兑换规则" />
      </section>

      <section className="acl-prize-card">
        <img className="acl-prize-card__title" src={getDesignAsset('prizeTitle')} alt="我的礼品" />
        <div className="acl-prize-slot">
          <PrizeShelf
            draw={latestWonDraw}
            hasDrawn={hasDrawn}
            getAsset={getDesignAsset}
            onClaim={() => setClaimDraw(latestWonDraw)}
          />
        </div>
        <img className="acl-prize-card__subtitle" src={getDesignAsset('prizeSubtitle')} alt="领奖方式" />
        <img className="acl-prize-card__footnote" src={getDesignAsset('prizeFootnote')} alt="" />
      </section>

      <button className="acl-bottom-link" type="button" onClick={handleBottomButtonClick}>
        <img src={getDesignAsset('bottomButton')} alt="查看详情" />
      </button>

        <DebugPanel
          access={debugAccess}
          resetting={debugResetting}
          onResetMine={() => handleDebugReset('me')}
          onResetAll={() => handleDebugReset('activity')}
          onRefresh={refreshAfterAction}
        />

            </div>
          </div>
        </div>

      {artistPickerOpen ? (
        <ArtistPicker
          selectedArtistKey={bootstrap?.myCall?.artist?.artistKey}
          loading={actionLoading}
          onSelect={handleSelectArtist}
          onClose={() => setArtistPickerOpen(false)}
        />
      ) : null}
      {prizeDraw ? (
        <PrizeModal
          draw={prizeDraw}
          onClose={() => setPrizeDraw(null)}
          onClaim={() => setClaimDraw(prizeDraw)}
          getAsset={getDesignAsset}
        />
      ) : null}
      {claimDraw ? (
        <ClaimModal
          submitting={claimSubmitting}
          onClose={() => setClaimDraw(null)}
          onSubmit={handleClaimSubmit}
        />
      ) : null}
      {message ? (
        <MessageModal
          title={message.title}
          message={message.message}
          onClose={() => setMessage(null)}
        />
      ) : null}
      {teamInvitePrompt ? (
        <TeamInviteModal
          invitation={teamInvitePrompt}
          submitting={actionLoading}
          onAccept={handleAcceptTeamInvite}
          onDecline={handleDeclineTeamInvite}
        />
      ) : null}
    </main>
  )
}
