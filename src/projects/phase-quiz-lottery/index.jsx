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
import { ADDRESS_OPTIONS } from './address-options'
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
const DEFAULT_PICKUP_INFO = {
  pickupType: 'self',
  pickupAddress: '姑苏区平川路510号，1号楼1820室，姑苏区国防动员办公室',
  pickupPhone: '0512-68728820',
  pickupStatus: 'enabled',
}
const SHANGHAI_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

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
  const parts = SHANGHAI_DATE_TIME_FORMATTER.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value
    return acc
  }, {})
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}

function normalizeTel(phone) {
  return String(phone || '').replace(/[^\d+]/g, '')
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function normalizePickupType(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return ''
  if (normalized === 'self' || normalized === 'self_pickup' || normalized === 'pickup') return 'self'
  return normalized
}

function resolvePrizePickupStatus(prize) {
  if (prize?.status === 'self_pickup') return 'self_pickup'
  if (prize?.claim?.deliveryMethod === 'pickup') return 'self_pickup'
  if (
    prize?.claim?.status === CLAIM_STATUS.PICKUP_PENDING ||
    prize?.claim?.status === CLAIM_STATUS.PICKUP_VERIFIED
  ) {
    return 'self_pickup'
  }
  if (normalizePickupType(prize?.activityConfig?.snapshot?.pickupType) === 'self') return 'self_pickup'
  if (normalizePickupType(prize?.activityConfig?.pickupType) === 'self') return 'self_pickup'
  if (normalizePickupType(prize?.prize?.pickup_config?.pickupType) === 'self') return 'self_pickup'
  if (normalizePickupType(prize?.draw?.result?.pickupType) === 'self') return 'self_pickup'
  return ''
}

function resolvePickupInfo(source) {
  const activitySnapshot = source?.activityConfig?.snapshot || null
  const activityConfig = source?.activityConfig || null
  const prizePickupConfig = source?.prize?.pickup_config || null
  const drawResult = source?.draw?.result || null
  const pickupType = normalizePickupType(
    pickFirstString(
      activitySnapshot?.pickupType,
      activityConfig?.pickupType,
      prizePickupConfig?.pickupType,
      drawResult?.pickupType,
    ),
  )
  const pickupAddress = pickFirstString(
    activitySnapshot?.pickupAddress,
    activityConfig?.pickupAddress,
    prizePickupConfig?.pickupAddress,
    drawResult?.pickupAddress,
  )
  const pickupPhone = pickFirstString(
    activitySnapshot?.pickupPhone,
    activityConfig?.pickupPhone,
    prizePickupConfig?.pickupPhone,
    drawResult?.pickupPhone,
  )
  const pickupStatus = pickFirstString(
    activitySnapshot?.pickupStatus,
    activityConfig?.pickupStatus,
    prizePickupConfig?.pickupStatus,
    drawResult?.pickupStatus,
  )

  return {
    pickupType: pickupType || DEFAULT_PICKUP_INFO.pickupType,
    pickupAddress: pickupAddress || DEFAULT_PICKUP_INFO.pickupAddress,
    pickupPhone: pickupPhone || DEFAULT_PICKUP_INFO.pickupPhone,
    pickupStatus: pickupStatus || DEFAULT_PICKUP_INFO.pickupStatus,
  }
}

function shouldShowPickupInfoCard(prize) {
  return resolvePrizePickupStatus(prize) === 'self_pickup'
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

function normalizeAddressSelection(current, next) {
  const province = getProvinceOption(next.province) ? next.province : ''
  const cityOptions = getCityOptions(province)
  const city = cityOptions.some((item) => item.city === next.city) ? next.city : ''
  const districtOptions = getDistrictOptions(province, city)
  const district = districtOptions.includes(next.district) ? next.district : ''
  return {
    ...current,
    ...next,
    province,
    city,
    district,
  }
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

function PickupInfoCard({ pickupInfo }) {
  const pickupTel = normalizeTel(pickupInfo.pickupPhone)

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-left">
      <div className="text-xs font-extrabold text-slate-900">自提信息</div>
      <div className="mt-2 grid gap-2 text-xs leading-5 text-slate-600">
        <div>
          <div className="font-bold text-slate-800">领取地址：</div>
          <div>{pickupInfo.pickupAddress}</div>
        </div>
        <div>
          <div className="font-bold text-slate-800">联系方式：</div>
          <a className="inline-flex min-h-8 cursor-pointer items-center text-sm font-extrabold text-blue-700 underline-offset-4 active:underline" href={`tel:${pickupTel}`}>
            {pickupInfo.pickupPhone}
          </a>
        </div>
      </div>
    </div>
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
  const pickupInfo = resolvePickupInfo(prize)
  const showPickupInfoCard = shouldShowPickupInfoCard(prize)
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

      {showPickupInfoCard ? <PickupInfoCard pickupInfo={pickupInfo} /> : null}

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
              自提
            </button>
          </div>

          {claimMode === 'mail' ? (
            <div className="grid gap-2">
              <div className="grid gap-1.5">
                <input
                  id="pql-name"
                  className="min-h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base text-slate-900"
                  value={mailForm.recipientName}
                  onChange={(event) => setMailForm((current) => ({ ...current, recipientName: event.target.value }))}
                  placeholder="收件人姓名"
                  aria-label="收件人姓名"
                />
                <input
                  id="pql-phone"
                  type="tel"
                  inputMode="numeric"
                  className="min-h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base text-slate-900"
                  value={mailForm.recipientPhone}
                  onChange={(event) => setMailForm((current) => ({ ...current, recipientPhone: event.target.value.replace(/\D/g, '') }))}
                  placeholder="手机号"
                  aria-label="手机号"
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <select
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-2 text-base text-slate-900"
                  value={mailForm.province}
                  onChange={(event) => {
                    setMailForm((current) => ({
                      ...current,
                      ...normalizeAddressSelection(current, {
                        province: event.target.value,
                        city: '',
                        district: '',
                      }),
                    }))
                  }}
                  aria-label="省份"
                >
                  <option value="">省</option>
                  {ADDRESS_OPTIONS.map((item) => <option key={item.province} value={item.province}>{item.province}</option>)}
                </select>
                <select
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-2 text-base text-slate-900"
                  value={mailForm.city}
                  onChange={(event) => {
                    setMailForm((current) => ({
                      ...current,
                      ...normalizeAddressSelection(current, {
                        province: current.province,
                        city: event.target.value,
                        district: '',
                      }),
                    }))
                  }}
                  disabled={!mailForm.province}
                  aria-label="城市"
                >
                  <option value="">市</option>
                  {getCityOptions(mailForm.province).map((item) => <option key={item.city} value={item.city}>{item.city}</option>)}
                </select>
                <select
                  className="min-h-10 rounded-2xl border border-slate-200 bg-white px-2 text-base text-slate-900"
                  value={mailForm.district}
                  onChange={(event) => setMailForm((current) => normalizeAddressSelection(current, { ...current, district: event.target.value }))}
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
                  className="min-h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base text-slate-900"
                  value={mailForm.detailAddress}
                  onChange={(event) => setMailForm((current) => ({ ...current, detailAddress: event.target.value }))}
                  placeholder="详细地址"
                  aria-label="详细地址"
                />
              </div>
              <button className="sticky bottom-0 mt-1 min-h-11 cursor-pointer rounded-full bg-slate-900 px-6 text-sm font-bold text-white" type="button" onClick={onSubmitMail}>
                提交邮寄信息
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              <button className="sticky bottom-0 min-h-11 cursor-pointer rounded-full bg-slate-900 px-6 text-sm font-bold text-white" type="button" onClick={onSubmitPickupClaim}>
                选择自提
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
              type="text"
              className="min-h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-base text-slate-900"
              value={pickupPassword}
              onChange={(event) => setPickupPassword(event.target.value)}
              placeholder="请输入门店核销密码"
              aria-label="门店核销密码"
            />
          </div>
          <button className="sticky bottom-0 min-h-11 cursor-pointer rounded-full bg-slate-900 px-6 text-sm font-bold text-white" type="button" onClick={onSubmitPickupVerify}>
            提交核销
          </button>
        </div>
      ) : null}

      {claim?.status === CLAIM_STATUS.PICKUP_VERIFIED && showPickupInfoCard ? (
        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          已完成自提核销
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
    const preventGesture = (event) => {
      event.preventDefault()
    }
    const preventMultiTouchZoom = (event) => {
      if (event.touches?.length > 1) {
        event.preventDefault()
      }
    }
    const preventWheelZoom = (event) => {
      if (event.ctrlKey) {
        event.preventDefault()
      }
    }

    document.addEventListener('gesturestart', preventGesture)
    document.addEventListener('gesturechange', preventGesture)
    document.addEventListener('gestureend', preventGesture)
    document.addEventListener('touchmove', preventMultiTouchZoom, { passive: false })
    document.addEventListener('wheel', preventWheelZoom, { passive: false })

    return () => {
      document.removeEventListener('gesturestart', preventGesture)
      document.removeEventListener('gesturechange', preventGesture)
      document.removeEventListener('gestureend', preventGesture)
      document.removeEventListener('touchmove', preventMultiTouchZoom)
      document.removeEventListener('wheel', preventWheelZoom)
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

  function applyPrizeState(nextPrize) {
    setMyPrize(nextPrize || null)
    if (nextPrize?.claim?.deliveryMethod === 'pickup') setClaimMode('pickup')
    if (nextPrize?.claim?.deliveryMethod === 'mail') {
      setClaimMode('mail')
      setMailForm({
        recipientName: nextPrize.claim.recipientName || '',
        recipientPhone: nextPrize.claim.recipientPhone || '',
        ...getInitialAddressParts(),
        detailAddress: nextPrize.claim.recipientAddress || '',
      })
    }
  }

  function applyHydratedState(nextModel, nextPrize) {
    setModel(nextModel)
    setAttemptId(nextModel?.attempt?.attemptId || '')
    setDraw(nextModel?.draw || null)
    applyPrizeState(nextPrize)
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

    async function hydratePageState() {
      setLoading(true)
      setLoadingText('活动加载中...')
      try {
        const [bootstrapData, prizeData] = await Promise.all([
          handleProtectedRequest(() => getBootstrap(activityKey), 'phase-quiz-bootstrap'),
          handleProtectedRequest(() => getMyPrize(activityKey), 'phase-quiz-my-prize'),
        ])
        if (!bootstrapData) return

        document.title = bootstrapData.activityTitle || '分期答题抽奖'
        applyHydratedState(bootstrapData, prizeData)
      } catch (error) {
        showToast(normalizeFriendlyMessage(error, '活动加载失败'))
      } finally {
        setLoading(false)
      }
    }

    hydratePageState()
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
      setMyPrize(null)
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
      applyPrizeState(data)
      setPrizeModalOpen(true)
    } catch (error) {
      showToast(normalizeFriendlyMessage(error, '奖品加载失败'))
    } finally {
      setLoading(false)
    }
  }

  async function refreshPrizeState() {
    const data = await handleProtectedRequest(() => getMyPrize(activityKey), 'phase-quiz-my-prize')
    if (!data) return null
    applyPrizeState(data)
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
