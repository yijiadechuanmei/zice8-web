import { request } from '../../shared/api/request'

export const getPublicConfig = (activityKey) => request(
  `/activities/${encodeURIComponent(activityKey)}/public-config`,
  { skipAuth: true },
)

export const getCurrentUser = () => request('/auth/me')
