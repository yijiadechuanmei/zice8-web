import { request } from '../../shared/api/request'

export const getBorderTownRoleTestPublicConfig = (activityKey) =>
  request(`/activities/${activityKey}/public-config`, { skipAuth: true })
