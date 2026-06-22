export const TJRCB_PENSION_MANUAL_ACTIVITY_TYPE = 'tjrcb_pension_manual'
export const TJRCB_PENSION_MANUAL_ACTIVITY_KEY = 'tjrcb_pension_manual_20260622'

export const TJRCB_PENSION_MANUAL_ASSET_ROOT =
  'https://assets.zice8.com/tjrcb_pension_manual'

export const TJRCB_PENSION_MANUAL_DEFAULT_CONFIG = {
  assetsBaseUrl: `${TJRCB_PENSION_MANUAL_ASSET_ROOT}/${TJRCB_PENSION_MANUAL_ACTIVITY_KEY}`,
  pagesBaseUrl: `${TJRCB_PENSION_MANUAL_ASSET_ROOT}/pages`,
  audiosBaseUrl: `${TJRCB_PENSION_MANUAL_ASSET_ROOT}/audios`,
  pageCount: 29,
  pageFilePadding: 2,
  pageFileExt: 'jpg',
  audioFilePadding: 2,
  audioFileExt: 'mp3',
  backgroundImage: 'background.png',
  logoImage: 'logo.png',
  titleImage: 'title.png',
  prevIcon: 'prev.svg',
  nextIcon: 'next.svg',
  audioLabel: '语音讲解',
  categories: [
    { label: '个人篇', page: 1 },
    { label: '家庭篇', page: 7 },
    { label: '企业篇', page: 13 },
    { label: '服务篇', page: 19 },
    { label: '安全篇', page: 25 },
  ],
}

export function mergeManualConfig(publicConfig) {
  return {
    ...TJRCB_PENSION_MANUAL_DEFAULT_CONFIG,
    ...(publicConfig?.mobileConfig || {}),
  }
}

export function manualAssetUrl(baseUrl, filename) {
  if (!filename) return ''
  if (/^(https?:)?\/\//i.test(filename) || filename.startsWith('/') || filename.startsWith('data:')) return filename
  return `${String(baseUrl || '').replace(/\/$/, '')}/${filename.replace(/^\//, '')}`
}

export function buildIndexedAssetUrl(baseUrl, index, padding, extension) {
  const pageNo = index + 1
  const filename = `${String(pageNo).padStart(Number(padding) || 0, '0')}.${extension || ''}`
  return manualAssetUrl(baseUrl, filename)
}
