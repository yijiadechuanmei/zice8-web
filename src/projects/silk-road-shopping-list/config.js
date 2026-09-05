import posterCheck from './assets/poster/final/check.svg'

export const SILK_ROAD_SHOPPING_LIST_ACTIVITY_TYPE = 'silk_road_shopping_list'
export const SILK_ROAD_SHOPPING_LIST_ACTIVITY_KEY = 'millennium_silk_road_shopping_list_2026'

export const ASSET_ROOT = `https://assets.zice8.com/${SILK_ROAD_SHOPPING_LIST_ACTIVITY_TYPE}/${SILK_ROAD_SHOPPING_LIST_ACTIVITY_KEY}`
const posterProductImages = import.meta.glob('./assets/poster/products/*.png', { eager: true, query: '?url', import: 'default' })

export const silkRoadAssets = {
  homeBackground: `${ASSET_ROOT}/b4d5cd34fa18bdfc0bab69b4e6b26998_2446173_750_1624.png`,
  homeTitle: `${ASSET_ROOT}/f3640a16647220d683c0fb52d231ac65_55490_440_53.png`,
  homeStart: `${ASSET_ROOT}/36192a094e9f264fcd5f851d0aa5bd56_155777_523_145.png`,
  homeIllustration: `${ASSET_ROOT}/6466c61f0e15e2dd5cbd15f3f43619bf_178314_295_595.png`,
  homeRibbon: `${ASSET_ROOT}/0714c782d30d3b9ac865b6410c677092_52548_595_87.png`,
  orientationHint: `${ASSET_ROOT}/bc3e53572dc55c0b4b4427b8c297ec49_44732_333_78.png`,
  video: `${ASSET_ROOT}/dd0988b6dee21c51137eaa48acc42725_25528934.mp4`,
  cartHeader: `${ASSET_ROOT}/c6aa920653948018b7fb8f06f79b5940_716640_750_551.png`,
  cartSectionTitle: `${ASSET_ROOT}/d05b8931f97085256970f8da8f7cbab0_27033_319_35.png`,
  cartDock: `${ASSET_ROOT}/2905f485d039d22456b539e1e54a1a94_165057_694_110.png`,
  productCard: `${ASSET_ROOT}/bb79dd2df956fdc0d91c34c988514a9b_142014_337_230.png`,
  plusIcon: `${ASSET_ROOT}/3b194b81654d42cf1fad7fc8eda29524_203.svg`,
  minusIcon: `${ASSET_ROOT}/1b16aadeba1e9b4e0b5f33dcadd456f4_633.svg`,
  detailTitle: `${ASSET_ROOT}/3d7685eaa9e31059a8bc4458a5713a8f_10412_115_58.png`,
  detailIcon: `${ASSET_ROOT}/4f985035441e52a947de6e19dcbc057b_425.svg`,
  posterNovice: `${ASSET_ROOT}/f2f20ea0fcefa00825ef35a6f93a255c_759257_750_1624.png`,
  posterApprentice: `${ASSET_ROOT}/e6316f6997866910ea82ec8f8274e1c8_767683_750_1624.png`,
  posterExpert: `${ASSET_ROOT}/148d2b2c2e9685ab17589e255eff9faa_923172_750_1900.png`,
  posterMasterOverlay: `${ASSET_ROOT}/0490edb206703dddc1e25a05ea31803b_1058644_750_2098.png`,
  posterCheck,
}

const productImage = (name) => `${ASSET_ROOT}/${name}`

export const SILK_ROAD_PRODUCTS = [
  ['黄瓜', '原产印度，西汉武帝时期传入。古称“胡瓜”，十六国石勒或隋炀帝避讳“胡”后改称黄瓜，是古代重要外来蔬菜。', '31e56c3aabda74d14aab6566dc53b267_79401_204_290.png'],
  ['葡萄', '原产南高加索至小亚细亚地区，经中亚大宛传入，西汉武帝时期进入中国。《史记·大宛列传》记载大宛以葡萄酿酒，“汉使取其实来”。', 'be7fb2405ce975d53d6161d653563d2e_81262_178_279.png'],
  ['石榴', '原产安息（波斯，今伊朗），西汉武帝时期传入。西晋《博物志》记张骞得安息石榴种，故称“安石榴”；因籽粒繁多，象征多子多福。', '00e23c9528a674370ad0d7af4eefe0bd_75816_182_286.png'],
  ['核桃', '原产西亚至中亚，西汉武帝时期传入。西晋《博物志》载张骞出使西域得种还，植于秦中，渐及东土；古称“胡桃”，是重要外来坚果。', 'ab42930c020e18f4dcf33632c1960668_82454_185_271.png'],
  ['苜蓿', '原产中亚，西汉武帝时期由汉使自大宛取回种子，《汉书·西域传》有明确记载。它是优质牧草，主要用于饲养汗血宝马，也可作绿肥。', 'c43bb38634a0efa21b3ce56592462ed2_81482_174_232.png'],
  ['大蒜', '原产西亚至中亚，西汉武帝时期传入。古代称“胡蒜”，传入后作为调味食材广泛用于饮食。', '977d0b1672df60c840f83593b4249f9a_73895_197_226.png'],
  ['香菜', '原产地中海沿岸，西汉武帝时期传入。初称“胡荽”，是古代重要的香辛调味蔬菜。', '9c61a73b7bd212c0cc8a4e3117fc1288_80564_178_227.png'],
  ['芝麻', '原产印度或非洲，西汉武帝时期传入。古称“胡麻”，既可榨油，也可直接食用，油脂价值高。', '279842d50ca74ddf211ca78e57fa1a00_67326_175_194.png'],
  ['蚕豆', '原产西亚至地中海东岸，西汉武帝时期传入。又称“胡豆”，兼具粮食与蔬菜属性，可煮食或制成副食。', 'b5e3a3b3e0945730cf6b2beee068c9da_69599_181_226.png'],
  ['胡椒', '原产印度，经中亚传入，汉晋时期进入中国，唐代成为高官贵族的日常调料。《新唐书》记唐相元载被抄没胡椒八百石，象征财富与地位。', 'c1362f71e1e9093b7b0f7b78ccac29bf_76288_191_207.png'],
  ['菠菜', '原产波斯（今伊朗），唐代贞观年间由泥婆罗国（今尼泊尔）进贡传入。初称“波斯菜、菠薐菜”，作为绿叶蔬菜进入唐人饮食。', '29dac518117e07d6450f6bc20c2da388_84118_203_237.png'],
  ['茄子', '原产印度，不晚于南北朝传入，汉代或已沿南方丝路进入内地。北魏《齐民要术》已有记载，隋炀帝赐名“昆仑紫瓜”，后成为家常蔬菜。', 'aeceb62e367f983259c548754531d642_71678_178_218.png'],
  ['开心果', '原产西亚至中亚，唐代经陆上丝路由西域传入中原。又称“阿月浑子”，唐代《本草拾遗》有记录，是多供贵族享用的西域珍稀坚果。', '36586d6a1e3578699e415dc460c9d389_70738_174_228.png'],
  ['巴旦木', '原产西亚古波斯，唐代通过丝绸之路商贸与朝贡传入中原。《酉阳杂俎》称其为“偏桃”，果仁营养丰富，受唐代上层喜爱。', '14c9907ec048d8d04ce5f3d7b07b52eb_68992_176_233.png'],
  ['无花果', '原产西亚至地中海沿岸，唐代沿陆上丝绸之路经西域传入。《酉阳杂俎》记波斯、拂林所产“阿驿”即无花果，可鲜食或晒干储藏。', '0c4a17e9bcfa543faa9a2ec38ca9c7bb_72934_181_230.png'],
  ['椰枣', '原产两河流域与波斯湾一带，唐代由丝路商旅和朝贡带入中原，唐称“波斯枣”。糖分含量高、耐储存，适合长途贩运。', '84d919c3ee6a815ed5bcb546a5ebe730_77847_200_213.png'],
  ['三勒浆', '原产印度，以庵摩勒、毗梨勒、诃梨勒三种果实为原料。唐代《唐国史补》记其酿造法出自波斯，是唐代流行的外来美酒。', '5d0272c01053209dcbb87b24e03d8523_69474_168_259.png'],
  ['胡芹', '原产中亚，唐代经西域贸易传入中原。它是西域芹菜品种，风味不同于中原本土芹菜，作为外来蔬菜食用。', '34be8b2f6ef2499df6a0b5893dc53b88_77532_193_247.png'],
  ['茴香（莳萝）', '原产地中海与波斯地区，唐代沿丝绸之路经中亚传入内地。《海药本草》有记载，是用于肉食去腥增香的重要调味香料。', '2861fb9506ba5ba9c448551463fdb77e_88043_178_228.png'],
  ['胡服', '源自游牧民族服饰，北朝已传入中原，唐代开元、天宝年间广为盛行。唐长安贵族女子与平民竞相穿戴，陶俑、诗文均可佐证。', '587e871abe78ba14a421ae0d833bd4c0_83135_197_249.png'],
  ['琉璃', '原产西亚，汉至唐时期传入。汉代域外琉璃商品经中亚、南亚输入，其后烧制工艺也传入中国；多用于器皿、饰品，是贵重奢侈品。', 'a5dfcff9a97ad1b51e7f0b43283f6ccf_78950_221_242.png'],
  ['宝石', '原产中亚、南亚地区，汉至唐时期经陆上丝绸之路商贸与朝贡东来。青金石、玛瑙等名贵宝石多用于首饰和器物镶嵌装饰。', 'f915ca0506a031beb39025ae96862fa4_70106_196_201.png'],
  ['金银器', '原产西亚、中亚，魏晋至唐代经丝路贸易输入成品器物，异域工艺也传入中原。唐代贵族竞相收藏，深刻影响中原金银器造型与纹饰。', '3d0cd6a2170b6f5c6ed1779389449b72_78581_207_216.png'],
  ['波斯地毯', '原产波斯（今伊朗），汉至唐时期由丝绸之路长途贩运、朝贡而来。编织工艺精湛、纹样繁复华丽，属于高级室内陈设奢侈品。', 'b2fb862da9b41eed4c585fc1b206b331_126743_290_247.png'],
  ['波斯锦', '原产波斯（今伊朗），魏晋至唐代经丝路商贸传入中原。织锦工艺独特，盛行联珠纹等异域图案，深刻影响中国丝织纹样设计。', '0c833d66e0620e4cb4a83e14c0612890_89642_225_254.png'],
  ['阿拉伯医药', '原产阿拉伯地区，唐宋传入，元代大规模传播。经陆上、海上丝绸之路带来香药与医药知识，是后世中国回回医学的重要源头。', 'edb24203d8b91c6008b65b714e4a864e_111989_262_268.png'],
  ['东罗马高脚金杯', '原产东罗马帝国（拜占庭），魏晋至唐代经丝路贸易与朝贡传入中原。“高脚金杯”为现代考古定名，是东西方物质交流的代表性器物。', 'b3a29cedb09c7f9c4944aa9d1a88e454_57975_168_261.png'],
  ['金币、银币', '原产东罗马、波斯萨珊、阿拉伯等国，汉至唐时期随丝路商贸流通进入中国。国内出土的大量东罗马金币、波斯银币和阿拉伯银币，见证东西方贸易往来。', '0816147e4c6fe5d450db15a6f8581019_60600_253_166.png'],
].map(([name, description, image], index) => ({
  id: index + 1,
  name,
  description,
  image: productImage(image),
  posterImage: posterProductImages[`./assets/poster/products/${image}`],
}))
