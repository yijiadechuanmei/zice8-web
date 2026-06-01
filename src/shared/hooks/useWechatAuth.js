/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { getToken } from '../api/request'
import { isWechatBrowser } from '../utils/url'

export function useWechatAuth(activityKey, publicConfig) {
  const [authReady, setAuthReady] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState('')

  useEffect(() => {
    if (!activityKey || !publicConfig) return

    const inWechat = isWechatBrowser()
    if (publicConfig.accessMode === 'wechat_required' && !inWechat) {
      setBlockedMessage('请在微信中打开')
      setAuthReady(false)
      return
    }

    setAuthReady(true)
  }, [activityKey, publicConfig])

  return { authReady, blockedMessage, hasToken: Boolean(getToken()) }
}
