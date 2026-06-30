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
  radio: {
    background: asset('2202c2c14234671ff69c8642c0d51226_615533_750_1624.png'),
    backIcon: asset('b25fef0a7ef46a1fc9580c405518deae_215.svg'),
    rankBadge: asset('31ea4dbdc9b6e8a865872b6543b42105_6925_59_71.png'),
    play: asset('3ae2bc9c7013b8a43776eeca87d06dd5_7175_62_62.png'),
    pause: asset('2a8b5b103e124b2cb35d5a3ef0f979df_6951_62_62.png'),
    star: asset('3ae2bc9c7013b8a43776eeca87d06dd5_7175_62_62.png'),
    starActive: asset('2a8b5b103e124b2cb35d5a3ef0f979df_6951_62_62.png'),
    recordBase: asset('ab73b29a0681193f3bb8acc0448a6be8_13446_363_234.png'),
    recordMic: asset('7969aeb942e8d1e0a9269876a9598ab8_16905_207_260.png'),
    recordWave: asset('5c7695f254ae0f4b430430444d0c31ac_10340_659_48.png'),
    recordPeople: asset('994976844574c02f3630e547882d92ff_8481_193_234.png'),
    recordNote: asset('e197146d640957ac746ce7ff1d0284a5_5718_64_101.png'),
    noticePanel: asset('e09a3c51847ae66e96b227c7d8f3de69_63829_685_584.png'),
    noticeButton: asset('e8851f582285b218ff391aee97168a05_22426_277_67.png'),
    shareTitle: asset('2e413cf764fa35f14d7cc3461850eb4a_21979_275_66.png'),
    shareContent: asset('d5186e2960e5724a87a4ee0d16dcebb5_13594_607_181.png'),
    shareButton: asset('d589e5f414195448856e34fc6b629b41_22444_277_67.png'),
  },
}
