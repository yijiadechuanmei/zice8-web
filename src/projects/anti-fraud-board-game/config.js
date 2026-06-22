export const ANTI_FRAUD_BOARD_GAME_ACTIVITY_TYPE = 'anti_fraud_board_game'
export const ANTI_FRAUD_BOARD_GAME_ACTIVITY_KEY = 'anti_fraud_board_game_20260623'

const CDN_BASE = 'https://cdn-ali.lionwhale.cn/ivxtest/files'

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
    answerPanel: `${CDN_BASE}/7829f544404d79b7731f9e45e6e499d9_96322.webp`,
    successPanel: `${CDN_BASE}/d372f144d683a21eb9bc690ce452afbc_56022.webp`,
    posterButton: `${CDN_BASE}/6cc8655dedb364107e6bb4f0d2761680_7652.webp`,
  },
  poster: {
    background: `${CDN_BASE}/048ca6d4e07c419d9d03e6ed59de067d_32465_750_1624.png`,
    card: `${CDN_BASE}/db14ca26676a66a7cc9a4c627bf2df16_73943_717_1076.png`,
    title: `${CDN_BASE}/b8e726dad612d1db94107d7c55b752af_38189_565_341.png`,
    footer: `${CDN_BASE}/1d5be33eeaa6f3cd227c2079cb1f67c7_7308_718_169.png`,
    badge: `${CDN_BASE}/c842cfa43a02860f4ecd170f7dd46071_8993_519_81.png`,
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
    title: '(单选)购买非法彩票，对自己和家庭的直接影响是（ ）',
    options: ['一定能发家致富', '可能造成巨大财产损失，破坏家庭幸福', '促进家庭和谐'],
    answerIndex: 1,
    analysis: 'B、可能造成巨大财产损失，破坏家庭幸福',
  },
  {
    title: '(单选)收到“银行账户异常”的短信链接，正确做法是（ ）',
    options: ['直接点开填写验证码', '拨打官方客服电话核实', '把链接转发给家人'],
    answerIndex: 1,
    analysis: 'B、应通过官方渠道核实，不点击陌生链接。',
  },
  {
    title: '(单选)陌生人要求共享屏幕指导转账，应该（ ）',
    options: ['立即共享', '拒绝并停止沟通', '按对方要求操作'],
    answerIndex: 1,
    analysis: 'B、共享屏幕会泄露账户、密码和验证码。',
  },
  {
    title: '(单选)刷单返利类骗局常用诱饵是（ ）',
    options: ['低投入高回报', '正规发票', '线下签合同'],
    answerIndex: 0,
    analysis: 'A、凡是要求垫资刷单并承诺返利，都要高度警惕。',
  },
  {
    title: '(单选)遇到疑似诈骗，应优先（ ）',
    options: ['继续转账试试', '保存证据并报警', '删除聊天记录'],
    answerIndex: 1,
    analysis: 'B、保存聊天、转账等证据，并及时求助。',
  },
]
