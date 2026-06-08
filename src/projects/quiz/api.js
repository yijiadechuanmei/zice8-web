import { request } from '../../shared/api/request'

export const getPublicConfig = (activityKey) => request(`/activities/${activityKey}/public-config`)

export const getBootstrap = (activityKey) => request(`/quiz/activities/${activityKey}/bootstrap`)

export const submitProfile = (activityKey, data) =>
  request(`/quiz/activities/${activityKey}/participant-profile`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const startAttempt = (activityKey, data) =>
  request(`/quiz/activities/${activityKey}/start-attempt`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getCurrentAttempt = (activityKey, attemptId) =>
  request(`/quiz/activities/${activityKey}/attempts/${attemptId}/current`)

export const submitAnswer = (activityKey, attemptId, data) =>
  request(`/quiz/activities/${activityKey}/attempts/${attemptId}/answer`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const submitTimeout = (activityKey, attemptId, data) =>
  request(`/quiz/activities/${activityKey}/attempts/${attemptId}/timeout`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const finishAttempt = (activityKey, attemptId) =>
  request(`/quiz/activities/${activityKey}/attempts/${attemptId}/finish`, { method: 'POST' })

export const getResult = (activityKey, attemptId) => request(`/quiz/activities/${activityKey}/result/${attemptId}`)

export const getRank = (activityKey, page = 1, pageSize = 50) =>
  request(`/quiz/activities/${activityKey}/rank?page=${page}&pageSize=${pageSize}`)

export const resetDemoActivity = (activityKey) =>
  request(`/quiz/activities/${activityKey}/dev-reset`, {
    method: 'POST',
    body: JSON.stringify({ confirm: 'RESET_QUIZ_DEMO' }),
  })
