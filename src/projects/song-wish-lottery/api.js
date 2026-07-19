import { request } from '../../shared/api/request'

export const songWishApi = {
  getBootstrap: (activityKey) =>
    request(`/song-wish-lottery/activities/${encodeURIComponent(activityKey)}/bootstrap`),

  createWish: (activityKey, data) =>
    request(`/song-wish-lottery/activities/${encodeURIComponent(activityKey)}/wishes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  drawPrize: (activityKey, data) =>
    request(`/song-wish-lottery/activities/${encodeURIComponent(activityKey)}/draw`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  claimPrize: (activityKey, drawId, data) =>
    request(`/song-wish-lottery/activities/${encodeURIComponent(activityKey)}/draws/${encodeURIComponent(drawId)}/claim`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getDebugAccess: (activityKey) =>
    request(`/song-wish-lottery/activities/${encodeURIComponent(activityKey)}/debug-access`),

  resetDebugData: (activityKey, data) =>
    request('/song-wish-lottery/dev/reset', {
      method: 'POST',
      body: JSON.stringify({ activityKey, scope: 'me', ...data }),
    }),

  debugConfirmToken: 'RESET_SWL_2026',
}
