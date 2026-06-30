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
  tasks: {
    background: asset('74c6f34fc9b0ab2d02237c39b28c364f_639659_750_1624.png'),
    title: asset('950d4238c826bf986d72cf19db15e013_25084_315_82.png'),
    route: asset('c63aee7827c30882f9c46408acb8f3b7_66658_556_1112.png'),
    quiz: asset('2b9ff07ee4d2fc00432a31f375d8a2bb_130590_363_236.png'),
    checkin: asset('0a544d1c36c42801fba12970c65e604a_160968_363_269.png'),
    radio: asset('d8182bd442b8dee95e9a31f92fe56d9e_107643_363_323.png'),
    honors: asset('92380f896067012b90a0ceae354d9892_130276_363_203.png'),
  },
  quiz: {
    background: asset('47dd9b7e076e8ed058a850edd9d695db_310081_750_1624.png'),
    card: asset('2a6b3e480de2afa4fa79975cf6b238e7_65570_695_1153.png'),
    feedbackPanel: asset('e3f78375422ded1b45926228995b2ee8_72462_685_958.png'),
    successPanel: asset('ad8e60995b44a6d23f6452cb08dd7da1_612722_685_958.png'),
    successMedal: asset('6bca398c1407c5d6b48ac671673c7866_40625_465_380.png'),
    dailyDonePanel: asset('eb0dae3751e32de454cc7e37ba2822ac_65711_685_677.png'),
  },
}
