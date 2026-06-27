export const BROCHURE_QUIZ_LOTTERY_ACTIVITY_KEY = 'zhongying_life_15th_five_year_quiz_lottery'
export const BROCHURE_QUIZ_LOTTERY_ACTIVITY_TYPE = 'brochure_quiz_lottery'

export const OSS_ASSET_ROOT =
  `https://assets.zice8.com/${BROCHURE_QUIZ_LOTTERY_ACTIVITY_TYPE}/${BROCHURE_QUIZ_LOTTERY_ACTIVITY_KEY}`

const ASSET_NAME_ALIASES = {
  'home-bg-overlay.png': '44b69f0f60d3d9169033a4abebc29184_1678508_750_1624.png',
  'home-title.png': 'ece697108c563e0e5edf936d310a41ee_172759_648_227.png',
  'carousel-placeholder.png': 'f4623270c38e7762f0e0472284893644_564204_750_422.png',
  'participate-button.png': 'c13d52d9aec214a5c7985c219bb783ca_48373_332_82.png',
}

export const DEFAULT_CONFIG = {
  assetsBaseUrl: OSS_ASSET_ROOT,
  imagesBaseUrl: OSS_ASSET_ROOT,
  audiosBaseUrl: OSS_ASSET_ROOT,
  home: {
    bgOverlay: '44b69f0f60d3d9169033a4abebc29184_1678508_750_1624.png',
    title: 'ece697108c563e0e5edf936d310a41ee_172759_648_227.png',
    logo: 'logo.png',
    participateButton: 'c13d52d9aec214a5c7985c219bb783ca_48373_332_82.png',
  },
  brochure: {
    placeholderImage: 'f4623270c38e7762f0e0472284893644_564204_750_422.png',
    slides: [
      { key: 'waiver', title: '投保人豁免篇', image: 'carousel-waiver.png', audio: 'waiver.mp3' },
      { key: 'value', title: '核心价值篇', image: 'carousel-value.png', audio: 'value.mp3' },
      { key: 'audience', title: '适用人群篇', image: 'carousel-audience.png', audio: 'audience.mp3' },
    ],
  },
}

export function resolveAssetFilename(filename) {
  return ASSET_NAME_ALIASES[filename] || filename
}

function normalizeAssetBaseUrl(value) {
  const base = String(value || '').trim()
  if (!base) return OSS_ASSET_ROOT
  return base
}

export function assetUrl(config, filename, folder = 'images') {
  if (!filename) return ''
  if (/^(https?:)?\/\//.test(filename) || filename.startsWith('data:')) return filename
  const resolvedFilename = resolveAssetFilename(filename)
  const base = folder === 'audios'
    ? normalizeAssetBaseUrl(config.audiosBaseUrl || config.assetsBaseUrl)
    : normalizeAssetBaseUrl(config.imagesBaseUrl || config.assetsBaseUrl)
  return `${base.replace(/\/$/, '')}/${resolvedFilename}`
}

export function mergeBrochureConfig(publicConfig) {
  const mobile = publicConfig?.mobileConfig || publicConfig?.config || {}
  const merged = {
    ...DEFAULT_CONFIG,
    ...mobile,
    home: { ...DEFAULT_CONFIG.home, ...(mobile.home || {}) },
    brochure: {
      ...DEFAULT_CONFIG.brochure,
      ...(mobile.brochure || {}),
      slides: mobile.brochure?.slides?.length ? mobile.brochure.slides : DEFAULT_CONFIG.brochure.slides,
    },
  }
  return {
    ...merged,
    assetsBaseUrl: normalizeAssetBaseUrl(merged.assetsBaseUrl),
    imagesBaseUrl: normalizeAssetBaseUrl(merged.imagesBaseUrl || merged.assetsBaseUrl),
    audiosBaseUrl: normalizeAssetBaseUrl(merged.audiosBaseUrl || merged.assetsBaseUrl),
  }
}
