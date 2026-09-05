import { request } from '../../shared/api/request'

export const getLvyuanFruitfulGamesPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })
