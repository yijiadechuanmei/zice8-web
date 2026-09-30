import { useEffect, useState } from 'react'
import { request } from '../../shared/api/request'
import './style.css'

const ACTIVITY_TYPE = 'tianfu_new_district_reading_20260927'
const ACTIVITY_KEY = 'tianfu_new_district_reading_20260927'
const OSS = `https://assets.zice8.com/${ACTIVITY_TYPE}/${ACTIVITY_KEY}/`
const asset = (name) => `${OSS}${name}`
const layer = (left, top, width, height, name) => ({ left, top, width, height, name })
const POINT_MAP_FOOTER = [
  layer(46, 1431, 177, 55, 'e5d460c695047ec781b3acd2bd299e0c_16214_177_55.png'),
  layer(282.5, 1431, 177, 55, '69d33e844ce34d5310ebc6bb655f24ed_18292_177_55.png'),
  layer(519, 1431, 177, 55, '70f171753e6a3aae7b57120228443265_17525_177_55.png'),
]

const REVIEW_PAGE = [
  layer(0, 0, 750, 1624, '5e6597570241374d6614ba5b63e7ea8e_87994_750_1624.png'),
  layer(27, 115, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'),
  layer(247, 105, 464, 151, 'f37931029340439d7a35fa3c95c48e40_16272_464_151.png'),
]

const HOME = [
  layer(0, 0, 750, 1624, '9e0698d039f852dcb71a782eba2609f4_1518088_750_1624.png'),
  layer(101, 237, 572, 257, '7035fb18d008055ad2b19625c9d44b11_71999_572_257.png'),
  layer(274, 1189, 195, 194, 'c47001a10b3e366ca43c15470d6ea07d_46718_195_194.png'),
  layer(282, 1410, 177, 55, '11e521138753e163ad5dc1a0211005c4_18240_177_55.png'),
]

const TIANFU_PARK = {
  name: '天府公园',
  introduction: `作为成都首批开放共享的公园绿地之一，天府公园欢迎露营、野餐、放风筝，也欢迎骑行。这里仅乔木就有近50个品种，落叶、常绿、彩叶树种还有近60种。这里五月蓝花楹紫色花海，金秋彩叶树层叠尽染，一年四季都有不同风采。对观鸟爱好者来说，天府公园更是一座秘密基地：园内已记录鸟类46种，放眼整个天府新区，这个数字达到248种。就连铺路的透水砖也藏着巧思：作为“海绵城市”的一环，雨水落下来会被直接“喝掉”，过滤净化后还能再次利用。逛一次天府公园，等于同时上了一堂鸟类观察课、植物认知课和生态工程课。

想动起来？Hi-Park运动中心就在园内——室内羽毛球馆、篮球场、网球场一应俱全，室外还有足球场和轮滑冰球场。这个占地约30亩的运动中心集运动体验、赛事活动和专业训练于一体，2021年就被列为天府新区全民健身惠民开放场馆。2025年成都世运会期间，速度攀岩和浮士德球比赛就在这片草坪旁举行`,
  books: [
    {
      title: '《小亮老师的博物课》',
      reason: `天府公园本身就是一本翻不完的 "自然之书"：公园里随处可见的花草树木、飞鸟昆虫、水生动物，正是孩子身边最生动的 "博物课"——《小亮老师的博物课》就是带他们读懂这片天地的向导。

中国全民阅读网推荐好书——《小亮老师的博物课》是“博物君”张辰亮专为5~12岁的小读者们创作的一套科普读物。这套小书共包含6个分册——《不可思议的花草树木》《叹为观止的自然现象》《深不可测的水生动物》《无奇不有的昆虫世界》《大开眼界的陆地动物》《奇趣无穷的飞鸟乐园》。本书选取了孩子们日常身边能见到并感知到的花草树木、自然现象、水生动物、陆生动物、昆虫和鸟，通过提问的方式导入阅读，让孩子们跟着内心的好奇，对千变万化、五彩纷呈的大自然一探究竟。作者科普图书被教育部列入中小学生阅读指导目录。`,
    },
    {
      title: '《虫子旁》',
      reason: `漫步天府公园，高大乔木与珍稀飞鸟固然引人注目，但低头细看，落叶堆、草坪边、石板缝里还藏着一个常被忽略的微观世界。中国全民阅读网推荐好书、“湘版好书榜”、首都图书馆公布30册年度“请读书目”。

《虫子旁》是设计师朱赢椿的一本观虫日志，收录了80余篇散文与200余张摄影作品，图文并茂，兼备知识性、审美性、趣味性。这个世界很小，小到足以被我们忽略、遗忘，但跟我们一样，虫子也有着惊心动魄的生活。蚂蚁被一根落下的枯枝砸断了腰肢；烟管蜗牛想在夏日的午后睡上一个美美的午觉，却未能如愿；而千足虫卡在路缝里，即使有一千条腿也无济于事……在虫子的世界，一个水洼就是一片海洋，一片叶子就是一顶阳伞，一朵花就是一座岛屿，它们从容认真，生生不息，与自然融洽相处。“在你忽略的地方，还有一个精彩的世界。”《虫子旁》是对虫的观察，也是对自然和生命的思索。`,
    },
  ],
}

const FIRST_PHASE_POINTS = [
  TIANFU_PARK,
  {
    id: 'west-china-expo-city',
    name: '西部国际博览城及天府国际会议中心',
    video: '66d67cddab033f2e84a9b55672f9087b_23321142.mp4.mp4',
    introduction: `远看像一艘来自未来的飞船，近看是一个巨大的“V”字——这就是西博城。用钢量16万吨，超过“鸟巢”，直接拿下中国钢结构金奖。这座建筑充分利用自然光线，雨水被收集起来循环利用，壮观的背后藏着细腻的环保心思。

让人挪不开眼的，还有隔壁的“天府之檐”。2025年世运会开幕式就在这里上演。这是亚洲最大的单体木结构建筑，由国际知名设计大师汤桦领衔设计，以中国古建筑“佛光寺大殿”的抬梁式木结构为原型，建构了一条长达430米、高32米的超尺度木结构空间。430米也是全国最长的连续瓦屋面建筑，犹如成都平原延绵伸展的地平线。

“天府之檐”的天府有两层意思：一层指天府新区，一层指天府之国。前厅木结构檐廊以唐代斗拱型制为蓝本，完全遵循传统建筑大木作做法，通过瓜柱抬梁形成殿堂式传统形制，端头出挑，展露木结构榫卯构件，再现中国传统建筑精髓。最讲究的是，这条钢木混合结构长廊的胶合木用量超过4300立方米，为了找到最合适的材料，建设团队辗转全国10余个胶合木工厂，考察100余种胶合木，最终远赴黑龙江漠河，在零下25度的天气下寻找到最为合适的胶合木。

站在这里，你看到的不仅是一座建筑，而是一段关于中国建筑智慧的当代诠释。`,
    books: [
      { title: '《藏在建筑里的世界史》', reason: '西博城以16万吨钢结构撑起57万平方米的巨大“V”字，天府国际会议中心则以亚洲最大单体木结构建筑“天府之檐”致敬古建智慧——读懂一座建筑，就是读懂一个时代的科技与文明。《藏在建筑里的世界史》（中国全民阅读网推荐好书）正是这样一把钥匙：以建筑为中心，以建筑的建造和用途为线索，展示与建筑相关的人们生活、科技、艺术、制度、节日庆典、宗教、历法、军事与娱乐等领域。书中1000余幅细节放大图、100余幅大型剖面图，帮助读者清晰感受文明进程的全景，也从建筑中读懂更多维度的文化内涵。' },
      { title: '《重拾瑰宝圆明园》', reason: '正如圆明园曾汇聚天下奇珍、承载万国风华，今天的西部国际博览城同样迎接着来自全球各国的文化、科技与产品——这座“万园之园”式的会展殿堂，用同一份包容讲述着中国与世界的对话。《重拾瑰宝圆明园》是中国全民阅读网推荐好书、2022年“中国好书”。本书以历史文献为基础，利用现代数字技术复原圆明园被毁景观，并从建筑艺术、园林植物、人物故事、诗文作品等方面解析各个景点，让读者穿越时空领略“万园之园”的卓绝风采，感受古典园林深厚的文化底蕴。' },
      { title: '《天工开物》（人民出版社）', reason: '当16万吨钢结构撑起现代会展奇迹，人们或许会问：中国造物的科技智慧从何而来？答案可以追溯至明代科学家宋应星的《天工开物》——入选《教育部基础教育课程教材发展中心中小学生阅读指导目录（2020年版）》。《天工开物》系统总结工业文明前中国农业与手工业领域130余项生产技术，涵盖谷物加工、纺织染色、金属冶炼等工艺流程，并与《考工记》《营造法式》共同完成中华“考工学”设计理论体系的建构。' },
    ],
  },
  {
    id: 'sichuan-celebrity-hall',
    name: '四川名人馆',
    video: '3ba26b0aae98eb44eb9f539cceb2dd38_4312419.mp4.mp4',
    introduction: `想和李白、苏轼、诸葛亮“面对面”聊天吗？来这里就对了。四川名人馆坐落于天府新区雅州路，紧邻天府公园，集中展示先秦至辛亥革命前的70位四川历史名人——司马相如、李白、苏轼生于巴蜀，诸葛亮、杜甫客居蜀地造福一方。

但这70位先贤不是挂在墙上的画像。场馆用大数据、人工智能、体感交互打造数字展项。走进1250平方米的数字沉浸式体验展厅，你化身“寻梦者”，穿过四重沉浸式梦境场景，与先贤跨越时空“对话”。场馆的设计中藏着“蜀山、蜀水、蜀道”的传统意象，内部连通各层展厅的动线灵感取自千古诗篇里的蜀道。

馆内还有吴为山、林茂等51位艺术家创作的雕塑书画，蜀锦、蜀绣、竹编穿插其中。走进这里，就像打开了一个会动的巴蜀文化盲盒——你永远不知道下一个转角会遇见谁，但每一个相遇都值得。`,
    books: [
      { title: '中华人物故事汇——中华先烈人物故事汇', reason: '四川名人馆以“存史、知人、益世”为宗旨，集中展示先秦至辛亥革命前的70位巴蜀先贤，勾勒出巴蜀文脉的发展轨迹。然而，四川的名人故事并未止于古代。近代以来，巴蜀大地同样涌现出黄继光、邱少云、赵一曼、丁佑君等为民族独立和人民解放英勇献身的革命先烈。“中华先烈人物故事汇”收录了这些四川籍先烈的感人故事。《中华人物故事汇》由党建读物出版社、接力出版社、学习出版社、中华书局联合编纂，包含先锋、先烈、先贤、传奇人物四个系列，共出版109册，曾获第五届中国出版政府奖图书奖，并入选全国青少年推荐百种优秀出版物。' },
      { title: '《古诗词遇见中国地理》', reason: '名人馆中的李白、杜甫、苏轼等都与诗词和地理足迹紧密相关，人们常说，生活中要有“诗和远方”。本书入选2022年向全国青少年推荐百种优秀出版物。它精选100组与中国地理有关的古典诗词，紧扣中小学语文课程标准与教学大纲，并结合手绘地图，从地理的独特视角切入，对古典诗词和传统文化进行现代阐释。全书按黄河、长江、大地、大海、名山、名城和名楼7个主题编排，让地理知识与诗词赏析融会贯通。' },
    ],
  },
  {
    id: 'utility-tunnel',
    name: '雅州路综合管廊',
    video: 'ece24f3fdf0b6739f66f46c5a7417bd6_9399741.mp4.mp4',
    introduction: `你脚下3米深的地方，藏着一座“智慧地下城”。雅州路综合管廊全长3公里，是成都目前唯一可通行车辆的管廊，一辆小型巡检车辆可以自由通过。

管廊内的智能巡检机器人头顶两只“大眼睛”、脚踏四个轮子，24小时自动巡逻。它会对配电系统、消防系统进行巡检，发现的问题自动进行图像分析，结果实时推送到控制中心。管廊内安装的设施设备实时监测氧气、温度、湿度、硫化氢、甲烷等环境参数，出现异常自动报警。截至目前，智能巡检机器人已替代人工完成日常巡检项目70%以上，巡检效率提升4倍。

以前人工巡检每天5公里需要配备多个巡检工人，效率较低还容易出错。现在发现问题立刻上报，巡检数据自动记录、分析、应用，后期还可以进行自动派单。在这里，你可以亲眼看到城市地下的“生命线”是怎么被一群机器人守护的。`,
    books: [
      { title: '《成为科学家》', reason: '中国全民阅读网推荐好书、入选向青少年推荐百种优秀出版物名单。行走在雅州路综合管廊这座“智慧地下城”里，每公里500多个监测设备如同城市的“眼睛”和“耳朵”，时刻守护氧气、温度、湿度、硫化氢、甲烷、液位等环境参数；智能巡检机器人自动采集、分析病害并报警——这些让城市安全运转的科技背后，正是一代代科学家的探索与坚守。《成为科学家》讲述屠呦呦、钟南山、张益唐、王贻芳、常进、鲍哲南、颜宁、许晨阳、莉丽莎·兰道尔、马克·麦考林十位国际知名科学家的“人物故事”，并介绍数学、物理学、生命科学、天文学等基础科学领域的前沿知识。' },
    ],
  },
  {
    id: 'guanghui-art-museum',
    name: '广汇美术馆',
    video: 'f5f5c5cf8b2d0c57fa0f76039c6bf8f1_33253818.mp4.mp4',
    introduction: '广汇美术馆位于天府新区天府总部商务区，毗邻天府公园，是一座集展览展示、学术研究、公共教育和收藏为一体的大型国际化美术馆。它犹如一个漂浮的立方，给人以强烈的视觉冲击力。其拥有71840平方米的总建筑面积和43685平方米的主楼建筑面积，内设8个专业展厅。此外，美术馆还配备了恒温恒湿典藏库、同声传译学术报告厅、艺术文献中心、实验空间、观影剧场等多功能空间，为观众提供了全方位的服务和体验。',
    books: [
      { title: '《名画在左，科学在右2》', reason: '当观众走进广汇美术馆8个专业展厅，面对一幅幅名画时，或许会好奇：达·芬奇笔下的光线为何如此真实？印象派的色彩背后藏着怎样的光学原理？《名画在左，科学在右2》（中国全民阅读网推荐好书）正是这样一场艺术与科学的“跨界展”：全书围绕100余幅脍炙人口的世界名画，以科学视角解读其中蕴含的科学元素、科学道理与人生智慧，探讨名画揭示的科学文明史——让美术馆的每一面墙，都成为连接审美与求知的窗口。' },
      { title: '《敦煌小画师》', reason: '中国全民阅读网推荐好书、入选向青少年推荐百种优秀出版物名单。《敦煌小画师》是一部原创现实主义题材的长篇儿童文学作品，由我省青年作家赵剑云女士创作。该书以20世纪40年代敦煌艺术研究所初创期为时代背景，讲述小主人公欣洁，一个11岁的小女孩跟随父亲来到敦煌莫高窟工作生活，在敦煌成长学习的动人故事。作品从儿童的视角，通过几个平凡的小故事，表现了敦煌莫高窟守护者们在面对艰苦的生活环境、变化莫测的时代格局中，坚守理想和信念，为保护敦煌默默付出，弘扬了一群致力于传承、发扬敦煌文化的艺术家和研究者甘守清贫、坚守大漠的无私奉献精神。' },
    ],
  },
]

const XINGLONG_LAKE_POINTS = [
  {
    id: 'xinglong-lake',
    name: '兴隆湖',
    introduction: '兴隆湖作为“天府绿肺”，不仅为市民提供了一个休闲娱乐的好去处，更是展示天府新区生态文明建设成果的重要窗口。2025年，天府新区兴隆湖湖滨场馆中心迎来成都世运会皮划艇马拉松、龙舟、跑酷、铁人两项比赛项目，场馆与公园城市自然环境交融，形成“近观竞技激情，远眺山水城景”的独特体验。兴隆湖的建设，不仅充分利用了原生自然地貌，雍水成湖，更是天府新区治水用水格局的典范。湖体工程、驳岸建设、岛屿湿地工程等生态环境建设的实施，使得兴隆湖的水质得到了显著改善，达到了地表水Ⅳ类标准，未来天府新区将努力打造更多人与自然和谐共生的生态空间。',
    books: [
      { title: '手绘水世界——关于水的博物课', reason: '2022年度“中国好书”（科普生活类）。人类跟水打了几十万年的交道。我们知其然：水是生命之源；但我们也不知其所以然：为什么万物不离水？该书把与水相关的自然、生态、资源、能源、利害、应用、文化等诸多离散的知识点像江河汇流一样融合在一起，并通过手绘图用透视的手法来剖解各种水工程构筑物的三维场景。全书分为34个知识单元、350个知识点，按照水与万物的关系、水之兴利的成就、水对文明的贡献三个层次，依序编排。旨在让大众，特别是青少年观察水世界、了解水文化、学习水知识、掌握水应用、探索水开发、加强水保护。水世界，美得只缺发现。\n\n兴隆湖的湖体工程、驳岸设计、水质净化，正是这本书里“水之兴利”的活教材——读完它，你再站在兴隆湖边，看到的就不只是水面，而是整个水循环与水利工程的奥秘。' },
      { title: '认识中国湖', reason: '2023年度“中国好书”。该书系统解析中国湖泊的地质、生态与文化，将兴隆湖纳入“城市湖泊生态治理”框架，可帮助读者理解其作为“天府绿肺”的水质改善工程（如湖体工程、湿地生态修复）和生物多样性价值，凸显其在区域生态系统中的典范意义。兴隆湖作为“城市湖泊生态治理”的样本，正好能在这本书的框架里找到位置——从“滞洪洼地”到“草型清水态”的蜕变，就是书中所讲的人与湖泊关系的当代实践。读完它，你就能理解“天府绿肺”四个字背后的科学含义。' },
    ],
  },
  {
    id: 'tsinghua-sichuan-energy-internet-institute',
    name: '清华四川能源互联网研究院',
    introduction: '四川有一个特别“绿色”的秘密武器，那就是清华四川能源互联网研究院，是清洁低碳能源研究的“大本营”。它的技术项目入选了国际技术交易创新项目榜单，获得许多荣誉称号，推动着社会向更加环保、可持续的方向发展。',
    books: [
      { title: '范式变更：碳中和的长潮与大浪', reason: '清华四川能源互联网研究院作为“清洁低碳能源研究大本营”，其智能电网、储能技术、能源互联网等方向的科研布局，正是书中“能源互联网推动低碳技术商业化”论述的实践样本。\n\n《范式变更：碳中和的长潮与大浪》由2023中国全民阅读网“科普生活类好书推荐”：\n\n碳中和是人类历史上最伟大的自我革命，它有着人类理想旗帜巨大的感召力，也被国家、民族和市场间的竞争所驱动，以排山倒海的巨浪之姿，从历史的长河中走来，呼啸着奔向未来。面对碳中和的长潮与大浪，亟待重塑面向未来的思维范式。这是一个发展目标确定、但过程充满不确定性的宏观环境，给身处其间的人们带来了全新的挑战。\n\n《范式变更：碳中和的长潮与大浪》旨在解构碳中和为中国带来的范式变更，从政策动向、科技进展和市场趋势等三大维度，剖析能源、交通、城建、工业、农业和土地等影响中国实现碳中和目标的核心产业，再深入解析零碳金融、双碳科创和绿色消费等三大实现碳中和目标的驱动力，最后洞悉碳中和的国际合作与竞争是面向未来不可回避的重要变量。望通过阅读本书，读者能从中汲取营养以重塑面向碳中和未来的思维范式。' },
      { title: '《像院士一样思考：100 位院士思维故事 100 例》', reason: '书中院士在天文、物理等领域的科研思维案例（如系统思维、实验设计），可对标点位“多单元协同观测”“科研平台搭建”的方法论，为科研人员提供跨学科思维借鉴，同时传递科学家精神。' },
    ],
  },
  {
    id: 'dongfang-electric-digital-technology',
    name: '东方电气集团数字科技有限公司',
    introduction: '“东方数科”在四川天府新区正式揭牌成立，标志着东方电气集团在“数字产业化、产业数字化”道路上迈出了关键一步。\n\n东方数科的核心业务是智能制造、数字化转型咨询、工业互联网、网络及信息安全。它的定位很独特——不是做产品，而是做“工业医生”，用大数据、云计算、AI赋能智能制造的每个环节，为离散型制造企业提供精准的“智改数转”个性化解决方案。\n\n东方数科已经为10多家企业打造了30余个数字化车间，其中2个获评国家级智能制造示范工厂。首条高端能源装备螺栓数字化生产线，实现从下料到入库全流程无人化，生产效率提升2倍，良品率接近100%，被央视《焦点访谈》报道。东方数科还作为主要编制单位，参与了中国电子技术标准化研究院牵头的《面向智能制造的工业大模型标准化研究报告》编制工作。',
    books: [
      { title: '给孩子讲大数据', reason: '东方数科的“工业医生”角色，本质上是用数据给工厂“看病”——从设备运行数据中发现隐患，从生产流程数据中优化效率。\n\n大数据究竟是什么？它和我们熟知的数字、数学又有着什么样的联系？《给孩子讲大数据》入选向全国青少年推荐百种优秀出版物、文津图书奖推荐图书，本书回溯数的发展、数据在中外历史重大事件的全方位应用，为孩子打开大数据之门，培养孩子们的“数商”和数据思维能力。\n\n这本书用故事和漫画讲大数据思维，帮你理解东方数科如何用数据“看见”工厂里看不见的问题。' },
      { title: '给孩子讲人工智能', reason: '东方数科的核心业务包含“人工智能基础软件开发”和“工业互联网数据服务”，他们做的“智改数转”本质上就是让AI走进工厂。\n\n人工智能正在撬动中国的创新，成为全领域、各行业关注的热点。《给孩子讲人工智能》入选向全国青少年推荐百种优秀出版物、文津图书奖推荐图书，用故事和漫画把人工智能的“前世今生”讲得通俗易懂，堪称“人工智能的启蒙入门读物”。\n\n这本书帮青少年理解东方数科的技术人员每天在“折腾”的到底是什么——从图灵测试到深度学习，从人脸识别到工业智能，AI的底层逻辑就藏在这些故事里。' },
    ],
  },
  {
    id: 'innovation-ecology-island',
    name: '科创生态岛',
    introduction: '成都科创生态岛是一座综合性的创新转化聚集区和科技成果转化生态基地。2024年，中西部地区首个人形机器人新型研发机构——成都人形机器人创新中心有限公司在这里正式落地。与此同时，新一代人造太阳“中国环流三号”的科研突破、成都“大脑”助力高海拔宇宙线观测站等，都展现了成都科技创新的强劲实力。这里就像一个“未来科技试验田”，你永远不知道下一个转角会遇到什么黑科技。',
    books: [
      { title: '元宇宙', reason: '探讨虚拟世界与现实科技的融合趋势，生态岛在“数字孪生城市”“智能建造”等领域的实践可与此书形成场景联动，其“科创 + 生态”的复合定位与书中“技术重塑空间”的理念相通，适合作为理解生态岛“未来科技试验田”角色的前瞻读物。中宣全民阅读科普生活类好书推荐。' },
      { title: '孩子看得懂的前沿科学漫画', reason: '入选中宣部出版局联合全国少工委办公室，会同中国出版协会少年儿童读物工作委员会、中国编辑学会少年儿童读物专业委员会、中国新闻出版广电报社、中国少年报社评选“向全国青少年推荐百种优秀出版物”名单。\n\n本系列用漫画的形式，将目前正在初步应用及未来10年将有巨大应用价值的尖端技术，包括量子物理、生物工程、通讯、宇航、新材料、神经科学、能源、娱乐、制造业、深空探测等，将其拟人为漫画人物，用孩子们喜欢的画风和简单的语言形式，科普10种尖端科学技术，让孩子们对尖端科技看得懂，有兴趣，感受尖端科技给生活带来的便利和无限可能。\n\n科创生态岛的“人形机器人创新中心”正在攻关的机器人运动原理、算法逻辑，正好是这本书里用漫画讲清楚的东西——机器人怎么动、算法怎么决策，看完漫画你就能理解科创生态岛上那些机器人在“想”什么。' },
      { title: '触手可及的未来科技：科学家与科幻作家的跨时空碰撞', reason: '入围2024年度“中国好书”，邀请11位一线科学家围绕“科幻作品中的十大未来科技”进行解读。太空电梯、脑机接口等科幻作品中出现的科技想象，由从事相关研究的科学家介绍科学背景、实现的可能性、目前存在的问题和困难等，探讨了这些未来科技从虚构走向现实的发展路径——这些科幻里的场景，正是科创生态岛正在攻关的方向。科创生态岛的存在本身，就是“科幻照进现实”的最佳注脚。' },
    ],
  },
  {
    id: 'tianqi-lithium',
    name: '天齐锂业',
    introduction: '天齐锂业是全球领先的以锂为核心的新能源材料企业，2023年正式入驻成都科学城兴隆湖畔。它的业务覆盖锂产业链的关键阶段——从硬岩型锂矿资源的开发，到锂精矿加工销售，再到锂化工产品的生产销售，为电动汽车和储能产业的锂离子电池技术提供材料支撑。换句话说，你手机里的电池、电动车里的电池，很可能就有天齐锂业的一份贡献。兴隆湖新总部大楼旁，还开了一座全球首个关于锂的科学馆，从锂的起源到发现，再到应用，全流程展示锂如何走进我们的生活。',
    books: [
      { title: '《院士解锁中国科技·藏起来的“能源之王”》', reason: '“院士解锁中国科技”丛书入选2023年度“中国好书”（科普生活类）。这套丛书由相关领域院士主笔，围绕信息、环境、化学、农业、矿产、医药卫生等16个领域，以青少年感兴趣的问题导入，生动讲述了新时代科技发展成就的故事，阐释了科技对于国家未来发展的贡献和意义。\n\n该书为丛书分册，由中国科学院院士金之钧主笔。这本书用17个科学专题讲解石油、天然气的基本知识，也涉及能源转型的思考。天齐锂业所在的锂电产业，正是“能源之王”从化石能源向新能源过渡的关键一环——读懂能源的过去，才能理解锂的未来，也才能理解天齐锂业为什么要在兴隆湖畔建一座锂的科学馆。' },
      { title: '《换道赛车：新能源汽车的中国道路》', reason: '天齐锂业是这条产业链上最上游的材料供应商——没有锂，就没有新能源汽车的“心脏”。读完这本书，你就能理解：为什么一块来自矿石的锂，能驱动整个汽车产业的“换道”，能更理解兴隆湖畔的天齐锂业在全球锂产业链中的位置。\n\n聚焦新能源汽车与能源供给体系的协同发展，研究院在智能电网、储能技术等领域的成果（如车网互动、分布式能源）可为此书提供技术注解，书中“能源—交通一体化”理念与研究院推动“绿色能源 + 可持续交通”的应用场景形成呼应，展现科技赋能产业升级的路径。' },
    ],
  },
]

const HAICHUANG_PARK_POINTS = [
  {
    id: 'tianfu-cosmic-ray-research-center',
    name: '天府宇宙线研究中心',
    introduction: `“拉索”有一张巨大的“网”——1.36平方公里，由5216个电磁粒子探测器和1188个缪子探测器组成。它昼夜不停地“接住”从宇宙深处砸向地球的粒子“阵雨”。

而在成都兴隆湖畔，天府宇宙线研究中心解读着这些来自这就是高海拔宇宙线观测站“拉索”的“密码”。

这里的科学家做的事，有点像宇宙级的“侦破”。宇宙线粒子本身带电，在星际磁场里拐来拐去，到达地球时早已不指向最初的源头。科学家只能通过它们撞出的次级粒子——高能伽马光子，来反推“肇事者”是谁。2022年10月9日，他们“接住”了一场穿越24亿光年而来的“宇宙烟花”——人类迄今记录到的最亮伽马射线暴GRB 221009A，6万多个伽马光子被拉索完整捕获，相关成果登上了《科学》杂志。2026年，他们又锁定了天鹅座方向一个每4.8小时“闪烁”一次的宇宙加速器——天鹅座X-3，它能将粒子加速到至少30拍电子伏特，远超人类最强大的对撞机数千倍。用“拉索”首席科学家曹臻的话说，这就像“宇宙中有人打开了一支手电筒，恰好就照在我们身上”。`,
    books: [
      { title: '《星海求知：天文学的奥秘》', reason: '中国全民阅读网科普生活好书推荐《星海求知：天文学的奥秘》。本书以图文并茂的方式，由浅入深地介绍了地球、月球、太阳系、银河系、黑洞、星团、星云、星系等一系列天体和天文研究对象，回顾了人类探索宇宙的艰辛历程，展望了天文学的发展前景。天府宇宙线研究中心“拉索”捕捉伽马射线暴、探索宇宙线起源的科研方向，正是这本书所讲述的“人类探索宇宙历程”的当代延续。读完它，你会理解“拉索”为什么要在海拔4410米的高原上张开那张1.36平方公里的“大网”。' },
      { title: '《月背征途：中国探月国家队记录》', reason: '2021年度“中国好书”、第十七届文津图书奖获奖图书、中国全民阅读网科普生活好书推荐。\n\n受地球与月球之间引力“潮汐锁定”的影响，人类在地球上只能看到月球正面。因此，神秘的月球背面曾长期挑动着人们的好奇心。2019年1月3日10时26分，“嫦娥四号”携“玉兔二号”成功着陆月球背面，中国成为世界上第一个成功在月球背面软着陆的国家。\n\n《月背征途》的编写历时近两年，记录了人类首次登陆月球背面全程，并首次公开大量珍贵图片。月球车的“身体结构”是怎样的、“玉兔”在月背如何“睡觉”“行走”“吃饭”、月球坑中隐藏着哪些神秘物质……这些问题都可在书中找到答案。\n\n《月背征途》还是一部通俗易懂的航天科普读本，详实介绍了从“嫦娥一号”到“嫦娥四号”，从月球车工作原理、地外天体遥操作技术到驾驶员的修炼过程，从“鹊桥”中继星的发射定点到月球背面着陆点选择，从一波三折的降落过程到“南征北战”一次次月面涉险探测历程。作者以专业的水准讲解大量技术细节，以满足人们对月球、对探月技术的浓厚兴趣，同时也彰显了中国航天人的智慧与勇气。\n\n“拉索”与探月工程同属国家重大科技基础设施，书中“国家队”的科研协作模式——北京航天飞行控制中心团队用精准操控让“玉兔二号”在月背生存了3年多——与“拉索”团队“把全国做宇宙线的力量拢到一起”的建制化攻关思路如出一辙。想理解中国大科学工程怎么运转，这本书是最好的样本。' },
      { title: '《征程：人类探索太空的故事》', reason: '“拉索”研究的是来自宇宙深处的粒子，这本书讲的正是人类如何一步步走向深空——从地球到月球，从月球到火星，下一个目标就是宇宙线的源头。\n\n宇宙是广袤空间和其中存在的各种天体以及弥漫物质的总称。自古以来，人类就对宇宙充满了好奇，并对宇宙的奥秘孜孜以求。人类探索宇宙的历史，是一幅波澜壮阔的画卷。在探索宇宙的过程中，随着科学技术不断进步，人类对宇宙的认知不断加深，人类社会自身的发展进步也深深受益于天文和宇宙学及航天科技的带动。人类作为高级智慧生物，对宇宙、地球与生命的起源、演化和未来的求知是必然的本能。\n\n本书以生动浅显的语言，讲述了地球、太阳系、宇宙空间的相关科学知识，介绍了人类探索太空的历史变迁、探索手段和工具的发展、探索所获得的重要发现，介绍了当前在探索太空中面临的科学和技术难题，探讨了地外生命存在的可能性以及人类与地球的未来。\n\n本书入选中宣部“向全国青少年推荐百种优秀出版物”、科技部2023年全国优秀科普作品。由“人民科学家”叶培建院士带领航天五院团队创作，系统梳理人类探索太空的历程。' },
    ],
  },
  {
    id: 'cas-chengdu-branch',
    name: '中科院成都分院',
    introduction: `中科院成都山地灾害与环境研究所：

在四川，有一座研究所专门“盯着”大山里的危险——滑坡、泥石流、山洪，都是它的研究对象。中国科学院成都山地所扎根西南山区数十年，做的是一件很具体的事：搞清楚山洪泥石流到底怎么发生、怎么运动、怎么成灾，然后提前发出预警。他们研发的“山地灾害风险精细监测预报预警平台”，构建了从降雨、入渗到汇流演进的全过程物理模型，实现了从“区域等级预报”到“精细化险情预报”的跨越，已经在四川凉山等地投入业务化运行，还计划落地巴基斯坦，让中国防灾技术走出国门。通俗地说，他们做的事就是：在大山发脾气之前，先替住在山脚下的人“听见”它的动静。

中科院成都生物研究所：

在成都，有一个地方藏着12万余号两栖爬行动物标本，馆藏量全国第一、亚洲第二，覆盖了我国已知两栖爬行类物种的80%以上。这就是中国科学院成都生物研究所的两栖爬行动物标本馆。四代学者用了80余年时间，一锄头一锄头地挖、一只蛙一条蛇地攒，才有了今天的规模。生物所的科研人员至今仍在四川的山林里跑野外，2025年刚发表了两栖爬行动物新种“成都滑蜥”，此前它一直藏在标本馆里，被误认为另一种滑蜥。这里的研究不止于“认识物种”，还涉及蛇类四肢缺失的演化机制、水栖蛇类如何适应水下生活等前沿问题，相关成果登上了Cell封面。对青少年来说，走进这个标本馆，看到的不只是浸在药水里的标本，而是一部四代人用脚底板走出来的中国两栖爬行动物“家底”。`,
    books: [
      { title: '古诗词里的科学现象', reason: '入选2022年向全国青少年推荐百种优秀出版物。《古诗词里的科学现象》巧妙地将科学与传统文化相结合，精选从先秦到清代的经典古诗词，从物理（光学、力学、微观物理）、化学、生物、自然地理、天文、气象等各个角度解读经典古诗词中的科学现象，以风趣幽默的文笔揭示科学知识和原理的历史内涵，是一本知识性与可读性俱佳的趣味科普读物。\n\n成都山地所的研究对象——山地、土壤、植被、水文、气象是这本书反复触及的主题。书中有专门篇章解读“山上的花为何如此‘害羞’”（山地垂直气候带对植物物候的影响）、“山脉，大地的皱纹”（山地地质构造）、“每一粒沙子都曾是岩石”（山地风化侵蚀过程）、“地球上的水确实是‘活着’的”（水循环与水文过程），以及“落红不是无情物，化作春泥更护花”（土壤有机质循环与植被恢复）。' },
      { title: '大山里的长尾龙', reason: '2025年度灾害防御科学技术普及奖一等奖，国内首部地质灾害主题科普绘本。以拟人化“长尾龙”为核心形象，把泥石流形成机理、发育特征和避险方法融入童话故事。成都山地所的核心工作就是研究滑坡、泥石流——这套书正是山地科研人员把“硬核知识”变成“孩子看得懂的故事”的典范。' },
      { title: '《科学巨人：中国科学家的榜样故事》', reason: '入选2022年向全国青少年推荐百种优秀出版物。收录袁隆平、钱学森、邓稼先、竺可桢、李四光等10位科学家。成都山地所首任所长竺可桢是中国现代气象学和地理学的奠基人，他坚持物候观测几十年，从一天不落的日记里“熬”出了中国气候变迁的规律——这正是成都山地所科研精神的源头。\n\n对青少年来说，这本书讲的不只是科学家的成就，更是他们“把一件事做一辈子”的耐心。\n\n科学研究不是一蹴而就，是从竺可桢那一代人就开始的“把论文写在祖国大地上”，一代一代接着干。' },
      { title: '《地球不能没有动物》', reason: '2022年向全国青少年推荐百种优秀出版物。这套书入选2022年向全国青少年推荐百种优秀出版物，作者林育真是山东师范大学教授，长期从事动物生态学及动物地理学教学与研究。丛书共10册，每册重点介绍一种动物，涵盖大熊猫、大象、老虎、狮子、孔雀、长颈鹿、长臂猿、大袋鼠、天鹅和企鹅，含百余张高清动物图片，系统展现动物的形态、生理、生态及其与人类的关系。书中关于动物生态、物种多样性的内容，能帮助青少年建立对动物学的基础认知。' },
      { title: '《熊猫七仔》', reason: '入选2026年“中国好书”青少年专榜，以全球唯一圈养棕白色大熊猫为主角，讲述一个关于生命救助与物种保护的真实故事。\n\n七仔因一身棕白色毛发区别于所有黑白相间的大熊猫，被人们称为“可以拍彩色照片的大熊猫”。这本书以生活在秦岭四宝科学公园的七仔为主角，讲述它接受人工救助并健康成长的故事，同时从七仔的“熊际圈”入手，介绍其他秦岭亚种大熊猫，普及大熊猫相关知识和珍稀动物保护理念。对于成都生物所而言，这本书的价值在于它用一只大熊猫的个体命运，串起了物种保护、栖息地生态、人工繁育等生物多样性保育的核心议题——而这些议题，正是生物所“生态恢复与生物多样性保育”重点实验室长期关注的方向。青少年读完七仔的故事再走进生物所展厅，看到的不再只是标本和术语，而是一个个有温度的生命故事。' },
      { title: '好样的昆虫笔记', reason: '全民阅读网少儿阅读推荐，该书是少年科普博主好样以自己观察、饲养昆虫的经历为素材，为小小“虫友”们精心打造的自然之书。全书有别于传统昆虫科普的说教模式，将文字与诙谐的昆虫漫画结合起来，以同龄人视角向小读者介绍蝴蝶、蜜蜂、螳螂等各种昆虫的形态特征、生活习性，以及与之相关的趣味“冷知识”，让小读者在掌握知识的同时，学习观察自然的方法，并逐步培养起对自然万物的敬畏之心、发掘自然奥秘的探索精神，以及保护生态环境的自觉意识。' },
    ],
  },
  {
    id: 'national-supercomputing-center-chengdu',
    name: '国家超算成都中心',
    introduction: '在西部（成都）科学城兴隆湖畔，隐藏着一个“超级大脑”——国家超级计算成都中心。它有着多重身份，是超级“算命先生”，能预测未来的气候变化趋势；是一位“神医”，与四川大学华西医院合作，运用强大的算力支持罕见病研究；是一位“农业大师”，与中国农业科学院合作，成功预测了蛋白质结构及相互作用；也是一位“天文学家”，与成都理工大学合作开展行星尺度的超高速碰撞模拟；还是一位“设计师”，为建筑、汽车等领域提供精确的设计方案。无论是宇宙的奥秘还是城市的脉搏，它都能一一算出。',
    books: [
      { title: '算法之问：看透数字世界的底层逻辑', reason: '入选2026年“中国好书”青少年专榜，作者熊辉、廖方宇等，书名直接指向“算法”与“数字世界的底层逻辑”。超算中心做气候模拟、行星碰撞模拟、蛋白质结构分析，底层全是算法在驱动。这本书帮青少年理解：超算不是一台“大电脑”，而是算法和算力结合后，对复杂世界进行模拟和预测的工具。' },
      { title: '孩子看得懂的前沿科学漫画', reason: '入选2022年向全国青少年推荐百种优秀出版物，用漫画形式直观呈现AI、机器人、量子物理等尖端技术原理。超算中心的人形机器人、人工智能等应用场景，正好是这本书里用漫画讲清楚的东西——机器人怎么动、算法怎么决策，看完漫画就能理解超算在背后“算”的是什么。' },
    ],
  },
]

const PAGES = [
  [
    layer(0, 0, 750, 1624, '5bc9a404d437eedc06fae329a77e4908_154473_750_1624.png'), layer(401, 1433, 177, 55, '69d33e844ce34d5310ebc6bb655f24ed_18292_177_55.png'), layer(161, 1433, 177, 55, 'e5d460c695047ec781b3acd2bd299e0c_16214_177_55.png'), layer(38, 103, 522, 125, '76f7806ab140036f786b40abaeb79d31_21731_522_125.png'), layer(658, 117, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(21, 283, 727, 347, '1c9e523743adb330ed510ce65fcb2554_314008_727_347.png'), layer(21, 657, 727, 331, '3b603cd853e4d82ffa66259c006e99bc_345886_727_331.png'), layer(21, 1038, 727, 341, '0aa3ecc6630ef8a990e1564db4665879_355213_727_341.png'),
  ],
  [
    layer(0, 0, 750, 1624, 'c7fd46c0385aeb0c1e2c2b36894a7b31_559897_750_1624.png'), layer(97, 1097, 460, 222, '4c5347d5245a379bf7fc5a9c17544cdd_163657_460_222.png'), layer(81, 1186, 684, 344, 'e943c9a372c8c50386bc2da2dbdfbc5b_141303_684_344.png'), layer(393, 549, 322, 211, '3e396b89dc526f1776ee2c0e2b2a78b7_104251_322_211.png'), layer(46, 829, 309, 192, '4af2415287a33b12a7f48e466c9ee4cd_166574_309_192.png'), layer(315, 280, 424, 194, '5d839151737647875317445f6bc219b3_121632_424_194.png'), layer(482, 236, 208, 55, '5afa29c218816d64f78f4581a9833024_19225_208_55.png'), layer(162, 716, 245, 55, 'f8d3ebbf5c47dd4c7ae9aad2f071de57_23006_245_55.png'), layer(470, 484, 177, 55, 'a007faa6a727abaf2f1a67ab603c169a_17350_177_55.png'), layer(252, 1185, 282, 93, '2d915f215031d551d43c9a6639a61a62_33522_282_93.png'), layer(415, 470, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(433, 246, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(87, 725, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(550, 1161, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(34, 101, 611, 125, '85d549673ca39a3822ff551d043ac4d6_39591_611_125.png'), layer(658, 103, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), ...POINT_MAP_FOOTER, layer(10, 504, 356, 160, '7635102ea5a3f71170e1ff561bd6d5e6_103517_356_160.png'), layer(81, 441, 208, 55, 'c1189bff2047246c067fcbd440c79688_16561_208_55.png'), layer(310, 468, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'),
  ],
  [
    layer(0, 0, 750, 1624, 'bd6f8cf6b018119c581a33e2ddfa405e_480165_750_1624.png'), layer(490, 1211, 208, 55, '65525d3ddb01829b60950ec48ab5b6d1_19512_208_55.png'), layer(404, 401, 316, 55, '559198fa328b24b32a13ec80159c8861_28896_316_55.png'), layer(61, 920, 151, 55, 'ea88b2a6854e54f5d1d55239c97b1d20_15860_151_55.png'), layer(84, 983, 545, 208, '681b18ed81a3b288457b96272fff06ee_253828_545_208.png'), layer(370, 142, 380, 243, '7e8322482a81f54c5d5cd48e78450395_202997_380_243.png'), layer(58, 1194, 558, 297, 'df715a3bba1247fbf572537953363195_239631_558_297.png'), layer(276, 352, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(643, 777, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(405, 532, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(627, 1278, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(31, 1006, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(46, 101, 643, 129, '58da27f455702a97011d3fb45fb44065_42099_643_129.png'), layer(658, 163, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), ...POINT_MAP_FOOTER, layer(69, 427, 329, 197, '1b92140f5edb847c21ab6fbbbbd4306c_122134_329_197.png'), layer(475, 849, 262, 87, '69a622798c8b88be6975959874797982_29383_262_87.png'), layer(149, 635, 177, 55, 'c830a1974f8e9f00887c307f787cba84_15768_177_55.png'), layer(273, 650, 336, 188, '240f446e2d74f40823248f03ffebbf54_111985_336_188.png'),
  ],
  [
    layer(0, 0, 750, 1624, '8260eebc4870c55ff557286c7a24d6ab_545650_750_1624.png'), layer(384, 277, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(148, 515, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(236, 1237, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(317, 1190, 509, 252, '81859d280394e5c9356b0faf13e8c52b_174873_509_252.png'), layer(13, 225, 380, 275, '42cc9916311d21fcebfa01113922b74a_161364_408_295.png'), layer(224, 717, 456, 226, '81b7d8b04df32d92f5e82fc02ca675aa_212440_456_226.png'), layer(208, 481, 479, 202, '2bad3e0bf6d853e2b6338f5ee908e918_179910_479_202.png'), layer(39, 1038, 467, 160, '59f3e30ace317bafc73c0961e18354b1_154445_467_160.png'), layer(98, 611, 254, 55, '1e59b9bf0a5b8661e3fb6729a5722b3b_23580_254_55.png'), layer(82, 1314, 282, 55, '13fe9d50d511cf74622460664113609e_25694_282_55.png'), layer(317, 378, 221, 55, '26e9e1ce2635e36b8d15d4fbcbcb6685_19004_221_55.png?v=20260928'), layer(26, 101, 689, 130, '39e48ee8ed646f4316db23745ff61dbd_34049_689_130.png'), layer(658, 162, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), ...POINT_MAP_FOOTER,
  ],
  [
    layer(0, 0, 750, 1624, '49d028d0926c4f74ebe84b0a2c5f8783_447027_750_1624.png'), layer(25, 467, 708, 561, '56a79cf1a92141737709d512e6ce5c7e_52678_708_571.png'), layer(27, 115, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(502, 1320, 194, 244, '27102cb248a54e06c3593993531c7fdf_70874_194_244.png'), layer(-20, 1017, 548, 99, '8551a4e442f8a94f85985c1e79fd77e7_38836_548_99.png'),
  ],
  [
    layer(0, 0, 750, 1624, '49d028d0926c4f74ebe84b0a2c5f8783_447027_750_1624.png'), layer(27, 86, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(205, 92, 548, 99, 'ecd6e654adc5b85a2ea1e3064008986b_14501_548_99.png'), layer(23, 523, 710, 929, 'ee328ace81f6a8ef5f9f5600d92aac97_67164_710_929.png'),
  ],
]

function Canvas({ sceneKey, layers, masks = [], actions = [], children }) {
  const animationKey = sceneKey || layers[0]?.name || 'detail'
  return <main className="tianfu-stage"><div className="tianfu-canvas" key={animationKey}>
    {layers.map((item, index) => {
      const isMarker = item.name === '82374099863f590a3e891a161d45ac9d_7390_41_64.png'
      return <img className={`tianfu-layer${isMarker ? ' tianfu-marker' : index > 0 ? ' tianfu-layer-enter' : ''}`} key={`${item.name}-${index}`} src={asset(item.name)} alt="" draggable="false" style={{ left: `${item.left / 7.5}%`, top: `${item.top / 16.24}%`, width: `${item.width / 7.5}%`, height: `${item.height / 16.24}%`, ...(isMarker ? { '--tianfu-marker-delay': `${(index % 5) * 110}ms` } : { '--tianfu-enter-delay': `${Math.min(index, 8) * 45}ms` }) }} />
    })}
    {masks.map((item) => <div className="tianfu-mask tianfu-layer-enter" key={item.top} style={{ left: `${item.left / 7.5}%`, top: `${item.top / 16.24}%`, width: `${item.width / 7.5}%`, height: `${item.height / 16.24}%`, '--tianfu-enter-delay': '180ms' }}><img className="tianfu-mask-image" src={asset(item.name)} alt="" draggable="false" style={{ left: `${item.imageLeft / item.width * 100}%`, top: `${item.imageTop / item.height * 100}%`, width: `${item.imageWidth / item.width * 100}%`, height: `${item.imageHeight / item.height * 100}%` }} /></div>)}
    {children}
    {actions.map((item) => <button className="tianfu-hit" key={item.label} type="button" onClick={item.onClick} aria-label={item.label} style={{ left: `${item.left / 7.5}%`, top: `${item.top / 16.24}%`, width: `${item.width / 7.5}%`, height: `${item.height / 16.24}%` }} />)}
  </div></main>
}

function DetailLayout({ point, onSelectBook }) {
  const visibleBookRows = Math.min(point.books.length, 4)
  const isScrollableBookList = point.books.length > visibleBookRows
  return <>
    <img className="tianfu-layer" src={asset(PAGES[4][0].name)} alt="" draggable="false" style={{ left: '0%', top: '0%', width: '100%', height: '100%' }} />
    <div className="tianfu-detail-media">{point.video && <div className="tianfu-detail-media-inner"><video controls playsInline preload="metadata" src={asset(point.video)} /></div>}</div>
    {PAGES[4].slice(1).map((item, index) => <img className="tianfu-layer" key={`${item.name}-${index}`} src={asset(item.name)} alt="" draggable="false" style={{ left: `${item.left / 7.5}%`, top: `${item.top / 16.24}%`, width: `${item.width / 7.5}%`, height: `${item.height / 16.24}%` }} />)}
    <div className="tianfu-detail-copy">{point.introduction}</div>
    <div className={`tianfu-detail-title${point.name.length > 12 ? ' tianfu-detail-title-long' : ''}`}>{point.name}</div>
    <div className={`tianfu-detail-recommendation${isScrollableBookList ? ' tianfu-detail-recommendation-scrollable' : ''}`} style={{ height: `${visibleBookRows * 100 / 16.24}%` }}>
      {point.books.map((book) => <div className="tianfu-detail-recommendation-row" key={book.title} role="button" tabIndex={0} onClick={() => onSelectBook(book)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelectBook(book) }} style={{ height: `${100 / visibleBookRows}%` }}><img src={asset('57143668e9dfe2e2cea46d52d1a57215_12027_108_97.png')} alt="" draggable="false" /><div className="tianfu-detail-recommendation-title"><span className="tianfu-detail-recommendation-title-text">{book.title}</span></div></div>)}
    </div>
  </>
}

function ReviewLayout() {
  return <div style={{ position: 'absolute', left: `${25 / 7.5}%`, top: `${259 / 16.24}%`, width: `${698 / 7.5}%`, minWidth: `${698 / 7.5}%`, maxWidth: `${698 / 7.5}%`, height: `${1240 / 16.24}%`, minHeight: `${1240 / 16.24}%`, maxHeight: `${1240 / 16.24}%`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: '1 0 0%', overflow: 'visible', backgroundColor: 'rgba(255, 255, 255, 0.8)', transformOrigin: '0% 0% 0px' }}><div style={{ color: '#8a653e', fontSize: 'clamp(21px, 5.6vw, 42px)', fontWeight: 700 }}>敬请期待</div></div>
}

function formatBookTitle(title) {
  const trimmedTitle = title.trim()
  return trimmedTitle.startsWith('《') && trimmedTitle.endsWith('》') ? trimmedTitle : `《${trimmedTitle}》`
}

function bookCoverName(title, pointId) {
  if (pointId === 'national-supercomputing-center-chengdu' && title.includes('孩子看得懂的前沿科学漫画')) return 'h11.png'
  if (title.includes('小亮老师')) return 't1.png'
  if (title.includes('虫子旁')) return 't2.png'
  if (title.includes('藏在建筑里的世界史')) return 't3.png'
  if (title.includes('重拾瑰宝圆明园')) return 't4.png'
  if (title.includes('天工开物')) return 't5.png'
  if (title.includes('中华人物故事汇')) return 't6.png'
  if (title.includes('古诗词遇见中国地理')) return 't7.png'
  if (title.includes('成为科学家')) return 't8.png'
  if (title.includes('名画在左')) return 't9.png'
  if (title.includes('敦煌小画师')) return 't10.png'
  if (title.includes('手绘水世界')) return 'x1.png'
  if (title.includes('认识中国湖')) return 'x2.png'
  if (title.includes('范式变更')) return 'x3.png'
  if (title.includes('像院士一样思考')) return 'x4.png'
  if (title.includes('给孩子讲大数据')) return 'x5.png'
  if (title.includes('给孩子讲人工智能')) return 'x6.png'
  if (title.includes('元宇宙')) return 'x7.png'
  if (title.includes('孩子看得懂的前沿科学漫画')) return 'x8.png'
  if (title.includes('触手可及的未来科技')) return 'x9.png'
  if (title.includes('院士解锁中国科技')) return 'x10.png'
  if (title.includes('换道赛车')) return 'x11.png'
  if (title.includes('星海求知')) return 'h1.png'
  if (title.includes('月背征途')) return 'h2.png'
  if (title.includes('征程：人类探索太空')) return 'h3.png'
  if (title.includes('古诗词里的科学现象')) return 'h4.png'
  if (title.includes('大山里的长尾龙')) return 'h5.png'
  if (title.includes('科学巨人')) return 'h6.png'
  if (title.includes('地球不能没有动物')) return 'h7.png'
  if (title.includes('熊猫七仔')) return 'h8.png'
  if (title.includes('好样的昆虫笔记')) return 'h9.png'
  if (title.includes('算法之问')) return 'h10.png'
  return null
}

function BookReasonLayout({ book, point }) {
  const title = formatBookTitle(book.title)
  const coverName = bookCoverName(book.title, point.id)
  return <>
    {coverName && <img className="tianfu-layer" src={asset(coverName)} alt="" draggable="false" style={{ left: '4.133333%', top: '12.315271%', width: '37.733333%', height: '20.628079%' }} />}
    <div className={`tianfu-book-reason-title${Array.from(title).length > 30 ? ' tianfu-book-reason-title-compact' : ''}`}><span className="tianfu-book-reason-title-text">{title}</span></div>
    <div className="tianfu-book-reason-copy">{book.reason}</div>
  </>
}

export default function TianfuNewDistrictReadingProject() {
  const [stage, setStage] = useState('home')
  const [districtReadingStage, setDistrictReadingStage] = useState(1)
  const [selectedBook, setSelectedBook] = useState(TIANFU_PARK.books[0])
  const [selectedPoint, setSelectedPoint] = useState(TIANFU_PARK)
  const [pointMapStage, setPointMapStage] = useState('map')

  useEffect(() => {
    let active = true
    request(`/activities/${ACTIVITY_KEY}/public-config`, { skipAuth: true })
      .then((config) => {
        if (!active) return
        const value = Number(config?.mobileConfig?.districtReadingStage)
        setDistrictReadingStage(Number.isInteger(value) && value >= 1 && value <= 3 ? value : 1)
      })
      .catch(() => {
        // Keep the first phase closed by default when public config cannot be read.
      })
    return () => {
      active = false
    }
  }, [])

  const openPoint = (point, mapStage = 'map') => {
    setSelectedPoint(point)
    setSelectedBook(point.books[0])
    setPointMapStage(mapStage)
    setStage('detail')
  }
  const openReview = (mapStage) => {
    setPointMapStage(mapStage)
    setStage('review')
  }
  if (stage === 'home') return <Canvas layers={HOME} actions={[{ label: '进入第一期', left: 274, top: 1189, width: 195, height: 194, onClick: () => setStage('catalog') }]} />
  if (stage === 'catalog') return <Canvas layers={PAGES[0]} masks={[
    districtReadingStage < 2 ? 644 : null,
    districtReadingStage < 3 ? 1024 : null,
  ].filter((top) => top !== null).map((top) => ({ left: 0, top, width: 750, height: 380, imageLeft: 248, imageTop: 47, imageWidth: 261, imageHeight: 264, name: 'dec5f1bd5f38a191230e26913a3592dd_35476_261_264.png' }))} actions={[
    { label: '返回首页', left: 658, top: 117, width: 66, height: 65, onClick: () => setStage('home') },
    { label: '首页', left: 161, top: 1433, width: 177, height: 55, onClick: () => setStage('home') },
    { label: '进入天府公园', left: 21, top: 283, width: 727, height: 347, onClick: () => setStage('map') },
    ...(districtReadingStage >= 2 ? [{ label: '进入兴隆湖', left: 21, top: 657, width: 727, height: 331, onClick: () => setStage('xinglong-lake') }] : []),
    ...(districtReadingStage >= 3 ? [{ label: '进入海创园', left: 21, top: 1038, width: 727, height: 341, onClick: () => setStage('haichuang-park') }] : []),
  ]} />
  if (stage === 'map') return <Canvas layers={PAGES[1]} actions={[
    { label: '返回阅读地图', left: 658, top: 103, width: 66, height: 65, onClick: () => setStage('catalog') },
    { label: '首页', left: 46, top: 1431, width: 177, height: 55, onClick: () => setStage('home') },
    { label: '查看精彩评论', left: 519, top: 1431, width: 177, height: 55, onClick: () => openReview('map') },
    { label: '查看广汇美术馆详情', left: 482, top: 236, width: 208, height: 55, onClick: () => openPoint(FIRST_PHASE_POINTS[4]) },
    { label: '查看天府公园详情', left: 470, top: 484, width: 177, height: 55, onClick: () => openPoint(FIRST_PHASE_POINTS[0]) },
    { label: '查看四川名人馆详情', left: 81, top: 441, width: 208, height: 55, onClick: () => openPoint(FIRST_PHASE_POINTS[2]) },
    { label: '查看雅州路综合管廊详情', left: 162, top: 716, width: 245, height: 55, onClick: () => openPoint(FIRST_PHASE_POINTS[3]) },
    { label: '查看天府新区国际会议中心详情', left: 252, top: 1185, width: 282, height: 93, onClick: () => openPoint(FIRST_PHASE_POINTS[1]) },
  ]} />
  if (stage === 'xinglong-lake') return <Canvas layers={PAGES[2]} actions={[
    { label: '返回阅读地图', left: 658, top: 163, width: 66, height: 65, onClick: () => setStage('catalog') },
    { label: '首页', left: 46, top: 1431, width: 177, height: 55, onClick: () => setStage('home') },
    { label: '查看精彩评论', left: 519, top: 1431, width: 177, height: 55, onClick: () => openReview('xinglong-lake') },
    { label: '查看清华四川能源互联网研究院详情', left: 404, top: 401, width: 316, height: 55, onClick: () => openPoint(XINGLONG_LAKE_POINTS[1], 'xinglong-lake') },
    { label: '查看天齐锂业详情', left: 149, top: 635, width: 177, height: 55, onClick: () => openPoint(XINGLONG_LAKE_POINTS[4], 'xinglong-lake') },
    { label: '查看东方电气集团数字科技有限公司详情', left: 475, top: 849, width: 262, height: 87, onClick: () => openPoint(XINGLONG_LAKE_POINTS[2], 'xinglong-lake') },
    { label: '查看兴隆湖详情', left: 61, top: 920, width: 151, height: 55, onClick: () => openPoint(XINGLONG_LAKE_POINTS[0], 'xinglong-lake') },
    { label: '查看科创生态岛详情', left: 490, top: 1211, width: 208, height: 55, onClick: () => openPoint(XINGLONG_LAKE_POINTS[3], 'xinglong-lake') },
  ]} />
  if (stage === 'haichuang-park') return <Canvas layers={PAGES[3]} actions={[{ label: '返回阅读地图', left: 658, top: 162, width: 66, height: 65, onClick: () => setStage('catalog') }, { label: '查看中科院成都分院详情', left: 317, top: 378, width: 221, height: 55, onClick: () => openPoint(HAICHUANG_PARK_POINTS[1], 'haichuang-park') }, { label: '查看国家超算成都中心详情', left: 98, top: 611, width: 254, height: 55, onClick: () => openPoint(HAICHUANG_PARK_POINTS[2], 'haichuang-park') }, { label: '查看天府宇宙线研究中心详情', left: 82, top: 1314, width: 282, height: 55, onClick: () => openPoint(HAICHUANG_PARK_POINTS[0], 'haichuang-park') }, { label: '首页', left: 46, top: 1431, width: 177, height: 55, onClick: () => setStage('home') }, { label: '查看精彩评论', left: 519, top: 1431, width: 177, height: 55, onClick: () => openReview('haichuang-park') }]} />
  if (stage === 'review') return <Canvas sceneKey={`review-${pointMapStage}`} layers={REVIEW_PAGE} actions={[{ label: '返回点位地图', left: 27, top: 115, width: 66, height: 65, onClick: () => setStage(pointMapStage) }]}><ReviewLayout /></Canvas>
  if (stage === 'detail') return <Canvas sceneKey={`detail-${selectedPoint.id}`} layers={[]} actions={[{ label: '返回点位地图', left: 27, top: 115, width: 66, height: 65, onClick: () => setStage(pointMapStage) }]}><DetailLayout point={selectedPoint} onSelectBook={(book) => { setSelectedBook(book); setStage('book-reason') }} /></Canvas>
  return <Canvas sceneKey={`book-${selectedBook.title}`} layers={PAGES[5]} actions={[{ label: '返回点位详情', left: 27, top: 86, width: 66, height: 65, onClick: () => setStage('detail') }]}><BookReasonLayout book={selectedBook} point={selectedPoint} /></Canvas>
}
