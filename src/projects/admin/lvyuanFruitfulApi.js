import { adminRequest } from './api'

const base = (activityKey) => `/admin/lvyuan-fruitful-games/activities/${encodeURIComponent(activityKey)}`

export const getLvyuanAdminOverview = (activityKey) => adminRequest(`${base(activityKey)}/overview`)

export const getLvyuanAdminParticipants = (activityKey, params = {}) => {
  const search = new URLSearchParams(params)
  return adminRequest(`${base(activityKey)}/participants?${search.toString()}`)
}

export const clearLvyuanAdminData = (activityKey, scope, userId = '') => adminRequest(`${base(activityKey)}/clear`, {
  method: 'POST',
  body: JSON.stringify({ scope, userId, confirm: 'CLEAR_LVYUAN_USER_DATA' }),
})
