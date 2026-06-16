/* eslint-disable react-hooks/set-state-in-effect */
import { startTransition, useEffect, useMemo, useRef, useState } from 'react'
import { request, setToken } from '../../shared/api/request'
import { trackPageView } from '../../shared/analytics'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import {
  DEFAULT_OSS_BASE_URL,
  claimPrize,
  drawPrize,
  getBootstrap,
  getMyPrize,
  getPublicConfig,
  getResult,
  isUnauthorizedError,
  pickupVerify,
  startAttempt,
  submitAttempt,
} from './api'
import StageLayout from './components/StageLayout'
import QuestionHeader from './components/QuestionHeader'
import QuestionPage from './pages/QuestionPage'
import ResultPage from './pages/ResultPage'
import WheelPage from './pages/WheelPage'
import './styles.css'

const STEP = {
  ENTRY: 'ENTRY',
  QUESTION: 'QUESTION',
  RESULT: 'RESULT',
  WHEEL: 'WHEEL',
}

const DRAW_STATUS = {
  WON: 'won',
  LOST: 'lost',
  STOCK_EMPTY: 'stock_empty',
}

const CLAIM_STATUS = {
  PENDING_METHOD: 'pending_method',
  MAIL_SUBMITTED: 'mail_submitted',
  PICKUP_PENDING: 'pickup_pending',
  PICKUP_VERIFIED: 'pickup_verified',
}

const isDebug = new URLSearchParams(window.location.search).get('debug') === '1'
const isDev = import.meta.env.DEV
const DEBUG_RESET_TOKEN = 'RESET_PQL_2026'
const FIXED_ASSET_ACTIVITY_KEY = 'phase_quiz_lottery_test_001'
const ASSET_BASE = `${DEFAULT_OSS_BASE_URL}/phase-quiz-lottery/${FIXED_ASSET_ACTIVITY_KEY}`

function LoadingLayer({ open = true, text = '加载中...' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/20" aria-live="polite" aria-busy="true">
      <div className="inline-flex items-center gap-4 rounded-full bg-white px-6 py-4 text-sm font-bold text-blue-500 shadow-xl">
        <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-500" aria-hidden="true" />
        <span>{text}</span>
      </div>
    </div>
  )
}

function ToastLayer({ message }) {
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[10001] flex items-center justify-center px-6" role="status" aria-live="polite">
      <div className="max-w-[80vw] whitespace-pre-line rounded-2xl bg-slate-900/82 px-5 py-4 text-center text-sm font-bold leading-7 text-white shadow-xl">
        {message}
      </div>
    </div>
  )
}

function PrizeModal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 px-4 py-5 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="relative max-h-[70vh] w-[min(92vw,360px)] max-w-[360px] overflow-y-auto rounded-[24px] bg-white px-4 py-4 shadow-[0_30px_80px_rgba(10,24,58,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="absolute right-4 top-4 h-9 w-9 cursor-pointer rounded-full bg-slate-100 text-xl text-slate-700" type="button" onClick={onClose} aria-label="关闭弹窗">
          ×
        </button>
        <div className="pr-10 text-base font-extrabold leading-tight text-slate-900">我的奖品</div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}

function buildAssets() {
  return {
    bannerBackground: `${ASSET_BASE}/banner/banner_bg.png`,
    bannerBook: `${ASSET_BASE}/banner/banner_book.png`,
    resultTrophy: `${ASSET_BASE}/result/result_trophy.png`,
    prizeBox: `${ASSET_BASE}/prize/prize_box.png`,
    wheelRing: `${ASSET_BASE}/wheel/wheel_ring.png`,
    wheelPointer: `${ASSET_BASE}/wheel/wheel_pointer.png`,
    wheelCenterButton: `${ASSET_BASE}/wheel/wheel_center_btn.png`,
  }
}

function buildWheelSegments(prizeName) {
  return [
    { label: prizeName || '奖品', prize: true },
    { label: '谢谢参与' },
    { label: '谢谢参与' },
    { label: '谢谢参与' },
  ]
}

function buildRequestId(prefix, counter) {
  return `${prefix}-${Date.now()}-${counter}`
}

function normalizeFriendlyMessage(error, fallback = '请求失败') {
  return error?.response?.message || error?.message || fallback
}

function formatDrawTime(value) {
  if (!value) return '待开奖'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '待开奖'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function resolveInitialStep(model) {
  if (model?.state === 'answering') return STEP.QUESTION
  if (model?.result || model?.eligibleForDraw || model?.alreadyDrawn || model?.won || model?.soldOut) return STEP.RESULT
  return STEP.ENTRY
}

function replaceLegacyPath(activityKey) {
  if (!activityKey) return
  const target = `/phase-quiz-lottery/${encodeURIComponent(activityKey)}${window.location.search || ''}`
  const current = `${window.location.pathname}${window.location.search || ''}`
  if (current !== target) {
    window.history.replaceState({}, '', target)
  }
}

function resolvePrizeName(model, draw, myPrize) {
  return (
    draw?.prize?.name ||
    model?.draw?.prize?.name ||
    model?.prize?.name ||
    model?.currentPhase?.prize?.name ||
    model?.currentPhase?.prizes?.[0]?.name ||
    model?.prizes?.[0]?.name ||
    myPrize?.prize?.name ||
    ''
  )
}

const ADDRESS_OPTIONS = [
  { province: '北京市', cities: [{ city: '北京市', districts: ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区'] }] },
  { province: '天津市', cities: [{ city: '天津市', districts: ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '滨海新区', '宁河区', '静海区', '蓟州区'] }] },
  { province: '河北省', cities: ['石家庄市', '唐山市', '秦皇岛市', '邯郸市', '邢台市', '保定市', '张家口市', '承德市', '沧州市', '廊坊市', '衡水市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '山西省', cities: ['太原市', '大同市', '阳泉市', '长治市', '晋城市', '朔州市', '晋中市', '运城市', '忻州市', '临汾市', '吕梁市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '内蒙古自治区', cities: ['呼和浩特市', '包头市', '乌海市', '赤峰市', '通辽市', '鄂尔多斯市', '呼伦贝尔市', '巴彦淖尔市', '乌兰察布市', '兴安盟', '锡林郭勒盟', '阿拉善盟'].map((city) => ({ city, districts: ['市辖区', '旗县区'] })) },
  { province: '辽宁省', cities: ['沈阳市', '大连市', '鞍山市', '抚顺市', '本溪市', '丹东市', '锦州市', '营口市', '阜新市', '辽阳市', '盘锦市', '铁岭市', '朝阳市', '葫芦岛市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '吉林省', cities: ['长春市', '吉林市', '四平市', '辽源市', '通化市', '白山市', '松原市', '白城市', '延边朝鲜族自治州'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '黑龙江省', cities: ['哈尔滨市', '齐齐哈尔市', '鸡西市', '鹤岗市', '双鸭山市', '大庆市', '伊春市', '佳木斯市', '七台河市', '牡丹江市', '黑河市', '绥化市', '大兴安岭地区'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '上海市', cities: [{ city: '上海市', districts: ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'] }] },
  { province: '江苏省', cities: ['南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市', '淮安市', '盐城市', '扬州市', '镇江市', '泰州市', '宿迁市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '浙江省', cities: ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '衢州市', '舟山市', '台州市', '丽水市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '安徽省', cities: ['合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市', '淮北市', '铜陵市', '安庆市', '黄山市', '滁州市', '阜阳市', '宿州市', '六安市', '亳州市', '池州市', '宣城市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '福建省', cities: ['福州市', '厦门市', '莆田市', '三明市', '泉州市', '漳州市', '南平市', '龙岩市', '宁德市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '江西省', cities: ['南昌市', '景德镇市', '萍乡市', '九江市', '新余市', '鹰潭市', '赣州市', '吉安市', '宜春市', '抚州市', '上饶市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '山东省', cities: ['济南市', '青岛市', '淄博市', '枣庄市', '东营市', '烟台市', '潍坊市', '济宁市', '泰安市', '威海市', '日照市', '临沂市', '德州市', '聊城市', '滨州市', '菏泽市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '河南省', cities: ['郑州市', '开封市', '洛阳市', '平顶山市', '安阳市', '鹤壁市', '新乡市', '焦作市', '濮阳市', '许昌市', '漯河市', '三门峡市', '南阳市', '商丘市', '信阳市', '周口市', '驻马店市', '济源市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '湖北省', cities: ['武汉市', '黄石市', '十堰市', '宜昌市', '襄阳市', '鄂州市', '荆门市', '孝感市', '荆州市', '黄冈市', '咸宁市', '随州市', '恩施土家族苗族自治州', '仙桃市', '潜江市', '天门市', '神农架林区'].map((city) => ({ city, districts: ['市辖区', '县市区'] })) },
  { province: '湖南省', cities: ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '张家界市', '益阳市', '郴州市', '永州市', '怀化市', '娄底市', '湘西土家族苗族自治州'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '广东省', cities: ['广州市', '韶关市', '深圳市', '珠海市', '汕头市', '佛山市', '江门市', '湛江市', '茂名市', '肇庆市', '惠州市', '梅州市', '汕尾市', '河源市', '阳江市', '清远市', '东莞市', '中山市', '潮州市', '揭阳市', '云浮市'].map((city) => ({ city, districts: city === '广州市' ? ['越秀区', '海珠区', '荔湾区', '天河区', '白云区', '黄埔区', '番禺区', '南沙区', '从化区', '增城区'] : city === '深圳市' ? ['福田区', '罗湖区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区', '光明区'] : ['市辖区', '镇街区'] })) },
  { province: '广西壮族自治区', cities: ['南宁市', '柳州市', '桂林市', '梧州市', '北海市', '防城港市', '钦州市', '贵港市', '玉林市', '百色市', '贺州市', '河池市', '来宾市', '崇左市'].map((city) => ({ city, districts: ['市辖区', '县', '自治县'] })) },
  { province: '海南省', cities: ['海口市', '三亚市', '三沙市', '儋州市', '五指山市', '琼海市', '文昌市', '万宁市', '东方市', '定安县', '屯昌县', '澄迈县', '临高县', '白沙黎族自治县', '昌江黎族自治县', '乐东黎族自治县', '陵水黎族自治县', '保亭黎族苗族自治县', '琼中黎族苗族自治县'].map((city) => ({ city, districts: ['市辖区', '县域'] })) },
  { province: '重庆市', cities: [{ city: '重庆市', districts: ['万州区', '涪陵区', '渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '綦江区', '大足区', '渝北区', '巴南区', '黔江区', '长寿区', '江津区', '合川区', '永川区', '南川区', '璧山区', '铜梁区', '潼南区', '荣昌区', '开州区', '梁平区', '武隆区', '县'] }] },
  { province: '四川省', cities: ['成都市', '自贡市', '攀枝花市', '泸州市', '德阳市', '绵阳市', '广元市', '遂宁市', '内江市', '乐山市', '南充市', '眉山市', '宜宾市', '广安市', '达州市', '雅安市', '巴中市', '资阳市', '阿坝藏族羌族自治州', '甘孜藏族自治州', '凉山彝族自治州'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '贵州省', cities: ['贵阳市', '六盘水市', '遵义市', '安顺市', '毕节市', '铜仁市', '黔西南布依族苗族自治州', '黔东南苗族侗族自治州', '黔南布依族苗族自治州'].map((city) => ({ city, districts: ['市辖区', '县', '自治县'] })) },
  { province: '云南省', cities: ['昆明市', '曲靖市', '玉溪市', '保山市', '昭通市', '丽江市', '普洱市', '临沧市', '楚雄彝族自治州', '红河哈尼族彝族自治州', '文山壮族苗族自治州', '西双版纳傣族自治州', '大理白族自治州', '德宏傣族景颇族自治州', '怒江傈僳族自治州', '迪庆藏族自治州'].map((city) => ({ city, districts: ['市辖区', '县', '自治县'] })) },
  { province: '西藏自治区', cities: ['拉萨市', '日喀则市', '昌都市', '林芝市', '山南市', '那曲市', '阿里地区'].map((city) => ({ city, districts: ['市辖区', '县'] })) },
  { province: '陕西省', cities: ['西安市', '铜川市', '宝鸡市', '咸阳市', '渭南市', '延安市', '汉中市', '榆林市', '安康市', '商洛市'].map((city) => ({ city, districts: ['市辖区', '县', '县级市'] })) },
  { province: '甘肃省', cities: ['兰州市', '嘉峪关市', '金昌市', '白银市', '天水市', '武威市', '张掖市', '平凉市', '酒泉市', '庆阳市', '定西市', '陇南市', '临夏回族自治州', '甘南藏族自治州'].map((city) => ({ city, districts: ['市辖区', '县', '自治县'] })) },
  { province: '青海省', cities: ['西宁市', '海东市', '海北藏族自治州', '黄南藏族自治州', '海南藏族自治州', '果洛藏族自治州', '玉树藏族自治州', '海西蒙古族藏族自治州'].map((city) => ({ city, districts: ['市辖区', '县', '自治县'] })) },
  { province: '宁夏回族自治区', cities: ['银川市', '石嘴山市', '吴忠市', '固原市', '中卫市'].map((city) => ({ city, districts: ['市辖区', '县'] })) },
  { province: '新疆维吾尔自治区', cities: ['乌鲁木齐市', '克拉玛依市', '吐鲁番市', '哈密市', '昌吉回族自治州', '博尔塔拉蒙古自治州', '巴音郭楞蒙古自治州', '阿克苏地区', '克孜勒苏柯尔克孜自治州', '喀什地区', '和田地区', '伊犁哈萨克自治州', '塔城地区', '阿勒泰地区', '石河子市', '阿拉尔市', '图木舒克市', '五家渠市', '北屯市', '铁门关市', '双河市', '可克达拉市', '昆玉市', '胡杨河市', '新星市', '白杨市'].map((city) => ({ city, districts: ['市辖区', '县市区'] })) },
  { province: '香港特别行政区', cities: [{ city: '香港特别行政区', districts: ['中西区', '湾仔区', '东区', '南区', '油尖旺区', '深水埗区', '九龙城区', '黄大仙区', '观塘区', '荃湾区', '屯门区', '元朗区', '北区', '大埔区', '西贡区', '沙田区', '葵青区', '离岛区'] }] },
  { province: '澳门特别行政区', cities: [{ city: '澳门特别行政区', districts: ['花地玛堂区', '圣安多尼堂区', '大堂区', '望德堂区', '风顺堂区', '嘉模堂区', '路氹填海区', '圣方济各堂区'] }] },
  { province: '台湾省', cities: ['台北市', '新北市', '桃园市', '台中市', '台南市', '高雄市', '基隆市', '新竹市', '嘉义市', '新竹县', '苗栗县', '彰化县', '南投县', '云林县', '嘉义县', '屏东县', '宜兰县', '花莲县', '台东县', '澎湖县', '金门县', '连江县'].map((city) => ({ city, districts: ['区', '乡镇市区'] })) },
]

function getInitialAddressParts() {
  const province = ADDRESS_OPTIONS[0]
  return {
    province: province.province,
    city: '',
    district: '',
    detailAddress: '',
  }
}

function getProvinceOption(provinceName) {
  return ADDRESS_OPTIONS.find((item) => item.province === provinceName) || null
}

function getCityOptions(provinceName) {
  return getProvinceOption(provinceName)?.cities || []
}

function getDistrictOptions(provinceName, cityName) {
  return getCityOptions(provinceName).find((item) => item.city === cityName)?.districts || []
}

function composeRecipientAddress(form) {
  return [form.province, form.city, form.district, form.detailAddress].filter(Boolean).join(' ')
}

function buildFallbackDraw() {
  return {
    status: DRAW_STATUS.LOST,
    won: false,
    soldOut: false,
    alreadyDrawn: true,
    wheelStopIndex: 1,
  }
}

function DebugPanel({
  activityKey,
  step,
  attemptId,
  model,
  draw,
  onReset,
  onGoQuestion,
  onLogState,
}) {
  if (!isDebug) return null

  return (
    <div className="absolute right-[24px] top-[calc(env(safe-area-inset-top,0px)+24px)] z-[12000] w-[250px] rounded-[20px] border border-white/60 bg-white/92 px-4 py-3 text-left text-[20px] leading-7 text-slate-700 shadow-[0_18px_48px_rgba(15,23,42,0.18)] backdrop-blur-md">
      <div className="text-[22px] font-extrabold text-slate-900">DEBUG</div>
      <div className="mt-2 break-all text-[18px] leading-6">
        <div>activityKey: {activityKey || '-'}</div>
        <div>step: {step || '-'}</div>
        <div>attemptId: {attemptId || model?.attempt?.attemptId || '-'}</div>
      </div>
      <div className="mt-3 grid gap-2">
        <button className="min-h-10 rounded-xl bg-red-500 px-3 py-2 text-[18px] font-bold text-white" type="button" onClick={onReset}>
          重置活动
        </button>
        <button className="min-h-10 rounded-xl bg-slate-900 px-3 py-2 text-[18px] font-bold text-white" type="button" onClick={onGoQuestion}>
          回到答题页
        </button>
        <button className="min-h-10 rounded-xl bg-slate-200 px-3 py-2 text-[18px] font-bold text-slate-800" type="button" onClick={() => onLogState({ activityKey, step, attemptId, model, draw })}>
          console.log 当前状态
        </button>
      </div>
    </div>
  )
}

function DevLayoutDebugPanel({ step }) {
  const [metrics, setMetrics] = useState(() => ({
    viewportWidth: typeof window === 'undefined' ? 0 : window.innerWidth,
    scale: typeof window === 'undefined' ? 1 : window.innerWidth / 750,
    stageWidth: 750,
  }))

  useEffect(() => {
    if (!isDev) return undefined
    const syncMetrics = () => {
      const nextMetrics = window.__pqlStageMetrics || {
        viewportWidth: window.innerWidth,
        scale: window.innerWidth / 750,
        stageWidth: 750,
      }
      setMetrics(nextMetrics)
    }
    syncMetrics()
    window.addEventListener('resize', syncMetrics)
    window.addEventListener('orientationchange', syncMetrics)
    const timer = window.setInterval(syncMetrics, 500)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('resize', syncMetrics)
      window.removeEventListener('orientationchange', syncMetrics)
    }
  }, [])

  if (!isDev) return null

  return (
    <div className="fixed left-3 bottom-3 z-[12001] rounded-xl bg-slate-950/80 px-3 py-2 text-[14px] leading-5 text-white shadow-lg">
      <div>vw: {metrics.viewportWidth}</div>
      <div>scale: {Number(metrics.scale || 0).toFixed(3)}</div>
      <div>stage: {metrics.stageWidth}</div>
      <div>step: {step || '-'}</div>
    </div>
  )
}

function EntryPage({ activityTitle, model, onStart, disabled, assets }) {
  const unavailable = model?.state === 'no_open_phase'
  const subtitle = unavailable ? '当前暂无开放期次' : '本期答题已开启'

  return (
    <section className="relative z-10 flex h-full flex-col text-center text-slate-900">
      <QuestionHeader
        title={activityTitle}
        backgroundImageUrl={assets.bannerBackground}
        bookImageUrl={assets.bannerBook}
      />
      <div className="px-[40px] pb-[88px] pt-[64px]">
        <h2 className="text-[40px] leading-[1.3] font-extrabold text-slate-900">{subtitle}</h2>
        <button
          className="mt-[56px] min-h-[92px] w-full cursor-pointer rounded-full bg-slate-900 px-[32px] text-[32px] font-bold text-white shadow-[0_20px_40px_rgba(15,23,42,0.16)] transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-300"
          type="button"
          disabled={disabled || unavailable}
          onClick={onStart}
        >
          开始答题
        </button>
      </div>
    </section>
  )
}

function PrizeModalContent({
  prize,
  assets,
  claimMode,
  setClaimMode,
  mailForm,
  setMailForm,
  pickupPassword,
  setPickupPassword,
  onSubmitMail,
  onSubmitPickupClaim,
  onSubmitPickupVerify,
}) {
  if (!prize?.hasPrize) return <p className="text-sm leading-7 text-slate-500">当前还没有可领取的奖品。</p>

  const claim = prize.claim
  const drawTime = formatDrawTime(prize.draw?.createdAt)
  const claimStatusText = claim?.status === CLAIM_STATUS.PICKUP_VERIFIED ? '已核销' : claim?.status === CLAIM_STATUS.PICKUP_PENDING ? '待核销' : claim?.status === CLAIM_STATUS.MAIL_SUBMITTED ? '已提交' : '待领取'

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-[56px_1fr_auto] items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
        <img className="h-[56px] w-[56px] object-contain" src={assets.prizeBox} alt="" aria-hidden="true" />
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold leading-[1.2] text-slate-800">{prize.prize?.name || '奖品待公布'}</div>
          <div className="mt-1 text-xs font-medium leading-[1.2] text-slate-500">{drawTime}</div>
        </div>
        <span className="inline-flex min-h-7 w-16 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-slate-700">{claimStatusText}</span>
      </div>

      {claim?.status === CLAIM_STATUS.MAIL_SUBMITTED ? (
        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          <div>{claim.recipientName || '-'} · {claim.recipientPhone || '-'}</div>
          <div className="mt-1">{claim.recipientAddress || '-'}</div>
        </div>
      ) : null}

      {!claim || claim.status === CLAIM_STATUS.PENDING_METHOD ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`min-h-10 cursor-pointer rounded-2xl text-sm font-bold ${claimMode === 'mail' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              type="button"
              onClick={() => setClaimMode('mail')}
            >
              邮寄领奖
            </button>
            <button
              className={`min-h-10 cursor-pointer rounded-2xl text-sm font-bold ${claimMode === 'pickup' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              type="button"
              onClick={() => setClaimMode('pickup')}
            >
              到店自提
            </button>
          </div>

          {claimMode === 'mail' ? (
            <div className="grid gap-2">
              <div className="grid gap-1.5">
                <input
                  id="pql-name"
                  className="min-h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  value={mailForm.recipientName}
                  onChange={(event) => setMailForm((current) => ({ ...current, recipientName: event.target.value }))}
                  placeholder="收件人姓名"
                />
                <input
                  id="pql-phone"
                  type="tel"
                  inputMode="numeric"
                  className="min-h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  value={mailForm.recipientPhone}
                  onChange={(event) => setMailForm((current) => ({ ...current, recipientPhone: event.target.value.replace(/\D/g, '') }))}
                  placeholder="手机号"
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-2 text-xs text-slate-900"
                  value={mailForm.province}
                  onChange={(event) => {
                    setMailForm((current) => ({
                      ...current,
                      province: event.target.value,
                      city: '',
                      district: '',
                    }))
                  }}
                  aria-label="省份"
                >
                  <option value="">省</option>
                  {ADDRESS_OPTIONS.map((item) => <option key={item.province} value={item.province}>{item.province}</option>)}
                </select>
                <select
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-2 text-xs text-slate-900"
                  value={mailForm.city}
                  onChange={(event) => {
                    setMailForm((current) => ({
                      ...current,
                      city: event.target.value,
                      district: '',
                    }))
                  }}
                  disabled={!mailForm.province}
                  aria-label="城市"
                >
                  <option value="">市</option>
                  {getCityOptions(mailForm.province).map((item) => <option key={item.city} value={item.city}>{item.city}</option>)}
                </select>
                <select
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-2 text-xs text-slate-900"
                  value={mailForm.district}
                  onChange={(event) => setMailForm((current) => ({ ...current, district: event.target.value }))}
                  disabled={!mailForm.city}
                  aria-label="区县"
                >
                  <option value="">区</option>
                  {getDistrictOptions(mailForm.province, mailForm.city).map((district) => <option key={district} value={district}>{district}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <input
                  id="pql-address"
                  className="min-h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
                  value={mailForm.detailAddress}
                  onChange={(event) => setMailForm((current) => ({ ...current, detailAddress: event.target.value }))}
                  placeholder="详细地址"
                />
              </div>
              <button className="sticky bottom-0 mt-1 min-h-11 cursor-pointer rounded-full bg-slate-900 px-6 text-sm font-bold text-white" type="button" onClick={onSubmitMail}>
                提交邮寄信息
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              <button className="sticky bottom-0 min-h-11 cursor-pointer rounded-full bg-slate-900 px-6 text-sm font-bold text-white" type="button" onClick={onSubmitPickupClaim}>
                选择到店自提
              </button>
            </div>
          )}
        </>
      ) : null}

      {claim?.status === CLAIM_STATUS.PICKUP_PENDING ? (
        <div className="grid gap-3">
          <div className="grid gap-2">
            <input
              id="pql-verify"
              type="password"
              className="min-h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900"
              value={pickupPassword}
              onChange={(event) => setPickupPassword(event.target.value)}
              placeholder="请输入门店核销密码"
            />
          </div>
          <button className="sticky bottom-0 min-h-11 cursor-pointer rounded-full bg-slate-900 px-6 text-sm font-bold text-white" type="button" onClick={onSubmitPickupVerify}>
            提交核销
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function PhaseQuizLotteryApp({ routeParams }) {
  const tokenFromUrl = getTokenFromUrl()
  if (tokenFromUrl) {
    setToken(tokenFromUrl)
    window.location.replace(sanitizeUrlForWechat(window.location.href))
    return null
  }

  return <PhaseQuizLotteryMain routeParams={routeParams} />
}

function PhaseQuizLotteryMain({ routeParams }) {
  const activityKey = routeParams?.activityKey || getQueryParam('activity_key') || ''
  const [step, setStep] = useState(STEP.ENTRY)
  const [publicConfig, setPublicConfig] = useState(null)
  const [model, setModel] = useState(null)
  const [attemptId, setAttemptId] = useState('')
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [attemptStartedAt, setAttemptStartedAt] = useState(0)
  const [scoreDisplay, setScoreDisplay] = useState(0)
  const [draw, setDraw] = useState(null)
  const [myPrize, setMyPrize] = useState(null)
  const [toast, setToast] = useState('')
  const [loadingText, setLoadingText] = useState('活动加载中...')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [spinKey, setSpinKey] = useState(0)
  const [prizeModalOpen, setPrizeModalOpen] = useState(false)
  const [claimMode, setClaimMode] = useState('mail')
  const [mailForm, setMailForm] = useState({
    recipientName: '',
    recipientPhone: '',
    ...getInitialAddressParts(),
  })
  const [pickupPassword, setPickupPassword] = useState('')
  const requestCounterRef = useRef(0)
  const toastTimerRef = useRef(0)
  const scoreTimerRef = useRef(0)
  const drawLockRef = useRef(false)
  const lastDrawClickRef = useRef(0)
  const assets = useMemo(() => buildAssets(), [])
  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, publicConfig)

  useEffect(() => {
    replaceLegacyPath(activityKey)
  }, [activityKey])

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimerRef.current)
      window.clearInterval(scoreTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!prizeModalOpen) return undefined
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [prizeModalOpen])

  function showToast(message, duration = 2200) {
    window.clearTimeout(toastTimerRef.current)
    setToast(message || '')
    if (!message) return
    toastTimerRef.current = window.setTimeout(() => setToast(''), duration)
  }

  function nextRequestId(prefix) {
    requestCounterRef.current += 1
    return buildRequestId(prefix, requestCounterRef.current)
  }

  function applyResultModel(nextModel) {
    setModel(nextModel)
    setAttemptId(nextModel?.attempt?.attemptId || '')
    setDraw(nextModel?.draw || null)
    setStep(resolveInitialStep(nextModel))
  }

  function startScoreAnimation(value) {
    window.clearInterval(scoreTimerRef.current)
    const target = Number(value || 0)
    setScoreDisplay(0)
    let current = 0
    scoreTimerRef.current = window.setInterval(() => {
      current += Math.max(1, Math.ceil(target / 12))
      if (current >= target) {
        setScoreDisplay(target)
        window.clearInterval(scoreTimerRef.current)
        return
      }
      setScoreDisplay(current)
    }, 32)
  }

  useEffect(() => {
    if (model?.result?.score === undefined || model?.result?.score === null) return
    startScoreAnimation(model.result.score)
  }, [model?.result?.score])

  useEffect(() => {
    if (!activityKey) {
      setLoading(false)
      showToast('缺少 activityKey')
      return
    }

    getPublicConfig(activityKey)
      .then((config) => setPublicConfig(config))
      .catch((error) => {
        setLoading(false)
        showToast(normalizeFriendlyMessage(error, '活动配置加载失败'))
      })
  }, [activityKey])

  async function handleProtectedRequest(task, reason) {
    try {
      return await task()
    } catch (error) {
      if (isUnauthorizedError(error)) {
        reauth(reason)
        return null
      }
      throw error
    }
  }

  useEffect(() => {
    if (!publicConfig || !authReady || !activityKey) return

    async function loadBootstrap() {
      setLoading(true)
      setLoadingText('活动加载中...')
      try {
        const data = await handleProtectedRequest(() => getBootstrap(activityKey), 'phase-quiz-bootstrap')
        if (!data) return

        document.title = data.activityTitle || '分期答题抽奖'
        setModel(data)
        setAttemptId(data?.attempt?.attemptId || '')
        setDraw(data?.draw || null)
        setStep(resolveInitialStep(data))
      } catch (error) {
        showToast(normalizeFriendlyMessage(error, '活动加载失败'))
      } finally {
        setLoading(false)
      }
    }

    loadBootstrap()
  }, [activityKey, authReady, publicConfig])

  useEffect(() => {
    if (!activityKey) return
    trackPageView(activityKey, '/phase-quiz-lottery', {
      activityType: 'phase_quiz_lottery',
      pageKey: step,
      phaseNo: model?.currentPhase?.phaseNo || null,
    })
  }, [activityKey, model?.currentPhase?.phaseNo, step])

  useEffect(() => {
    if (!blockedMessage) return
    showToast(blockedMessage)
  }, [blockedMessage])

  useEffect(() => {
    if (!step) setStep(STEP.ENTRY)
  }, [step])

  async function handleDebugReset() {
    if (!isDebug) return

    setLoading(true)
    setLoadingText('正在重置测试活动...')
    try {
      const result = await request('/phase-quiz-lottery/dev/reset', {
        method: 'POST',
        body: JSON.stringify({
          activityKey,
          confirmToken: DEBUG_RESET_TOKEN,
        }),
      })
      console.log('[phase-quiz-lottery debug reset]', result)
      showToast('测试活动已重置')
      setQuestions([])
      setCurrentIndex(0)
      setAnswers([])
      setAttemptId('')
      setDraw(null)
      setModel((current) => (current ? { ...current, state: 'ready_to_start', result: null, eligibleForDraw: false, alreadyDrawn: false, won: false, soldOut: false, draw: null, attempt: null } : current))
      setStep(STEP.ENTRY)
    } catch (error) {
      showToast(normalizeFriendlyMessage(error, '重置失败'))
    } finally {
      setLoading(false)
    }
  }

  function handleDebugGoQuestion() {
    if (!isDebug) return
    setStep(STEP.QUESTION)
  }

  function handleDebugLogState(state) {
    if (!isDebug) return
    console.log('[phase-quiz-lottery debug state]', state)
  }

  async function handleStart() {
    if (!model?.currentPhase?.phaseNo) {
      showToast('活动未开始')
      return
    }

    setSubmitting(true)
    setLoading(true)
    setLoadingText('正在创建答题会话...')
    try {
      const data = await handleProtectedRequest(
        () =>
          startAttempt(activityKey, model.currentPhase.phaseNo, {
            requestId: nextRequestId('phase-start'),
            clientNonce: nextRequestId('phase-client'),
          }),
        'phase-quiz-start',
      )
      if (!data) return

      if (data.state === 'answering') {
        startTransition(() => {
          setQuestions(data.questions || [])
          setCurrentIndex(0)
          setAnswers([])
          setAttemptStartedAt(Date.now())
          setAttemptId(data.attemptId || '')
          setModel((current) => ({
            ...(current || {}),
            state: 'answering',
            currentPhase: current?.currentPhase || {
              phaseNo: data.phaseNo || model.currentPhase.phaseNo,
            },
          }))
          setStep(STEP.QUESTION)
        })
        return
      }

      applyResultModel(data)
    } catch (error) {
      showToast(normalizeFriendlyMessage(error, '开始答题失败'))
    } finally {
      setSubmitting(false)
      setLoading(false)
    }
  }

  async function handleAnswer(answer) {
    const question = questions[currentIndex]
    if (!question || submitting) return

    const nextAnswers = [...answers, { questionId: question.id, answer }]
    setAnswers(nextAnswers)

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((value) => value + 1)
      return
    }

    setSubmitting(true)
    setLoading(true)
    setLoadingText('正在提交答案...')
    try {
      const data = await handleProtectedRequest(
        () =>
          submitAttempt(activityKey, attemptId, {
            answers: nextAnswers,
            requestId: nextRequestId('phase-submit'),
            clientUsedTimeMs: Date.now() - attemptStartedAt,
          }),
        'phase-quiz-submit',
      )
      if (!data) return
      applyResultModel(data)
    } catch (error) {
      showToast(normalizeFriendlyMessage(error, '提交答案失败'))
    } finally {
      setSubmitting(false)
      setLoading(false)
    }
  }

  async function handleGoWheel() {
    if (!attemptId && model?.attempt?.attemptId) {
      try {
        const resultData = await handleProtectedRequest(
          () => getResult(activityKey, model.attempt.attemptId),
          'phase-quiz-result',
        )
        if (resultData) {
          setModel(resultData)
          setAttemptId(resultData?.attempt?.attemptId || '')
          setDraw(resultData?.draw || null)
        }
      } catch (error) {
        showToast(normalizeFriendlyMessage(error, '结果加载失败'))
        return
      }
    }

    setStep(STEP.WHEEL)
  }

  function patchModelWithDraw(nextDraw) {
    setModel((current) => {
      if (!current) return current
      return {
        ...current,
        eligibleForDraw: false,
        alreadyDrawn: true,
        won: nextDraw?.won || false,
        soldOut: nextDraw?.soldOut || false,
        draw: nextDraw,
      }
    })
  }

  async function handleDraw() {
    if (!model?.eligibleForDraw || !model?.attempt?.attemptId) return
    const now = Date.now()
    if (drawing || drawLockRef.current || now - lastDrawClickRef.current < 800) return
    lastDrawClickRef.current = now
    drawLockRef.current = true

    setDrawing(true)
    try {
      const data = await handleProtectedRequest(
        () =>
          drawPrize(activityKey, model.attempt.attemptId, {
            requestId: nextRequestId('phase-draw'),
          }),
        'phase-quiz-draw',
      )
      if (!data) {
        setDrawing(false)
        return
      }

      const nextDraw = Number.isInteger(data.wheelStopIndex) && data.wheelStopIndex >= 0 && data.wheelStopIndex < 4
        ? data
        : buildFallbackDraw()

      setDraw(nextDraw)
      patchModelWithDraw(nextDraw)
      if (Number.isInteger(nextDraw.wheelStopIndex)) {
        setSpinKey((value) => value + 1)
        return
      }

      setDrawing(false)
      setStep(STEP.RESULT)
    } catch (error) {
      console.warn('[phase-quiz-lottery draw fallback]', error)
      const fallbackDraw = buildFallbackDraw()
      setDraw(fallbackDraw)
      patchModelWithDraw(fallbackDraw)
      setSpinKey((value) => value + 1)
    } finally {
      drawLockRef.current = false
    }
  }

  async function openPrizeModal() {
    setLoading(true)
    setLoadingText('正在加载奖品...')
    try {
      const data = await handleProtectedRequest(() => getMyPrize(activityKey), 'phase-quiz-my-prize')
      if (!data) return
      setMyPrize(data)
      setPrizeModalOpen(true)
      if (data.claim?.deliveryMethod === 'pickup') setClaimMode('pickup')
      if (data.claim?.deliveryMethod === 'mail') {
        setClaimMode('mail')
        setMailForm({
          recipientName: data.claim.recipientName || '',
          recipientPhone: data.claim.recipientPhone || '',
          ...getInitialAddressParts(),
          detailAddress: data.claim.recipientAddress || '',
        })
      }
    } catch (error) {
      showToast(normalizeFriendlyMessage(error, '奖品加载失败'))
    } finally {
      setLoading(false)
    }
  }

  async function refreshPrizeState() {
    const data = await handleProtectedRequest(() => getMyPrize(activityKey), 'phase-quiz-my-prize')
    if (!data) return null
    setMyPrize(data)
    return data
  }

  async function handleSubmitMailClaim() {
    if (!myPrize?.draw?.id) return
    const recipientAddress = composeRecipientAddress(mailForm)
    if (!mailForm.recipientName.trim() || !mailForm.recipientPhone.trim() || !mailForm.province || !mailForm.city || !mailForm.district || !mailForm.detailAddress.trim()) {
      showToast('表单不完整')
      return
    }

    setLoading(true)
    setLoadingText('正在提交邮寄信息...')
    try {
      await handleProtectedRequest(
        () =>
          claimPrize(activityKey, myPrize.draw.id, {
            deliveryMethod: 'mail',
            recipientName: mailForm.recipientName,
            recipientPhone: mailForm.recipientPhone,
            recipientAddress,
          }),
        'phase-quiz-claim-mail',
      )
      await refreshPrizeState()
      showToast('邮寄信息已提交')
    } catch (error) {
      showToast(normalizeFriendlyMessage(error, '提交失败'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitPickupClaim() {
    if (!myPrize?.draw?.id) return

    setLoading(true)
    setLoadingText('正在创建自提记录...')
    try {
      await handleProtectedRequest(
        () =>
          claimPrize(activityKey, myPrize.draw.id, {
            deliveryMethod: 'pickup',
          }),
        'phase-quiz-claim-pickup',
      )
      const data = await refreshPrizeState()
      if (data?.claim?.status === CLAIM_STATUS.PICKUP_PENDING) {
        showToast('请输入核销密码')
      }
    } catch (error) {
      showToast(normalizeFriendlyMessage(error, '创建自提记录失败'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitPickupVerify() {
    if (!myPrize?.claim?.claimId) return
    if (!pickupPassword.trim()) {
      showToast('表单不完整')
      return
    }

    setLoading(true)
    setLoadingText('正在核销...')
    try {
      await handleProtectedRequest(
        () =>
          pickupVerify(activityKey, myPrize.claim.claimId, {
            verifyPassword: pickupPassword,
          }),
        'phase-quiz-pickup-verify',
      )
      setPickupPassword('')
      await refreshPrizeState()
      showToast('核销成功')
    } catch (error) {
      showToast(normalizeFriendlyMessage(error, '核销失败'))
    } finally {
      setLoading(false)
    }
  }

  function handleWheelFinish() {
    setDrawing(false)
    setStep(STEP.RESULT)
    if (!draw) return
    if (draw.status === DRAW_STATUS.WON) {
      openPrizeModal()
    }
  }

  const currentPhaseNo = model?.currentPhase?.phaseNo || model?.attempt?.phaseNo || ''
  const activityTitle = model?.activityTitle || '分期答题抽奖'
  const wheelSegments = useMemo(
    () => buildWheelSegments(resolvePrizeName(model, draw, myPrize)),
    [draw, model, myPrize],
  )

  return (
    <>
      <main className="h-[100vh] overflow-hidden bg-[#f5f7fb]">
        <StageLayout className="bg-[#f5f7fb]">
          <div className="pql-stage relative overflow-hidden bg-[#f5f7fb] text-slate-900">
            <DebugPanel
              activityKey={activityKey}
              step={step}
              attemptId={attemptId}
              model={model}
              draw={draw}
              onReset={handleDebugReset}
              onGoQuestion={handleDebugGoQuestion}
              onLogState={handleDebugLogState}
            />

            {step === STEP.ENTRY ? (
              <EntryPage activityTitle={activityTitle} model={model} onStart={handleStart} disabled={submitting || loading} assets={assets} />
            ) : null}

            {step === STEP.QUESTION ? (
              <QuestionPage
                activityTitle={activityTitle}
                questions={questions}
                currentIndex={currentIndex}
                submitting={submitting}
                onAnswer={handleAnswer}
                assets={assets}
              />
            ) : null}

            {step === STEP.RESULT ? (
              <ResultPage
                activityTitle={activityTitle}
                phaseNo={currentPhaseNo}
                model={model}
                animatedScore={scoreDisplay}
                onStart={handleStart}
                onGoWheel={handleGoWheel}
                onOpenPrize={openPrizeModal}
                assets={assets}
              />
            ) : null}

            {step === STEP.WHEEL ? (
              <WheelPage
                phaseNo={currentPhaseNo}
                segments={wheelSegments}
                draw={draw}
                canDraw={Boolean(model?.eligibleForDraw && !model?.alreadyDrawn)}
                drawing={drawing}
                spinKey={spinKey}
                onDraw={handleDraw}
                onOpenPrize={openPrizeModal}
                onWheelFinish={handleWheelFinish}
                assets={assets}
              />
            ) : null}
          </div>
        </StageLayout>
      </main>

      <DevLayoutDebugPanel step={step} />

      <PrizeModal open={prizeModalOpen} onClose={() => setPrizeModalOpen(false)}>
        <PrizeModalContent
          prize={myPrize}
          assets={assets}
          claimMode={claimMode}
          setClaimMode={setClaimMode}
          mailForm={mailForm}
          setMailForm={setMailForm}
          pickupPassword={pickupPassword}
          setPickupPassword={setPickupPassword}
          onSubmitMail={handleSubmitMailClaim}
          onSubmitPickupClaim={handleSubmitPickupClaim}
          onSubmitPickupVerify={handleSubmitPickupVerify}
        />
      </PrizeModal>

      <ToastLayer message={toast} />
      <LoadingLayer open={loading} text={loadingText} />
    </>
  )
}
