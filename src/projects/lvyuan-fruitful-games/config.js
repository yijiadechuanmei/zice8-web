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
}

export function getLvyuanFruitfulGamesAsset(assetName) {
  return `${LVYUAN_FRUITFUL_GAMES_ASSET_BASE}/${LVYUAN_FRUITFUL_GAMES_IH5_ASSETS[assetName]}`
}

export const LVYUAN_SNAKE_TARGET_SCORE = 100

export const LVYUAN_SNAKE_FRUITS = [
  { id: 'apple', label: '红苹果', emoji: '🍎', score: 10 },
  { id: 'pear', label: '甜香梨', emoji: '🍐', score: 15 },
  { id: 'orange', label: '金橘', emoji: '🍊', score: 20 },
]
