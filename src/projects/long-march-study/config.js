export const LONG_MARCH_STUDY_ACTIVITY_KEY = 'long_march_study_2026'
export const LONG_MARCH_STUDY_ACTIVITY_TYPE = 'long_march_study'

export const LONG_MARCH_STUDY_ASSET_ROOT =
  `https://assets.zice8.com/${LONG_MARCH_STUDY_ACTIVITY_TYPE}/${LONG_MARCH_STUDY_ACTIVITY_KEY}`

const asset = (filename) => `${LONG_MARCH_STUDY_ASSET_ROOT}/${filename}`

export const longMarchStudyAssets = {
  home: {
    background: asset('93c60fd921a536d388a178b41488ba9b_1088216_750_1624.png'),
    title: asset('e87b38824f50bcd03264ba37d6e0e986_185513_612_366.png'),
    startButton: asset('11f498edf60ef86948992c9c81795401_67802_503_108.png'),
    rulesButton: asset('d9fb45cc0377f28f6d503edc91b4b0ba_2279_43_103.png'),
    mineButton: asset('6118df165b616d93b21fa16a1e65e963_1773_43_103.png'),
    rankButton: asset('87407071eccf67f3e145ef6ae5e38763_2073_43_103.png'),
  },
  modal: {
    rules: asset('e3f78375422ded1b45926228995b2ee8_72462_685_958.png'),
    profile: asset('ba27e78232205479ae5c6f8b5f6d18c1_68551_686_794.png'),
  },
}
