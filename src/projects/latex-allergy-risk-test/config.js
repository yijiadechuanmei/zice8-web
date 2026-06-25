export const LATEX_ALLERGY_RISK_TEST_ACTIVITY_TYPE = 'latex_allergy_risk_test'
export const LATEX_ALLERGY_RISK_TEST_ACTIVITY_KEY = 'latex_allergy_risk_test_20260625'
export const LATEX_ALLERGY_RISK_TEST_ASSETS_BASE_URL =
  'https://assets.zice8.com/latex_allergy_risk_test/latex_allergy_risk_test_20260625'

export const DEFAULT_CONFIG = {
  assetsBaseUrl: LATEX_ALLERGY_RISK_TEST_ASSETS_BASE_URL,
  backgroundImage: 'landing-bg.png',
  logoImage: 'logo.png',
  miniProgram: {
    enabled: false,
    username: '',
    path: '',
    envVersion: 'release',
    fallbackUrl: '',
  },
  storeUrl: '',
}

export function mergeConfig(publicConfig) {
  const mobileConfig = publicConfig?.mobileConfig || {}
  return {
    ...DEFAULT_CONFIG,
    ...mobileConfig,
    miniProgram: {
      ...DEFAULT_CONFIG.miniProgram,
      ...(mobileConfig.miniProgram || {}),
    },
  }
}

export function assetUrl(baseUrl, filename) {
  if (!filename) return ''
  if (/^(https?:)?\/\//i.test(filename) || filename.startsWith('/') || filename.startsWith('data:')) return filename
  return `${String(baseUrl || '').replace(/\/$/, '')}/${filename.replace(/^\//, '')}`
}
