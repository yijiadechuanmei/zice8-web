export const MATERIAL_REGISTRATION_ACTIVITY_KEY =
  'material_community_registration_20260620'

export const MATERIAL_REGISTRATION_ACTIVITY_TYPE =
  'material_review_registration'

export const MATERIAL_REGISTRATION_ASSETS = {
  background: '87bbe600f0195a271dceaea0cbd40e99_1377921_853_1844.png',
  homeLogo: '73603d6d3051f84cbffd5e29a9f4006d_23330_356_78.png',
  homeTitle: 'cd01fc01e58bd1f3597586c1b97ec3da_31915_715_278.png',
  successTitle: '02ebaf25c38011a851dbb81f6bffa2ed_11098_455_91.png',
  declineSuccessTitle: 'https://file3.ih5.cn/v35/edt/u10013600/c017168573ea9f56fd14661f278ad39a_10850_546_88.png',
  documentIcons: [
    '3caf49840fc38f106c75784cba1352c7_5687.svg',
    'a8f5261cddd5fe420bc75da17e7783dd_5206.svg',
    '77d14bd5c9cf3b8858e2d017b71a8f2a_1184.svg',
    '76bf32fa974024bb1f8f9adb7305cef0_2276.svg',
  ],
  checkIcon: '9409243b9cd1afee07f51193dadad173_273.svg',
  backIcon: 'c11b584b4606a0f848853d9ce80c342e_270.svg',
  mapButton: 'map.png',
}

export function assetUrl(assetsBaseUrl, filename) {
  if (/^(https?:)?\/\//i.test(filename)) return filename
  return `${assetsBaseUrl}/${filename}`
}
