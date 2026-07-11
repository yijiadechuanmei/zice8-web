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
const DEBUG_RESET_TOKEN = 'RESET_ACL_2026'
const DESIGN_WIDTH = 750
const DESIGN_STAGE_HEIGHT = 1448
const isDebugRequested = new URLSearchParams(window.location.search).get('debug') === '1'
const PRESET_BARRAGES = [
  { id: 'preset-1', text: '为心动的TA打CALL！' },
  { id: 'preset-2', text: '音乐节现场见！' },
  { id: 'preset-3', text: '邀请好友助力，一起抽惊喜礼品' },
  { id: 'preset-4', text: '秘境崇左音乐节冲呀！' },
]

const DESIGN_ASSETS = {
  mainVisual: '774edde28a2e87d4356b672153b0391d_538166_461_808.png',
  topBackground: '2ec8ffc98ff52624b323a3f2a4f58a9e_129785_759_494.png',
  contentBackground: 'c84c3fe9c07920e5305b58176609d7a4_251037_751_719.png',
  footerBackground: '2d39e42e7cccc07d341b8ab0d43581d7_23789_750_59.png',
  title: '7e7582285c78ef69f6d2091249ffedb6_42076_448_287.png',
  logo: 'a8e8ec36f1b094220b0a9ce29f8e5ccc_16333_325_46.png',
  callButton: '767c72816a0490af17df4d67c5b27b67_8381_246_57.png',
  partnerButton: 'aedabf88c1be8865603e71ce7a001910_8211_247_57.png',
  drawAction: '3c93de1f605650ea746b8faec0d48285_5983_92_67.png',
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
  prizeFootnote: '68f6a32c6ae7107249d759c5606e0081_4143_636_60.png',
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

function getBarrageTop(item, index) {
  const source = `${item?.id || item?.text || 'barrage'}-${index}`
  let hash = 0
  for (let position = 0; position < source.length; position += 1) {
    hash = (hash * 31 + source.charCodeAt(position)) >>> 0
  }
  return 8 + (hash % 416)
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

function formatDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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

function ArtistAvatar({ artist, selected }) {
  if (artist?.avatarUrl) {
    return (
      <img
        className="acl-artist-avatar"
        src={artist.avatarUrl}
        alt={artist.name}
        loading="lazy"
      />
    )
  }
  return (
    <div className={`acl-artist-avatar acl-artist-avatar-fallback${selected ? ' is-selected' : ''}`}>
      {String(artist?.name || 'TA').slice(0, 2)}
    </div>
  )
}

function Modal({ children, onClose, labelledBy }) {
  return (
    <div className="acl-modal-mask" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="acl-modal">
        <button className="acl-modal-close" type="button" onClick={onClose} aria-label="关闭弹窗">
          ×
        </button>
        {children}
      </div>
    </div>
  )
}

function ArtistPicker({ artists, onSelect, onClose, selectedArtistId, loading }) {
  return (
    <Modal onClose={onClose} labelledBy="acl-artist-title">
      <h2 id="acl-artist-title" className="acl-modal-title">选择你心动的TA</h2>
      <div className="acl-artist-grid">
        {artists.map((artist) => (
          <button
            key={artist.id}
            type="button"
            className={`acl-artist-card${selectedArtistId === artist.id ? ' is-selected' : ''}`}
            onClick={() => onSelect(artist)}
            disabled={loading}
          >
            <ArtistAvatar artist={artist} selected={selectedArtistId === artist.id} />
            <span className="acl-artist-name">{artist.name}</span>
            {artist.slogan ? <span className="acl-artist-slogan">{artist.slogan}</span> : null}
          </button>
        ))}
      </div>
    </Modal>
  )
}

function PrizeModal({ draw, onClose, onClaim, claim }) {
  const claimed = claim || draw?.claim
  return (
    <Modal onClose={onClose} labelledBy="acl-prize-title">
      <p className="acl-modal-kicker">恭喜中奖</p>
      <h2 id="acl-prize-title" className="acl-modal-title">{draw?.prizeName || '惊喜礼品'}</h2>
      <div className="acl-prize-image-wrap">
        {draw?.prizeImage ? (
          <img className="acl-prize-image" src={draw.prizeImage} alt={draw.prizeName} />
        ) : (
          <div className="acl-prize-placeholder">PRIZE</div>
        )}
      </div>
      <p className="acl-prize-meta">中奖时间：{formatDateTime(draw?.createdAt)}</p>
      {claimed ? (
        <div className="acl-code-box">
          <span>中奖码</span>
          <strong>{claimed.redemptionCode}</strong>
          <small>请凭此码到现场兑换实物礼品</small>
        </div>
      ) : (
        <button className="acl-primary-btn acl-full-btn" type="button" onClick={onClaim}>
          领取礼品
        </button>
      )}
    </Modal>
  )
}

function PrizeShelf({ draw, onClaim }) {
  if (!draw) {
    return (
      <div className="acl-prize-shelf acl-prize-shelf--empty">
        <p>尚未获得奖品</p>
      </div>
    )
  }

  return (
    <div className="acl-prize-shelf">
      <div className="acl-prize-shelf__visual">
        {draw.prizeImage ? (
          <img src={draw.prizeImage} alt={draw.prizeName} />
        ) : (
          <span>礼品</span>
        )}
      </div>
      <div className="acl-prize-shelf__info">
        <strong>{draw.prizeName || '惊喜礼品'}</strong>
        <span>{draw.prizeLevel || '中奖礼品'}</span>
        <span className="acl-prize-shelf__time">中奖时间：{formatDateTime(draw.createdAt) || '—'}</span>
        {draw.claim ? (
          <div className="acl-prize-shelf__code">
            <small>兑换码</small>
            <b>{draw.claim.redemptionCode}</b>
          </div>
        ) : (
          <button className="acl-shelf-claim" type="button" onClick={onClaim}>
            去领取
          </button>
        )}
      </div>
    </div>
  )
}

function ClaimModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({ recipientName: '', recipientPhone: '' })

  return (
    <Modal onClose={onClose} labelledBy="acl-claim-title">
      <h2 id="acl-claim-title" className="acl-modal-title">填写领奖信息</h2>
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
      <button
        className="acl-primary-btn acl-full-btn"
        type="button"
        disabled={submitting}
        onClick={() => onSubmit(form)}
      >
        {submitting ? '提交中...' : '提交并生成中奖码'}
      </button>
    </Modal>
  )
}

function MessageModal({ title, message, onClose }) {
  return (
    <Modal onClose={onClose} labelledBy="acl-message-title">
      <h2 id="acl-message-title" className="acl-modal-title">{title}</h2>
      <p className="acl-message-text">{message}</p>
      <button className="acl-primary-btn acl-full-btn" type="button" onClick={onClose}>
        我知道了
      </button>
    </Modal>
  )
}

function DebugPanel({
  access,
  loading,
  resetting,
  onResetMine,
  onResetAll,
  onRefresh,
}) {
  if (!isDebugRequested) return null
  if (loading) {
    return <section className="acl-debug-panel">调试权限校验中...</section>
  }
  if (!access?.canDebug) {
    return <section className="acl-debug-panel">调试面板未授权</section>
  }
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
  const inviterUserId = getQueryParam('inviterUserId') || ''
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [artistPickerOpen, setArtistPickerOpen] = useState(false)
  const [prizeDraw, setPrizeDraw] = useState(null)
  const [claimDraw, setClaimDraw] = useState(null)
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [prizeDebugState, setPrizeDebugState] = useState(null)
  const [message, setMessage] = useState(null)
  const [debugAccess, setDebugAccess] = useState(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugResetting, setDebugResetting] = useState(false)

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
      if (data?.inviteAssist?.created) {
        setMessage({ title: '助力成功', message: '你和邀请人均已获得1次额外抽奖资格。' })
        trackEvent({ activityKey, eventType: 'artist_call_team_up_auto', extra: { activityType: 'artist_call_lottery' } })
      }
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
    setDebugLoading(true)
    getDebugAccess(activityKey)
      .then((access) => {
        if (active) setDebugAccess(access)
      })
      .catch((error) => {
        if (Number(error?.status) === 401) reauth('artist-call-debug-access')
        if (active) setDebugAccess(null)
      })
      .finally(() => {
        if (active) setDebugLoading(false)
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

  const artists = bootstrap?.artists || []
  const barrages = [...(bootstrap?.barrages || []).slice(0, 2), ...PRESET_BARRAGES]
  const chances = bootstrap?.chances || { total: 0, used: 0, remaining: 0, max: 2 }
  const latestWonDraw = [...(bootstrap?.draws || [])].reverse().find((draw) => draw.won)
  const theme = pageConfig.theme || {}
  const assetsBaseUrl = pageConfig.assetsBaseUrl || DEFAULT_ASSETS_BASE_URL
  const getDesignAsset = (key) => {
    const configured = pageConfig.designAssets?.[key]
    if (configured) return configured
    return `${assetsBaseUrl.replace(/\/$/, '')}/${DESIGN_ASSETS[key]}`
  }
  const debugPrizeDraws = useMemo(() => {
    const prizeImage = `${assetsBaseUrl.replace(/\/$/, '')}/prizes/first.png`
    return {
      empty: null,
      unclaimed: {
        id: 'debug-unclaimed-prize',
        prizeName: '音乐节惊喜礼包',
        prizeLevel: '一等奖',
        prizeImage,
        createdAt: '2026-07-11T10:30:00+08:00',
        claim: null,
      },
      claimed: {
        id: 'debug-claimed-prize',
        prizeName: '音乐节惊喜礼包',
        prizeLevel: '一等奖',
        prizeImage,
        createdAt: '2026-07-11T10:30:00+08:00',
        claim: { redemptionCode: 'A8C6K2' },
      },
    }
  }, [assetsBaseUrl])
  const displayedPrizeDraw = prizeDebugState ? debugPrizeDraws[prizeDebugState] : latestWonDraw

  const cyclePrizeDebugState = () => {
    setPrizeDebugState((current) => {
      if (current === 'empty') return 'unclaimed'
      if (current === 'unclaimed') return 'claimed'
      if (current === 'claimed') return null
      return 'empty'
    })
  }

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
      setArtistPickerOpen(false)
      trackEvent({ activityKey, eventType: 'artist_call_submit', extra: { activityType: 'artist_call_lottery' } })
    } catch (error) {
      setMessage({ title: '打CALL失败', message: error.message || '请稍后再试' })
    } finally {
      setActionLoading(false)
    }
  }

  const handlePartner = async () => {
    const pending = bootstrap?.pendingInvitation
    if (pending?.inviterUserId) {
      setActionLoading(true)
      try {
        const result = await teamUp(activityKey, { inviterUserId: pending.inviterUserId })
        setBootstrap((prev) => ({
          ...prev,
          myTeam: result.team,
          pendingInvitation: null,
          chances: result.chances,
        }))
        setMessage({ title: '助力成功', message: '你和邀请人均已获得1次额外抽奖资格。' })
        trackEvent({ activityKey, eventType: 'artist_call_team_up', extra: { activityType: 'artist_call_lottery' } })
      } catch (error) {
        setMessage({ title: '助力失败', message: error.message || '请稍后再试' })
      } finally {
        setActionLoading(false)
      }
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
        setMessage({ title: '未中奖', message: '这次没有中奖。分享活动邀请助力，好友完成助力后还能再抽一次。' })
      }
      trackEvent({ activityKey, eventType: 'lottery_draw_click', extra: { activityType: 'artist_call_lottery' } })
    } catch (error) {
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
        <img className="acl-design-image acl-design-image--main" src={getDesignAsset('mainVisual')} alt="" />
        <img className="acl-design-image acl-design-image--top" src={getDesignAsset('topBackground')} alt="" />
        <img className="acl-design-image acl-design-image--title" src={getDesignAsset('title')} alt="为心动的TA打CALL" />
        <img className="acl-design-image acl-design-image--logo" src={getDesignAsset('logo')} alt="" />
        <img className="acl-design-image acl-design-image--content" src={getDesignAsset('contentBackground')} alt="" />
        <img className="acl-design-image acl-design-image--footer" src={getDesignAsset('footerBackground')} alt="" />

        <section className="acl-barrage-area" aria-label="弹幕区">
          {barrages.slice(0, 6).map((item, index) => (
            <div
              className="acl-barrage"
              key={`${item.id}-${index}`}
              style={{
                top: `${getBarrageTop(item, index)}px`,
                animationDelay: `${-index * 2.7}s`,
              }}
            >
              <span className="acl-barrage__text">{item.text}</span>
              <img src={getDesignAsset('barrageAvatar')} alt="" />
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
          <img className="acl-stage-actions__decor" src={getDesignAsset('drawAction')} alt="" />
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

        {bootstrap?.pendingInvitation ? (
          <div className="acl-invite-tip">
            {bootstrap.pendingInvitation.inviterName} 邀请你助力，点击“寻找搭子”完成助力。
          </div>
        ) : null}
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
        <button
          className="acl-prize-card__title-button"
          type="button"
          onClick={cyclePrizeDebugState}
          aria-label="切换礼品调试状态"
        >
          <img className="acl-prize-card__title" src={getDesignAsset('prizeTitle')} alt="我的礼品" />
        </button>
        <div className="acl-prize-slot">
          <PrizeShelf
            draw={displayedPrizeDraw}
            onClaim={() => setClaimDraw(displayedPrizeDraw)}
          />
        </div>
        <img className="acl-prize-card__subtitle" src={getDesignAsset('prizeSubtitle')} alt="领奖方式" />
        <img className="acl-prize-card__footnote" src={getDesignAsset('prizeFootnote')} alt="" />
      </section>

        <DebugPanel
          access={debugAccess}
          loading={debugLoading}
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
          artists={artists}
          selectedArtistId={bootstrap?.myCall?.artist?.id}
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
    </main>
  )
}
