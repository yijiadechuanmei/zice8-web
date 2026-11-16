import { request } from '../../shared/api/request'

const base = (key) => `/safe-driver-quiz/activities/${encodeURIComponent(key)}`
export const getActivityConfig = (key) => request(`/activities/${encodeURIComponent(key)}/public-config`, { skipAuth: true })
export const getState = (key) => request(`${base(key)}/state`)
export const startQuiz = (key) => request(`${base(key)}/start`, { method: 'POST' })
export const answerQuestion = (key, questionId, option) => request(`${base(key)}/answer`, { method: 'POST', body: JSON.stringify({ questionId, option }) })
export const drawPrize = (key) => request(`${base(key)}/draw`, { method: 'POST' })
export const submitClaim = (key, claim) => request(`${base(key)}/claim`, { method: 'POST', body: JSON.stringify(claim) })
