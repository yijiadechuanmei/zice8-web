import { request } from '../../shared/api/request'

const base = (activityKey) => `/lucky-draw/activities/${encodeURIComponent(activityKey)}`

export const getLuckyDrawPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getLuckyDrawState = (activityKey) => request(`${base(activityKey)}/state`)

export const drawLuckyDraw = (activityKey) => request(`${base(activityKey)}/draw`, { method: 'POST' })
