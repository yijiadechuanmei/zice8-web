import { useState } from 'react'
import './style.css'

const ACTIVITY_TYPE = 'tianfu_new_district_reading_20260927'
const ACTIVITY_KEY = 'tianfu_new_district_reading_20260927'
const OSS = `https://assets.zice8.com/${ACTIVITY_TYPE}/${ACTIVITY_KEY}/`
const asset = (name) => `${OSS}${name}`
const layer = (left, top, width, height, name) => ({ left, top, width, height, name })

const HOME = [
  layer(0, 0, 750, 1624, '9e0698d039f852dcb71a782eba2609f4_1518088_750_1624.png'),
  layer(101, 237, 572, 257, '7035fb18d008055ad2b19625c9d44b11_71999_572_257.png'),
  layer(274, 1189, 195, 194, 'c47001a10b3e366ca43c15470d6ea07d_46718_195_194.png'),
  layer(282, 1410, 177, 55, '11e521138753e163ad5dc1a0211005c4_18240_177_55.png'),
]

const TIANFU_PARK = {
  name: '天府公园',
  introduction: `你想象过这样的场景吗——一边在公园散步，一抬头就看到选手在岩壁上飞檐走壁？这不是电影，是天府公园的日常。2025年成都世运会的速度攀岩和浮士德球比赛，就在这片草坪旁边举行。开放式场馆让“赛事即风景”成为现实，你不需要买门票，在公园漫步时就能感受到国际赛事的紧张与刺激。

但天府公园的精彩远不止于此。这里是300多种鸟类的秘密基地。鸳鸯在湖面悠闲地秀恩爱，雀鹰在头顶盘旋巡视，白肩雕偶尔来串门。观鸟爱好者在这里记录到的鸟种多达46种，从赤膀鸭到红嘴蓝鹊，从翠鸟到八哥，每一种都有自己独特的“性格”。

50种乔木加60种彩叶树，一年四季轮番换装，逛一次根本不够。脚下踩的透水砖也不是普通砖。这是“海绵城市”的巧思——雨水落下来直接被“喝掉”，经过滤净化后还能再利用。公园的道路和广场全部采用透水铺装，下沉式绿地和雨水花园负责收集、净化地表径流，让整座公园像一块巨大的海绵，会呼吸、会蓄水。逛一次天府公园，你等于同时上了一堂鸟类观察课、植物认知课和生态工程课。`,
  books: [
    {
      title: '《小亮老师的博物课》',
      reason: `天府公园本身就是一本翻不完的“自然之书”：300多种鸟类在此栖居，鸳鸯、雀鹰、白肩雕等国家二级保护鸟类常驻其间，近50种乔木与近60种落叶、常绿、彩叶树种让四季皆有风景。公园里随处可见的花草树木、飞鸟昆虫、水生动物，正是孩子身边最生动的“博物课”——《小亮老师的博物课》就是带他们读懂这片天地的向导。

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
    introduction: '广汇美术馆位于天府新区天府总部商务区，毗邻天府公园，是一座集展览展示、学术研究、公共教育和收藏为一体的大型国际化美术馆。它犹如一个漂浮的立方，给人以强烈的视觉冲击力。其拥有71840平方米的总建筑面积和43685平方米的主楼建筑面积，内设8个专业展厅。此外，美术馆还配备了恒温恒湿典藏库、同声传译学术报告厅、艺术文献中心、实验空间、观影剧场等多功能空间，为观众提供了全方位的服务和体验。',
    books: [
      { title: '《名画在左，科学在右2》', reason: '当观众走进广汇美术馆8个专业展厅，面对一幅幅名画时，或许会好奇：达·芬奇笔下的光线为何如此真实？印象派的色彩背后藏着怎样的光学原理？《名画在左，科学在右2》（中国全民阅读网推荐好书）正是这样一场艺术与科学的“跨界展”：全书围绕100余幅脍炙人口的世界名画，以科学视角解读其中蕴含的科学元素、科学道理与人生智慧，探讨名画揭示的科学文明史——让美术馆的每一面墙，都成为连接审美与求知的窗口。' },
      { title: '《敦煌小画师》', reason: '中国全民阅读网推荐好书、入选向青少年推荐百种优秀出版物名单。《敦煌小画师》是一部原创现实主义题材的长篇儿童文学作品，由我省青年作家赵剑云女士创作。该书以20世纪40年代敦煌艺术研究所初创期为时代背景，讲述小主人公欣洁，一个11岁的小女孩跟随父亲来到敦煌莫高窟工作生活，在敦煌成长学习的动人故事。作品从儿童的视角，通过几个平凡的小故事，表现了敦煌莫高窟守护者们在面对艰苦的生活环境、变化莫测的时代格局中，坚守理想和信念，为保护敦煌默默付出，弘扬了一群致力于传承、发扬敦煌文化的艺术家和研究者甘守清贫、坚守大漠的无私奉献精神。' },
    ],
  },
]

const PAGES = [
  [
    layer(0, 0, 750, 1624, '5bc9a404d437eedc06fae329a77e4908_154473_750_1624.png'), layer(401, 1433, 177, 55, '69d33e844ce34d5310ebc6bb655f24ed_18292_177_55.png'), layer(161, 1433, 177, 55, 'e5d460c695047ec781b3acd2bd299e0c_16214_177_55.png'), layer(38, 103, 522, 125, '76f7806ab140036f786b40abaeb79d31_21731_522_125.png'), layer(658, 117, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(21, 283, 727, 347, '1c9e523743adb330ed510ce65fcb2554_314008_727_347.png'), layer(21, 657, 727, 331, '3b603cd853e4d82ffa66259c006e99bc_345886_727_331.png'), layer(21, 1038, 727, 341, '0aa3ecc6630ef8a990e1564db4665879_355213_727_341.png'),
  ],
  [
    layer(0, 0, 750, 1624, 'c7fd46c0385aeb0c1e2c2b36894a7b31_559897_750_1624.png'), layer(97, 1097, 460, 222, '4c5347d5245a379bf7fc5a9c17544cdd_163657_460_222.png'), layer(81, 1186, 684, 344, 'e943c9a372c8c50386bc2da2dbdfbc5b_141303_684_344.png'), layer(393, 549, 322, 211, '3e396b89dc526f1776ee2c0e2b2a78b7_104251_322_211.png'), layer(46, 829, 309, 192, '4af2415287a33b12a7f48e466c9ee4cd_166574_309_192.png'), layer(315, 280, 424, 194, '5d839151737647875317445f6bc219b3_121632_424_194.png'), layer(482, 236, 208, 55, '5afa29c218816d64f78f4581a9833024_19225_208_55.png'), layer(162, 716, 245, 55, 'f8d3ebbf5c47dd4c7ae9aad2f071de57_23006_245_55.png'), layer(470, 484, 177, 55, 'a007faa6a727abaf2f1a67ab603c169a_17350_177_55.png'), layer(165, 1040, 316, 55, 'dcb97b1e9570c982d5dd8737ebbf2627_27821_316_55.png'), layer(433, 1222, 151, 55, '80bf77a7220bb1f618a0217c02829b10_15353_151_55.png'), layer(415, 470, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(433, 246, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(87, 725, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(593, 1205, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(117, 1013, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(34, 101, 611, 125, '85d549673ca39a3822ff551d043ac4d6_39591_611_125.png'), layer(658, 103, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(401, 1433, 177, 55, '69d33e844ce34d5310ebc6bb655f24ed_18292_177_55.png'), layer(161, 1433, 177, 55, 'e5d460c695047ec781b3acd2bd299e0c_16214_177_55.png'), layer(10, 504, 356, 160, '7635102ea5a3f71170e1ff561bd6d5e6_103517_356_160.png'), layer(81, 441, 208, 55, 'c1189bff2047246c067fcbd440c79688_16561_208_55.png'), layer(310, 468, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'),
  ],
  [
    layer(0, 0, 750, 1624, 'bd6f8cf6b018119c581a33e2ddfa405e_480165_750_1624.png'), layer(490, 1211, 208, 55, '65525d3ddb01829b60950ec48ab5b6d1_19512_208_55.png'), layer(462, 845, 262, 87, 'dcee4dc4637c8a06027231ea9f4f6829_35366_262_87.png'), layer(404, 401, 316, 55, '559198fa328b24b32a13ec80159c8861_28896_316_55.png'), layer(41, 609, 368, 55, '78df47829ce0116ad6e35b21c7477e81_31215_368_55.png'), layer(61, 920, 151, 55, 'ea88b2a6854e54f5d1d55239c97b1d20_15860_151_55.png'), layer(179, 687, 430, 188, 'ac316f8f2bec35681bdc16d27bd32c3f_151024_430_188.png'), layer(84, 983, 545, 208, '681b18ed81a3b288457b96272fff06ee_253828_545_208.png'), layer(370, 142, 380, 243, '7e8322482a81f54c5d5cd48e78450395_202997_380_243.png'), layer(52, 462, 481, 128, '834fd170fa84f72cb51ff12cd2b49dcb_125274_481_128.png'), layer(58, 1194, 558, 297, 'df715a3bba1247fbf572537953363195_239631_558_297.png'), layer(276, 352, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(643, 777, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(552, 539, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(627, 1278, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(31, 1006, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(46, 101, 643, 129, '58da27f455702a97011d3fb45fb44065_42099_643_129.png'), layer(658, 163, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(401, 1433, 177, 55, '69d33e844ce34d5310ebc6bb655f24ed_18292_177_55.png'), layer(161, 1433, 177, 55, 'e5d460c695047ec781b3acd2bd299e0c_16214_177_55.png'),
  ],
  [
    layer(0, 0, 750, 1624, '8260eebc4870c55ff557286c7a24d6ab_545650_750_1624.png'), layer(384, 277, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(691, 827, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(148, 515, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(236, 1237, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(317, 1190, 509, 252, '81859d280394e5c9356b0faf13e8c52b_174873_509_252.png'), layer(13, 225, 380, 275, '42cc9916311d21fcebfa01113922b74a_161364_408_295.png'), layer(224, 717, 456, 226, '81b7d8b04df32d92f5e82fc02ca675aa_212440_456_226.png'), layer(208, 481, 479, 202, '2bad3e0bf6d853e2b6338f5ee908e918_179910_479_202.png'), layer(39, 1038, 467, 160, '59f3e30ace317bafc73c0961e18354b1_154445_467_160.png'), layer(83, 970, 208, 55, 'd005a8ee85521165efc5dcdc8f4df0dd_20393_208_55.png'), layer(515, 925, 204, 55, '9911d31db3e63d5de9dc39295abcc061_21002_204_55.png'), layer(98, 611, 254, 55, '1e59b9bf0a5b8661e3fb6729a5722b3b_23580_254_55.png'), layer(82, 1314, 282, 55, '13fe9d50d511cf74622460664113609e_25694_282_55.png'), layer(361, 381, 151, 55, '0b9d94728e17d21d9fdd8f4dd4af6214_15196_151_55.png'), layer(26, 101, 689, 130, '39e48ee8ed646f4316db23745ff61dbd_34049_689_130.png'), layer(658, 162, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(401, 1433, 177, 55, '69d33e844ce34d5310ebc6bb655f24ed_18292_177_55.png'), layer(161, 1433, 177, 55, 'e5d460c695047ec781b3acd2bd299e0c_16214_177_55.png'),
  ],
  [
    layer(0, 0, 750, 1624, '49d028d0926c4f74ebe84b0a2c5f8783_447027_750_1624.png'), layer(25, 467, 708, 561, '56a79cf1a92141737709d512e6ce5c7e_52678_708_571.png'), layer(27, 115, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(502, 1320, 194, 244, '27102cb248a54e06c3593993531c7fdf_70874_194_244.png'), layer(-20, 1017, 548, 99, '8551a4e442f8a94f85985c1e79fd77e7_38836_548_99.png'),
  ],
  [
    layer(0, 0, 750, 1624, '49d028d0926c4f74ebe84b0a2c5f8783_447027_750_1624.png'), layer(27, 86, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(31, 159, 283, 335, '64d485ccb2d65ed29809201f3d0c070e_169525_283_335.png'), layer(205, 92, 548, 99, 'ecd6e654adc5b85a2ea1e3064008986b_14501_548_99.png'), layer(23, 523, 710, 929, 'ee328ace81f6a8ef5f9f5600d92aac97_67164_710_929.png'),
  ],
]

function Canvas({ layers, masks = [], actions = [], children }) {
  return <main className="tianfu-stage"><div className="tianfu-canvas">
    {layers.map((item, index) => <img className="tianfu-layer" key={`${item.name}-${index}`} src={asset(item.name)} alt="" draggable="false" style={{ left: `${item.left / 7.5}%`, top: `${item.top / 16.24}%`, width: `${item.width / 7.5}%`, height: `${item.height / 16.24}%` }} />)}
    {masks.map((item) => <div className="tianfu-mask" key={item.top} style={{ left: `${item.left / 7.5}%`, top: `${item.top / 16.24}%`, width: `${item.width / 7.5}%`, height: `${item.height / 16.24}%` }}><img className="tianfu-mask-image" src={asset(item.name)} alt="" draggable="false" style={{ left: `${item.imageLeft / item.width * 100}%`, top: `${item.imageTop / item.height * 100}%`, width: `${item.imageWidth / item.width * 100}%`, height: `${item.imageHeight / item.height * 100}%` }} /></div>)}
    {children}
    {actions.map((item) => <button className="tianfu-hit" key={item.label} type="button" onClick={item.onClick} aria-label={item.label} style={{ left: `${item.left / 7.5}%`, top: `${item.top / 16.24}%`, width: `${item.width / 7.5}%`, height: `${item.height / 16.24}%` }} />)}
  </div></main>
}

function DetailLayout({ point }) {
  return <>
    <img className="tianfu-layer" src={asset(PAGES[4][0].name)} alt="" draggable="false" style={{ left: '0%', top: '0%', width: '100%', height: '100%' }} />
    <div className="tianfu-detail-media"><div className="tianfu-detail-media-inner" /></div>
    {PAGES[4].slice(1).map((item, index) => <img className="tianfu-layer" key={`${item.name}-${index}`} src={asset(item.name)} alt="" draggable="false" style={{ left: `${item.left / 7.5}%`, top: `${item.top / 16.24}%`, width: `${item.width / 7.5}%`, height: `${item.height / 16.24}%` }} />)}
    <div className="tianfu-detail-copy">{point.introduction}</div>
    <div className={`tianfu-detail-title${point.name.length > 12 ? ' tianfu-detail-title-long' : ''}`}>{point.name}</div>
    <div className="tianfu-detail-recommendation" style={{ height: `${point.books.length * 100 / 16.24}%` }}>
      {point.books.map((book) => <div className="tianfu-detail-recommendation-row" key={book.title} style={{ height: `${100 / point.books.length}%` }}><img src={asset('57143668e9dfe2e2cea46d52d1a57215_12027_108_97.png')} alt="" draggable="false" /><div>{book.title}</div></div>)}
    </div>
  </>
}

function BookReasonLayout({ book }) {
  return <>
    <div className="tianfu-book-reason-title">{book.title}</div>
    <div className="tianfu-book-reason-copy">{book.reason}</div>
  </>
}

export default function TianfuNewDistrictReadingProject() {
  const [stage, setStage] = useState('home')
  const [selectedBook, setSelectedBook] = useState(TIANFU_PARK.books[0])
  const [selectedPoint, setSelectedPoint] = useState(TIANFU_PARK)
  const openPoint = (point) => {
    setSelectedPoint(point)
    setSelectedBook(point.books[0])
    setStage('detail')
  }
  if (stage === 'home') return <Canvas layers={HOME} actions={[{ label: '进入第一期', left: 274, top: 1189, width: 195, height: 194, onClick: () => setStage('catalog') }]} />
  if (stage === 'catalog') return <Canvas layers={PAGES[0]} masks={[644, 1024].map((top) => ({ left: 0, top, width: 750, height: 380, imageLeft: 248, imageTop: 47, imageWidth: 261, imageHeight: 264, name: 'dec5f1bd5f38a191230e26913a3592dd_35476_261_264.png' }))} actions={[{ label: '返回首页', left: 658, top: 117, width: 66, height: 65, onClick: () => setStage('home') }, { label: '进入天府公园', left: 21, top: 283, width: 727, height: 347, onClick: () => setStage('map') }]} />
  if (stage === 'map') return <Canvas layers={PAGES[1]} actions={[
    { label: '返回阅读地图', left: 658, top: 103, width: 66, height: 65, onClick: () => setStage('catalog') },
    { label: '查看广汇美术馆详情', left: 482, top: 236, width: 208, height: 55, onClick: () => openPoint(FIRST_PHASE_POINTS[4]) },
    { label: '查看天府公园详情', left: 470, top: 484, width: 177, height: 55, onClick: () => openPoint(FIRST_PHASE_POINTS[0]) },
    { label: '查看四川名人馆详情', left: 81, top: 441, width: 208, height: 55, onClick: () => openPoint(FIRST_PHASE_POINTS[2]) },
    { label: '查看雅州路综合管廊详情', left: 162, top: 716, width: 245, height: 55, onClick: () => openPoint(FIRST_PHASE_POINTS[3]) },
    { label: '查看天府新区国际会议中心详情', left: 165, top: 1040, width: 316, height: 55, onClick: () => openPoint(FIRST_PHASE_POINTS[1]) },
    { label: '查看西博城详情', left: 433, top: 1222, width: 151, height: 55, onClick: () => openPoint(FIRST_PHASE_POINTS[1]) },
  ]} />
  if (stage === 'detail') return <Canvas layers={[]} actions={[{ label: '返回点位地图', left: 27, top: 115, width: 66, height: 65, onClick: () => setStage('map') }, ...selectedPoint.books.map((book, index) => ({ label: `查看${book.title}推荐理由`, left: 57, top: 1119 + index * 100, width: 577, height: 100, onClick: () => { setSelectedBook(book); setStage('book-reason') } }))]}><DetailLayout point={selectedPoint} /></Canvas>
  return <Canvas layers={PAGES[5]} actions={[{ label: '返回点位详情', left: 27, top: 86, width: 66, height: 65, onClick: () => setStage('detail') }]}><BookReasonLayout book={selectedBook} /></Canvas>
}
