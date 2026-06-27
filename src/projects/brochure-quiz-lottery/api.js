import { request } from '../../shared/api/request'

function withVisitor(path, visitorId) {
  if (!visitorId) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}visitorId=${encodeURIComponent(visitorId)}`
}

export const getPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getBootstrap = (activityKey, visitorId) =>
  request(withVisitor(`/brochure-quiz-lottery/activities/${encodeURIComponent(activityKey)}/bootstrap`, visitorId))

export const getDebugAccess = (activityKey, visitorId) =>
  request(withVisitor(`/brochure-quiz-lottery/activities/${encodeURIComponent(activityKey)}/debug-access`, visitorId))

export const resetDebugData = (activityKey, data) =>
  request('/brochure-quiz-lottery/dev/reset', {
    method: 'POST',
    body: JSON.stringify({
      activityKey,
      scope: 'me',
      ...data,
    }),
  })

export const saveProfile = (activityKey, data) =>
  request(`/brochure-quiz-lottery/activities/${encodeURIComponent(activityKey)}/profile`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const startAttempt = (activityKey, data) =>
  request(`/brochure-quiz-lottery/activities/${encodeURIComponent(activityKey)}/start`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const submitAttempt = (activityKey, attemptId, data) =>
  request(`/brochure-quiz-lottery/activities/${encodeURIComponent(activityKey)}/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const drawPrize = (activityKey, attemptId, data) =>
  request(`/brochure-quiz-lottery/activities/${encodeURIComponent(activityKey)}/attempts/${encodeURIComponent(attemptId)}/draw`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getMyPrizes = (activityKey, visitorId) =>
  request(withVisitor(`/brochure-quiz-lottery/activities/${encodeURIComponent(activityKey)}/my-prizes`, visitorId))
