import { request } from '../../shared/api/request'

const base = (activityKey) => `/longwen-beer-quiz/activities/${encodeURIComponent(activityKey)}`

export const getLongwenBeerQuizPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getLongwenBeerQuizState = (activityKey) => request(`${base(activityKey)}/state`)
export const startLongwenBeerQuiz = (activityKey) => request(`${base(activityKey)}/start`, { method: 'POST' })
export const submitLongwenBeerAnswer = (activityKey, payload) => request(`${base(activityKey)}/answer`, {
  method: 'POST', body: JSON.stringify(payload),
})
export const redeemLongwenBeerPrize = (activityKey, verificationCode) => request(`${base(activityKey)}/redeem`, {
  method: 'POST', body: JSON.stringify({ verificationCode }),
})
