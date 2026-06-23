import { request } from '../../shared/api/request'

export const getTufeCampusOpenDayPublicConfig = (activityKey) =>
  request(`/activities/${activityKey}/public-config`, { skipAuth: true })
