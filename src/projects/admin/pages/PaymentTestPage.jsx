import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Input,
  InputNumber,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  CloseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import {
  closePaymentDemoOrder,
  createPaymentDemoJsapiOrder,
  getPaymentDemoOrder,
  syncPaymentDemoOrder,
} from '../api'

const { Paragraph, Text, Title } = Typography
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 60000

export default function PaymentTestPage() {
  const [openid, setOpenid] = useState('')
  const [amountTotal, setAmountTotal] = useState(1)
  const [description, setDescription] = useState('Zice8 支付测试')
  const [creating, setCreating] = useState(false)
  const [querying, setQuerying] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [closing, setClosing] = useState(false)
  const [invoking, setInvoking] = useState(false)
  const [polling, setPolling] = useState(false)
  const [order, setOrder] = useState(null)
  const [paymentPayload, setPaymentPayload] = useState(null)
  const pollTimerRef = useRef(null)
  const pollStartedAtRef = useRef(0)

  const canInvokePay = useMemo(() => {
    if (!paymentPayload?.orderNo || !paymentPayload?.payParams) return false
    return !['paid', 'closed', 'failed'].includes(order?.status || '')
  }, [order?.status, paymentPayload])

  const canClose = ['pending', 'paying'].includes(order?.status || '')
  const isWechat = /MicroMessenger/i.test(window.navigator.userAgent || '')

  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  async function handleCreateOrder() {
    if (!openid.trim()) {
      message.warning('请输入 openid')
      return
    }
    setCreating(true)
    try {
      const data = await createPaymentDemoJsapiOrder({
        openid: openid.trim(),
        amountTotal,
        description: description.trim(),
      })
      setPaymentPayload(data)
      const currentOrder = {
        orderNo: data.orderNo,
        status: 'paying',
        amountTotal,
        provider: 'wechat_pay',
        prepayId: data.prepayId,
        transactionId: null,
        paidAt: null,
        notifyReceivedAt: null,
        updatedAt: new Date().toISOString(),
      }
      setOrder(currentOrder)
      stopPolling()
      message.success('测试支付单已创建')
    } catch (err) {
      message.error(resolveDemoErrorMessage(err, '创建支付单失败'))
    } finally {
      setCreating(false)
    }
  }

  async function handleFetchOrder() {
    if (!paymentPayload?.orderNo) {
      message.warning('请先创建支付单')
      return
    }
    setQuerying(true)
    try {
      const data = await getPaymentDemoOrder(paymentPayload.orderNo)
      setOrder(data)
      return data
    } catch (err) {
      message.error(resolveDemoErrorMessage(err, '订单状态查询失败'))
      throw err
    } finally {
      setQuerying(false)
    }
  }

  async function handleSyncOrder() {
    if (!paymentPayload?.orderNo) {
      message.warning('请先创建支付单')
      return
    }
    setSyncing(true)
    try {
      const data = await syncPaymentDemoOrder(paymentPayload.orderNo)
      setOrder((current) =>
        current
          ? {
              ...current,
              status: data.status,
              transactionId: data.transactionId || current.transactionId,
              paidAt: data.paidAt || current.paidAt,
              updatedAt: new Date().toISOString(),
            }
          : current,
      )
      if (isTerminalStatus(data.status)) stopPolling()
      message.success(`订单已同步，当前状态：${data.status}`)
      return data
    } catch (err) {
      message.error(resolveDemoErrorMessage(err, '订单同步失败'))
      throw err
    } finally {
      setSyncing(false)
    }
  }

  async function handleCloseOrder() {
    if (!paymentPayload?.orderNo) {
      message.warning('请先创建支付单')
      return
    }
    setClosing(true)
    try {
      const data = await closePaymentDemoOrder(paymentPayload.orderNo)
      setOrder((current) =>
        current
          ? {
              ...current,
              status: data.status,
              updatedAt: new Date().toISOString(),
            }
          : current,
      )
      stopPolling()
      message.success(data.reason === 'already_closed' ? '订单已关闭' : '未支付订单已关闭')
    } catch (err) {
      message.error(resolveDemoErrorMessage(err, '关闭订单失败'))
    } finally {
      setClosing(false)
    }
  }

  async function handleInvokePay() {
    if (!paymentPayload?.payParams) {
      message.warning('请先创建支付单')
      return
    }
    if (paymentPayload.providerMode !== 'wechat') {
      message.info('当前是 mock mode，无法真实调起微信 JSAPI 支付，可继续查询 / sync / close 验证链路')
      return
    }
    if (!isWechat) {
      message.warning('当前不是微信内置浏览器，无法真实调起 JSAPI 支付')
      return
    }
    setInvoking(true)
    try {
      const result = await callWechatJsapiPay(paymentPayload.payParams)
      if (result.ok) {
        message.success('微信客户端返回支付成功，等待后端确认')
        startPolling()
      } else if (result.message) {
        message.info(result.message)
      }
    } catch (err) {
      message.error(err.message || '微信支付调起失败')
    } finally {
      setInvoking(false)
    }
  }

  function startPolling() {
    if (!paymentPayload?.orderNo) {
      message.warning('请先创建支付单')
      return
    }
    stopPolling()
    pollStartedAtRef.current = Date.now()
    setPolling(true)
    pollTimerRef.current = window.setInterval(async () => {
      if (Date.now() - pollStartedAtRef.current >= POLL_TIMEOUT_MS) {
        stopPolling()
        message.info('轮询已停止：超过 60 秒')
        return
      }
      try {
        const data = await getPaymentDemoOrder(paymentPayload.orderNo)
        setOrder(data)
        if (isTerminalStatus(data.status)) {
          stopPolling()
        }
      } catch {
        stopPolling()
      }
    }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setPolling(false)
  }

  return (
    <div className="admin-stack">
      <Alert
        type="info"
        showIcon
        message="支付链路测试"
        description={(
          <div>
            <div>这是内部支付链路验证工具，仅用于测试 payment_demo 订单。</div>
            <div>不会开通套餐、不会解锁活动、不会触发商家转账，最终支付成功以后端订单状态 paid 为准。</div>
            <div>需要后端显式开启 PAYMENT_DEMO_ENABLED=true。</div>
          </div>
        )}
      />

      <Card className="admin-card">
        <div className="admin-page-head">
          <div>
            <Title level={4}>工具箱 / 支付链路测试</Title>
            <Text type="secondary">仅用于验证 JSAPI 下单、查询、同步和关单链路，不属于正式支付管理模块。</Text>
          </div>
          <Tag color={paymentPayload?.providerMode === 'wechat' ? 'blue' : 'default'}>
            providerMode: {paymentPayload?.providerMode || '未创建'}
          </Tag>
        </div>

        <div className="admin-payment-test-grid">
          <Card size="small" title="创建支付单" className="admin-card">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <label className="admin-field-block">
                <Text strong>openid</Text>
                <Input
                  value={openid}
                  onChange={(event) => setOpenid(event.target.value)}
                  placeholder="请输入测试 openid"
                />
              </label>
              <label className="admin-field-block">
                <Text strong>amountTotal（分）</Text>
                <InputNumber
                  min={1}
                  max={100}
                  value={amountTotal}
                  onChange={(value) => setAmountTotal(Number(value || 1))}
                  style={{ width: '100%' }}
                />
              </label>
              <label className="admin-field-block">
                <Text strong>description</Text>
                <Input
                  maxLength={64}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <Button type="primary" icon={<WalletOutlined />} loading={creating} onClick={handleCreateOrder}>
                创建支付单
              </Button>
            </Space>
          </Card>

          <Card size="small" title="支付参数" className="admin-card">
            {paymentPayload ? (
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="orderNo">{paymentPayload.orderNo}</Descriptions.Item>
                <Descriptions.Item label="providerMode">{paymentPayload.providerMode}</Descriptions.Item>
                <Descriptions.Item label="prepayId">{paymentPayload.prepayId}</Descriptions.Item>
                <Descriptions.Item label="appId">{paymentPayload.payParams?.appId || '-'}</Descriptions.Item>
                <Descriptions.Item label="timeStamp">{paymentPayload.payParams?.timeStamp || '-'}</Descriptions.Item>
                <Descriptions.Item label="nonceStr">{paymentPayload.payParams?.nonceStr || '-'}</Descriptions.Item>
                <Descriptions.Item label="package">{paymentPayload.payParams?.package || '-'}</Descriptions.Item>
                <Descriptions.Item label="signType">{paymentPayload.payParams?.signType || '-'}</Descriptions.Item>
                <Descriptions.Item label="paySign">
                  <Collapse
                    size="small"
                    items={[
                      {
                        key: 'pay-sign',
                        label: `点击展开查看（默认脱敏：${maskMiddle(paymentPayload.payParams?.paySign || '-')})`,
                        children: (
                          <Paragraph copyable={{ text: paymentPayload.payParams?.paySign || '' }} style={{ marginBottom: 0 }}>
                            <Text code>{paymentPayload.payParams?.paySign || '-'}</Text>
                          </Paragraph>
                        ),
                      },
                    ]}
                  />
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">创建支付单后，这里会显示 prepayId 和 payParams。</Text>
            )}
          </Card>
        </div>
      </Card>

      <Card className="admin-card" title="订单状态">
        <Descriptions column={2} bordered size="small" className="admin-payment-order-status">
          <Descriptions.Item label="status">
            <Tag color={statusColor(order?.status)}>{order?.status || 'unknown'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="provider">{order?.provider || '-'}</Descriptions.Item>
          <Descriptions.Item label="amountTotal">{order?.amountTotal ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="prepayId">{order?.prepayId || paymentPayload?.prepayId || '-'}</Descriptions.Item>
          <Descriptions.Item label="transactionId">{order?.transactionId || '-'}</Descriptions.Item>
          <Descriptions.Item label="paidAt">{formatDateTime(order?.paidAt)}</Descriptions.Item>
          <Descriptions.Item label="notifyReceivedAt">{formatDateTime(order?.notifyReceivedAt)}</Descriptions.Item>
          <Descriptions.Item label="updatedAt">{formatDateTime(order?.updatedAt)}</Descriptions.Item>
        </Descriptions>

        <div className="admin-payment-actions">
          <Space wrap>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleInvokePay}
              loading={invoking}
              disabled={!canInvokePay}
            >
              调起微信支付
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleFetchOrder} loading={querying} disabled={!paymentPayload?.orderNo}>
              查询状态
            </Button>
            <Button icon={<SyncOutlined />} onClick={handleSyncOrder} loading={syncing} disabled={!paymentPayload?.orderNo}>
              主动同步
            </Button>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={handleCloseOrder}
              loading={closing}
              disabled={!paymentPayload?.orderNo || !canClose}
            >
              关闭未支付订单
            </Button>
            <Button onClick={polling ? stopPolling : startPolling} disabled={!paymentPayload?.orderNo}>
              {polling ? '停止轮询' : '开始轮询'}
            </Button>
          </Space>
        </div>

        <Paragraph className="admin-muted" style={{ marginTop: 12 }}>
          {isWechat
            ? '当前检测到微信环境，可以在 wechat mode 下尝试真实 JSAPI 支付。'
            : '当前不是微信内置浏览器。mock mode 可继续验证 API 与订单状态流，但无法真实调起 JSAPI 支付。'}
        </Paragraph>
      </Card>
    </div>
  )
}

function statusColor(status) {
  if (status === 'paying') return 'processing'
  if (status === 'paid') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'closed') return 'default'
  if (status === 'pending') return 'default'
  return 'warning'
}

function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

function isTerminalStatus(status) {
  return ['paid', 'closed', 'failed'].includes(status || '')
}

function maskMiddle(value) {
  if (!value || value.length <= 12) return value
  return `${value.slice(0, 6)}...${value.slice(-6)}`
}

function resolveDemoErrorMessage(error, fallback) {
  const messageText = error?.message || fallback
  if (messageText.includes('Payment demo is disabled')) {
    return '后端未开启支付测试开关 PAYMENT_DEMO_ENABLED=true'
  }
  return messageText
}

function callWechatJsapiPay(payParams) {
  return new Promise((resolve) => {
    if (!/MicroMessenger/i.test(window.navigator.userAgent || '')) {
      resolve({ ok: false, raw: null, message: '当前不是微信内置浏览器，无法真实调起 JSAPI 支付' })
      return
    }

    const invoke = () => {
      const bridge = window.WeixinJSBridge
      if (!bridge?.invoke) {
        resolve({ ok: false, raw: null, message: '未检测到 WeixinJSBridge，请在微信中打开或等待桥接完成' })
        return
      }

      bridge.invoke(
        'getBrandWCPayRequest',
        {
          appId: payParams.appId,
          timeStamp: payParams.timeStamp,
          nonceStr: payParams.nonceStr,
          package: payParams.package,
          signType: payParams.signType,
          paySign: payParams.paySign,
        },
        (response) => {
          const errMsg = response?.err_msg || ''
          if (errMsg.includes(':ok')) {
            resolve({ ok: true, raw: response, message: '微信客户端返回支付成功，等待后端确认' })
            return
          }
          if (errMsg.includes(':cancel')) {
            resolve({ ok: false, raw: response, message: '用户取消支付' })
            return
          }
          if (errMsg.includes(':fail')) {
            resolve({ ok: false, raw: response, message: '微信支付调起失败' })
            return
          }
          resolve({ ok: false, raw: response, message: errMsg || '微信支付返回未知状态' })
        },
      )
    }

    if (window.WeixinJSBridge?.invoke) {
      invoke()
      return
    }

    let handled = false
    const onReady = () => {
      if (handled) return
      handled = true
      document.removeEventListener('WeixinJSBridgeReady', onReady)
      invoke()
    }
    document.addEventListener('WeixinJSBridgeReady', onReady, { once: true })
    window.setTimeout(() => {
      if (handled) return
      handled = true
      document.removeEventListener('WeixinJSBridgeReady', onReady)
      resolve({ ok: false, raw: null, message: '未检测到 WeixinJSBridgeReady，请在微信中打开当前页面' })
    }, 3000)
  })
}
