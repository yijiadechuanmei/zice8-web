import { getToken, request } from '../../shared/api/request'
import { debugLog, debugWarn, isQuizAuthDebugEnabled, setQuizAuthDebugState } from '../../shared/debug/quizAuthDebug'

export function isUnauthorizedError(error) {
  const response = error?.response || {}
  const status = Number(response?.code) || Number(response?.status) || 0
  const message = response?.message || error?.message || ''
  return status === 401 || /unauthorized/i.test(message)
}

async function quizRequest(path, options = {}) {
  const method = options.method || 'GET'
  const hasAuth = Boolean(getToken())
  const debugEndpointType = options.skipAuth ? 'public' : 'protected'

  if (isQuizAuthDebugEnabled()) {
    debugLog('[QuizApiDebug] request', {
      method,
      url: path,
      hasAuth: !options.skipAuth && hasAuth,
    })
  }

  try {
    const data = await request(path, options)
    if (isQuizAuthDebugEnabled()) {
      debugLog('[QuizApiDebug] response', {
        url: path,
        status: 200,
        code: 200,
        errorCode: data?.errorCode || data?.data?.errorCode || '',
        message: 'success',
      })
    }
    return data
  } catch (error) {
    const response = error?.response || {}
    const errorCode = response?.data?.errorCode || response?.errorCode || ''
    const status = Number(response?.code) || (isUnauthorizedError(error) ? 401 : 500)
    const debugPayload = {
      path,
      status,
      errorCode,
      willReauth: status === 401 && !options.skipAuth,
    }

    setQuizAuthDebugState({
      lastApiError: {
        method,
        path,
        status,
        errorCode,
        message: response?.message || error?.message || '请求失败',
      },
    })

    if (status === 401 && !options.skipAuth) {
      debugWarn('[QuizAuthDebug] protected api unauthorized', {
        endpoint: path,
        willClearToken: true,
        willReauth: true,
      })
    } else if (status === 401) {
      debugWarn('[QuizAuthDebug] unauthorized', debugPayload)
    }

    if (isQuizAuthDebugEnabled()) {
      debugLog('[QuizApiDebug] response', {
        url: path,
        status,
        code: response?.code || status,
        errorCode,
        message: response?.message || error?.message || '请求失败',
      })
    }

    throw error
  }
}

export const getPublicConfig = (activityKey) => quizRequest(`/activities/${activityKey}/public-config`, { skipAuth: true })

export const getBootstrap = (activityKey) => quizRequest(`/quiz/activities/${activityKey}/bootstrap`)

export const submitProfile = (activityKey, data) =>
  quizRequest(`/quiz/activities/${activityKey}/participant-profile`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const startAttempt = (activityKey, data) =>
  quizRequest(`/quiz/activities/${activityKey}/start-attempt`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getCurrentAttempt = (activityKey, attemptId) =>
  quizRequest(`/quiz/activities/${activityKey}/attempts/${attemptId}/current`)

export const submitAnswer = (activityKey, attemptId, data) =>
  quizRequest(`/quiz/activities/${activityKey}/attempts/${attemptId}/answer`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const submitTimeout = (activityKey, attemptId, data) =>
  quizRequest(`/quiz/activities/${activityKey}/attempts/${attemptId}/timeout`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const finishAttempt = (activityKey, attemptId) =>
  quizRequest(`/quiz/activities/${activityKey}/attempts/${attemptId}/finish`, { method: 'POST' })

export const getResult = (activityKey, attemptId) => quizRequest(`/quiz/activities/${activityKey}/result/${attemptId}`)

export const getRank = (activityKey, page = 1, pageSize = 50) =>
  quizRequest(`/quiz/activities/${activityKey}/rank?page=${page}&pageSize=${pageSize}`, { skipAuth: true })

export const resetDemoActivity = (activityKey) =>
  quizRequest(`/quiz/activities/${activityKey}/dev-reset`, {
    method: 'POST',
    body: JSON.stringify({ confirm: 'RESET_QUIZ_DEMO' }),
  })
