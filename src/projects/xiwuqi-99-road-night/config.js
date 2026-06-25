export const XIWUQI_99_ROAD_NIGHT_ACTIVITY_TYPE = 'xiwuqi_99_road_night'
export const XIWUQI_99_ROAD_NIGHT_ACTIVITY_KEY = 'xiwuqi_99_road_night_20260624'
export const XIWUQI_99_ROAD_NIGHT_ASSETS_BASE_URL =
  'https://assets.zice8.com/xiwuqi_99_road_night/xiwuqi_99_road_night_20260624'

export const DEFAULT_CONFIG = {
  assetsBaseUrl: XIWUQI_99_ROAD_NIGHT_ASSETS_BASE_URL,
  imageFile: 'main.png',
  imageAlt: '西乌旗99号公路之夜',
  targetUrl: 'https://v.douyin.com/ooOBXZXQd8Q/',
}

export function mergeConfig(publicConfig) {
  return { ...DEFAULT_CONFIG, ...(publicConfig?.mobileConfig || {}) }
}

export function assetUrl(baseUrl, filename) {
  if (!filename) return ''
  if (/^(https?:)?\/\//i.test(filename) || filename.startsWith('/') || filename.startsWith('data:')) {
    return filename
  }
  return `${String(baseUrl || '').replace(/\/$/, '')}/${filename.replace(/^\//, '')}`
}
