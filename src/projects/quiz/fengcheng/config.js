export const FENGCHENG_ACTIVITY_KEY = 'fengcheng_wx_coin_partner_quiz_20260701'
export const FENGCHENG_THEME_KEY = 'fengcheng-partner-quiz'
export const FENGCHENG_ASSET_BASE_URL = `https://assets.zice8.com/quiz/${FENGCHENG_ACTIVITY_KEY}`
const FENGCHENG_PRELOAD_CACHE = new Map()

const DEFAULT_ASSET_NAMES = {
  homeBackground: 'a4e5502d7c05d5aea112eceb47cab20e_30184_750_1624.png',
  homeForeground: 'b68711009b4f8aa712fd82d976333ad8_1620126_750_1624.png',
  homeTitle: '35f7958af589637e49458aa47f0ca1a5_359111_726_496.png',
  homeStartButton: '1b4701c4fec06cd39a29ddc26265511e_68494_386_113.png',
  profileModal: 'e7091726064700513663fd9a585e0fda_385367_573_558.png',
  rankTitle: '30e31861ea200cfbf8c52fe47181ffdd_43202_469_84.png',
  rankHomeButton: 'fe3660b8c8a049409436c35ac7f6a0e0_63984_387_106.png',
  pageBackground: 'a4e5502d7c05d5aea112eceb47cab20e_30184_750_1624.png',
  pageForeground: 'b68711009b4f8aa712fd82d976333ad8_1620126_750_1624.png',
}

function cleanBaseUrl(value) {
  return String(value || FENGCHENG_ASSET_BASE_URL).replace(/\/$/, '')
}

export function isFengchengQuiz(activityKey, bootstrap, publicConfig) {
  return (
    activityKey === FENGCHENG_ACTIVITY_KEY ||
    bootstrap?.quizConfig?.themeKey === FENGCHENG_THEME_KEY ||
    publicConfig?.mobileConfig?.themeKey === FENGCHENG_THEME_KEY
  )
}

export function createFengchengLocalPublicConfig() {
  return {
    activityKey: FENGCHENG_ACTIVITY_KEY,
    title: '凤城实验学校“为先币”系列活动 · 亲子时政“最强拍档”挑战赛',
    type: 'quiz',
    accessMode: 'wechat_optional',
    oauthScope: 'snsapi_base',
    requireUserinfo: false,
    status: 1,
    mobileConfig: {
      themeKey: FENGCHENG_THEME_KEY,
      assetsBaseUrl: FENGCHENG_ASSET_BASE_URL,
      ...DEFAULT_ASSET_NAMES,
    },
    bgmConfig: {
      enabled: false,
      url: '',
      loop: true,
      autoplay: true,
      showControl: true,
      volume: 0.6,
    },
  }
}

export function getFengchengAssets(publicConfig) {
  const mobileConfig = publicConfig?.mobileConfig || {}
  const baseUrl = cleanBaseUrl(mobileConfig.assetsBaseUrl)
  const names = { ...DEFAULT_ASSET_NAMES, ...mobileConfig }
  return {
    baseUrl,
    homeBackground: `${baseUrl}/${names.homeBackground}`,
    homeForeground: `${baseUrl}/${names.homeForeground}`,
    homeTitle: `${baseUrl}/${names.homeTitle}`,
    homeStartButton: `${baseUrl}/${names.homeStartButton}`,
    profileModal: `${baseUrl}/${names.profileModal}`,
    rankTitle: `${baseUrl}/${names.rankTitle}`,
    rankHomeButton: `${baseUrl}/${names.rankHomeButton}`,
    pageBackground: `${baseUrl}/${names.pageBackground}`,
    pageForeground: `${baseUrl}/${names.pageForeground}`,
  }
}

function preloadImage(src) {
  if (!src || typeof window === 'undefined') return Promise.resolve()
  if (FENGCHENG_PRELOAD_CACHE.has(src)) return FENGCHENG_PRELOAD_CACHE.get(src)

  const promise = new Promise((resolve) => {
    const img = new window.Image()
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const decodeAndDone = () => {
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {}).finally(done)
        return
      }
      done()
    }

    img.onload = decodeAndDone
    img.onerror = done
    img.src = src
    if (img.complete) decodeAndDone()
  })

  FENGCHENG_PRELOAD_CACHE.set(src, promise)
  return promise
}

export function preloadFengchengHomeAssets(publicConfig) {
  const assets = getFengchengAssets(publicConfig)
  return Promise.all([
    preloadImage(assets.homeBackground),
    preloadImage(assets.homeForeground),
    preloadImage(assets.homeTitle),
    preloadImage(assets.homeStartButton),
  ]).then(() => undefined)
}

export function formatFengchengDuration(ms) {
  const seconds = Math.max(Number(ms || 0) / 1000, 0)
  return `${seconds.toFixed(2)}s`
}
