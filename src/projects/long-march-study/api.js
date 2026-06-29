import { request } from '../../shared/api/request'

function withVisitor(path, visitorId) {
  if (!visitorId) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}visitorId=${encodeURIComponent(visitorId)}`
}

const base = (activityKey) => `/long-march-study/activities/${encodeURIComponent(activityKey)}`

export const getPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getBootstrap = (activityKey, visitorId) =>
  request(withVisitor(`${base(activityKey)}/bootstrap`, visitorId))

export const saveProfile = (activityKey, data) =>
  request(`${base(activityKey)}/profile`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const startQuiz = (activityKey, data) =>
  request(`${base(activityKey)}/quiz/start`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const answerQuiz = (activityKey, attemptId, data) =>
  request(`${base(activityKey)}/quiz/attempts/${encodeURIComponent(attemptId)}/answer`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const finishQuiz = (activityKey, attemptId, data) =>
  request(`${base(activityKey)}/quiz/attempts/${encodeURIComponent(attemptId)}/finish`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const checkinLocation = (activityKey, locationKey, data) =>
  request(`${base(activityKey)}/checkins/${encodeURIComponent(locationKey)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const submitRecording = (activityKey, data) =>
  request(`${base(activityKey)}/recordings`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const voteRecording = (activityKey, recordingId, data) =>
  request(`${base(activityKey)}/recordings/${encodeURIComponent(recordingId)}/vote`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getRank = (activityKey, visitorId) =>
  request(withVisitor(`${base(activityKey)}/rank`, visitorId))

export const getMine = (activityKey, visitorId) =>
  request(withVisitor(`${base(activityKey)}/mine`, visitorId))

export const generateHonor = (activityKey, data) =>
  request(`${base(activityKey)}/honors/generate`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const resetDebugData = (activityKey, data) =>
  request('/long-march-study/dev/reset', {
    method: 'POST',
    body: JSON.stringify({ activityKey, scope: 'me', ...data }),
  })
