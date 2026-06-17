import { getToken, request } from '../../shared/api/request'

export const DEFAULT_OSS_BASE_URL =
  import.meta.env.VITE_OSS_BASE_URL || 'https://assets.zice8.com'

export function getPhaseQuizLotteryAssetBaseUrl(activityKey) {
  return `${DEFAULT_OSS_BASE_URL}/phase-quiz-lottery/${encodeURIComponent(activityKey || '')}`
}

export function buildPhaseQuizLotteryAssetUrl(activityKey, folder, filename) {
  return `${getPhaseQuizLotteryAssetBaseUrl(activityKey)}/${folder}/${filename}`
}

export function isUnauthorizedError(error) {
  const response = error?.response || {}
  const status = Number(response?.code) || Number(response?.status) || 0
  const message = response?.message || error?.message || ''
  return status === 401 || /unauthorized/i.test(message)
}

async function phaseQuizLotteryRequest(path, options = {}) {
  const method = options.method || 'GET'
  const hasAuth = Boolean(getToken())

  try {
    return await request(path, options)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[phase-quiz-lottery]', method, path, {
        hasAuth: !options.skipAuth && hasAuth,
        error,
      })
    }
    throw error
  }
}

export const getPublicConfig = (activityKey) =>
  phaseQuizLotteryRequest(`/activities/${activityKey}/public-config`, { skipAuth: true })

export const getBootstrap = (activityKey) =>
  phaseQuizLotteryRequest(`/phase-quiz-lottery/activities/${activityKey}/bootstrap`)

export const startAttempt = (activityKey, phaseNo, data) =>
  phaseQuizLotteryRequest(`/phase-quiz-lottery/activities/${activityKey}/phases/${phaseNo}/start`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const submitAttempt = (activityKey, attemptId, data) =>
  phaseQuizLotteryRequest(`/phase-quiz-lottery/activities/${activityKey}/attempts/${attemptId}/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getResult = (activityKey, attemptId) =>
  phaseQuizLotteryRequest(`/phase-quiz-lottery/activities/${activityKey}/attempts/${attemptId}/result`)

export const drawPrize = (activityKey, attemptId, data) =>
  phaseQuizLotteryRequest(`/phase-quiz-lottery/activities/${activityKey}/attempts/${attemptId}/draw`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getMyPrize = (activityKey) =>
  phaseQuizLotteryRequest(`/phase-quiz-lottery/activities/${activityKey}/my-prize`)

export const getDebugAccess = (activityKey) =>
  phaseQuizLotteryRequest(`/phase-quiz-lottery/activities/${activityKey}/debug-access`)

export const resetMyDebugData = (activityKey, data) =>
  phaseQuizLotteryRequest('/phase-quiz-lottery/dev/reset', {
    method: 'POST',
    body: JSON.stringify({
      activityKey,
      scope: 'me',
      ...data,
    }),
  })

export const claimPrize = (activityKey, drawId, data) =>
  phaseQuizLotteryRequest(`/phase-quiz-lottery/activities/${activityKey}/draws/${drawId}/claim`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const pickupVerify = (activityKey, claimId, data) =>
  phaseQuizLotteryRequest(`/phase-quiz-lottery/activities/${activityKey}/claims/${claimId}/pickup-verify`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
