export const TARGETED_THERAPY_QUIZ_ACTIVITY_TYPE = 'targeted_therapy_quiz'
export const TARGETED_THERAPY_QUIZ_ACTIVITY_KEY = 'targeted_therapy_quiz_20260807'
export const TARGETED_THERAPY_QUIZ_ASSETS_BASE_URL =
  'https://assets.zice8.com/targeted_therapy_quiz/targeted_therapy_quiz_20260807'

export const DEFAULT_CONFIG = {
  assetsBaseUrl: TARGETED_THERAPY_QUIZ_ASSETS_BASE_URL,
  homeBackgroundImage: 'bj1.png',
  questionBackgroundImage: 'bj2.png',
  categories: ['肺癌', '肉瘤', '消化道瘤'],
}

export function mergeConfig(publicConfig) {
  return {
    ...DEFAULT_CONFIG,
    ...(publicConfig?.mobileConfig || {}),
  }
}

export function assetUrl(baseUrl, filename) {
  if (!filename) return ''
  if (/^(https?:)?\/\//i.test(filename) || filename.startsWith('/') || filename.startsWith('data:')) return filename
  return `${String(baseUrl || '').replace(/\/$/, '')}/${filename.replace(/^\//, '')}`
}
