/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setToken } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getTokenFromUrl, isWechatBrowser, sanitizeUrlForWechat } from '../../shared/utils/url'
import {
  createAuthorization,
  createPayment,
  createPayout,
  getBootstrap,
  getPublicConfig,
  syncAuthorization,
  syncPayment,
  syncPayout,
} from './api'
import './styles.css'

const PAYMENT_TERMINAL = new Set(['paid', 'closed', 'failed'])
const PAYOUT_TERMINAL = new Set(['success', 'failed', 'canceled'])

export default function PaymentTransferTestProject({ routeParams }) {
  const tokenFromUrl = getTokenFromUrl()
  if (tokenFromUrl) {
    setToken(tokenFromUrl)
    window.location.replace(sanitizeUrlForWechat(window.location.href))
    return null
  }

  return <PaymentTransferTestMain routeParams={routeParams} />
}

function PaymentTransferTestMain({ routeParams }) {
  const activityKey = routeParams?.activityKey || 'payment_transfer_test_20260801'
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [payment, setPayment] = useState(null)
  const [payout, setPayout] = useState(null)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [events, setEvents] = useState([])
  const pollRef = useRef(null)

  const { authReady, blockedMessage, hasToken } = useWechatAuth(activityKey, publicConfig)
  useWechatShare(activityKey, publicConfig)

  const authorization = bootstrap?.authorization
  const authorizationEffective = authorization?.state === 'TAKING_EFFECT'
  const providerMode = bootstrap?.providerMode || 'unknown'

  const appendEvent = useCallback((label, detail = '') => {
    setEvents((current) => [
      { id: `${Date.now()}-${Math.random()}`, time: new Date(), label, detail },
      ...current,
    ].slice(0, 8))
  }, [])

  const reloadBootstrap = useCallback(async () => {
    const data = await getBootstrap(activityKey)
    setBootstrap(data)
    return data
  }, [activityKey])

  useEffect(() => {
    getPublicConfig(activityKey)
      .then(setPublicConfig)
      .catch((error) => setNotice(error.message || '活动加载失败'))
  }, [activityKey])

  useEffect(() => {
    if (!authReady || !hasToken) return
    reloadBootstrap().catch((error) => setNotice(error.message || '链路状态加载失败'))
  }, [authReady, hasToken, reloadBootstrap])

  useEffect(() => () => stopPolling(pollRef), [])

  const paymentState = payment?.status || (payment?.orderNo ? 'paying' : '未发起')
  const payoutState = payout?.status || '未发起'
  const readiness = useMemo(() => {
    if (!isWechatBrowser()) return '请在微信内打开'
    if (!authorization) return '需开通一次免确认授权'
    if (authorizationEffective) return '已授权，可后台自动转账'
    if (authorization.state === 'WAIT_USER_CONFIRM') return '等待用户确认授权'
    return `授权状态：${authorization.state}`
  }, [authorization, authorizationEffective])

  async function handlePay() {
    setBusy('payment')
    setNotice('')
    try {
      const data = await createPayment(activityKey, createRequestId('pay'))
      setPayment({ ...data, status: 'paying' })
      appendEvent('支付单已创建', data.orderNo)
      if (data.providerMode !== 'wechat') {
        setNotice('当前是 mock/test 模式，已验证下单链路，不会真实扣款。')
        return
      }
      const result = await invokeWechatPay(data.payParams)
      appendEvent('微信支付面板返回', result)
      startPaymentPolling(data.orderNo)
    } catch (error) {
      setNotice(error.message || '支付发起失败')
      appendEvent('支付失败', error.message)
    } finally {
      setBusy('')
    }
  }

  async function handleAuthorization() {
    setBusy('authorization')
    setNotice('')
    try {
      const data = await createAuthorization(activityKey)
      setBootstrap((current) => ({ ...(current || {}), authorization: data }))
      appendEvent('免确认授权申请已创建', data.outAuthorizationNo)
      if (data.state === 'TAKING_EFFECT') {
        setNotice('免确认授权已生效，现在可以直接测试自动转账。')
        return
      }
      if (!data.packageInfo) {
        throw new Error('微信未返回授权 package_info')
      }
      const bridgeResult = await invokeMerchantTransferAuthorization(data)
      appendEvent('微信授权页返回', bridgeResult)
      await wait(900)
      await handleSyncAuthorization()
    } catch (error) {
      setNotice(error.message || '免确认授权失败')
      appendEvent('授权失败', error.message)
    } finally {
      setBusy('')
    }
  }

  async function handleSyncAuthorization() {
    setBusy('sync-authorization')
    try {
      const data = await syncAuthorization(activityKey)
      setBootstrap((current) => ({ ...(current || {}), authorization: data }))
      appendEvent('授权状态已同步', data.state)
      setNotice(data.effective ? '授权已生效，后续转账无需逐笔确认。' : `当前授权状态：${data.state}`)
      return data
    } catch (error) {
      setNotice(error.message || '授权状态同步失败')
      throw error
    } finally {
      setBusy('')
    }
  }

  async function handlePayout() {
    setBusy('payout')
    setNotice('')
    try {
      const data = await createPayout(activityKey, createRequestId('payout'))
      setPayout(data)
      appendEvent('后台转账已发起', data.payoutNo)
      if (data.status === 'success') {
        setNotice('微信返回转账成功，资金已转入用户零钱。')
      } else {
        startPayoutPolling(data.payoutNo)
      }
    } catch (error) {
      setNotice(error.message || '后台转账失败')
      appendEvent('转账失败', error.message)
    } finally {
      setBusy('')
    }
  }

  function startPaymentPolling(orderNo) {
    stopPolling(pollRef)
    let count = 0
    pollRef.current = window.setInterval(async () => {
      count += 1
      try {
        const data = await syncPayment(activityKey, orderNo)
        setPayment((current) => ({ ...(current || {}), ...data }))
        if (PAYMENT_TERMINAL.has(data.status) || count >= 15) {
          stopPolling(pollRef)
          appendEvent('支付状态已确认', data.status)
        }
      } catch (error) {
        stopPolling(pollRef)
        setNotice(error.message || '支付状态同步失败')
      }
    }, 2000)
  }

  function startPayoutPolling(payoutNo) {
    stopPolling(pollRef)
    let count = 0
    pollRef.current = window.setInterval(async () => {
      count += 1
      try {
        const data = await syncPayout(activityKey, payoutNo)
        setPayout(data)
        if (PAYOUT_TERMINAL.has(data.status) || count >= 15) {
          stopPolling(pollRef)
          appendEvent('转账状态已确认', data.status)
          if (data.status === 'success') setNotice('转账成功，资金已转入用户零钱。')
        }
      } catch (error) {
        stopPolling(pollRef)
        setNotice(error.message || '转账状态同步失败')
      }
    }, 2000)
  }

  if (blockedMessage) {
    return <StateScreen title={blockedMessage} detail="支付和零钱转账只能在微信内置浏览器中验证。" />
  }
  if (!publicConfig || !authReady || !bootstrap) {
    return <StateScreen title="正在校验支付环境" detail="请稍候，正在读取微信身份与商户配置。" loading />
  }

  return (
    <main className="ptt-page">
      <header className="ptt-header">
        <div className="ptt-brand">
          <span className="ptt-brand-mark" aria-hidden="true"><i /></span>
          <span>ZICE8 LAB</span>
        </div>
        <span className={`ptt-mode ptt-mode--${providerMode}`}>{providerMode}</span>
      </header>

      <section className="ptt-intro">
        <p className="ptt-kicker">支付基础设施·真实用户链路</p>
        <h1>{publicConfig.title}</h1>
        <p className="ptt-lead">在同一个微信用户上验证小额支付与免确认转账，每一步都以后台最终状态为准。</p>
        <div className="ptt-readiness">
          <span className={authorizationEffective ? 'is-ready' : ''} />
          {readiness}
        </div>
      </section>

      {notice ? <div className="ptt-notice" role="status">{notice}</div> : null}

      <section className="ptt-action" aria-labelledby="payment-title">
        <div className="ptt-action-index">01</div>
        <div className="ptt-action-copy">
          <p className="ptt-eyebrow">JSAPI PAYMENT</p>
          <h2 id="payment-title">0.01 元支付</h2>
          <p>点击后立即创建支付单并调起微信支付，不触发其他业务。</p>
        </div>
        <div className="ptt-action-meta">
          <StatusValue label="ORDER" value={payment?.orderNo || '—'} />
          <StatusValue label="STATUS" value={paymentState} tone={payment?.status} />
        </div>
        <button className="ptt-primary" disabled={Boolean(busy)} onClick={handlePay}>
          {busy === 'payment' ? '正在发起…' : '发起 0.01 元支付'}
        </button>
      </section>

      <section className="ptt-action ptt-action--transfer" aria-labelledby="transfer-title">
        <div className="ptt-action-index">02</div>
        <div className="ptt-action-copy">
          <p className="ptt-eyebrow">MERCHANT TRANSFER</p>
          <h2 id="transfer-title">0.10 元自动到零钱</h2>
          <p>转账使用现金营销场景。免确认授权生效后，按钮只调后台转账，不再调起逐笔收款确认。每个用户限成功一次。</p>
        </div>
        <div className="ptt-action-meta">
          <StatusValue label="AUTH" value={authorization?.state || '未授权'} tone={authorization?.state} />
          <StatusValue label="PAYOUT" value={payoutState} tone={payout?.status} />
          <StatusValue label="PAYOUT NO" value={payout?.payoutNo || '—'} />
        </div>
        {!authorizationEffective ? (
          <div className="ptt-button-row">
            <button className="ptt-primary" disabled={Boolean(busy)} onClick={handleAuthorization}>
              {busy === 'authorization' ? '正在申请…' : '开通免确认收款'}
            </button>
            {authorization ? (
              <button className="ptt-secondary" disabled={Boolean(busy)} onClick={handleSyncAuthorization}>
                {busy === 'sync-authorization' ? '同步中…' : '同步授权状态'}
              </button>
            ) : null}
          </div>
        ) : (
          <button className="ptt-primary ptt-primary--transfer" disabled={Boolean(busy)} onClick={handlePayout}>
            {busy === 'payout' ? '正在转账…' : '后台自动转账 0.10 元'}
          </button>
        )}
      </section>

      <section className="ptt-log">
        <div className="ptt-log-head">
          <h2>本次测试记录</h2>
          <span>最新在上</span>
        </div>
        {events.length ? events.map((event) => (
          <div className="ptt-log-row" key={event.id}>
            <time>{event.time.toLocaleTimeString('zh-CN', { hour12: false })}</time>
            <strong>{event.label}</strong>
            <span>{event.detail || '—'}</span>
          </div>
        )) : <p className="ptt-empty">发起测试后，链路节点会显示在这里。</p>}
      </section>

      <footer>内部真实资金测试 · 请仅使用指定微信账号</footer>
    </main>
  )
}

function StatusValue({ label, value, tone = '' }) {
  return (
    <div className="ptt-status-value">
      <span>{label}</span>
      <strong className={`ptt-tone-${String(tone || '').toLowerCase()}`}>{value}</strong>
    </div>
  )
}

function StateScreen({ title, detail, loading = false }) {
  return (
    <main className="ptt-state-screen">
      <span className={`ptt-state-orbit ${loading ? 'is-loading' : ''}`}><i /></span>
      <h1>{title}</h1>
      <p>{detail}</p>
    </main>
  )
}

function createRequestId(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function invokeWechatPay(payParams) {
  return invokeBridge('getBrandWCPayRequest', payParams).then((result) => {
    const message = result?.err_msg || result?.errMsg || ''
    if (/cancel$/i.test(message)) throw new Error('已取消支付')
    if (!/ok$/i.test(message)) throw new Error(message || '微信支付调起失败')
    return message
  })
}

function invokeMerchantTransferAuthorization(authorization) {
  return invokeBridge('requestMerchantTransfer', {
    mchId: authorization.mchId,
    appId: authorization.appId,
    package: authorization.packageInfo,
  }).then((result) => {
    const message = result?.err_msg || result?.errMsg || ''
    if (/cancel$/i.test(message)) throw new Error('已取消免确认授权')
    if (!/ok$/i.test(message)) throw new Error(message || '微信授权页调起失败')
    return message
  })
}

function invokeBridge(method, payload) {
  return new Promise((resolve, reject) => {
    if (!isWechatBrowser()) {
      reject(new Error('请在微信内置浏览器中打开'))
      return
    }
    const invoke = () => {
      if (!window.WeixinJSBridge?.invoke) {
        reject(new Error('微信 JSBridge 未就绪'))
        return
      }
      window.WeixinJSBridge.invoke(method, payload, resolve)
    }
    if (window.WeixinJSBridge?.invoke) invoke()
    else document.addEventListener('WeixinJSBridgeReady', invoke, { once: true })
  })
}

function stopPolling(ref) {
  if (!ref.current) return
  window.clearInterval(ref.current)
  ref.current = null
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
