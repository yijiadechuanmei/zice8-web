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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="relative max-h-[calc(100vh-64px)] w-full max-w-[620px] overflow-auto rounded-[32px] bg-white px-7 py-8 shadow-[0_30px_80px_rgba(10,24,58,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="absolute right-5 top-4 h-11 w-11 cursor-pointer rounded-full bg-slate-100 text-2xl text-slate-700" type="button" onClick={onClose} aria-label="关闭弹窗">
          ×
        </button>
        <div className="pr-12 text-lg font-extrabold text-slate-900">我的奖品</div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}

function buildAssets() {
  return {
    bannerBackground: `${ASSET_BASE}/banner/banner_bg.png`,
    prizeBox: `${ASSET_BASE}/prize/prize_box.png`,
    wheelPointer: `${ASSET_BASE}/wheel/pointer`,
  }
}

function buildWheelSegments() {
  return [
    { label: '一等奖', background: '#fff8e5' },
    { label: '二等奖', background: '#f8fbff' },
    { label: '三等奖', background: '#fff8e5' },
    { label: '谢谢参与', background: '#f8fbff' },
    { label: '谢谢参与', background: '#fff8e5' },
    { label: '谢谢参与', background: '#f8fbff' },
    { label: '谢谢参与', background: '#fff8e5' },
    { label: '谢谢参与', background: '#f8fbff' },
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

function EntryPage({ activityTitle, model, onStart, disabled }) {
  const unavailable = model?.state === 'no_open_phase'
  const title = activityTitle || '分期答题抽奖'
  const subtitle = unavailable ? '当前暂无开放期次' : '本期答题已开启'
  const description = unavailable ? '活动未开始或当前期次已结束，请稍后再来。' : '完成本期 5 道判断题后查看结果，满分且具备资格时可进入抽奖。'

  return (
    <section className="flex h-full flex-col px-[40px] pb-[88px] pt-[420px] text-center text-slate-900">
      <div className="rounded-[36px] bg-white px-[40px] py-[56px] shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
        <div className="text-[32px] font-bold text-slate-500">{title}</div>
        <h2 className="mt-[28px] text-[40px] leading-[1.3] font-extrabold text-slate-900">{subtitle}</h2>
        <p className="mt-[24px] text-[30px] leading-[1.7] text-slate-600">{description}</p>
        <button
          className="mt-[56px] min-h-[92px] w-full rounded-full bg-slate-900 px-[32px] text-[32px] font-bold text-white shadow-[0_20px_40px_rgba(15,23,42,0.16)] disabled:cursor-not-allowed disabled:bg-slate-300"
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

  return (
    <div className="grid gap-5">
      <div className="grid justify-items-center gap-3 text-center">
        <img className="h-28 w-28 object-contain" src={prize.prize?.imageUrl || assets.prizeBox} alt="" aria-hidden="true" />
        <div className="text-lg font-extrabold text-slate-800">{prize.prize?.name || '奖品待公布'}</div>
        <div className="text-sm leading-6 text-slate-500">中奖时间：{drawTime}</div>
      </div>

      {claim?.status === CLAIM_STATUS.MAIL_SUBMITTED ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-700">邮寄信息已提交</span>
          </div>
          <div className="whitespace-pre-line text-sm leading-7 text-slate-500">
            {`收件人：${claim.recipientName || '-'}\n手机号：${claim.recipientPhone || '-'}\n地址：${claim.recipientAddress || '-'}`}
          </div>
        </div>
      ) : null}

      {claim?.status === CLAIM_STATUS.PICKUP_VERIFIED ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-700">核销已完成</span>
          </div>
          <div className="text-sm leading-7 text-slate-500">该奖品已完成自提核销，可截图留存。</div>
        </div>
      ) : null}

      {!claim || claim.status === CLAIM_STATUS.PENDING_METHOD ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`min-h-12 rounded-2xl text-sm font-bold ${claimMode === 'mail' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              type="button"
              onClick={() => setClaimMode('mail')}
            >
              邮寄领奖
            </button>
            <button
              className={`min-h-12 rounded-2xl text-sm font-bold ${claimMode === 'pickup' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              type="button"
              onClick={() => setClaimMode('pickup')}
            >
              到店自提
            </button>
          </div>

          {claimMode === 'mail' ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700" htmlFor="pql-name">姓名</label>
                <input
                  id="pql-name"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                  value={mailForm.recipientName}
                  onChange={(event) => setMailForm((current) => ({ ...current, recipientName: event.target.value }))}
                  placeholder="请输入收件人姓名"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700" htmlFor="pql-phone">手机号</label>
                <input
                  id="pql-phone"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                  value={mailForm.recipientPhone}
                  onChange={(event) => setMailForm((current) => ({ ...current, recipientPhone: event.target.value }))}
                  placeholder="支持 +86 / 空格 / 短横线"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-bold text-slate-700" htmlFor="pql-address">收货地址</label>
                <textarea
                  id="pql-address"
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                  value={mailForm.recipientAddress}
                  onChange={(event) => setMailForm((current) => ({ ...current, recipientAddress: event.target.value }))}
                  placeholder="请输入完整地址"
                />
              </div>
              <button className="min-h-14 rounded-full bg-slate-900 px-6 py-4 text-sm font-bold text-white" type="button" onClick={onSubmitMail}>
                提交邮寄信息
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              <div className="text-sm leading-7 text-slate-500">先创建自提领奖记录，再输入核销密码完成领取。</div>
              <button className="min-h-14 rounded-full bg-slate-900 px-6 py-4 text-sm font-bold text-white" type="button" onClick={onSubmitPickupClaim}>
                选择到店自提
              </button>
            </div>
          )}
        </>
      ) : null}

      {claim?.status === CLAIM_STATUS.PICKUP_PENDING ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex min-h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-700">待核销</span>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-bold text-slate-700" htmlFor="pql-verify">核销密码</label>
            <input
              id="pql-verify"
              type="password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              value={pickupPassword}
              onChange={(event) => setPickupPassword(event.target.value)}
              placeholder="请输入门店核销密码"
            />
          </div>
          <button className="min-h-14 rounded-full bg-slate-900 px-6 py-4 text-sm font-bold text-white" type="button" onClick={onSubmitPickupVerify}>
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
    recipientAddress: '',
  })
  const [pickupPassword, setPickupPassword] = useState('')
  const requestCounterRef = useRef(0)
  const toastTimerRef = useRef(0)
  const scoreTimerRef = useRef(0)
  const assets = useMemo(() => buildAssets(), [])
  const wheelSegments = useMemo(() => buildWheelSegments(), [])
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

    setDrawing(true)
    try {
      const data = await handleProtectedRequest(
        () =>
          drawPrize(activityKey, model.attempt.attemptId, {
            requestId: nextRequestId('phase-draw'),
          }),
        'phase-quiz-draw',
      )
      if (!data) return

      setDraw(data)
      patchModelWithDraw(data)
      if (Number.isInteger(data.wheelStopIndex)) {
        setSpinKey((value) => value + 1)
        return
      }

      setDrawing(false)
      setStep(STEP.RESULT)
      if (data.status === DRAW_STATUS.STOCK_EMPTY) {
        showToast('本期已抽完')
        return
      }
      showToast('谢谢参与')
    } catch (error) {
      showToast(normalizeFriendlyMessage(error, '抽奖失败'))
      setDrawing(false)
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
          recipientAddress: data.claim.recipientAddress || '',
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
    if (!mailForm.recipientName.trim() || !mailForm.recipientPhone.trim() || !mailForm.recipientAddress.trim()) {
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
            recipientAddress: mailForm.recipientAddress,
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
      return
    }
    if (draw.status === DRAW_STATUS.STOCK_EMPTY) {
      showToast('本期已抽完')
      return
    }
    showToast('谢谢参与')
  }

  const currentPhaseNo = model?.currentPhase?.phaseNo || model?.attempt?.phaseNo || ''
  const activityTitle = model?.activityTitle || '分期答题抽奖'

  return (
    <>
      <main className="h-[100vh] overflow-hidden bg-[#f5f7fb]">
        <StageLayout className="bg-[#f5f7fb]">
          <div className="pql-stage relative overflow-hidden bg-[#f5f7fb] text-slate-900">
            {step === STEP.ENTRY ? (
              <div className="absolute inset-x-0 top-0 z-0 h-[420px] bg-white">
                <div className="pql-banner h-full w-full" style={{ backgroundImage: `url(${assets.bannerBackground})` }} />
              </div>
            ) : null}

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
              <EntryPage activityTitle={activityTitle} model={model} onStart={handleStart} disabled={submitting || loading} />
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
                activityTitle={activityTitle}
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
