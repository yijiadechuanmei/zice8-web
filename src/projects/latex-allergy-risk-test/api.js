import { request } from '../../shared/api/request'

export const getLatexAllergyRiskTestPublicConfig = (activityKey) =>
  request(`/activities/${activityKey}/public-config`, { skipAuth: true })
