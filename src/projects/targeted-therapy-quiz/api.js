import { request } from '../../shared/api/request'

export const getTargetedTherapyQuizPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

const base = (activityKey) => `/targeted-therapy-quiz/activities/${encodeURIComponent(activityKey)}`

export const getRandomQuestion = (activityKey, category) =>
  request(`${base(activityKey)}/questions/random?category=${encodeURIComponent(category)}`, { skipAuth: true })

export const submitAnswer = (activityKey, questionId, selectedOption) =>
  request(`${base(activityKey)}/answers`, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ questionId, selectedOption }),
  })
