export const LONGWEN_BEER_QUIZ_ACTIVITY_TYPE = 'longwen_beer_quiz'
export const LONGWEN_BEER_QUIZ_ACTIVITY_KEY = 'longwen_budweiser_quiz_20260812'
export const LONGWEN_BEER_QUIZ_ASSETS_BASE_URL =
  `https://assets.zice8.com/${LONGWEN_BEER_QUIZ_ACTIVITY_TYPE}/${LONGWEN_BEER_QUIZ_ACTIVITY_KEY}`

export const DEFAULT_CONFIG = {
  assetsBaseUrl: LONGWEN_BEER_QUIZ_ASSETS_BASE_URL,
  backgroundImage: '40b8738ae24a0f397dbedda9ca0fe031_2091058_750_1624.png',
  homeBannerImage: 'fb472be3e1c8483dd190d445db763890_102996_790_350.png',
  homeTitleImage: 'f2f0f8872a9e8cbb5ef6f54c46062cbd_87197_562_316.png',
  homeFooterImage: 'a54770d0d47f506eed0058f752e7ed83_57937_532_69.png',
  startButtonImage: '317f3a73cae6a9e7101d3ffb62de4e94_28409_228_108.png',
  prizeImage: '1.png',
}

export function mergeConfig(publicConfig) {
  return { ...DEFAULT_CONFIG, ...(publicConfig?.mobileConfig || {}) }
}

export function assetUrl(baseUrl, filename) {
  if (!filename) return ''
  if (/^(https?:)?\/\//i.test(filename) || filename.startsWith('/') || filename.startsWith('data:')) return filename
  return `${String(baseUrl || '').replace(/\/$/, '')}/${filename.replace(/^\//, '')}`
}
