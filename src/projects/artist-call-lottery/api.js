import { request } from '../../shared/api/request'

export const getPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getBootstrap = (activityKey, inviterUserId) => {
  const params = new URLSearchParams()
  if (inviterUserId) params.set('inviterUserId', inviterUserId)
  const query = params.toString()
  return request(`/artist-call-lottery/activities/${encodeURIComponent(activityKey)}/bootstrap${query ? `?${query}` : ''}`)
}

export const getBarrages = (activityKey, limit = 20) =>
  request(`/artist-call-lottery/activities/${encodeURIComponent(activityKey)}/barrages?limit=${encodeURIComponent(limit)}`, { skipAuth: true })

export const callArtist = (activityKey, data) =>
  request(`/artist-call-lottery/activities/${encodeURIComponent(activityKey)}/call`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const teamUp = (activityKey, data) =>
  request(`/artist-call-lottery/activities/${encodeURIComponent(activityKey)}/team-up`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const drawPrize = (activityKey, data) =>
  request(`/artist-call-lottery/activities/${encodeURIComponent(activityKey)}/draw`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const claimPrize = (activityKey, drawId, data) =>
  request(`/artist-call-lottery/activities/${encodeURIComponent(activityKey)}/draws/${encodeURIComponent(drawId)}/claim`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
