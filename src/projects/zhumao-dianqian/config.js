export const ZHUMAO_DIANQIAN_ACTIVITY_TYPE = 'zhumao_dianqian'
export const ZHUMAO_DIANQIAN_ACTIVITY_KEY = 'zhumao_dianqian_20260723'
export const ZHUMAO_DIANQIAN_ASSETS_BASE_URL =
  'https://assets.zice8.com/zhumao_dianqian/zhumao_dianqian_20260723'

export const DEFAULT_CONFIG = {
  assetsBaseUrl: ZHUMAO_DIANQIAN_ASSETS_BASE_URL,
  pageCount: 9,
  pageFileExt: 'png',
  imageWidth: 750,
  imageHeight: 1311,
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
