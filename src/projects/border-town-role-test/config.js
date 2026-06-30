export const BORDER_TOWN_ROLE_TEST_ACTIVITY_TYPE = 'border_town_role_test'
export const BORDER_TOWN_ROLE_TEST_ACTIVITY_KEY = 'border_town_role_test_20260701'
export const BORDER_TOWN_ROLE_TEST_ASSETS_BASE_URL =
  'https://assets.zice8.com/border_town_role_test/border_town_role_test_20260701'

export const DEFAULT_CONFIG = {
  assetsBaseUrl: BORDER_TOWN_ROLE_TEST_ASSETS_BASE_URL,
  heroImage: 'hero-river.png',
  homeBackgroundImage: '077eee7e62a2f9e0c418a6e1ec9b6f2e_2487088_750_1622.png',
  pageBackgroundImage: '077eee7e62a2f9e0c418a6e1ec9b6f2e_2487088_750_1622.png',
  homeIntroImage: 'c98f84fe9fef5441004b82a3a01bcc29_217849_680_352.png',
  homeTitleImage: '7125eb7d4ce30d939aac1f94c939ab34_92206_502_187.png',
  homeButtonImage: '16a9fe20bd99dde2e260c0802cc7f587_84696_471_99.png',
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
