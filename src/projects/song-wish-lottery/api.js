import { request } from '../../shared/api/request'

export const getPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getBootstrap = (activityKey) =>
  request(`/song-wish-lottery/activities/${encodeURIComponent(activityKey)}/bootstrap`)

export const getMessages = (activityKey, limit = 20) =>
  request(`/song-wish-lottery/activities/${encodeURIComponent(activityKey)}/messages?limit=${encodeURIComponent(limit)}`, { skipAuth: true })

export const createWish = (activityKey, data) =>
  request(`/song-wish-lottery/activities/${encodeURIComponent(activityKey)}/wishes`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const drawPrize = (activityKey, data) =>
  request(`/song-wish-lottery/activities/${encodeURIComponent(activityKey)}/draw`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const claimPrize = (activityKey, drawId, data) =>
  request(`/song-wish-lottery/activities/${encodeURIComponent(activityKey)}/draws/${encodeURIComponent(drawId)}/claim`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
