/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL, getToken, removeToken } from '../api/request'
import { buildTokenDebug, debugLog, setQuizAuthDebugState } from '../debug/quizAuthDebug'
import { getQueryParam, isWechatBrowser, sanitizeUrlForWechat } from '../utils/url'

const REAUTH_LIMIT = 2

function getReauthAttemptKey(activityKey) {
  return `quiz_reauth_attempt_${activityKey}`
}

function readReauthAttempts(activityKey) {
  const value = Number(sessionStorage.getItem(getReauthAttemptKey(activityKey)) || 0)
  return Number.isFinite(value) ? value : 0
}

function writeReauthAttempts(activityKey, value) {
  sessionStorage.setItem(getReauthAttemptKey(activityKey), String(value))
}

function clearReauthAttempts(activityKey) {
  sessionStorage.removeItem(getReauthAttemptKey(activityKey))
}

function getAccessMode(publicConfig) {
  return publicConfig?.accessMode || publicConfig?.access_mode || ''
}

function getOauthScope(publicConfig) {
  return publicConfig?.oauthScope || publicConfig?.oauth_scope || ''
}

function getRequireUserinfo(publicConfig) {
  return Boolean(publicConfig?.requireUserinfo || publicConfig?.require_userinfo)
}

export function useWechatAuth(activityKey, publicConfig, options = {}) {
  const [authReady, setAuthReady] = useState(false)
  const [blockedMessage, setBlockedMessage] = useState('')
  const [autoAuthStarted, setAutoAuthStarted] = useState(false)
  const [authStatus, setAuthStatus] = useState('checking')
  const requiresWechatBrowser = getAccessMode(publicConfig) === 'wechat_required'
  const configuredOauthScope = getOauthScope(publicConfig)
  const configuredRequireUserinfo = getRequireUserinfo(publicConfig)
  const blockSnapshotUser = Boolean(options.blockSnapshotUser)

  const reauth = useCallback((reason = 'reauth') => {
    if (!activityKey) return false

    const inWechat = isWechatBrowser()
    if (!inWechat) {
      if (requiresWechatBrowser) {
        setBlockedMessage('请在微信中打开')
        setAuthReady(false)
        setAuthStatus('error')
      }
      return false
    }

    const attempts = readReauthAttempts(activityKey)
    if (attempts >= REAUTH_LIMIT) {
      removeToken()
      setAuthReady(false)
      setAuthStatus('error')
      setBlockedMessage('授权失败，请重新打开活动')
      setQuizAuthDebugState({
        lastAuthStep: 'reauth-limit',
        reauthAttempts: attempts,
      })
      return false
    }

    const nextAttempts = attempts + 1
    writeReauthAttempts(activityKey, nextAttempts)
    removeToken()
    setAutoAuthStarted(true)
    setAuthReady(false)
    setAuthStatus('redirecting')

    const redirectUrlObject = new URL(sanitizeUrlForWechat(window.location.href))
    if (options.authCallbackParam) {
      redirectUrlObject.searchParams.set(options.authCallbackParam, '1')
    }
    const redirectUrl = redirectUrlObject.toString()
    const oauthParams = new URLSearchParams({
      activity_key: activityKey,
      redirect_url: redirectUrl,
    })
    if (configuredRequireUserinfo || configuredOauthScope === 'snsapi_userinfo') {
      oauthParams.set('scope', 'snsapi_userinfo')
    }
    const oauthUrl = `${API_BASE_URL}/wechat/oauth/redirect?${oauthParams.toString()}`
    debugLog('[QuizAuthDebug] oauth redirect', {
      reason,
      redirectUrl,
    })
    setQuizAuthDebugState({
      lastAuthStep: 'oauth-redirect',
      lastOauthRedirectUrl: redirectUrl,
      reauthAttempts: nextAttempts,
    })
    window.location.replace(oauthUrl)
    return true
  }, [activityKey, configuredOauthScope, configuredRequireUserinfo, options.authCallbackParam, requiresWechatBrowser])

  useEffect(() => {
    if (!activityKey || !publicConfig) return

    const inWechat = isWechatBrowser()
    const accessMode = getAccessMode(publicConfig)
    const oauthScope = configuredOauthScope
    const requireUserinfo = configuredRequireUserinfo
    debugLog('[QuizAuthDebug] config', {
      accessMode,
      oauthScope,
      requireUserinfo,
    })
    debugLog('[QuizAuthDebug] zice8 token', buildTokenDebug())
    setQuizAuthDebugState({
      accessMode,
      oauthScope,
      requireUserinfo,
      ...buildTokenDebug(),
      lastAuthStep: inWechat ? 'wechat-check' : 'browser-check',
    })

    if (accessMode === 'wechat_required' && !inWechat) {
      setBlockedMessage('请在微信中打开')
      setAuthReady(false)
      setAuthStatus('error')
      setQuizAuthDebugState({
        lastAuthStep: 'blocked-non-wechat',
      })
      return
    }

    setBlockedMessage('')

    if (getQueryParam('snapshot_user') === '1') {
      if (blockSnapshotUser) {
        removeToken()
        setBlockedMessage('请点击微信右下角“使用完整服务”后重新进入活动')
        setAuthReady(false)
        setAuthStatus('error')
      } else {
        setAuthReady(true)
        setAuthStatus('ready')
      }
      setQuizAuthDebugState({
        lastAuthStep: 'snapshot-user',
      })
      return
    }

    const shouldAuthorize =
      accessMode === 'wechat_required' ||
      requireUserinfo ||
      oauthScope === 'snsapi_userinfo'

    debugLog('[QuizAuthDebug] auth decision', {
      needWechatAuth: inWechat && shouldAuthorize,
      hasToken: Boolean(getToken()),
      action: inWechat && shouldAuthorize && !getToken() ? 'oauth' : 'ready',
    })
    setQuizAuthDebugState({
      needWechatAuth: inWechat && shouldAuthorize,
      authHasToken: Boolean(getToken()),
    })

    if (inWechat && shouldAuthorize && !getToken()) {
      reauth('missing-token')
      return
    }

    if (getToken()) {
      clearReauthAttempts(activityKey)
    }

    setQuizAuthDebugState({
      lastAuthStep: 'auth-ready',
    })
    setAuthReady(true)
    setAuthStatus('ready')
  }, [activityKey, blockSnapshotUser, configuredOauthScope, configuredRequireUserinfo, publicConfig, reauth])

  return { authReady, blockedMessage, hasToken: Boolean(getToken()), autoAuthStarted, authStatus, reauth, clearToken: removeToken }
}
