import { request } from '../../shared/api/request'

export const getLvyuanFruitfulGamesPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getLvyuanFruitfulGamesBootstrap = (activityKey) =>
  request(`/lvyuan-fruitful-games/activities/${encodeURIComponent(activityKey)}/bootstrap`)

export const completeLvyuanFruitfulGame = (activityKey, gameKey, answers) =>
  request(`/lvyuan-fruitful-games/activities/${encodeURIComponent(activityKey)}/complete`, {
    method: 'POST',
    body: JSON.stringify({ gameKey, answers }),
  })
