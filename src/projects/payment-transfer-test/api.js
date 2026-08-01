import { request } from '../../shared/api/request'

const base = (activityKey) =>
  `/payment-transfer-test/activities/${encodeURIComponent(activityKey)}`

export const getPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getBootstrap = (activityKey) => request(`${base(activityKey)}/bootstrap`)

export const createPayment = (activityKey, requestId) =>
  request(`${base(activityKey)}/payment-orders`, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })

export const getPayment = (activityKey, orderNo) =>
  request(`${base(activityKey)}/payment-orders/${encodeURIComponent(orderNo)}`)

export const syncPayment = (activityKey, orderNo) =>
  request(`${base(activityKey)}/payment-orders/${encodeURIComponent(orderNo)}/sync`, {
    method: 'POST',
  })

export const createAuthorization = (activityKey) =>
  request(`${base(activityKey)}/transfer-authorization`, { method: 'POST' })

export const syncAuthorization = (activityKey) =>
  request(`${base(activityKey)}/transfer-authorization/sync`, { method: 'POST' })

export const createPayout = (activityKey, requestId) =>
  request(`${base(activityKey)}/payouts`, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })

export const drawLottery = (activityKey, requestId) =>
  request(`${base(activityKey)}/lottery-draws`, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  })

export const getPayout = (activityKey, payoutNo) =>
  request(`${base(activityKey)}/payouts/${encodeURIComponent(payoutNo)}`)

export const syncPayout = (activityKey, payoutNo) =>
  request(`${base(activityKey)}/payouts/${encodeURIComponent(payoutNo)}/sync`, {
    method: 'POST',
  })
