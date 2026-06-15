import { API_BASE_URL, getToken } from './api/request'

const VISITOR_ID_KEY = 'zice8_visitor_id'
const PAGE_VIEW_DEDUPE_MS = 30 * 1000
const APPOINTMENT_EXTRA_KEYS = new Set([
  'activityKey',
  'activityType',
  'pageKey',
  'eventName',
  'date',
  'slot',
  'result',
  'reason',
])

export function getVisitorId() {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY)
    if (existing) return existing
    const random = Math.random().toString(36).slice(2, 10)
    const id = `zice8_vid_${Date.now().toString(36)}_${random}`
    localStorage.setItem(VISITOR_ID_KEY, id)
    return id
  } catch {
    return `zice8_vid_${Date.now().toString(36)}`
  }
}

export function shouldTrackPageView(activityKey, page) {
  if (!activityKey || !page) return false
  try {
    const key = `zice8_pv_${activityKey}_${page}`
    const lastTrackedAt = Number(localStorage.getItem(key) || 0)
    const now = Date.now()
    if (lastTrackedAt && now - lastTrackedAt < PAGE_VIEW_DEDUPE_MS) return false
    localStorage.setItem(key, String(now))
    return true
  } catch {
    return true
  }
}

export function trackEvent(payload) {
  if (!payload?.activityKey || !payload?.eventType) return
  const body = {
    activityKey: payload.activityKey,
    eventType: payload.eventType,
    page: payload.page || window.location.pathname,
    path: payload.path || `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || '',
    visitorId: getVisitorId(),
    extra: sanitizeExtra(payload.extra, payload),
  }
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  fetch(`${API_BASE_URL}/analytics/track`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    keepalive: true,
  }).catch((err) => {
    console.warn('analytics track failed', err)
  })
}

export function trackPageView(activityKey, page, extra) {
  if (!shouldTrackPageView(activityKey, page)) return
  trackEvent({ activityKey, eventType: 'page_view', page, extra })
}

function sanitizeExtra(extra, payload = {}) {
  if (!extra || typeof extra !== 'object') return {}
  const appointmentOnly = payload?.eventType?.startsWith?.('appointment_') || extra.activityType === 'appointment_visit'
  return Object.entries(extra).reduce((result, [key, value]) => {
    if (isSensitiveExtraKey(key)) return result
    if (appointmentOnly && !APPOINTMENT_EXTRA_KEYS.has(key)) return result
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      result[key] = value
    }
    return result
  }, {})
}

function isSensitiveExtraKey(key) {
  const normalized = String(key || '').trim().toLowerCase()
  if (!normalized) return true
  return (
    normalized === 'name' ||
    normalized.endsWith('_name') ||
    normalized === 'phone' ||
    normalized.endsWith('_phone') ||
    normalized === 'department' ||
    normalized.endsWith('_department') ||
    normalized === 'openid' ||
    normalized.endsWith('_openid') ||
    normalized === 'token' ||
    normalized.endsWith('_token') ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized === 'idtail' ||
    normalized === 'id_tail' ||
    normalized.endsWith('_id_tail')
  )
}
