export const XIANGYU_GLOBAL_TREASURE_ACTIVITY_TYPE = 'xiangyu_global_treasure'
export const XIANGYU_GLOBAL_TREASURE_ACTIVITY_KEY = 'xiangyu_global_treasure_2026'
export const XIANGYU_GLOBAL_TREASURE_ASSETS_BASE_URL =
  `https://assets.zice8.com/${XIANGYU_GLOBAL_TREASURE_ACTIVITY_TYPE}/${XIANGYU_GLOBAL_TREASURE_ACTIVITY_KEY}`

export const DEFAULT_CONFIG = {
  assetsBaseUrl: XIANGYU_GLOBAL_TREASURE_ASSETS_BASE_URL,
  backgroundImage: '80a461c66e9ca7916b2264ff15b1d367_2034609_750_1624.png',
  homeTitleImage: 'f926d0f39884e1e55b207629acff79aa_309478_532_384.png',
  homeButtonImage: '13361ff6ba3c9e12ff355c7ed42bab91_38359_277_99.png',
  homeFieldLabelImage: 'a3322355ac66f1ce864987d9ad5ce4c3_13102_263_50.png',
  inputBackgroundImage: '411079ca170f86c4b3fa46cbc8013ef1_64084_404_203.png',
  homeMascotImage: '4430a1a0b9c4e336fc5c4a20edffb52b_291055_453_398.png',
  brandImage: '1a55dd40a4581d192626642d6d41c4ae_12096_242_94.png',
  wonTitleImage: '0e8827802f289372e236477819044e2f_143129_517_236.png',
  lockedChestImage: '004b4cb1ab1d272387a280795ab9cd14_377013_500_369.png',
  openChestButtonImage: 'f8e97d715723ae9df474f1f9d796039f_38419_277_99.png',
  redeemPanelImage: '4d03cfc216f478adc39832151b89d9a1_386058_663_742.png',
  openedChestImage: '46b7338147d7c6f131c679195b0f808c_509038_524_482.png',
  openedTitleImage: '77a64923932ef7d2b3102ad0ba842127_14810_262_59.png',
  lostTitleImage: 'a4909e32ea9418dd16d4a8afe4987e7c_132953_529_224.png',
  tryAgainImage: '37e2f312858b823f91b82f3b148c90c3_21060_185_66.png',
  tomorrowImage: 'b9887eb6865184cdb17dac3382ca55e6_21229_185_66.png',
  dailyLimitImage: '75b49ce19a6ba3f4bee8e6da89aead04_24688_396_45.png',
  lostMascotImage: '5717f102e20563f798a4e3c53feb2def_232300_366_393.png',
}

export function mergeConfig(publicConfig) {
  return { ...DEFAULT_CONFIG, ...(publicConfig?.mobileConfig || {}) }
}

export function assetUrl(baseUrl, filename) {
  if (!filename) return ''
  if (/^(https?:)?\/\//i.test(filename) || filename.startsWith('/') || filename.startsWith('data:')) return filename
  return `${String(baseUrl || '').replace(/\/$/, '')}/${filename.replace(/^\//, '')}`
}
