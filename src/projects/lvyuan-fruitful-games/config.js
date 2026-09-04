export const LVYUAN_FRUITFUL_GAMES_ACTIVITY_TYPE = 'lvyuan_consumer_game_collection'
export const LVYUAN_FRUITFUL_GAMES_ACTIVITY_KEY = 'lvyuan_fruitful_heart_2026'

export const LVYUAN_FRUITFUL_GAMES_ASSET_BASE = `https://assets.zice8.com/${LVYUAN_FRUITFUL_GAMES_ACTIVITY_TYPE}/${LVYUAN_FRUITFUL_GAMES_ACTIVITY_KEY}`

export const LVYUAN_FRUITFUL_GAMES_IH5_ASSETS = {
  background: '247f932dd14699f1a830558efc4b63f4_2455907_750_1624.png',
  homeTitle: 'dc158b9026db63abdbe9c1655b90188d_103543_547_92.png',
  homeHero: '5beedecd260eb401c946bc605dfe1d47_293268_474_270.png',
  homeStart: '3b71e4242db2aaed09d7fd6fbf269c44_122572_434_129.png',
  selectorTitle: 'e1adb42f697292523ecb83238628ec1d_116860_528_109.png',
  selectorSubtitle: '605c884863a0e3ae0777c3a7d93dcdbe_187172_567_134.png',
  selectorSnake: 'cfd60c307649394a3e3be358b4d2a720_262795_201_576.png',
  selectorSpotDifference: '8715bc5f593abd2fa7bdbf992ee3276a_254517_201_576.png',
  selectorFruitMerge: '4615f6cfcfee056027d5a588e8861f1b_254372_201_576.png',
  selectorFooter: '88b3b97a6c0b3285f76785357a20bfd9_272072_444_287.png',
  mergeRulesTitle: 'e9db21d6edb6387eff7568c3d5af62de_554991_631_426.png',
  mergeRulesDiagram: '41042f91aa5a8f4bd40a5d21264341a7_1313614_740_790.png',
  mergeRulesBack: '53aa93ef73c99076abc8b9e25ac244d9_156438_357_263.png',
  mergeRulesStart: 'd38476026148b3f9de858ac3917c019f_147856_367_267.png',
  snakeBackground: '2078ea4ed1d72ccc9e82e98305ec1144_3266804_765_1627.png',
  snakeTitle: 'b6bcc0301f373b3f255365ad434155ed_142239_615_91.png',
}

export const LVYUAN_SNAKE_MATERIALS = {
  head: 'dc160da0a2eb3002e5fc168f48dadca4_22990_93_117.png',
  bodies: [
    '5465b2d8cd5d93c4e2c27131e4bc287b_15364_84_94.png',
    '85f46fef0db7e12ccb25e6de06d49738_14966_84_94.png',
    '730ddb37650e4fa091ddb68340016f99_15486_84_94.png',
    '6d0b72638a484d9c0f3452dd081454a1_15430_84_94.png',
    '2297216545c748d8c6b9bc43314c034f_15119_84_94.png',
    'a0b0126269a6464f04d2558a40c901ce_15503_84_94.png',
    'b45030e83e8f267e7b34551df493de5c_14689_84_94.png',
    '666498cd81b33d9a10369415949ee5f0_14618_84_94.png',
    '2f5e4e7c886b692b6b52a1024688ad6e_14320_84_94.png',
    'dab6ea471fc0c2a014d836535d58ee4f_13962_84_94.png',
    'bf7c0299e22424cca025cffc9e4a177e_14212_84_94.png',
    '60fb3b3113326bd37596acee4cc845ac_14285_84_94.png',
  ],
}

export function getLvyuanFruitfulGamesAsset(assetName) {
  return `${LVYUAN_FRUITFUL_GAMES_ASSET_BASE}/${LVYUAN_FRUITFUL_GAMES_IH5_ASSETS[assetName] || assetName}`
}

export const LVYUAN_SNAKE_TARGET_SCORE = 100

export const LVYUAN_SNAKE_FRUITS = [
  { id: 'apple', label: '红苹果', emoji: '🍎', score: 10 },
  { id: 'pear', label: '甜香梨', emoji: '🍐', score: 15 },
  { id: 'orange', label: '金橘', emoji: '🍊', score: 20 },
]
