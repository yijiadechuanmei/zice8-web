import { request } from '../../shared/api/request'

const base = (key) => `/pingan-family/activities/${encodeURIComponent(key)}`
export const getConfig = (key) => request(`/activities/${encodeURIComponent(key)}/public-config`, { skipAuth: true })
export const getState = (key) => request(`${base(key)}/state`)
export const start = (key) => request(`${base(key)}/start`, { method: 'POST' })
export const retry = (key, id) => request(`${base(key)}/challenges/${encodeURIComponent(id)}/retry`, { method: 'POST' })
export const activateStage = (key, id) => request(`${base(key)}/challenges/${encodeURIComponent(id)}/activate-stage`, { method: 'POST' })
export const answer = (key, id, questionId, option) => request(`${base(key)}/challenges/${encodeURIComponent(id)}/answer`, { method: 'POST', body: JSON.stringify({ questionId, option }) })
export const saveProfile = (key, profile) => request(`${base(key)}/profile`, { method: 'POST', body: JSON.stringify(profile) })
export const draw = (key, id) => request(`${base(key)}/chances/${encodeURIComponent(id)}/draw`, { method: 'POST' })
export const getDrawResult = (key, id) => request(`${base(key)}/chances/${encodeURIComponent(id)}/result`)
export const getRecords = (key) => request(`${base(key)}/records`)
