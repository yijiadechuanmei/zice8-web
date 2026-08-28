import { request } from '../../shared/api/request'

const base = (activityKey) => `/quality-month/activities/${encodeURIComponent(activityKey)}`

export const getQualityMonthPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getQualityMonthState = (activityKey) => request(`${base(activityKey)}/bootstrap`)

export const startQualityMonthQuiz = (activityKey) => request(`${base(activityKey)}/start`, {
  method: 'POST',
})

export const submitQualityMonthQuiz = (activityKey, attemptId, answers) =>
  request(`${base(activityKey)}/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
