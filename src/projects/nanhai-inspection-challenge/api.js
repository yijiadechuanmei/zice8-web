import { request } from '../../shared/api/request'

const base = (activityKey) => `/nanhai-inspection-challenge/activities/${encodeURIComponent(activityKey)}`
const debugSuffix = (debug) => debug ? '?debug=1' : ''
const authorizationSuffix = (debug, renew) => {
  if (debug && renew) return '?debug=1&renew=1'
  if (debug) return '?debug=1'
  return renew ? '?renew=1' : ''
}

export const getBootstrap = (activityKey, debug = false) => request(`${base(activityKey)}/bootstrap${debugSuffix(debug)}`)

export const checkRegionAccess = (activityKey) =>
  request(`${base(activityKey)}/access/region`, { method: 'POST' })

export const getPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const submitAnswer = (activityKey, levelNo, payload, debug = false) =>
  request(`${base(activityKey)}/levels/${encodeURIComponent(levelNo)}/answers${debugSuffix(debug)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const previewAnswer = (activityKey, levelNo, payload) =>
  request(`${base(activityKey)}/preview/levels/${encodeURIComponent(levelNo)}/answers?debug=1`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const createAuthorization = (activityKey, debug = false, renew = false) =>
  request(`${base(activityKey)}/transfer-authorization${authorizationSuffix(debug, renew)}`, { method: 'POST' })

export const syncAuthorization = (activityKey, debug = false) =>
  request(`${base(activityKey)}/transfer-authorization/sync${debugSuffix(debug)}`, { method: 'POST' })

export const drawPrize = (activityKey, requestId, debug = false) =>
  request(`${base(activityKey)}/draw${debugSuffix(debug)}`, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })

export const getDrawAvailability = (activityKey) =>
  request(`${base(activityKey)}/draw/availability`)

export const syncPayout = (activityKey, payoutNo, debug = false) =>
  request(`${base(activityKey)}/payouts/${encodeURIComponent(payoutNo)}/sync${debugSuffix(debug)}`, { method: 'POST' })

export const getDrawStatus = (activityKey, debug = false) =>
  request(`${base(activityKey)}/draw/status${debugSuffix(debug)}`)

export const getDebugState = (activityKey) =>
  request(`${base(activityKey)}/debug/state?debug=1`)

export const resetDebugData = (activityKey) =>
  request(`${base(activityKey)}/debug/reset?debug=1`, { method: 'POST' })
