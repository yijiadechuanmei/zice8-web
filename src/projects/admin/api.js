import { API_BASE_URL } from '../../shared/api/request'

const ADMIN_TOKEN_KEY = 'zice8_admin_token'

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
}

export function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function removeAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export async function adminRequest(path, options = {}) {
  const token = getAdminToken()
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })
  const result = await response.json().catch(() => ({ code: response.status, message: response.statusText, data: null }))
  if (!response.ok || result.code >= 400) {
    const error = new Error(result.message || '请求失败')
    error.response = result
    throw error
  }
  return result.data
}

export function loginAdmin(payload) {
  return adminRequest('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getAdminMe() {
  return adminRequest('/admin/auth/me')
}

export function getActivities() {
  return adminRequest('/admin/activities')
}

export function getOverview(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/overview`)
}

export function getCharts(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/charts`)
}

export function getDataSchema(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/data-schema`)
}

export function getDataViews(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/data-views`)
}

export function getDataRows(activityKey, viewKey, params) {
  const search = new URLSearchParams(params)
  return adminRequest(`/admin/activities/${activityKey}/data/${viewKey}?${search.toString()}`)
}

export function exportDataRows(activityKey, viewKey, params) {
  const search = new URLSearchParams(params)
  return adminRequest(`/admin/activities/${activityKey}/data/${viewKey}/export?${search.toString()}`)
}

export function getOperationLogs(params = {}) {
  const search = new URLSearchParams(params)
  return adminRequest(`/admin/operation-logs?${search.toString()}`)
}

export function getAccounts() {
  return adminRequest('/admin/accounts')
}

export function createAccount(payload) {
  return adminRequest('/admin/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getAccount(id) {
  return adminRequest(`/admin/accounts/${id}`)
}

export function updateAccount(id, payload) {
  return adminRequest(`/admin/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteAccount(id) {
  return adminRequest(`/admin/accounts/${id}`, {
    method: 'DELETE',
  })
}

export function updateAccountActivities(id, activityIds) {
  return adminRequest(`/admin/accounts/${id}/activities`, {
    method: 'POST',
    body: JSON.stringify({ activityIds }),
  })
}

export function updateAccountPermissions(id, permissions) {
  return adminRequest(`/admin/accounts/${id}/permissions`, {
    method: 'POST',
    body: JSON.stringify({ permissions }),
  })
}

export function importQuizQuestions(activityKey, file, mode = 'append') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('mode', mode)
  return adminRequest(`/quiz/admin/activities/${activityKey}/questions/import`, {
    method: 'POST',
    body: formData,
  })
}

export function getQuizAdminOverview(activityKey) {
  return adminRequest(`/quiz/admin/activities/${activityKey}/overview`)
}

export function getQuizAdminCategories(activityKey) {
  return adminRequest(`/quiz/admin/activities/${activityKey}/categories`)
}

export function getQuizAdminQuestions(activityKey, params = {}) {
  const search = new URLSearchParams(params)
  return adminRequest(`/quiz/admin/activities/${activityKey}/questions?${search.toString()}`)
}

export function getQuizAdminAttempts(activityKey, params = {}) {
  const search = new URLSearchParams(params)
  return adminRequest(`/quiz/admin/activities/${activityKey}/attempts?${search.toString()}`)
}

export function getQuizAdminAttemptAnswers(activityKey, attemptId) {
  return adminRequest(`/quiz/admin/activities/${activityKey}/attempts/${attemptId}/answers`)
}

export function getQuizAdminRank(activityKey, params = {}) {
  const search = new URLSearchParams(params)
  return adminRequest(`/quiz/admin/activities/${activityKey}/rank?${search.toString()}`)
}
