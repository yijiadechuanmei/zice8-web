export const FIFTEENTH_FIVE_I_CAN_ACTIVITY_TYPE = "fifteenth_five_i_can";
export const FIFTEENTH_FIVE_I_CAN_ACTIVITY_KEY = "fifteenth_five_i_can_2026";
export const FIFTEENTH_FIVE_I_CAN_ASSETS_BASE_URL = `https://assets.zice8.com/${FIFTEENTH_FIVE_I_CAN_ACTIVITY_TYPE}/${FIFTEENTH_FIVE_I_CAN_ACTIVITY_KEY}`;

export const ASSETS = {
  homeBackground: "24d0b163005b724f426d83bfcffa9ee7_2354314_750_1624.png",
  pageBackground: "9553676e49117725a68a2612e8a85122_2505384_750_1624.png",
  homeTitle: "0d0b9ca84ca2bd371b65c501ecf0b87f_12668_346_39.png",
  homeHero: "f8c9365f5f7bfdeec92404960c45100b_63935_496_297.png",
  homeSubtitle: "9e1b4d6abc80e4ba52d51a242c93067f_29493_325_79.png",
  homeButton: "469189e41b70647ea867327469f35f15_97246_580_90.png",
  keywordAction: "5faa01013bde5714a700ff02ea90d0ee_94160_574_89.png",
  keywordCaption: "9c5d45fdd30a72c56ba6a2b91a0d8f93_50535_413_74.png",
  keywordHeading: "4fc2ef5d817fb0a655e7638330f26020_16238_240_43.png",
  quizCard: "abe26211608deab6102a052d727fcb50_20875_621_622.png",
  quizHeading: "984dd25d3ebc8c41efe2352b5935fcd9_33218_243_87.png",
  quizTitle: "a8d939e97f7a876d76b267c434994b5a_28261_407_58.png",
  formAction: "416248c2670cc5b38a389f77a7f8d4f9_94003_574_89.png",
  formCaption: "4ad77fa9618ec826f5d34dcc922204d9_49067_477_74.png",
  wishAction: "012c7beb8756b6c894cd1122ec85c284_96871_574_90.png",
  wishTitle: "df54bb5a2d56536e127adef85014c343_20785_272_58.png",
  wishCaption: "f7b255e61060f35a97191bbf163d0373_30360_552_36.png",
  certificate: "7f360e9f81acdbe06a27c1bdc4677941_851184_583_815.png",
  certificateHeading: "396de029be057e28c751a5f79e89e081_35380_688_48.png",
  certificateSave: "0e6300bf3354b0705df74a31ee34d44d_16735_152_55.png",
  certificateReplay: "8b9bf8a271e090398e7e22f1d9da832e_16333_152_55.png",
  certificateShare: "008aee3e128b27df1ee62aabdf7135e7_17463_152_55.png",
};

const keywordCoordinates = [
  [183, 561, 150, 44], [35, 594, 150, 44], [14, 657, 150, 44],
  [39, 716, 149, 43], [5, 789, 150, 44], [49, 853, 150, 43],
  [334, 901, 150, 43], [137, 917, 149, 43], [39, 975, 149, 43],
  [222, 981, 150, 43], [392, 975, 150, 43], [505, 907, 149, 43],
  [579, 847, 149, 43], [541, 686, 149, 44], [556, 582, 150, 44],
  [534, 501, 150, 43], [392, 434, 150, 44], [215, 859, 150, 43],
  [187, 625, 149, 44], [404, 554, 149, 44], [351, 608, 149, 44],
  [205, 686, 150, 44], [324, 750, 149, 43], [408, 840, 150, 44],
  [162, 781, 149, 43], [379, 686, 149, 44], [466, 789, 150, 44],
  [493, 742, 150, 44], [505, 636, 149, 44], [385, 488, 150, 44],
  [192, 495, 149, 43], [233, 428, 149, 44], [80, 449, 149, 44],
  [27, 509, 150, 44],
];
const keywordLabels = [
  "战略使命", "高质量发展", "科技创新", "新质生产力", "产业治理", "公共基础",
  "检测认证", "再生利用", "新能源汽车", "智能网联", "低空经济", "人工智能",
  "国际化布局", "协同效能", "党建引领", "数智融合", "人才活力", "风险防控",
  "全链奋进", "创新突破", "国际化开拓", "笃行实干", "新质生产力", "开放共赢",
  "强核聚力", "人才迸发", "开放共赢", "国际化标杆工程", "成渝协同", "开放共赢",
  "粤港澳大湾区", "京津冀总部", "长三角布局", "长江经济带",
];

export const KEYWORD_LAYOUT = keywordCoordinates.map(([x, y, width, height], index) => ({
  id: `keyword-${index + 1}`,
  label: keywordLabels[index],
  x,
  y,
  width,
  height,
}));

// This activity can be configured as public, so its learning progress must be
// usable without a WeChat identity or a JWT-backed participant record.
export const PUBLIC_ACTIVITY_DATA = {
  keywords: KEYWORD_LAYOUT.map(({ id }) => id),
  wishPresets: ["奔赴更好的2030", "让梦想照进现实", "与时代同频共振", "成为更好的自己"],
  questions: [
    { no: 1, type: "single", title: "“十四五”时期中汽中心已经取得了历史性、开创性成就，向（）战略目标迈出坚实步伐", options: [{ id: "A", text: "“四个最”" }, { id: "B", text: "“五个最”" }, { id: "C", text: "“俩个最”" }, { id: "D", text: "“三个最”" }], correctOptions: ["A"] },
    { no: 2, type: "single", title: "中汽中心“十五五”确立的发展战略简称是", options: [{ id: "A", text: "“一四二三”" }, { id: "B", text: "“一二三四”" }, { id: "C", text: "“五二五”" }, { id: "D", text: "“二五二”" }], correctOptions: ["A"] },
    { no: 3, type: "multiple", title: "中汽中心的核心功能有哪些？", options: [{ id: "A", text: "汽车产业标准创新引领" }, { id: "B", text: "汽车产业战略政策支撑" }, { id: "C", text: "汽车行业共性技术供给" }, { id: "D", text: "汽车产品价值提升促进" }], correctOptions: ["A", "B", "C", "D"] },
    { no: 4, type: "multiple", title: "中汽中心的核心竞争力有哪些？", options: [{ id: "A", text: "全价值链技术服务能力" }, { id: "B", text: "前瞻科技策源创新能力" }, { id: "C", text: "基础资源建设整合能力" }, { id: "D", text: "产业生态构建协同能力" }], correctOptions: ["A", "B", "C", "D"] },
    { no: 5, type: "multiple", title: "中汽中心“十五五”规划中“两聚焦两着力”指的是什么？", options: [{ id: "A", text: "聚焦战略使命和高质量发展的内生需求，着力增强汽车全价值链协同效能" }, { id: "B", text: "聚焦创新驱动可持续发展的根本要求，着力培育新质发展动能" }, { id: "C", text: "聚焦产业变革和市场竞争的现实需要，着力扩大传统业务规模优势" }, { id: "D", text: "聚焦年度经营目标和考核激励的刚性约束，着力提升短期经营效益" }], correctOptions: ["A", "B"] },
    { no: 6, type: "single", title: "中汽中心“十五五”新业务布局是什么？", options: [{ id: "A", text: "“1+6+X”" }, { id: "B", text: "“1+7+X”" }, { id: "C", text: "“1+8+X”" }, { id: "D", text: "“1+9+X”" }], correctOptions: ["D"] },
    { no: 7, type: "single", title: "以下哪一项不包含在中汽中心战略目标中？", options: [{ id: "A", text: "成为政府最认可的产业智库" }, { id: "B", text: "成为行业最尊重的合作伙伴" }, { id: "C", text: "成为国际最具影响力的检测机构" }, { id: "D", text: "成为员工最自豪的事业平台" }], correctOptions: ["C"] },
    { no: 8, type: "single", title: "中汽中心“十五五”国内区域网络化布局中，集团总部位于哪个区域？", options: [{ id: "A", text: "京津冀" }, { id: "B", text: "长三角" }, { id: "C", text: "粤港澳大湾区" }, { id: "D", text: "成渝地区" }], correctOptions: ["A"] },
    { no: 9, type: "single", title: "中汽中心“十五五”国际化布局中，哪个区域的定位是“打造提升中汽中心国际影响力的标杆工程”？", options: [{ id: "A", text: "日韩" }, { id: "B", text: "欧洲" }, { id: "C", text: "中亚" }, { id: "D", text: "东南亚" }], correctOptions: ["B"] },
    { no: 10, type: "multiple", title: "中汽中心“十五五”打造的“1+9+X”新业务布局中，9大产业关键环节包含以下哪些选项？", options: [{ id: "A", text: "产业治理" }, { id: "B", text: "公共基础" }, { id: "C", text: "检测认证" }, { id: "D", text: "再生利用" }], correctOptions: ["A", "B", "C", "D"] },
    { no: 11, type: "multiple", title: "中汽中心“十五五”的战新业务群包含以下哪些？", options: [{ id: "A", text: "新能源汽车业务群" }, { id: "B", text: "智能网联汽车业务群" }, { id: "C", text: "低空经济业务群" }, { id: "D", text: "人工智能业务群" }], correctOptions: ["A", "B", "C", "D"] },
    { no: 12, type: "multiple", title: "以下选项中，属于中汽中心“十五五”规划实施保障措施的有哪些？", options: [{ id: "A", text: "坚持党的领导，持之以恒加强党建" }, { id: "B", text: "以干事者为本，激发人才队伍活力" }, { id: "C", text: "加速数智融合，赋能业务转型发展" }, { id: "D", text: "防范化解重大风险" }], correctOptions: ["A", "B", "C", "D"] },
    { no: 13, type: "multiple", title: "以下选项中，属于中汽中心“十五五”规划中专精特新基地的有哪些？", options: [{ id: "A", text: "盐城场地" }, { id: "B", text: "昆明高原场地" }, { id: "C", text: "呼伦贝尔高寒场地" }, { id: "D", text: "海南高温场地" }], correctOptions: ["A", "B", "C", "D"] },
    { no: 14, type: "multiple", title: "以下选项中，哪些属于中汽中心团委组织的面向青年的评选活动？", options: [{ id: "A", text: "“五小”创新大赛" }, { id: "B", text: "青年创新创效大赛" }, { id: "C", text: "十大向上向上好青年评选" }], correctOptions: ["A", "B", "C"] },
  ],
};

export function keywordLabel(keywordId) {
  return KEYWORD_LAYOUT.find(({ id }) => id === keywordId)?.label || keywordId;
}

export function assetUrl(
  filename,
  baseUrl = FIFTEENTH_FIVE_I_CAN_ASSETS_BASE_URL,
) {
  if (!filename) return "";
  if (/^(https?:)?\/\//i.test(filename) || filename.startsWith("data:"))
    return filename;
  return `${String(baseUrl).replace(/\/$/, "")}/${filename.replace(/^\//, "")}`;
}

export function mergeConfig(publicConfig) {
  return {
    assetsBaseUrl: FIFTEENTH_FIVE_I_CAN_ASSETS_BASE_URL,
    ...(publicConfig?.mobileConfig || {}),
  };
}
