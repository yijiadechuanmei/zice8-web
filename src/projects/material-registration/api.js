import { request } from '../../shared/api/request'

export const MATERIAL_REGISTRATION_FALLBACK_ASSETS_BASE_URL =
  'https://assets.zice8.com/material_review_registration/material_community_registration_20260620'

export const getMaterialRegistrationBootstrap = (activityKey) =>
  request(`/material-registration/activities/${activityKey}/bootstrap`)

export const createMaterialRegistrationSubmission = (activityKey, data) =>
  request(`/material-registration/activities/${activityKey}/submissions`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
