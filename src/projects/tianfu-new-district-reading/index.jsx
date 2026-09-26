import { useState } from 'react'
import './style.css'

const OSS = 'https://file3.ih5.cn/v35/edt/u10013600/'
const asset = (name) => `${OSS}${name}`
const layer = (left, top, width, height, name) => ({ left, top, width, height, name })

const HOME = [
  layer(0, 0, 750, 1624, '9e0698d039f852dcb71a782eba2609f4_1518088_750_1624.png'),
  layer(101, 237, 572, 257, '7035fb18d008055ad2b19625c9d44b11_71999_572_257.png'),
  layer(274, 1189, 195, 194, 'c47001a10b3e366ca43c15470d6ea07d_46718_195_194.png'),
  layer(282, 1410, 177, 55, '11e521138753e163ad5dc1a0211005c4_18240_177_55.png'),
]

const PAGES = [
  [
    layer(0, 0, 750, 1624, '5bc9a404d437eedc06fae329a77e4908_154473_750_1624.png'), layer(401, 1433, 177, 55, '69d33e844ce34d5310ebc6bb655f24ed_18292_177_55.png'), layer(161, 1433, 177, 55, 'e5d460c695047ec781b3acd2bd299e0c_16214_177_55.png'), layer(38, 103, 522, 125, '76f7806ab140036f786b40abaeb79d31_21731_522_125.png'), layer(658, 117, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(21, 283, 727, 347, '1c9e523743adb330ed510ce65fcb2554_314008_727_347.png'), layer(21, 657, 727, 331, '3b603cd853e4d82ffa66259c006e99bc_345886_727_331.png'), layer(21, 1038, 727, 341, '0aa3ecc6630ef8a990e1564db4665879_355213_727_341.png'), layer(248, 47, 261, 264, 'dec5f1bd5f38a191230e26913a3592dd_35476_261_264.png'),
  ],
  [
    layer(0, 0, 750, 1624, 'c7fd46c0385aeb0c1e2c2b36894a7b31_559897_750_1624.png'), layer(97, 1097, 460, 222, '4c5347d5245a379bf7fc5a9c17544cdd_163657_460_222.png'), layer(81, 1186, 684, 344, 'e943c9a372c8c50386bc2da2dbdfbc5b_141303_684_344.png'), layer(393, 549, 322, 211, '3e396b89dc526f1776ee2c0e2b2a78b7_104251_322_211.png'), layer(46, 829, 309, 192, '4af2415287a33b12a7f48e466c9ee4cd_166574_309_192.png'), layer(300, 281, 424, 194, '5d839151737647875317445f6bc219b3_121632_424_194.png'), layer(482, 236, 208, 55, '5afa29c218816d64f78f4581a9833024_19225_208_55.png'), layer(162, 716, 245, 55, 'f8d3ebbf5c47dd4c7ae9aad2f071de57_23006_245_55.png'), layer(470, 477, 177, 55, 'a007faa6a727abaf2f1a67ab603c169a_17350_177_55.png'), layer(165, 1040, 316, 55, 'dcb97b1e9570c982d5dd8737ebbf2627_27821_316_55.png'), layer(433, 1222, 151, 55, '80bf77a7220bb1f618a0217c02829b10_15353_151_55.png'), layer(415, 470, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(433, 246, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(87, 725, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(593, 1205, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(117, 1013, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(34, 101, 611, 125, '85d549673ca39a3822ff551d043ac4d6_39591_611_125.png'), layer(658, 103, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(401, 1433, 177, 55, '69d33e844ce34d5310ebc6bb655f24ed_18292_177_55.png'), layer(161, 1433, 177, 55, 'e5d460c695047ec781b3acd2bd299e0c_16214_177_55.png'),
  ],
  [
    layer(0, 0, 750, 1624, 'bd6f8cf6b018119c581a33e2ddfa405e_480165_750_1624.png'), layer(490, 1211, 208, 55, '65525d3ddb01829b60950ec48ab5b6d1_19512_208_55.png'), layer(462, 845, 262, 87, 'dcee4dc4637c8a06027231ea9f4f6829_35366_262_87.png'), layer(404, 401, 316, 55, '559198fa328b24b32a13ec80159c8861_28896_316_55.png'), layer(41, 609, 368, 55, '78df47829ce0116ad6e35b21c7477e81_31215_368_55.png'), layer(61, 920, 151, 55, 'ea88b2a6854e54f5d1d55239c97b1d20_15860_151_55.png'), layer(179, 687, 430, 188, 'ac316f8f2bec35681bdc16d27bd32c3f_151024_430_188.png'), layer(84, 983, 545, 208, '681b18ed81a3b288457b96272fff06ee_253828_545_208.png'), layer(370, 142, 380, 243, '7e8322482a81f54c5d5cd48e78450395_202997_380_243.png'), layer(52, 462, 481, 128, '834fd170fa84f72cb51ff12cd2b49dcb_125274_481_128.png'), layer(58, 1194, 558, 297, 'df715a3bba1247fbf572537953363195_239631_558_297.png'), layer(276, 352, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(643, 777, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(552, 539, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(627, 1278, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(31, 1006, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(46, 101, 643, 129, '58da27f455702a97011d3fb45fb44065_42099_643_129.png'), layer(658, 163, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(401, 1433, 177, 55, '69d33e844ce34d5310ebc6bb655f24ed_18292_177_55.png'), layer(161, 1433, 177, 55, 'e5d460c695047ec781b3acd2bd299e0c_16214_177_55.png'),
  ],
  [
    layer(0, 0, 750, 1624, '8260eebc4870c55ff557286c7a24d6ab_545650_750_1624.png'), layer(384, 277, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(691, 827, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(148, 515, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(236, 1237, 41, 64, '82374099863f590a3e891a161d45ac9d_7390_41_64.png'), layer(317, 1190, 509, 252, '81859d280394e5c9356b0faf13e8c52b_174873_509_252.png'), layer(13, 225, 380, 275, '42cc9916311d21fcebfa01113922b74a_161364_408_295.png'), layer(224, 717, 456, 226, '81b7d8b04df32d92f5e82fc02ca675aa_212440_456_226.png'), layer(208, 481, 479, 202, '2bad3e0bf6d853e2b6338f5ee908e918_179910_479_202.png'), layer(39, 1038, 467, 160, '59f3e30ace317bafc73c0961e18354b1_154445_467_160.png'), layer(83, 970, 208, 55, 'd005a8ee85521165efc5dcdc8f4df0dd_20393_208_55.png'), layer(515, 925, 204, 55, '9911d31db3e63d5de9dc39295abcc061_21002_204_55.png'), layer(98, 611, 254, 55, '1e59b9bf0a5b8661e3fb6729a5722b3b_23580_254_55.png'), layer(82, 1314, 282, 55, '13fe9d50d511cf74622460664113609e_25694_282_55.png'), layer(361, 381, 151, 55, '0b9d94728e17d21d9fdd8f4dd4af6214_15196_151_55.png'), layer(26, 101, 689, 130, '39e48ee8ed646f4316db23745ff61dbd_34049_689_130.png'), layer(658, 162, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(401, 1433, 177, 55, '69d33e844ce34d5310ebc6bb655f24ed_18292_177_55.png'), layer(161, 1433, 177, 55, 'e5d460c695047ec781b3acd2bd299e0c_16214_177_55.png'),
  ],
  [
    layer(0, 0, 750, 1624, '49d028d0926c4f74ebe84b0a2c5f8783_447027_750_1624.png'), layer(25, 467, 708, 561, '56a79cf1a92141737709d512e6ce5c7e_52678_708_571.png'), layer(27, 115, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(502, 1320, 194, 244, '27102cb248a54e06c3593993531c7fdf_70874_194_244.png'), layer(-20, 1017, 548, 99, '8551a4e442f8a94f85985c1e79fd77e7_38836_548_99.png'), layer(0, 0, 108, 97, '57143668e9dfe2e2cea46d52d1a57215_12027_108_97.png'),
  ],
  [
    layer(0, 0, 750, 1624, '49d028d0926c4f74ebe84b0a2c5f8783_447027_750_1624.png'), layer(27, 86, 66, 65, '1346673f4bcb9e86c1d64d995f5d7ac9_9029_66_65.png'), layer(31, 159, 283, 335, '64d485ccb2d65ed29809201f3d0c070e_169525_283_335.png'), layer(205, 92, 548, 99, 'ecd6e654adc5b85a2ea1e3064008986b_14501_548_99.png'), layer(23, 523, 710, 929, 'ee328ace81f6a8ef5f9f5600d92aac97_67164_710_929.png'),
  ],
]

function Canvas({ layers, actions = [] }) {
  return <main className="tianfu-stage"><div className="tianfu-canvas">
    {layers.map((item, index) => <img className="tianfu-layer" key={`${item.name}-${index}`} src={asset(item.name)} alt="" draggable="false" style={{ left: `${item.left / 7.5}%`, top: `${item.top / 16.24}%`, width: `${item.width / 7.5}%`, height: `${item.height / 16.24}%` }} />)}
    {actions.map((item) => <button className="tianfu-hit" key={item.label} type="button" onClick={item.onClick} aria-label={item.label} style={{ left: `${item.left / 7.5}%`, top: `${item.top / 16.24}%`, width: `${item.width / 7.5}%`, height: `${item.height / 16.24}%` }} />)}
  </div></main>
}

export default function TianfuNewDistrictReadingProject() {
  const [stage, setStage] = useState('home')
  if (stage === 'home') return <Canvas layers={HOME} actions={[{ label: '进入第一期', left: 274, top: 1189, width: 195, height: 194, onClick: () => setStage('catalog') }]} />
  if (stage === 'catalog') return <Canvas layers={PAGES[0]} actions={[{ label: '进入天府公园', left: 21, top: 283, width: 727, height: 347, onClick: () => setStage('map') }]} />
  if (stage === 'map') return <Canvas layers={PAGES[1]} actions={[{ label: '查看点位详情', left: 482, top: 236, width: 208, height: 55, onClick: () => setStage('detail') }]} />
  return <Canvas layers={PAGES[4]} />
}
