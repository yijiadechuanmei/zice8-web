import posterBackground from './assets/poster-background.png'
import posterCard from './assets/poster-card.png'
import posterTitle from './assets/poster-title.png'
import posterFooter from './assets/poster-footer.png'
import posterBadge from './assets/poster-badge.png'

export const ANTI_FRAUD_BOARD_GAME_ACTIVITY_TYPE = 'anti_fraud_board_game'
export const ANTI_FRAUD_BOARD_GAME_ACTIVITY_KEY = 'anti_fraud_board_game_20260623'

const CDN_BASE = 'https://assets.zice8.com/anti_fraud_board_game/anti_fraud_board_game_20260623'

export const antiFraudBoardAssets = {
  bgm: `${CDN_BASE}/281974df63e94d666beaa1340df4fa50_853056.mp3`,
  home: {
    background: `${CDN_BASE}/1d1bde02edf2a9c5362b59954c88cd74_260047_750_1624.png`,
    topRibbon: `${CDN_BASE}/de3344222eb2d00971209248997a171b_14199_718_81.png`,
    title: `${CDN_BASE}/4fbcdd875215f1b215b09315d515e7c8_55319_574_425.png`,
    subtitle: `${CDN_BASE}/eea20e19dbff4f2467ad1428634d7fe6_9081_534_98.png`,
    mascot: `${CDN_BASE}/b9c8a79316cd698c7e6d2970a3b87070_57349_504_370.png`,
    startButton: `${CDN_BASE}/3d44c3056ee85a0c926c267b5313fe71_7710_346_106.png`,
    footer: `${CDN_BASE}/041121b6f71dca3893ec8d1d245aae86_11969_643_37.png`,
  },
  game: {
    background: `${CDN_BASE}/b53a10c739b44392a5d0c5ae8da4e24a_324480_750_1624.png`,
    board: `${CDN_BASE}/c83a31f20b2c3b89f602f922ef28e8cb_293578.webp`,
    startDecor: `${CDN_BASE}/df3b46d077c674e55010e00130ed586e_39168.webp`,
    finishDecor: `${CDN_BASE}/cf0351deb36950e75901fe244e69117a_21046.webp`,
    signTop: `${CDN_BASE}/ad1c8cd2d939a28290abb0f6d8f31e33_12304.webp`,
    signBottom: `${CDN_BASE}/0443a038b3b92dcfa205db5998a22ea9_9308.webp`,
    lamp: `${CDN_BASE}/811c6174bf1ce2a50656b4f124681b28_6164.webp`,
    badge: `${CDN_BASE}/905726bb8a5d2b42d0b4dc543e426dee_10406.webp`,
    tile: `${CDN_BASE}/ece607fa58d60429a58a299b29bfc67b_10774.webp`,
    character: `${CDN_BASE}/b5e04ebc7c449cf4bb8df045f59559a4_17381_294_327.gif`,
    prompt: `${CDN_BASE}/cd5a751235d7e3717b8b537b4acafa15_18914.webp`,
    questionCard: `${CDN_BASE}/228d07f79c1583c4f46fe5bd3edfcefc_739732_1017_1220.png`,
    optionA: `${CDN_BASE}/b4f1a0cf17daa95afda9d25b46ef14a1_5386_102_83.png`,
    optionB: `${CDN_BASE}/fed4854bf10bd15d7f19f7962265e754_5303_102_83.png`,
    optionC: `${CDN_BASE}/aa24444f1c677d329bf1eb84f9f6d01f_5257_102_83.png`,
    nextButton: `${CDN_BASE}/4fb03353a1e0ec18d66e887d28cd8553_1503_106_41.png`,
    propCurrencyReference: `${CDN_BASE}/0605c38027d410981da37ede15a572a1_24916.webp`,
    answerPanel: `${CDN_BASE}/7829f544404d79b7731f9e45e6e499d9_96322.webp`,
    correctAnswerPanel: `${CDN_BASE}/9ed712e6dd6ba98dc36daa853ba74bb0_116348.webp`,
    diceGlow: `${CDN_BASE}/0b27563217b02a3c956f330392b9dc21_460469_663_663.png`,
    diceRolling: `${CDN_BASE}/5baad9ebe85601da084d4f7dbd467bd9_30064.webp`,
    diceRollingText: `${CDN_BASE}/e4cb8e659b5257432cd9e97a35bfc8c3_8216.webp`,
    diceResult: `${CDN_BASE}/2b661a938e147dda5ff27e2637a04cfa_23686.webp`,
    diceResultText: `${CDN_BASE}/82efdf46f46e02c2cf84313519932c02_4804.webp`,
    successPanel: `${CDN_BASE}/d372f144d683a21eb9bc690ce452afbc_56022.webp`,
    posterButton: `${CDN_BASE}/6cc8655dedb364107e6bb4f0d2761680_7652.webp`,
    correctSound: `${CDN_BASE}/d.mp3`,
    wrongSound: `${CDN_BASE}/c.mp3`,
  },
  poster: {
    background: posterBackground,
    card: posterCard,
    title: posterTitle,
    footer: posterFooter,
    badge: posterBadge,
  },
}

export const BOARD_POINTS = [
  { x: 77, y: 145 },
  { x: 211, y: 145 },
  { x: 295, y: 145 },
  { x: 295, y: 64 },
  { x: 295, y: -16 },
  { x: 379, y: -16 },
  { x: 465, y: -10 },
  { x: 464, y: 66 },
  { x: 548, y: 66 },
  { x: 548, y: 145 },
  { x: 633, y: 145 },
  { x: 716, y: 145 },
  { x: 716, y: 65 },
  { x: 795, y: 65 },
  { x: 875, y: 65 },
  { x: 875, y: 145 },
  { x: 960, y: 145 },
]

export const BOARD_TILES = [
  { x: 219, y: 217 },
  { x: 303, y: 217 },
  { x: 303, y: 136 },
  { x: 303, y: 56 },
  { x: 387, y: 56 },
  { x: 472, y: 56 },
  { x: 472, y: 138 },
  { x: 556, y: 138 },
  { x: 556, y: 217 },
  { x: 641, y: 217 },
  { x: 724, y: 217 },
  { x: 724, y: 137 },
  { x: 803, y: 137 },
  { x: 883, y: 137 },
  { x: 883, y: 217 },
  { x: 968, y: 217 },
]

export const QUESTION_BANK = [
  {
    title: '(单选)在辨识第五套人民币过程中，改变钞票观察角度，关于不同面额光彩光变数字颜色变化说法错误的是：（ ）',
    options: ['100元、20元、5元券的面额数字的颜色在金色和绿色之间变化', '50元和10元券在绿色和蓝色之间变化', '颜色基本无变化'],
    answerIndex: 2,
    analysis: 'C、不同面额的光彩光变数字会随观察角度改变而变色，并非颜色基本无变化。',
  },
  {
    title: '(单选)以下可能是假币的是：（ ）',
    options: ['水印发黄或对印图案错位', '光彩光变面额数字，变换角度时有变色且有光带滚动', '透光显示完整紫红色安全线'],
    answerIndex: 0,
    analysis: 'A、水印发黄或对印图案错位，可能是假币特征。',
  },
  {
    title: '(多选)以下哪种行为会被依法追究刑事责任：（ ）',
    options: ['变造货币总面额在2000元以上', '变造货币量200张（枚）以上', '变造货币总面额在1000元以上或100张（枚）以上，2年内因变造货币受过行政处罚，又变造货币的'],
    answerIndex: [0, 1, 2],
    analysis: 'A、B、C均符合依法追究刑事责任的情形。',
  },
  {
    title: '(单选)图片中的人民币是否属于“道具类”假币：（ ）',
    referenceImage: antiFraudBoardAssets.game.propCurrencyReference,
    options: ['是', '否'],
    answerIndex: 0,
    analysis: 'A、图片中的人民币印有“影视道具”字样，属于道具类假币。',
  },
  {
    title: '(多选)以下哪种行为属于被禁止的违规虚假宣传：（ ）',
    options: ['以高价回收、投资价值高为噱头', '混淆“纪念章”与“纪念币”', '人民币类收藏品用中国人民银行发行、回购等诱导性表述'],
    answerIndex: [0, 1, 2],
    analysis: 'A、B、C均属于被禁止的违规虚假宣传。',
  },
  {
    title: '(单选)如果你收到一条短信，内容是“点击链接购买内部体育彩票，中奖率100%”，正确做法是？',
    options: ['点击链接查看详情', '忽略短信，不轻易点击陌生链接', '保存链接，等有空再买'],
    answerIndex: 1,
    analysis: 'B、不轻易点击陌生链接，避免进入钓鱼网站或参与非法彩票。',
  },
  {
    title: '(单选)当你看到有人宣传一款“高返奖、中奖率100%”的彩票APP时，你应该怎么做？',
    options: ['保持警惕，这很可能是非法彩票的骗局', '立即下载并投入大量资金', '相信其宣传，小额试试'],
    answerIndex: 0,
    analysis: 'A、高返奖、中奖率100%是非法彩票或诈骗的常见诱饵。',
  },
  {
    title: '(单选)关于“保底回购”“稳赚不赔”等彩票推销话术，最正确的看法是？',
    options: ['这是难得的发财机会，要抓住', '这说明对方很有实力和诚意', '这属于非法集资或诈骗的常见诱饵，风险极高'],
    answerIndex: 2,
    analysis: 'C、“保底回购”“稳赚不赔”属于非法集资或诈骗的常见诱饵，风险极高。',
  },
  {
    title: '(单选)非法彩票最常见的特点之一是？',
    options: ['有国家统一的彩票标识', '公开透明，接受社会监督', '以“高收益”“高中奖率”为噱头'],
    answerIndex: 2,
    analysis: 'C、非法彩票常以“高收益”“高中奖率”为噱头诱导参与。',
  },
  {
    title: '(单选)购买非法彩票，对自己和家庭的直接影响是？',
    options: ['一定能发家致富', '可能造成巨大财产损失，破坏家庭幸福', '促进家庭和谐'],
    answerIndex: 1,
    analysis: 'B、购买非法彩票可能造成巨大财产损失，破坏家庭幸福。',
  },
]
