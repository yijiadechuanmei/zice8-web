export const NANHAI_INSPECTION_CHALLENGE_TYPE = 'nanhai_inspection_challenge'
export const NANHAI_INSPECTION_CHALLENGE_KEY = 'nanhai_work_injury_prevention_2026'
export const NANHAI_INSPECTION_CHALLENGE_TITLE = '幸福南海巡检图 工伤预防知识大闯关'

export const NANHAI_INSPECTION_ASSET_ROOT =
  import.meta.env.VITE_NANHAI_INSPECTION_ASSET_ROOT ||
  `https://assets.zice8.com/${NANHAI_INSPECTION_CHALLENGE_TYPE}/${NANHAI_INSPECTION_CHALLENGE_KEY}`

export function nanhaiAsset(filename) {
  return `${NANHAI_INSPECTION_ASSET_ROOT}/${filename}`
}

// 设计稿原始资源文件名：所有资源均由活动 OSS 目录提供。
export const NANHAI_ART = {
  home: {
    canvas: [1477, 750],
    background: '04069ac0a549f3af2c0f404cafd130a6_1922556_1477_750.png',
    layers: [
      ['06f43cce3f5cd8b83c68181c77ac8ad7_252329_935_303.png', 231, 22, 935, 303],
      ['6ed44262b29dc601ba9531c9043e8911_59547_543_80.png', 467, 311, 543, 80],
      ['f82f1f703f3cb43497cf4d52688b4b0e_75621_409_111.png', 534, 572, 409, 111, 'start'],
      ['9d196895dd78c56ea610abfd0672b167_49015_553_52.png', 462, 686, 553, 52],
    ],
  },
  rules: {
    canvas: [1477, 750],
    background: '61950a9f3b817ad23f8d2640e4eab974_1603580_1477_750.png',
    layers: [
      ['2fe88eaa8d56a4dfe51934fb0f6a1e26_66757_651_221.png', 413, 19, 651, 221],
      ['035918918cd404739426e4feb8593293_294690_1105_516.png', 186, 140, 1105, 516],
      ['704208b3c185bd2ec08f9936661d966d_30245_287_71.png', 595, 667, 287, 71, 'enter-map'],
    ],
  },
  map: {
    canvas: [1477, 750],
    background: '6fb3cc9d7b2812d1aea11523bea09577_1686863_1477_750.png',
    layers: [
      ['272cbf92d41b6a32f67eaed75d9ade1b_200748_861_189.png', 308, 97, 861, 189],
      ['671566d066513ab225bd3f6ad00773cf_31082_158_138.png', 63, 409, 158, 138],
      ['dd6ae51b537a2a0894e49e193a6354f9_28229_148_126.png', 1266, 413, 148, 126, 'debug-complete'],
      ['05a8f3487a977dde885ba40949332d70_16513_891_35.png', 406, 456, 891, 35],
      ['1d8337a798cef91dac23767b072a6102_62354_355_92.png', 561, 639, 355, 92, 'start-scene'],
    ],
    cards: [
      ['a64e7016ba2f0486d7f1a7f3757a8446_82359_178_223.png', 230, 361, 178, 223],
      ['97e7e96167b9c1d033aa09b15c17e382_87009_179_223.png', 444, 363, 179, 223],
      ['3b4043a254d256853c1c5f52edc9af5b_86606_178_223.png', 657, 361, 178, 223],
      ['843b3048cc04983b944e73dddc5ad7d1_86659_179_223.png', 869, 363, 179, 223],
      ['b658b4dfefbc6aff9fd92d9ccbad6af1_84435_178_223.png', 1079, 361, 178, 223],
    ],
    unlockedLocks: [
      [368, 372, 39, 36],
      [583, 372, 38, 36],
      [796, 371, 39, 37],
      [1006, 373, 39, 36],
      [1217, 373, 39, 37],
    ],
  },
  scenes: [
    {
      canvas: [2109, 750], background: '564aa823ebedf1e0fc4117dc4b8410ee_3415240_2109_750.png',
      pins: [
        ['b23df2910e469d8505bf281bcd375d75_12053_82_82.png', 327, 400],
        ['bd5cbec1077bc08e78dff14f494f0bf1_12002_82_82.png', 656, 331],
        ['f5465947e677eb30c599164b2a8d8ada_12024_82_82.png', 983, 274],
        ['8bb5056242ab89697d57e132ddd29608_12028_82_82.png', 1376, 413],
        ['912954d1fe45e45e2bf638aa7da258bc_12048_82_82.png', 1668, 315],
        ['19127c579bc06f7871c510b0ff84ec7a_12029_82_82.png', 1887, 375],
      ],
    },
    {
      canvas: [2109, 750], background: '7d6cfc20aad841bc3a1473306947e825_3219228_2109_750.png',
      pins: [
        ['1f8afef7c577a0f88960cd5e18bb838b_12052_82_82.png', 221, 316],
        ['3452e4cabe5ff2c45dc3e9421a91daae_11993_82_82.png', 418, 429],
        ['1515ee27f8d0c71865b3fd2417f8a956_11974_82_82.png', 1253, 131],
        ['2181b8951dd80b930f2edde0a6b7bcb0_12020_82_82.png', 1315, 493],
        ['0fdd885c34fe162c4ae05b37076ef99c_12016_82_82.png', 1634, 152],
        ['90d6650754be261cc28a831ee49fad6c_12024_82_83.png', 1752, 605],
      ],
    },
    {
      canvas: [2109, 750], background: 'ec8d1ceeb3748d377e07472954a0c5ed_3361439_2109_750.png',
      pins: [
        ['2931d2831d2e6bd9f324f7bafb556c7b_12015_82_82.png', 244, 388],
        ['0be003e021fc7ccfc26c9b73072bb33f_11913_82_83.png', 530, 380],
        ['ea92c3cbd8044e15dfdb251930242083_12037_82_82.png', 964, 523],
        ['9f09b52567e16f8c81c829655972c3c1_11979_82_82.png', 1067, 441],
        ['9b47c10e55e02bd7b12e58bf93fec108_12004_82_82.png', 1508, 492],
        ['22492a115780b1f7374bdbdb1e4545e5_11989_82_82.png', 1687, 419],
      ],
    },
    {
      canvas: [2109, 750], background: 'd58d909eb531cb493f6562f0003e45dc_3382010_2109_750.png',
      pins: [
        ['bc25b1095ce3d7b48fed82b5889a5e0f_12012_82_82.png', 227, 60],
        ['e37721c33b4421e1ae4df8736e26d20f_12046_82_82.png', 228, 586],
        ['e84868c1c7c30fe3d56ce54b10644760_11927_82_82.png', 567, 463],
        ['d1349d5f54710c6df1c68102c0df495b_11995_82_82.png', 1001, 574],
        ['e300bd437aa79961b707fb0faeb81597_12019_82_82.png', 1364, 545],
        ['05c8eeb89768091c124ebfbb3450561d_12024_82_82.png', 1809, 349],
      ],
    },
    {
      canvas: [2109, 749], background: '6f175e72d6bc8049834fcd8a74cd57ea_3398817_2109_749.png',
      pins: [
        ['200ada254120752e6c2a155ef931fc8b_11996_82_82.png', 165, 463],
        ['4ba2b5796b094bca3ef325cd1755b341_12009_82_82.png', 351, 190],
        ['f90761f1e2678f15b28925e65018577a_11996_82_82.png', 702, 231],
        ['8b716c1837fbc911dc44bdf7e6a0cf04_12000_82_82.png', 1398, 217],
        ['796881bb6f7310c624249efb77f1f5e5_12058_82_82.png', 1925, 258],
        ['495734fd0c0022d744efdf09d37fa56b_12014_82_82.png', 1842, 620],
      ],
    },
  ],
  success: {
    canvas: [1477, 750], background: '6fb3cc9d7b2812d1aea11523bea09577_1686863_1477_750.png',
    layers: [
      ['e9093583acd7d043ae8ca2ff71196c1f_373690_1046_547.png', 212, 172, 1046, 547],
      ['e7c1fec6c7d766a6848d6d033aef1c9a_25234_245_54.png', 616, 637, 245, 54, 'draw'],
      ['1fcd6ddf4f8eac087f67afd58556d376_72258_2106_226.png', 332, 43, 824, 90],
    ],
    wheel: {
      disc: ['929e6d562afc39f8ba553208198639a9_38598_401_400.png', 998.83, 415.83, 401, 400],
      base: ['de74ea8d96599456066d3f794398a906_29148_430_455.png', 782, 196, 430, 455],
      ring: ['defd36489703661e8b267ada9e14ade5_18069_106_109.png', 945.83, 370, 106, 109],
      pointer: ['e47d985e784744df3207cdf9e9a16293_3773_23_34.png', 987.33, 339, 23, 34],
    },
  },
  share: {
    canvas: [1477, 750], background: '6fb3cc9d7b2812d1aea11523bea09577_1686863_1477_750.png',
    layers: [
      ['1fcd6ddf4f8eac087f67afd58556d376_72258_2106_226.png', 332, 43, 824, 90],
      ['e36bbf5dcb5c6a98525a0a2acae8985d_366308_913_517.png', 282, 162, 913, 517],
      ['08aff44d38b8933b1f028dcdf2b3a7a3_32711_276_64.png', 415, 608, 276, 64, 'share'],
      ['49f1bcb43ad7e6e493b36082bca07b6f_30863_272_64.png', 790, 608, 272, 64, 'home'],
    ],
  },
  questionPanel: '45465f95e491916e49e69214348347f8_188328_817_634.png',
  answerPanel: 'cf585af83b61db3e85d16c737670c1f0_103953_331_236.png',
  answerCorrect: 'f8dc7d4c10ab4f16df939d2a3a6d8537_89734_337_240.png',
  answerClose: '5e273dd7ad20a8615feb2f2163c65f20_12876_161_34.png',
  unlockedLock: 'f912835b4cd05961ffec0eacef35e292_5312_39_36.png',
}
