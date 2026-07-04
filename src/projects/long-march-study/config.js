export const LONG_MARCH_STUDY_ACTIVITY_KEY = 'long_march_study_2026'
export const LONG_MARCH_STUDY_ACTIVITY_TYPE = 'long_march_study'

export const LONG_MARCH_STUDY_ASSET_ROOT =
  `https://assets.zice8.com/${LONG_MARCH_STUDY_ACTIVITY_TYPE}/${LONG_MARCH_STUDY_ACTIVITY_KEY}`

const asset = (filename) => `${LONG_MARCH_STUDY_ASSET_ROOT}/${filename}`
const ih5Asset = (filename) => `https://file3.ih5.cn/v35/edt/u10013600/${filename}`

export const longMarchStudyAssets = {
  splash: {
    background: ih5Asset('eceba6b9e5b20db2be0b0c0e971c9554_1320025_750_1624.png'),
    participantFrame: ih5Asset('3a324b6317b93eb353b7289b2c5381d2_33278_547_541.png'),
  },
  home: {
    background: asset('93c60fd921a536d388a178b41488ba9b_1088216_750_1624.png'),
    title: asset('1d0cded85f7d17e338bf72dddbc61727_192912_612_366.png'),
    startButton: asset('11f498edf60ef86948992c9c81795401_67802_503_108.png'),
    rulesButton: asset('d9fb45cc0377f28f6d503edc91b4b0ba_2279_43_103.png'),
    mineButton: asset('6118df165b616d93b21fa16a1e65e963_1773_43_103.png'),
    rankButton: asset('87407071eccf67f3e145ef6ae5e38763_2073_43_103.png'),
  },
  modal: {
    rules: asset('e3f78375422ded1b45926228995b2ee8_72462_685_958.png'),
    profile: asset('ba27e78232205479ae5c6f8b5f6d18c1_68551_686_794.png'),
  },
  mine: {
    scoreBar: asset('98f00baf23d0b2da214e693a655e9958_6961_519_76.png'),
    ledgerButton: ih5Asset('a6ae0c1eb7b456ca6c252d35149681f7_5813_626_59.png'),
    quizButton: ih5Asset('597a300bd8d4018e3eb9b48fa96ab09b_5978_626_61.png'),
    honorsButton: ih5Asset('63ec4f98ad44e6b1772ae676d27a26ea_5839_626_64.png'),
    posterButton: ih5Asset('095d9fddd09f5d111c49362c208d2ae6_6067_626_64.png'),
    rankButton: ih5Asset('9f34650f48d774409f433f55802643f0_6037_626_62.png'),
    shareScreenshotButton: ih5Asset('f4a57957d2f8aa00ab48e5c6ff0030ff_5989_626_61.png'),
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
  checkin: {
    background: ih5Asset('522bb90d7aa579a2e8a338119f144eea_180528_750_1624.png'),
    successBackground: ih5Asset('6d82d38087e1b37eddbf023260ac2173_1167263_750_1624.png'),
    successPanel: ih5Asset('82dca40305f5fdd8028054e4801f88a2_18477_688_980.png'),
    silhouette: asset('87d3ed8bac5e1426510c6f70235f6f73_100281_607_870.png'),
    locationOne: asset('1721be6c4318820efe55591a6d5fcf56_118921_363_276.png'),
    locationOneActive: asset('3dde499c787390ea151bcadfc14fc0db_101568_363_276.png'),
    locationTwo: asset('e18b5889e061591da2a33b991cabe2f2_125628_361_278.png'),
    locationTwoActive: asset('eb954da39a73320ec1415484ee8d6f19_102861_361_278.png'),
    locationThree: asset('c461bcc484aabe6568bea433b390d60b_140842_379_279.png'),
    locationThreeActive: asset('d3c32f61aeeb7c09ca5330ed053a89e3_113656_379_279.png'),
    locationFour: asset('65a7425c14a7be116b73da77298b7ac6_147080_384_276.png'),
    locationFourActive: asset('f426c928645a9427b53682804a0cc867_119367_384_276.png'),
    checkButton: asset('3437ca526beaab53ce0a3a93c786ca10_10476_158_52.png'),
    homeButton: asset('1805234c8d7c935ecfb04f47f9dc5753_30178_367_68.png'),
    detailOne: asset('bbf9ec2a07f6c20cdad629137a4738c7_730391_685_1139.png'),
    detailTwo: asset('61f71c1b2376ead76a161b70ad380af9_625300_685_1139.png'),
    detailThree: asset('4b7901a440f52f11201c664a61de4577_797191_685_1139.png'),
    detailFour: asset('f967f593d141e3624dbf034e355bffb0_792812_685_1184.png'),
  },
  checkinPoster: {
    posterBackground: asset('2202c2c14234671ff69c8642c0d51226_615533_750_1624.png'),
    background: ih5Asset('b6fa357bd43abe1217388630d0ae368f_992544_750_1624.png'),
    title: ih5Asset('1d0cded85f7d17e338bf72dddbc61727_192912_612_366.png'),
    share: ih5Asset('3e17b8ebb7ea1c14259431fd2ea5d142_1185040_689_1237.png'),
    locations: [
      ih5Asset('0c91f6328e26a61205498d9d4f6a3b7f_1089662_698_799.png'),
      ih5Asset('47529f86d322d6cf93e0fbf962e8d356_1050979_706_796.png'),
      ih5Asset('01131dbffc13b2e982bbc096d05ec3b4_1299366_695_818.png'),
      ih5Asset('7329695e619d996c312b60506eae05ea_1035596_672_781.png'),
    ],
  },
  honors: {
    badge: asset('a55e1e9da1cb4578ffac6b0eebedd582_26351_119_134.png'),
    honorPanel: asset('82dca40305f5fdd8028054e4801f88a2_18477_688_980.png'),
    posterPanel: asset('e0cd35378356b62af1ad6741f3dcafc8_16437_688_864.png'),
    certificate: asset('4092e3d7f20dfabccf122eb24fb73e60_214938_621_1140.png'),
    poster: asset('f967f593d141e3624dbf034e355bffb0_792812_685_1184.png'),
  },
  shared: {
    backIcon: asset('b25fef0a7ef46a1fc9580c405518deae_215.svg'),
  },
}
