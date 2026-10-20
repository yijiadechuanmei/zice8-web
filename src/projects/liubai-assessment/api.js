import { request } from '../../shared/api/request'

const base = (key) => `/liubai-assessment/activities/${encodeURIComponent(key)}`

export function loadLiubaiActivity(key) {
  return Promise.all([
    request(`/activities/${encodeURIComponent(key)}/public-config`),
    request(`${base(key)}/questions`),
  ]).then(([activity, quiz]) => ({ activity, ...quiz }))
}

export function submitLiubaiAnswers(key, answers, questionVersion, signal) {
  return request(`${base(key)}/preview`, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ answers, questionVersion }),
    signal,
  })
}
