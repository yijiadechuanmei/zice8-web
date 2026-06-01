/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { API_BASE_URL, getToken } from '../api/request'
import { getQueryParam, isWechatBrowser, sanitizeUrlForWechat } from '../utils/url'

export function useWechatAuth(activityKey, publicConfig) {
  const [authReady, setAuthReady] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState('')
  const [autoAuthStarted, setAutoAuthStarted] = useState(false)

  useEffect(() => {
    if (!activityKey || !publicConfig) return

    const inWechat = isWechatBrowser()
    if (publicConfig.accessMode === 'wechat_required' && !inWechat) {
      setBlockedMessage('请在微信中打开')
      setAuthReady(false)
      return
    }

    if (getQueryParam('snapshot_user') === '1') {
      setAuthReady(true)
      return
    }

    const shouldAuthorize =
      publicConfig.accessMode === 'wechat_required' ||
      publicConfig.requireUserinfo ||
      publicConfig.oauthScope === 'snsapi_userinfo'

    if (inWechat && shouldAuthorize && !getToken()) {
      setAutoAuthStarted(true)
      const redirectUrl = encodeURIComponent(sanitizeUrlForWechat(window.location.href))
      const oauthUrl = `${API_BASE_URL}/wechat/oauth/redirect?activity_key=${encodeURIComponent(activityKey)}&redirect_url=${redirectUrl}`
      window.location.replace(oauthUrl)
      return
    }

    setAuthReady(true)
  }, [activityKey, publicConfig])

  return { authReady, blockedMessage, hasToken: Boolean(getToken()), autoAuthStarted }
}
