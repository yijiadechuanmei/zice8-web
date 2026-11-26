import { markActivityUnavailable } from '../activityAvailability'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const TOKEN_KEY = 'zice8_token'
let fallbackToken = ''
const publicConfigRequests = new Map()
const PUBLIC_CONFIG_PATH = /^\/activities\/[^/]+\/public-config(?:\?|$)/

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || fallbackToken
  } catch {
    return fallbackToken
  }
}

export function setToken(token) {
  if (!token) return
  fallbackToken = token
  try { localStorage.setItem(TOKEN_KEY, token) } catch { /* Keep the token for this page when storage is blocked. */ }
}

export function removeToken() {
  fallbackToken = ''
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* Storage may be blocked in embedded browsers. */ }
}

async function executeRequest(path, options) {
  const { skipAuth, ...fetchOptions } = options
  const token = skipAuth ? '' : getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {}),
  }
  if (token && !skipAuth) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  })
  const result = await response.json().catch(() => ({ code: response.status, message: response.statusText, data: null }))
  if (!response.ok || result.code >= 400) {
    if ((response.status === 404 || Number(result.code) === 404)) {
      markActivityUnavailable(path)
    }
    const error = new Error(result.message || '请求失败')
    error.response = result
    error.status = response.status || Number(result.code) || 0
    throw error
  }
  return result.data
}

export function request(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  if (method !== 'GET' || !PUBLIC_CONFIG_PATH.test(path) || options.signal) {
    return executeRequest(path, options)
  }

  const existingRequest = publicConfigRequests.get(path)
  if (existingRequest) return existingRequest

  const pendingRequest = executeRequest(path, options).catch((error) => {
    if (Number(error?.status) !== 404) publicConfigRequests.delete(path)
    throw error
  })
  publicConfigRequests.set(path, pendingRequest)
  return pendingRequest
}
