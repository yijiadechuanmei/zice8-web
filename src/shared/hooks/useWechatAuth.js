/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { API_BASE_URL, getToken } from '../api/request'
import { buildTokenDebug, debugLog, setQuizAuthDebugState } from '../debug/quizAuthDebug'
import { getQueryParam, isWechatBrowser, sanitizeUrlForWechat } from '../utils/url'

export function useWechatAuth(activityKey, publicConfig) {
  const [authReady, setAuthReady] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState('')
  const [autoAuthStarted, setAutoAuthStarted] = useState(false)

  useEffect(() => {
    if (!activityKey || !publicConfig) return

    const inWechat = isWechatBrowser()
    debugLog('[QuizAuthDebug] config', {
      accessMode: publicConfig.accessMode || publicConfig.access_mode || '',
      oauthScope: publicConfig.oauthScope || publicConfig.oauth_scope || '',
      requireUserinfo: Boolean(publicConfig.requireUserinfo || publicConfig.require_userinfo),
    })
    debugLog('[QuizAuthDebug] token', buildTokenDebug())
    setQuizAuthDebugState({
      accessMode: publicConfig.accessMode || publicConfig.access_mode || '',
      oauthScope: publicConfig.oauthScope || publicConfig.oauth_scope || '',
      requireUserinfo: Boolean(publicConfig.requireUserinfo || publicConfig.require_userinfo),
      ...buildTokenDebug(),
      lastAuthStep: inWechat ? 'wechat-check' : 'browser-check',
    })

    if (publicConfig.accessMode === 'wechat_required' && !inWechat) {
      setBlockedMessage('请在微信中打开')
      setAuthReady(false)
      setQuizAuthDebugState({
        lastAuthStep: 'blocked-non-wechat',
      })
      return
    }

    if (getQueryParam('snapshot_user') === '1') {
      setAuthReady(true)
      setQuizAuthDebugState({
        lastAuthStep: 'snapshot-user',
      })
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
      debugLog('[QuizAuthDebug] oauth redirect', {
        reason: 'missing-token',
        redirectUrl: sanitizeUrlForWechat(window.location.href),
      })
      setQuizAuthDebugState({
        lastAuthStep: 'oauth-redirect',
        lastOauthRedirectUrl: sanitizeUrlForWechat(window.location.href),
      })
      window.location.replace(oauthUrl)
      return
    }

    setQuizAuthDebugState({
      lastAuthStep: 'auth-ready',
    })
    setAuthReady(true)
  }, [activityKey, publicConfig])

  return { authReady, blockedMessage, hasToken: Boolean(getToken()), autoAuthStarted }
}
