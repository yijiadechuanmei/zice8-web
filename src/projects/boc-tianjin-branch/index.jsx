import { useCallback, useEffect, useRef, useState } from 'react'
import './style.css'

const ASSET_BASE = 'https://assets.zice8.com/boc_tianjin_branch/boc_tianjin_branch_20260816'
const asset = (name) => `${ASSET_BASE}/${name}`

function getAssetMotion(index, width, height) {
  if (index === 0 || height > 1000) return 'scene'
  if (height < 100) return 'ribbon'
  if (width < 260 && height > 150) return 'figure'
  return index % 2 === 0 ? 'panel-left' : 'panel-right'
}

const HOME_TOP_HEIGHT = 1126
const INSERT_IMAGE_TOP = 4687
const INSERT_IMAGE_HEIGHT = 650
const INSERT_IMAGE_GAP = 34
const CONTENT_SHIFT_AFTER_INSERT = INSERT_IMAGE_HEIGHT + INSERT_IMAGE_GAP

const firstPageContent = [
  [0, 0, 750, 1673, '955952c176e1a67f4c447731a3284c2f_2272669_750_1673.png'],
  [18, 1687, 709, 2966, 'a5bdc671f942c3728d6d75a68a2274a9_272247_709_2966.png'],
  [20, INSERT_IMAGE_TOP, 710, INSERT_IMAGE_HEIGHT, '1.png'],
  [18, INSERT_IMAGE_TOP + CONTENT_SHIFT_AFTER_INSERT, 709, 2965, 'f03215ed0ca1d0699df59435ecfeb1e7_270529_709_2965.png'],
  [82, 1759, 559, 76, '91a449ab9e4921d6603e28338e644818_52590_559_76.png'],
  [90, 1899, 396, 42, '7c58bf52962d922092e3422d8e9b6b87_10669_396_42.png'],
  [54, 1966, 637, 288, 'd62b0a06fb2686496c2ed094cb51360c_197774_637_288.png'],
  [69, 2241, 607, 280, 'c3297c1ba3e95b15bfe9bac86372db7c_262971_607_280.png'],
  [54, 2593, 637, 289, '1a18706ddec9eec6fbbb6b966c210aea_180966_637_289.png'],
  [66, 2828, 613, 270, '8862373745b1136d2311df7683ec1507_251577_613_270.png'],
  [79, 3175, 573, 146, 'd574702e495f3b0373d0a0365e74a7e8_65609_573_146.png'],
  [58, 3370, 617, 214, '2fc075535ebd7bf5706fdb33510247ba_231461_617_214.png'],
  [47, 3717, 637, 481, '664275248c39a9d7d1bd9285b0bfee90_367391_637_481.png'],
  [52, 4215, 646, 346, 'fd0d3696d73bbe677e84a46486c569b1_223143_646_346.png'],
  [62, 4759 + CONTENT_SHIFT_AFTER_INSERT, 634, 77, '505a168b303b16356b53f0e9a1064d09_65490_634_77.png'],
  [97, 4900 + CONTENT_SHIFT_AFTER_INSERT, 396, 42, 'e2532463556e19dc970c61f80e358fe7_10255_396_42.png'],
  [61, 4967 + CONTENT_SHIFT_AFTER_INSERT, 637, 288, 'c33fb8b1390bd84a154d875aaa84649e_144959_637_288.png'],
  [76, 5158 + CONTENT_SHIFT_AFTER_INSERT, 605, 279, '4ac5be3d98c513bfe2cf1071e67658b2_288195_605_279.png'],
  [61, 5507 + CONTENT_SHIFT_AFTER_INSERT, 637, 288, 'b968a13abaf8cc7a19d76b31cfd745da_170551_637_288.png'],
  [70, 5760 + CONTENT_SHIFT_AFTER_INSERT, 616, 310, 'f1c7afa79b53620bf8bb5285fcce5012_345562_616_310.png'],
  [54, 6154 + CONTENT_SHIFT_AFTER_INSERT, 637, 288, 'afdc11b64b169f402bf529150f87b807_148709_637_288.png'],
  [61, 6364 + CONTENT_SHIFT_AFTER_INSERT, 617, 226, '670f213a8af81a4ba245dd9aff7006fa_295949_617_226.png'],
  [63, 6634 + CONTENT_SHIFT_AFTER_INSERT, 398, 41, '060b1ef8396fcfb899b99759fec57ac7_10974_398_41.png'],
  [54, 6707 + CONTENT_SHIFT_AFTER_INSERT, 637, 351, '1741ce7187f3e261dfa31e4cb03a0a0f_302684_637_351.png'],
  [54, 7181 + CONTENT_SHIFT_AFTER_INSERT, 637, 362, '575a6cc35dfe9c1ca3f51fc649e03c24_329087_637_362.png'],
]

const firstPage = [
  [0, 0, 750, HOME_TOP_HEIGHT, '0.png'],
  ...firstPageContent.map(([left, top, width, height, fileName]) => [
    left,
    top + HOME_TOP_HEIGHT,
    width,
    height,
    fileName,
  ]),
]

const secondPage = [
  [0, 0, 750, 1635, '7e25b178c6c547a2e2f11bb2cd720950_2053679_750_1635.png'],
  [35, 1680, 682, 2045, '70cfc35bd994fb96e2d5bb33136a261a_1219398_682_2045.png'],
  [35, 3804, 682, 2152, '35923257696e0e89de74f79e76a1bcae_737655_682_2152.png'],
  [35, 6032, 682, 2085, '1440bba0a159ced8102fe77fc251dd13_1244891_682_2085.png'],
  [35, 8195, 682, 2182, 'd511be5dbef30b2fa25345f8b51dcb99_1303120_682_2182.png'],
  [102, 1744, 528, 72, '9b0ec88ac64a34a4a2142e54b4c20f75_49334_528_72.png'],
  [75, 1927, 602, 144, '0b11993102474269f7878d2fd05e2a53_135818_602_144.png'],
  [93, 2086, 567, 230, '2799f67454403b990ff3f2773f38d890_337186_567_230.png'],
  [76, 2368, 602, 290, 'a4766b80032331cfc37e1b0fbee91589_282591_602_290.png'],
  [93, 2681, 204, 331, '377b25d802fc5eac82e49f4b6f262a16_126502_204_331.png'],
  [301, 2681, 360, 165, '41947d8615ca82122e91c30d4a643c9c_153506_360_165.png'],
  [301, 2822, 360, 190, 'b9fb73069d88c6c3175ac0f6c50ba25c_126713_360_190.png'],
  [76, 3105, 602, 274, '1d83a0cccd7754041d1b6e3255c37aab_307190_602_274.png'],
  [95, 3464, 354, 190, 'a456f9574e5151e1a7ca64fe75b29880_65779_354_190.png'],
  [474, 3418, 207, 242, '0c91520f905d4e110582fe36d254a81e_91459_207_242.png'],
  [104, 3889, 528, 73, '6e5aa8e80cead008fbf316c41be7c47d_46805_528_73.png'],
  [77, 4055, 602, 183, '61bbd37f5c0646d9973934837565f32c_162570_602_183.png'],
  [95, 4232, 568, 213, '4daff058d0d1ce5add3ac554d0374892_300227_568_213.png'],
  [77, 4466, 602, 128, '0b38626c859fcefca5c4f4de59ba27dc_139132_602_128.png'],
  [95, 4607, 576, 223, '48535d46b65b033789350361531faf4f_305640_576_223.png'],
  [77, 4853, 602, 119, 'cffc1637657883177ee299f0a615b604_125713_602_119.png'],
  [96, 4988, 576, 223, 'd935e57c3f4373dc6492af379718d143_313497_576_223.png'],
  [83, 5248, 376, 39, '386f18ee8434203590ced8dcd630296c_10437_376_39.png'],
  [78, 5312, 601, 287, '0b8eb38624d67028a713a8e310b06a98_309253_601_287.png'],
  [96, 5698, 353, 190, '658ff0b876aafec06b0bc4b5a74b41dc_69339_353_190.png'],
  [475, 5643, 207, 242, '1e6966e3e03b0b1466d3a3d9c9c62556_91342_207_242.png'],
  [105, 6104, 527, 73, '7a0c77dad1463bd0598c9ea977210241_48285_527_73.png'],
  [78, 6287, 601, 168, 'e1db5566fc8a345dbc0654b6070da06b_151699_601_168.png'],
  [77, 6473, 610, 228, '1e12617f5b1c218c43013e44403eb5a6_303911_610_228.png'],
  [77, 6747, 602, 168, '59db0a8f470c04c842066856a9b9597f_154183_602_168.png'],
  [104, 6914, 548, 89, '36bcba600e4cc79b12804a61571d011d_44001_548_89.png'],
  [99, 7029, 559, 309, '936021dea34260073b517504299a9632_375115_559_309.png'],
  [82, 7374, 376, 39, 'b76586382ddfbbc5f4bfafef2b250a7c_10304_376_39.png'],
  [77, 7430, 602, 302, '9802243fc6a0c2da0add311ff1331793_298556_602_302.png'],
  [97, 7831, 353, 190, 'c2b539c8d9caabd5f452a426e4ce7933_73998_353_190.png'],
  [476, 7797, 207, 242, '335ad1e0f1f0c5f38e92f468edbcee78_91450_207_242.png'],
  [103, 8261, 528, 73, '0602321670906f6f819498c1ada2f039_50881_528_73.png'],
  [77, 8430, 602, 129, '609ff1e2aa12007f8eda67ba6440c17e_97565_602_129.png'],
  [95, 8569, 567, 213, 'dcf4f6785b00618c0d8f38a3472040a7_304602_567_213.png'],
  [77, 8804, 602, 184, '296cc7e658ea169f882fcdf914375e48_123799_602_184.png'],
  [95, 8997, 567, 214, 'e520088f0bfe59ba60c5391f04304212_270862_567_214.png'],
  [77, 9232, 602, 116, '85eea790f19f033d0f617c68bb536e9f_91981_602_116.png'],
  [91, 9366, 574, 222, '740f9e0c57ac5fcbdbc1140a5864363e_285023_574_222.png'],
  [77, 9708, 602, 301, '6f35deecd815e1ebaed75c58579799f9_252117_602_301.png'],
  [101, 10111, 353, 190, 'ea9677b5cf18030946bf9b44a76b83d6_66857_353_190.png'],
  [473, 10056, 207, 242, 'b8771f82b189db1559d818b1c52fae08_91387_207_242.png'],
]

function useCanvasWidth() {
  const [width, setWidth] = useState(() => Math.min(window.innerWidth, 750))
  useEffect(() => {
    const update = () => setWidth(Math.min(window.innerWidth, 750))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return width
}

function PageCanvas({ assets, height, pageRef, pageNo }) {
  const width = useCanvasWidth()
  const scale = width / 750
  const [cover, ...contentAssets] = assets
  useEffect(() => {
    const root = pageRef.current
    if (!root) return undefined
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible')
      })
    }, { root, rootMargin: '0px 0px -9% 0px', threshold: 0.1 })
    root.querySelectorAll('.boc-asset').forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [assets, pageNo, pageRef])
  return (
    <div className="boc-canvas-wrap" style={{ width, height: height * scale }}>
      <div className={`boc-canvas boc-canvas--${pageNo}`} style={{ height, transform: `scale(${scale})` }}>
        <div className="boc-page-cover" style={{ left: cover[0], top: cover[1], width: cover[2], height: cover[3] }}>
          <img src={asset(cover[4])} alt="" draggable="false" referrerPolicy="no-referrer" loading="eager" fetchPriority="high" decoding="sync" />
        </div>
        {contentAssets.map(([left, top, assetWidth, assetHeight, fileName], index) => {
          const originalIndex = index + 1
          return (
            <div className={`boc-asset boc-asset--${getAssetMotion(originalIndex, assetWidth, assetHeight)}`} key={fileName} style={{ left, top, width: assetWidth, height: assetHeight, '--delay': `${220 + (originalIndex % 5) * 110}ms` }}>
              <img src={asset(fileName)} alt="" draggable="false" referrerPolicy="no-referrer" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function BocTianjinBranchProject() {
  const [pageNo, setPageNo] = useState(0)
  const pageRef = useRef(null)
  const touchStartY = useRef(null)
  useEffect(() => {
    const secondPageCover = new Image()
    secondPageCover.referrerPolicy = 'no-referrer'
    secondPageCover.fetchPriority = 'high'
    secondPageCover.decoding = 'sync'
    secondPageCover.src = asset(secondPage[0][4])
  }, [])
  const changePage = useCallback((nextPage) => {
    setPageNo(nextPage)
    requestAnimationFrame(() => pageRef.current?.scrollTo({ top: 0, behavior: 'auto' }))
  }, [])
  const atBoundary = useCallback((direction) => {
    const page = pageRef.current
    if (!page) return false
    const bottom = page.scrollHeight - page.clientHeight - page.scrollTop < 8
    return direction === 'next' ? bottom : page.scrollTop < 8
  }, [])
  const handleTouchStart = (event) => { touchStartY.current = event.touches[0]?.clientY ?? null }
  const handleTouchEnd = (event) => {
    const startedAt = touchStartY.current
    const endedAt = event.changedTouches[0]?.clientY
    touchStartY.current = null
    if (startedAt === null || typeof endedAt !== 'number') return
    const delta = endedAt - startedAt
    if (delta < -54 && pageNo === 0 && atBoundary('next')) changePage(1)
    if (delta > 54 && pageNo === 1 && atBoundary('previous')) changePage(0)
  }
  const handleWheel = (event) => {
    if (event.deltaY > 20 && pageNo === 0 && atBoundary('next')) changePage(1)
    if (event.deltaY < -20 && pageNo === 1 && atBoundary('previous')) changePage(0)
  }
  const isLast = pageNo === 1
  return (
    <main className="boc-project" aria-label="中国银行天津市分行">
      <section className="boc-page" ref={pageRef} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
        <PageCanvas key={isLast ? 'second-page' : 'first-page'} pageRef={pageRef} pageNo={pageNo + 1} height={isLast ? 10460 : 7712 + HOME_TOP_HEIGHT + CONTENT_SHIFT_AFTER_INSERT} assets={isLast ? secondPage : firstPage} />
      </section>
      <button className={`boc-page-cue ${isLast ? 'is-last' : ''}`} type="button" onClick={() => changePage(isLast ? 0 : 1)} aria-label={isLast ? '返回第一页' : '前往下一页'}>
        <span>{isLast ? '继续下滑 返回首页' : '滑至底部 继续上滑'}</span><i aria-hidden="true" />
      </button>
    </main>
  )
}
