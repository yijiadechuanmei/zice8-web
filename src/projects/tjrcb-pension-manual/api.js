import { request } from '../../shared/api/request'

export const getTjrcbPensionManualPublicConfig = (activityKey) =>
  request(`/activities/${activityKey}/public-config`, { skipAuth: true })
