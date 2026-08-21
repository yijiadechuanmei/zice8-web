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
    error.status = response.status || result.code
    error.errorCode = result.data?.errorCode
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

export function getOverview(activityKey, params = {}) {
  const search = new URLSearchParams(params)
  const suffix = search.toString() ? `?${search.toString()}` : ''
  return adminRequest(`/admin/activities/${activityKey}/overview${suffix}`)
}

export function getActivityConfig(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/config`)
}

export function updateActivityBgmConfig(activityKey, payload) {
  return adminRequest(`/admin/activities/${activityKey}/mobile-config/bgm`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getNanhaiChallengePrizes(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/nanhai-inspection-challenge/prizes`)
}

export function saveNanhaiChallengePrizes(activityKey, prizes) {
  return adminRequest(`/admin/activities/${activityKey}/nanhai-inspection-challenge/prizes`, {
    method: 'PUT',
    body: JSON.stringify({ prizes }),
  })
}

export function getNanhaiChallengeDrawControl(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/nanhai-inspection-challenge/draw-control`)
}

export function saveNanhaiChallengeDrawAutoControl(activityKey, payload) {
  return adminRequest(`/admin/activities/${activityKey}/nanhai-inspection-challenge/draw-control/auto-config`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function updateNanhaiChallengeDrawManualControl(activityKey, payload) {
  return adminRequest(`/admin/activities/${activityKey}/nanhai-inspection-challenge/draw-control/action`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function resetNanhaiChallengeData(activityKey, payload) {
  return adminRequest(`/admin/activities/${activityKey}/nanhai-inspection-challenge/reset-data`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      confirm: 'CLEAR_NANHAI_CHALLENGE_DATA',
    }),
  })
}

export function getNanhaiChallengeRegionAccessExemptions(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/nanhai-inspection-challenge/region-access-exemptions`)
}

export function updateNanhaiChallengeRegionAccessExemption(activityKey, payload) {
  return adminRequest(`/admin/activities/${activityKey}/nanhai-inspection-challenge/region-access-exemptions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getArtistCallLotteryPrizes(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/artist-call-lottery/prizes`)
}

export function saveArtistCallLotteryPrizes(activityKey, prizes) {
  return adminRequest(`/admin/activities/${activityKey}/artist-call-lottery/prizes`, {
    method: 'PUT',
    body: JSON.stringify({ prizes }),
  })
}

export function getSongWishLotteryResultConfig(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/song-wish-lottery/result-config`)
}

export function saveSongWishLotteryResultConfig(activityKey, payload) {
  return adminRequest(`/admin/activities/${activityKey}/song-wish-lottery/result-config`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function manualDrawSongWishLottery(activityKey, payload) {
  return adminRequest(`/admin/activities/${activityKey}/song-wish-lottery/manual-draw`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function revokeSongWishLotteryDraw(activityKey, drawId) {
  return adminRequest(`/admin/activities/${activityKey}/song-wish-lottery/draws/${encodeURIComponent(drawId)}/revoke`, {
    method: 'POST',
  })
}

export function clearSongWishLotteryDraws(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/song-wish-lottery/draws/clear`, {
    method: 'POST',
  })
}

export function updateActivityStatus(activityKey, status) {
  return adminRequest(`/admin/activities/${activityKey}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export function getNanshaOpenMicConfig(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/nansha-open-mic/config`)
}

export function updateNanshaOpenMicConfig(activityKey, payload) {
  return adminRequest(`/admin/activities/${activityKey}/nansha-open-mic/config`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function resetNanshaOpenMicData(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/nansha-open-mic/reset-data`, {
    method: 'POST',
    body: JSON.stringify({ confirm: 'CLEAR_NANSHA_OPEN_MIC_DATA' }),
  })
}

export function deleteNanshaOpenMicEntry(activityKey, entryId) {
  return adminRequest(`/admin/activities/${activityKey}/nansha-open-mic/entries/${encodeURIComponent(entryId)}/delete`, {
    method: 'POST',
    body: JSON.stringify({ confirm: 'DELETE_NANSHA_OPEN_MIC_ENTRY' }),
  })
}

export function clearLongwenBeerQuizData(activityKey) {
  return adminRequest(`/admin/activities/${activityKey}/longwen-beer-quiz/clear-data`, {
    method: 'POST',
    body: JSON.stringify({ confirm: 'CLEAR_LONGWEN_BEER_QUIZ_DATA' }),
  })
}

export function reviewNanshaOpenMicEntry(activityKey, entryId, payload) {
  return adminRequest(`/admin/activities/${activityKey}/nansha-open-mic/entries/${entryId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCharts(activityKey, params = {}) {
  const search = new URLSearchParams(params)
  const suffix = search.toString() ? `?${search.toString()}` : ''
  return adminRequest(`/admin/activities/${activityKey}/charts${suffix}`)
}

export function getAnalyticsFunnel(activityKey) {
  return adminRequest(`/admin/analytics/funnel/${activityKey}`)
}

export function getAnalyticsLottery(activityKey) {
  return adminRequest(`/admin/analytics/lottery/${activityKey}`)
}

export function getAnalyticsTrend(activityKey) {
  return adminRequest(`/admin/analytics/trend/${activityKey}`)
}

export function getSourceAccess(activityKey, params = {}) {
  const search = new URLSearchParams(params)
  return adminRequest(`/admin/analytics/source-access/${activityKey}?${search.toString()}`)
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
  const search = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      if (!value.length) {
        search.append(key, '')
        return
      }
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') search.append(key, String(item))
      })
      return
    }
    search.append(key, String(value))
  })
  return adminRequest(`/admin/activities/${activityKey}/data/${viewKey}/export?${search.toString()}`)
}

export function retractSongWish(activityKey, wishId) {
  return adminRequest(`/admin/activities/${activityKey}/song-wish-lottery/wishes/${wishId}/retract`, {
    method: 'POST',
  })
}

export function reviewLongMarchRecording(activityKey, recordingId, payload) {
  return adminRequest(`/long-march-study/admin/activities/${activityKey}/recordings/${recordingId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getLongMarchRecordingPlayUrl(activityKey, recordingId) {
  return adminRequest(`/long-march-study/admin/activities/${activityKey}/recordings/${recordingId}/play-url`)
}

export function adjustLongMarchProfile(activityKey, profileId, payload) {
  return adminRequest(`/long-march-study/admin/activities/${activityKey}/profiles/${profileId}/adjust`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function reviewLongMarchShareScreenshot(activityKey, screenshotId, payload) {
  return adminRequest(`/long-march-study/admin/activities/${activityKey}/share-screenshots/${screenshotId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getOperationLogs(params = {}) {
  const search = new URLSearchParams(params)
  return adminRequest(`/admin/operation-logs?${search.toString()}`)
}

export function getLoginLogs(params = {}) {
  const search = new URLSearchParams(params)
  return adminRequest(`/admin/login-logs?${search.toString()}`)
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

export function clearQuizQuestions(activityKey, confirm = 'CLEAR_QUIZ_QUESTIONS') {
  return adminRequest(`/quiz/admin/activities/${activityKey}/questions/clear`, {
    method: 'POST',
    body: JSON.stringify({ confirm }),
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

export function createPaymentDemoJsapiOrder(payload) {
  return adminRequest('/pay/demo/jsapi-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getPaymentDemoOrder(orderNo) {
  return adminRequest(`/pay/demo/orders/${encodeURIComponent(orderNo)}`)
}

export function syncPaymentDemoOrder(orderNo) {
  return adminRequest(`/pay/demo/orders/${encodeURIComponent(orderNo)}/sync`, {
    method: 'POST',
  })
}

export function closePaymentDemoOrder(orderNo) {
  return adminRequest(`/pay/demo/orders/${encodeURIComponent(orderNo)}/close`, {
    method: 'POST',
  })
}

export function createPaymentDemoTransfer(payload) {
  return adminRequest('/pay/demo/transfers', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getPaymentDemoTransfer(payoutNo) {
  return adminRequest(`/pay/demo/transfers/${encodeURIComponent(payoutNo)}`)
}

export function retryPaymentDemoTransfer(payoutNo) {
  return adminRequest(`/pay/demo/transfers/${encodeURIComponent(payoutNo)}/retry`, {
    method: 'POST',
  })
}

export function syncPaymentDemoTransfer(payoutNo) {
  return adminRequest(`/pay/demo/transfers/${encodeURIComponent(payoutNo)}/sync`, {
    method: 'POST',
  })
}

export function syncNanhaiChallengePayout(activityKey, drawId) {
  return adminRequest(`/nanhai-inspection-challenge/admin/activities/${encodeURIComponent(activityKey)}/draws/${encodeURIComponent(drawId)}/payout/sync`, {
    method: 'POST',
  })
}

export function retryNanhaiChallengePayout(activityKey, drawId, reason) {
  return adminRequest(`/nanhai-inspection-challenge/admin/activities/${encodeURIComponent(activityKey)}/draws/${encodeURIComponent(drawId)}/payout/retry`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}
