import { request } from '../../shared/api/request'

export const MATERIAL_REGISTRATION_FALLBACK_ASSETS_BASE_URL =
  'https://assets.zice8.com/material_review_registration/material_community_registration_20260620'

export const getMaterialRegistrationPublicConfig = (activityKey) =>
  request(`/activities/${activityKey}/public-config`, { skipAuth: true })

export const getMaterialRegistrationBootstrap = (activityKey) =>
  request(`/material-registration/activities/${activityKey}/bootstrap`)

export const createMaterialRegistrationSubmission = (activityKey, data) =>
  request(`/material-registration/activities/${activityKey}/submissions`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export function isUnauthorizedError(error) {
  const response = error?.response || {}
  const status = Number(response?.code) || Number(response?.status) || 0
  const message = response?.message || error?.message || ''
  return status === 401 || /unauthorized/i.test(message) || /未获取到微信身份/.test(message)
}
