import { useEffect, useRef, useState } from 'react'
import { getVoucher } from './api'

export default function Voucher({ activityKey, drawId, claimCode }) {
  const [voucher, setVoucher] = useState(null)
  const [serverNow, setServerNow] = useState(0)
  const [error, setError] = useState('')
  const clock = useRef({ server: 0, local: 0 })

  useEffect(() => {
    if (!drawId) return undefined
    let mounted = true
    async function sync() {
      try {
        const result = await getVoucher(activityKey, drawId)
        if (!mounted) return
        clock.current = { server: new Date(result.serverTime).getTime(), local: performance.now() }
        setServerNow(clock.current.server)
        setVoucher(result)
        setError('')
      } catch (failure) {
        if (mounted) setError(failure.message || '中奖凭证刷新失败')
      }
    }
    sync()
    const clockInterval = window.setInterval(() => {
      if (mounted && clock.current.server)
        setServerNow(clock.current.server + performance.now() - clock.current.local)
    }, 1000)
    const refreshInterval = window.setInterval(sync, 20_000)
    return () => { mounted = false; window.clearInterval(clockInterval); window.clearInterval(refreshInterval) }
  }, [activityKey, drawId])

  return <div className="pfh-voucher">
    <span className="pfh-voucher-caption">专属中奖编码</span>
    <strong className="pfh-voucher-code">{voucher?.claimCode || claimCode || '加载中…'}</strong>
    <p className="pfh-voucher-status">{voucher?.redeemedAt ? '已兑奖 · 不可重复领取' : voucher?.registered ? '兑奖时请报登记姓名和手机号' : '填写姓名和手机号后可兑奖'}</p>
    <time className="pfh-voucher-time">当前北京时间（供参考） {serverNow ? new Date(serverNow).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '同步中…'}</time>
    {error && <small className="pfh-voucher-error">{error}</small>}
  </div>
}
