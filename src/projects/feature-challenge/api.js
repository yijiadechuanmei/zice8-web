import { request } from '../../shared/api/request'

export const getFeatureChallengePublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })
