/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { getToken } from '../api/request'
import { isWechatBrowser, sanitizeUrlForWechat } from '../utils/url'

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

    if (inWechat && !getToken()) {
      const redirectUrl = encodeURIComponent(sanitizeUrlForWechat(window.location.href))
      const oauthUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}/wechat/oauth/redirect?activity_key=${encodeURIComponent(activityKey)}&redirect_url=${redirectUrl}`
      window.location.replace(oauthUrl)
      return
    }

    setAuthReady(Boolean(getToken()))
  }, [activityKey, publicConfig])

  return { authReady, blockedMessage, hasToken: Boolean(getToken()) }
}
