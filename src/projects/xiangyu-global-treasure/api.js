import { request } from '../../shared/api/request'

const base = (activityKey) => `/xiangyu-global-treasure/activities/${encodeURIComponent(activityKey)}`

export const getXiangyuGlobalTreasurePublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getXiangyuGlobalTreasureState = (activityKey) => request(`${base(activityKey)}/state`)

export const drawXiangyuGlobalTreasure = (activityKey, organizationName) =>
  request(`${base(activityKey)}/draw`, {
    method: 'POST',
    body: JSON.stringify({ organizationName }),
  })

export const redeemXiangyuGlobalTreasure = (activityKey, verificationCode) =>
  request(`${base(activityKey)}/redeem`, {
    method: 'POST',
    body: JSON.stringify({ verificationCode }),
  })
