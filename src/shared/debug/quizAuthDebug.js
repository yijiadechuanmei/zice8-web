import { getToken } from '../api/request'
import { getQueryParam, sanitizeUrlForWechat } from '../utils/url'

const QUIZ_AUTH_DEBUG_STATE_KEY = '__zice8QuizAuthDebugState'

export function isQuizAuthDebugEnabled() {
  if (typeof window === 'undefined') return false
  return getQueryParam('debug_auth') === '1' || getQueryParam('debug') === '1'
}

export function maskToken(token) {
  if (!token) return ''
  return `${String(token).slice(0, 6)}...`
}

export function getQuizAuthDebugState() {
  if (typeof window === 'undefined') return {}
  return window[QUIZ_AUTH_DEBUG_STATE_KEY] || {}
}

export function setQuizAuthDebugState(partial) {
  if (typeof window === 'undefined') return
  const nextState = {
    ...getQuizAuthDebugState(),
    ...partial,
  }
  window[QUIZ_AUTH_DEBUG_STATE_KEY] = nextState
}

export function debugLog(message, payload) {
  if (!isQuizAuthDebugEnabled()) return
  if (payload === undefined) {
    console.log(message)
    return
  }
  console.log(message, payload)
}

export function debugWarn(message, payload) {
  if (!isQuizAuthDebugEnabled()) return
  if (payload === undefined) {
    console.warn(message)
    return
  }
  console.warn(message, payload)
}

export function buildTokenDebug(storageKey = 'zice8_token') {
  const token = getToken()
  return {
    hasToken: Boolean(token),
    tokenPreview: maskToken(token),
    storageKey,
  }
}

export function buildBootDebug(activityKey) {
  return {
    activityKey,
    isWechat: /MicroMessenger/i.test(window.navigator.userAgent),
    href: sanitizeUrlForWechat(window.location.href),
  }
}
