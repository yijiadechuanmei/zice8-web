import { request } from '../../shared/api/request'

export const getZhumaoDianqianPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })
