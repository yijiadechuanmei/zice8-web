import { request } from '../../shared/api/request'

const base = (activityKey) => `/nanhai-inspection-challenge/activities/${encodeURIComponent(activityKey)}`

export const getBootstrap = (activityKey) => request(`${base(activityKey)}/bootstrap`)

export const submitAnswer = (activityKey, levelNo, payload) =>
  request(`${base(activityKey)}/levels/${encodeURIComponent(levelNo)}/answers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const previewAnswer = (activityKey, levelNo, payload) =>
  request(`${base(activityKey)}/preview/levels/${encodeURIComponent(levelNo)}/answers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const createAuthorization = (activityKey) =>
  request(`${base(activityKey)}/transfer-authorization`, { method: 'POST' })

export const syncAuthorization = (activityKey) =>
  request(`${base(activityKey)}/transfer-authorization/sync`, { method: 'POST' })

export const drawPrize = (activityKey, requestId) =>
  request(`${base(activityKey)}/draw`, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })

export const syncPayout = (activityKey, payoutNo) =>
  request(`${base(activityKey)}/payouts/${encodeURIComponent(payoutNo)}/sync`, { method: 'POST' })
