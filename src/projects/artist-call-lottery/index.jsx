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
  getPublicConfig,
  teamUp,
} from './api'
import './styles.css'

const DEFAULT_ACTIVITY_KEY = 'artist_call_lottery_2026'

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

export default function ArtistCallLotteryProject({ routeParams }) {
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
  const [message, setMessage] = useState(null)

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
  const barrages = bootstrap?.barrages?.length ? bootstrap.barrages : [
    { id: 'demo-1', text: '快来为心动的TA打CALL!' },
    { id: 'demo-2', text: '寻找音乐节搭子，一起抽惊喜礼品' },
  ]
  const chances = bootstrap?.chances || { total: 0, used: 0, remaining: 0, max: 2 }
  const latestWonDraw = [...(bootstrap?.draws || [])].reverse().find((draw) => draw.won)
  const theme = pageConfig.theme || {}

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
        setMessage({ title: '组队成功', message: '你和搭子均已获得1次额外抽奖资格。' })
        trackEvent({ activityKey, eventType: 'artist_call_team_up', extra: { activityType: 'artist_call_lottery' } })
      } catch (error) {
        setMessage({ title: '组队失败', message: error.message || '请稍后再试' })
      } finally {
        setActionLoading(false)
      }
      return
    }
    setMessage({
      title: '寻找音乐节搭子',
      message: '点击微信右上角分享给朋友，朋友打开并参与搭子组队后，你们双方都能额外获得1次抽奖资格。',
    })
  }

  const handleDraw = async () => {
    if (!bootstrap?.myCall) {
      setMessage({ title: '先打CALL', message: '请先选择心仪艺人完成打CALL，再参与抽奖。' })
      return
    }
    if (chances.remaining <= 0) {
      setMessage({ title: '暂无抽奖机会', message: '分享给朋友寻找搭子，组队成功后可额外获得1次机会。' })
      return
    }
    setActionLoading(true)
    try {
      const result = await drawPrize(activityKey, { requestId: buildRequestId('artist_call_draw') })
      await refreshAfterAction()
      if (result.draw?.won) {
        setPrizeDraw(result.draw)
      } else {
        setMessage({ title: '未中奖', message: '这次没有中奖。分享活动寻找搭子，组队成功后还能再抽一次。' })
      }
      trackEvent({ activityKey, eventType: 'lottery_draw_click', extra: { activityType: 'artist_call_lottery' } })
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
      <section className="acl-card">
        <header className="acl-header">
          <p className="acl-eyebrow">{theme.eyebrow || '秘境崇左音乐节'}</p>
          <button
            className="acl-gift-btn"
            type="button"
            onClick={() => latestWonDraw ? setPrizeDraw(latestWonDraw) : setMessage({ title: '我的礼品', message: '你还没有中奖礼品。' })}
          >
            {theme.giftBadge || '我的礼品'}
          </button>
        </header>

        <h1 className="acl-title">{theme.title || publicConfig?.title || '秘境惊喜，为心动而来！'}</h1>

        <section className="acl-poster" aria-label="打CALL弹幕区">
          <div className="acl-barrage-layer">
            {[...barrages, ...barrages].slice(0, 10).map((item, index) => (
              <span
                className="acl-barrage"
                key={`${item.id}-${index}`}
                style={{ top: `${18 + (index % 5) * 13}%`, animationDelay: `${index * 1.3}s` }}
              >
                {item.text}
              </span>
            ))}
          </div>
          {pageConfig.posterImage ? (
            <img className="acl-poster-image" src={pageConfig.posterImage} alt="音乐节阵容海报" />
          ) : (
            <div className="acl-poster-placeholder">
              <strong>{theme.heroText || '带肖像两日阵容'}</strong>
              <span>{bootstrap?.myCall?.commentText || 'XXX为XXX打CALL'}</span>
            </div>
          )}
        </section>

        {bootstrap?.pendingInvitation ? (
          <div className="acl-invite-tip">
            {bootstrap.pendingInvitation.inviterName} 邀请你成为音乐节搭子，点击“寻找搭子”完成组队。
          </div>
        ) : null}

        <div className="acl-copy">
          点击下方按钮，<br />
          为你心动的TA打CALL，<br />
          就有机会抽取惊喜礼品哦！
        </div>

        <div className="acl-action-row">
          <button
            className="acl-outline-btn"
            type="button"
            onClick={() => bootstrap?.myCall
              ? setMessage({ title: '已完成打CALL', message: bootstrap.myCall.commentText || '你已获得1次抽奖资格。' })
              : setArtistPickerOpen(true)}
            disabled={actionLoading}
          >
            {bootstrap?.myCall ? '已打CALL' : (theme.callButtonText || '为TA打CALL')}
          </button>
          <button
            className="acl-outline-btn"
            type="button"
            onClick={() => bootstrap?.myTeam
              ? setMessage({ title: '已完成组队', message: '你已获得搭子组队额外抽奖资格。' })
              : handlePartner()}
            disabled={actionLoading}
          >
            {bootstrap?.myTeam ? '已组搭子' : (theme.partnerButtonText || '寻找搭子')}
          </button>
          <button className="acl-round-btn" type="button" onClick={handleDraw} disabled={actionLoading}>
            {actionLoading ? '处理中' : (theme.drawButtonText || '抽奖')}
          </button>
        </div>

        <div className="acl-chance-bar">
          <span>抽奖机会：{chances.remaining}/{chances.max}</span>
          <span>已用：{chances.used}</span>
        </div>

        <section className="acl-rules">
          <h2>活动说明</h2>
          {(pageConfig.rules?.length ? pageConfig.rules : [
            '点击“为TA打CALL”，选择心仪艺人头像，即可获得1次抽奖资格。',
            '分享给朋友寻找搭子，好友参与组队后双方各获得1次额外抽奖资格。',
            '每人最多获得2次抽奖机会，每人最多中奖1次。',
            '中奖后填写姓名和手机号，凭6位中奖码到现场兑换实物礼品。',
          ]).map((rule, index) => (
            <p key={rule}>{index + 1}. {rule}</p>
          ))}
        </section>
      </section>

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
