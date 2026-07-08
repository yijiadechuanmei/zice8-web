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
import './styles.css'

const DEFAULT_ACTIVITY_KEY = 'song_wish_lottery_2026'

function normalizeActivityKey(routeParams) {
  return routeParams?.activityKey || getQueryParam('activity_key') || DEFAULT_ACTIVITY_KEY
}

function buildRequestId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
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
    posterImages: config.posterImages || mobileConfig.posterImages || [],
  }
}

function Modal({ children, onClose, labelledBy }) {
  return (
    <div className="swl-modal-mask" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="swl-modal">
        <button className="swl-modal-close" type="button" onClick={onClose} aria-label="关闭弹窗">
          ×
        </button>
        {children}
      </div>
    </div>
  )
}

function PrizeModal({ draw, onClose, onClaim }) {
  const claimed = draw?.claim
  return (
    <Modal onClose={onClose} labelledBy="swl-prize-title">
      <p className="swl-modal-kicker">恭喜中奖</p>
      <h2 id="swl-prize-title" className="swl-modal-title">{draw?.prizeName || '音乐节盲盒礼品'}</h2>
      <div className="swl-prize-image-wrap">
        {draw?.prizeImage ? (
          <img className="swl-prize-image" src={draw.prizeImage} alt={draw.prizeName} />
        ) : (
          <div className="swl-prize-placeholder">PRIZE</div>
        )}
      </div>
      <p className="swl-prize-meta">中奖时间：{formatDateTime(draw?.createdAt)}</p>
      {claimed ? (
        <div className="swl-code-box">
          <span>中奖码</span>
          <strong>{claimed.redemptionCode}</strong>
          <small>请凭此码到现场兑换实物礼品</small>
        </div>
      ) : (
        <button className="swl-primary-btn swl-full-btn" type="button" onClick={onClaim}>
          领取礼品
        </button>
      )}
    </Modal>
  )
}

function ClaimModal({ onClose, onSubmit, submitting }) {
  const [form, setForm] = useState({ recipientName: '', recipientPhone: '' })

  return (
    <Modal onClose={onClose} labelledBy="swl-claim-title">
      <h2 id="swl-claim-title" className="swl-modal-title">填写领奖信息</h2>
      <label className="swl-field">
        <span>姓名</span>
        <input
          value={form.recipientName}
          onChange={(event) => setForm((prev) => ({ ...prev, recipientName: event.target.value }))}
          placeholder="请输入姓名"
        />
      </label>
      <label className="swl-field">
        <span>手机号</span>
        <input
          value={form.recipientPhone}
          onChange={(event) => setForm((prev) => ({ ...prev, recipientPhone: event.target.value }))}
          placeholder="请输入手机号"
          inputMode="tel"
        />
      </label>
      <button
        className="swl-primary-btn swl-full-btn"
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
    <Modal onClose={onClose} labelledBy="swl-message-title">
      <h2 id="swl-message-title" className="swl-modal-title">{title}</h2>
      <p className="swl-message-text">{message}</p>
      <button className="swl-primary-btn swl-full-btn" type="button" onClick={onClose}>
        我知道了
      </button>
    </Modal>
  )
}

export default function SongWishLotteryProject({ routeParams }) {
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
      const data = await getBootstrap(activityKey)
      setBootstrap(data)
    } catch (error) {
      setMessage({ title: '加载失败', message: error.message || '请稍后再试' })
      if (Number(error?.status) === 401) reauth('song-wish-bootstrap-401')
    } finally {
      setLoading(false)
    }
  }, [activityKey, authReady, reauth])

  useEffect(() => {
    loadBootstrap()
  }, [loadBootstrap])

  useEffect(() => {
    trackPageView(activityKey, '/song-wish-lottery', { activityType: 'song_wish_lottery' })
  }, [activityKey])

  useEffect(() => {
    if (!activityKey) return undefined
    const timer = window.setInterval(() => {
      getMessages(activityKey, 20)
        .then((data) => {
          setBootstrap((prev) => (prev ? { ...prev, messages: data.messages || [] } : prev))
        })
        .catch(() => {})
    }, 12000)
    return () => window.clearInterval(timer)
  }, [activityKey])

  const pageConfig = useMemo(() => mergeConfig(publicConfig, bootstrap), [publicConfig, bootstrap])
  useWechatShare(activityKey, publicConfig)

  const theme = pageConfig.theme || {}
  const messages = bootstrap?.messages?.length ? bootstrap.messages : [
    { id: 'demo-1', text: '留言许愿你最想听到的歌' },
    { id: 'demo-2', text: '每许愿1首歌，获得1次抽奖资格' },
  ]
  const chances = bootstrap?.chances || { total: 0, used: 0, remaining: 0, max: 3, wishes: 0 }
  const posterImages = pageConfig.posterImages || []
  const latestWonDraw = [...(bootstrap?.draws || [])].reverse().find((draw) => draw.won)

  const refreshAfterAction = useCallback(async () => {
    const data = await getBootstrap(activityKey)
    setBootstrap(data)
    return data
  }, [activityKey])

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
      setMessage({ title: '先许愿歌曲', message: '留言你最想听到的歌，即可获得抽奖资格。' })
      return
    }
    if (chances.remaining <= 0) {
      setMessage({ title: '暂无抽奖机会', message: '每人最多许愿3首歌并获得3次抽奖资格，每人最多中奖1次。' })
      return
    }
    setActionLoading(true)
    try {
      const result = await drawPrize(activityKey, { requestId: buildRequestId('song_wish_draw') })
      await refreshAfterAction()
      if (result.draw?.won) {
        setPrizeDraw(result.draw)
      } else {
        setMessage({ title: '未中奖', message: '这次没有中奖。继续许愿歌曲，还可累计抽奖资格。' })
      }
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
      <div className="swl-page swl-centered">
        <div className="swl-blocked">{blockedMessage}</div>
      </div>
    )
  }

  if (loading && !bootstrap) {
    return (
      <div className="swl-page swl-centered">
        <div className="swl-loading">活动加载中...</div>
      </div>
    )
  }

  return (
    <main className="swl-page">
      <section className="swl-card">
        <header className="swl-header">
          <div />
          <button
            className="swl-gift-btn"
            type="button"
            onClick={() => latestWonDraw ? setPrizeDraw(latestWonDraw) : setMessage({ title: '我的礼品', message: '你还没有中奖礼品。' })}
          >
            {theme.giftBadge || '我的礼品'}
          </button>
        </header>

        <h1 className="swl-title">
          <span>{theme.festivalName || '秘境崇左音乐节'}</span>
          <strong>{theme.title || publicConfig?.title || '你最爱的歌曲正在加载中'}</strong>
        </h1>

        <section className="swl-poster" aria-label="艺人海报轮播窗口">
          {posterImages.length ? (
            <div className="swl-poster-track">
              {[...posterImages, ...posterImages].map((src, index) => (
                <img key={`${src}-${index}`} className="swl-poster-image" src={src} alt="艺人海报" />
              ))}
            </div>
          ) : (
            <div className="swl-poster-placeholder">{theme.posterText || '艺人海报轮播窗口'}</div>
          )}
        </section>

        <section className="swl-message-window" aria-label="留言滚动区">
          <div className="swl-message-track">
            {[...messages, ...messages].slice(0, 12).map((item, index) => (
              <span
                className="swl-message-pill"
                key={`${item.id}-${index}`}
                style={{ animationDelay: `${index * 1.2}s` }}
              >
                {item.text}
              </span>
            ))}
          </div>
        </section>

        <div className="swl-copy">
          留言许愿你最想听到的歌，立即参与盲盒抽奖！
        </div>

        <div className="swl-action-row">
          <label className="swl-wish-input">
            <span className="swl-sr-only">歌曲许愿</span>
            <input
              value={songName}
              onChange={(event) => setSongName(event.target.value)}
              placeholder={theme.wishPlaceholder || '歌曲许愿'}
              maxLength={120}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleWishSubmit()
              }}
            />
            <button type="button" onClick={handleWishSubmit} disabled={actionLoading}>
              {theme.sendButtonText || '发送'}
            </button>
          </label>
          <button className="swl-round-btn" type="button" onClick={handleDraw} disabled={actionLoading}>
            {actionLoading ? '处理中' : (theme.drawButtonText || '抽奖')}
          </button>
        </div>

        <div className="swl-chance-bar">
          <span>抽奖机会：{chances.remaining}/{chances.max}</span>
          <span>已许愿：{Math.min(chances.wishes || 0, chances.max)}</span>
          <span>已抽：{chances.used}</span>
        </div>

        <section className="swl-rules">
          <h2>活动说明</h2>
          {(pageConfig.rules?.length ? pageConfig.rules : [
            '进入活动授权登录后，留言你最想在现场听到的歌曲，即可获得1次抽奖资格。',
            '每许愿1首歌获得1次抽奖资格，每人最多累计3次抽奖资格。',
            '每人最多中奖1次，中奖信息可在右上角“我的礼品”中查看。',
            '中奖后填写姓名和手机号，凭6位中奖码到现场兑换实物礼品。',
          ]).map((rule, index) => (
            <p key={rule}>{index + 1}. {rule}</p>
          ))}
        </section>
      </section>

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
