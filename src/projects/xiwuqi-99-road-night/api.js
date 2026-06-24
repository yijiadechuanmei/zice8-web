import { request } from '../../shared/api/request'

export const getXiwuqi99RoadNightPublicConfig = (activityKey) =>
  request(`/activities/${activityKey}/public-config`, { skipAuth: true })
