import { markActivityUnavailable } from '../activityAvailability'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const TOKEN_KEY = 'zice8_token'
const publicConfigRequests = new Map()
const PUBLIC_CONFIG_PATH = /^\/activities\/[^/]+\/public-config(?:\?|$)/

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function executeRequest(path, options) {
  const { skipAuth, ...fetchOptions } = options
  const token = getToken()
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
  if (method !== 'GET' || !PUBLIC_CONFIG_PATH.test(path)) {
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
