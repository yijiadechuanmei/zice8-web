import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setToken } from '../../shared/api/request'
import { getVisitorId, trackEvent, trackPageView } from '../../shared/analytics'
import { activityAudioService } from '../../shared/audio/activityAudioService'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import { DEFAULT_OSS_BASE_URL } from '../phase-quiz-lottery/api'
import StageLayout from '../phase-quiz-lottery/components/StageLayout'
import PhaseWheel from '../phase-quiz-lottery/components/Wheel'
import {
  drawPrize,
  getBootstrap,
  getDebugAccess,
  getMyPrizes,
  getPublicConfig,
  resetDebugData,
  saveProfile,
  startAttempt,
  submitAttempt,
} from './api'
import {
  assetUrl,
  BROCHURE_QUIZ_LOTTERY_ACTIVITY_KEY,
  BROCHURE_QUIZ_LOTTERY_ACTIVITY_TYPE,
  mergeBrochureConfig,
} from './config'
import './styles.css'

const isDebugRequested = getQueryParam('debug') === '1'
const DEBUG_RESET_TOKEN = 'RESET_BQL_2026'
const MIN_DRAW_SCORE = 60
const PHASE_WHEEL_ASSET_BASE = `${DEFAULT_OSS_BASE_URL}/phase-quiz-lottery/phase_quiz_lottery_test_001`
const PHASE_WHEEL_ASSETS = {
  resultTrophy: `${PHASE_WHEEL_ASSET_BASE}/result/result_trophy.png`,
  prizeBox: `${PHASE_WHEEL_ASSET_BASE}/prize/prize_box.png`,
  bannerBackground: `${PHASE_WHEEL_ASSET_BASE}/banner/banner_bg.png`,
  bannerBook: `${PHASE_WHEEL_ASSET_BASE}/banner/banner_book.png`,
  wheelRing: `${PHASE_WHEEL_ASSET_BASE}/wheel/wheel_ring.png`,
  wheelPointer: `${PHASE_WHEEL_ASSET_BASE}/wheel/wheel_pointer.png`,
  wheelCenterButton: `${PHASE_WHEEL_ASSET_BASE}/wheel/wheel_center_btn.png`,
}
const BROCHURE_WHEEL_SEGMENTS = [
  { label: '谢谢参与', prizeLevel: '未中奖', background: '#EAF6FF' },
  { label: '特等奖', prizeLevel: '特等奖', prize: true, background: '#FFE7A3' },
  { label: '幸运奖', prizeLevel: '幸运奖', prize: true, background: '#F7FAFF' },
  { label: '一等奖', prizeLevel: '一等奖', prize: true, background: '#EEF6FF' },
  { label: '二等奖', prizeLevel: '二等奖', prize: true, background: '#FFF7D6' },
  { label: '三等奖', prizeLevel: '三等奖', prize: true, background: '#E6F2FF' },
]

function normalizeActivityKey(routeParams) {
  return routeParams?.activityKey || getQueryParam('activity_key') || BROCHURE_QUIZ_LOTTERY_ACTIVITY_KEY
}

function resolveNewParticipationBlock({ activityState, activityWindow, availablePoolCount }) {
  if (activityState === 'activity_not_started' || activityWindow?.status === 'not_started') return '活动未开始'
  const poolCount = Number(availablePoolCount)
  if (
    activityState === 'activity_ended' ||
    activityWindow?.status === 'ended' ||
    (Number.isFinite(poolCount) && poolCount <= 0)
  ) {
    return '活动已结束'
  }
  return ''
}

function isActivityWindowError(error) {
  const message = error?.message || ''
  return message.includes('活动未开始') || message.includes('活动已结束')
}

function isWechatBrowser() {
  if (typeof navigator === 'undefined') return false
  return /MicroMessenger/i.test(navigator.userAgent || '')
}

function playWithWechatBridge(audio) {
  return new Promise((resolve) => {
    const run = () => audio.play().then(() => resolve(true)).catch(() => resolve(false))
    try {
      window.WeixinJSBridge.invoke('getNetworkType', {}, run)
    } catch {
      run()
    }
  })
}

function playAudio(audio) {
  if (!audio) return Promise.resolve(false)
  if (!isWechatBrowser()) {
    return audio.play().then(() => true).catch(() => false)
  }
  if (window.WeixinJSBridge?.invoke) {
    return playWithWechatBridge(audio)
  }
  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      document.removeEventListener('WeixinJSBridgeReady', handleReady)
      resolve(result)
    }
    const handleReady = () => {
      playWithWechatBridge(audio).then(finish)
    }
    document.addEventListener('WeixinJSBridgeReady', handleReady, { once: true })
    window.setTimeout(() => {
      audio.play().then(() => finish(true)).catch(() => finish(false))
    }, 1200)
  })
}

function buildBackgroundStyle(config) {
  return {
    '--bql-home-bg-overlay': `url("${assetUrl(config, config.home.bgOverlay)}")`,
  }
}

function buildPhaseWheelSegments() {
  return BROCHURE_WHEEL_SEGMENTS
}

function normalizePrizeLevel(value) {
  return String(value || '').trim()
}

function resolveWheelTargetIndex(draw) {
  if (!draw) return null
  const prizeLevel = normalizePrizeLevel(draw.prizeLevel)
  const expectedPrizeLevel = draw.won && prizeLevel ? prizeLevel : '未中奖'
  const expectedIndex = BROCHURE_WHEEL_SEGMENTS.findIndex((segment) => segment.prizeLevel === expectedPrizeLevel)
  if (Number.isInteger(draw.wheelStopIndex) && draw.wheelStopIndex >= 0 && draw.wheelStopIndex < BROCHURE_WHEEL_SEGMENTS.length) {
    const segment = BROCHURE_WHEEL_SEGMENTS[draw.wheelStopIndex]
    if (segment?.prizeLevel === expectedPrizeLevel) return draw.wheelStopIndex
  }
  return expectedIndex >= 0 ? expectedIndex : 0
}

function formatPrizeTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function appendUrlVersion(url, version) {
  if (!url || !version) return url
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`
}

function getPrizeImageUrl(config, prize) {
  const image =
    config.prizes?.imagesByCode?.[prize?.prizeCode] ||
    config.prizes?.images?.[prize?.prizeLevel]
  return image
    ? appendUrlVersion(assetUrl(config, image), config.prizes?.imageVersion)
    : PHASE_WHEEL_ASSETS.prizeBox
}

function HomeCanvas({ config, currentSlide, onSlide, onParticipate, autoplaySlideAudio = true, bgmEnabled = false }) {
  const audioRef = useRef(null)
  const touchRef = useRef({ startX: 0, startY: 0, active: false })
  const slides = config.brochure.slides
  const active = slides[currentSlide] || slides[0]
  const activeNavKey = active?.navKey || active?.key
  const tabs = useMemo(() => {
    const seen = new Set()
    return slides.reduce((items, slide, index) => {
      const navKey = slide.navKey || slide.key
      if (seen.has(navKey)) return items
      seen.add(navKey)
      items.push({ key: navKey, title: slide.title, firstSlideIndex: index })
      return items
    }, [])
  }, [slides])

  const startAudio = useCallback(async (index) => {
    const audio = audioRef.current
    const slide = slides[index]
    if (!audio || !slide?.audio) return
    audio.src = assetUrl(config, slide.audio, 'audios')
    audio.currentTime = 0
    await playAudio(audio)
  }, [config, slides])

  useEffect(() => {
    if (!autoplaySlideAudio) return
    const timer = window.setTimeout(() => {
      startAudio(currentSlide)
    }, bgmEnabled ? 450 : 0)
    return () => window.clearTimeout(timer)
  }, [autoplaySlideAudio, bgmEnabled, currentSlide, startAudio])

  const handleEnded = () => {
    if (currentSlide < slides.length - 1) onSlide(currentSlide + 1)
  }

  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return
    if (index === currentSlide) {
      startAudio(index)
      return
    }
    onSlide(index)
  }

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0]
    if (!touch) return
    touchRef.current = { startX: touch.clientX, startY: touch.clientY, active: true }
  }

  const handleTouchEnd = (event) => {
    const touch = event.changedTouches?.[0]
    const start = touchRef.current
    touchRef.current = { startX: 0, startY: 0, active: false }
    if (!touch || !start.active) return
    const deltaX = touch.clientX - start.startX
    const deltaY = touch.clientY - start.startY
    if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return
    goToSlide(currentSlide + (deltaX < 0 ? 1 : -1))
  }

  return (
    <main className="bql-home">
      <div className="bql-canvas">
        <img
          className="bql-home-bg-overlay"
          src={assetUrl(config, config.home.bgOverlay)}
          alt=""
        />
        <img
          className="bql-home-title"
          src={assetUrl(config, config.home.title)}
          alt=""
        />
        <img
          className="bql-home-logo"
          src={assetUrl(config, config.home.logo)}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />

        <div
          className="bql-carousel-frame"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="bql-carousel-track"
            style={{ transform: `translate3d(-${currentSlide * 100}%, 0, 0)` }}
          >
            {slides.map((slide) => {
              const slideImage = slide.image || config.brochure.placeholderImage
              return (
                <div className="bql-carousel-slide" key={slide.key}>
                  <img
                    className="bql-carousel-image"
                    src={assetUrl(config, slideImage)}
                    alt={slide.title}
                    draggable="false"
                    onError={(event) => {
                      if (slideImage !== config.brochure.placeholderImage && !event.currentTarget.dataset.placeholderApplied) {
                        event.currentTarget.dataset.placeholderApplied = '1'
                        event.currentTarget.src = assetUrl(config, config.brochure.placeholderImage)
                        return
                      }
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="bql-tab-row" aria-label="画册篇章">
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              className={`bql-image-button bql-tab bql-tab-${index + 1} ${tab.key === activeNavKey ? 'is-active' : ''}`}
              type="button"
              onClick={() => goToSlide(tab.firstSlideIndex)}
              aria-label={tab.title}
            >
              <span className="bql-tab-text">{tab.title}</span>
            </button>
          ))}
        </div>

        <button className="bql-image-button bql-participate" type="button" onClick={onParticipate}>
          <img src={assetUrl(config, config.home.participateButton)} alt="参与互动" />
        </button>
      </div>
      <audio ref={audioRef} onEnded={handleEnded} preload="auto" />
    </main>
  )
}

function ProfileModal({ initialProfile, visitorId, onClose, onSaved }) {
  const [form, setForm] = useState({
    customerName: initialProfile?.customerName || '',
    phone: initialProfile?.phone || '',
    agentName: initialProfile?.agentName || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    const phone = form.phone.trim()
    if (!form.customerName.trim() || !phone || !form.agentName.trim()) {
      setError('请完整填写信息')
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await onSaved({ ...form, visitorId })
    } catch (err) {
      setError(err?.message || '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalMask>
      <form className="bql-profile-modal" onSubmit={handleSubmit}>
        <button className="bql-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        <h2>参与信息</h2>
        <label>
          <span>客户真实姓名</span>
          <input value={form.customerName} onChange={(event) => update('customerName', event.target.value)} />
        </label>
        <label>
          <span>手机号</span>
          <input value={form.phone} onChange={(event) => update('phone', event.target.value)} inputMode="tel" maxLength={11} />
        </label>
        <label>
          <span>代理人姓名</span>
          <input value={form.agentName} onChange={(event) => update('agentName', event.target.value)} />
        </label>
        {error ? <p className="bql-form-error">{error}</p> : null}
        <button className="bql-primary" type="submit" disabled={submitting}>{submitting ? '提交中...' : '提交并答题'}</button>
      </form>
    </ModalMask>
  )
}

function ModalMask({ children }) {
  const blockMaskEvent = (event) => {
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      className="bql-modal-mask"
      onClick={blockMaskEvent}
      onMouseDown={blockMaskEvent}
      onPointerDown={blockMaskEvent}
      onTouchMove={blockMaskEvent}
    >
      {children}
    </div>
  )
}

function QuizPage({ attempt, answers, currentIndex, onAnswer, onContinue, submitting, error }) {
  const questions = attempt?.questions || []
  const question = questions[currentIndex] || null
  const selected = question ? answers[question.id] || [] : []
  const total = questions.length || 5
  const progress = total > 0 ? Math.min(1, (currentIndex + 1) / total) : 0
  const isLast = currentIndex >= total - 1

  return (
    <main className="bql-stage bql-quiz-stage">
      <section className="bql-panel bql-question-page-panel">
        <div className="bql-progress-card">
          <div className="bql-progress-label">
            题目 <strong>{Math.min(currentIndex + 1, total)}</strong><span>/{total}</span>
          </div>
          <div className="bql-progress-track">
            <div className="bql-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>

        <article className="bql-question-card">
          <div className="bql-stage-kicker">{question?.type === 'multiple' ? '多选题' : '单选题'}</div>
          <h1>{question?.title || '题目加载中...'}</h1>
          <div className="bql-options" role={question?.type === 'multiple' ? 'group' : 'radiogroup'} aria-label="题目选项">
            {(question?.options || []).map((option) => {
              const active = selected.includes(option.key)
              return (
                <button
                  key={option.key}
                  className={`bql-option ${active ? 'is-selected' : ''}`}
                  type="button"
                  disabled={submitting || !question}
                  onClick={() => onAnswer(question, option.key)}
                  aria-pressed={active}
                >
                  <span>{option.key}</span>
                  {option.text}
                </button>
              )
            })}
          </div>
        </article>

        <div className="bql-question-actions">
          <button className="bql-primary" type="button" onClick={onContinue} disabled={submitting || !selected.length}>
            {submitting ? '提交中...' : isLast ? '提交答案' : '下一题'}
          </button>
        </div>
        {error ? <p className="bql-form-error">{error}</p> : null}
      </section>
    </main>
  )
}

function ResultPage({ result, draw, onGoWheel, onOpenPrize, onHome, onRetry, retrying }) {
  const total = result?.totalCount || 5
  const correct = result?.correctCount || 0
  const score = Number(result?.score || 0)
  const wrong = Math.max(0, total - correct)
  const hasDraw = Boolean(draw)
  const hasPrize = Boolean(draw?.won)
  const canDraw = score >= MIN_DRAW_SCORE

  return (
    <main className="bql-stage">
      <section className="bql-panel bql-result-panel bql-phase-like-panel">
        <img className="bql-result-trophy" src={PHASE_WHEEL_ASSETS.resultTrophy} alt="" aria-hidden="true" />
        <h1>{hasPrize ? '抽奖结果已确认' : hasDraw ? '未中奖' : '本次答题完成'}</h1>
        {!hasPrize ? (
          <div className="bql-score-card">
            <div className="bql-score-number">
              <strong>{score}</strong><span>分</span>
            </div>
            <div className="bql-score-meta">
              <span>答对 {correct} 题</span>
              <span>答错 {wrong} 题</span>
            </div>
          </div>
        ) : null}
        <div className="bql-result-actions">
          {!hasDraw && canDraw ? (
            <>
              <button className="bql-primary" type="button" onClick={onGoWheel}>立即抽奖</button>
              <button className="bql-secondary" type="button" onClick={onHome}>返回首页</button>
            </>
          ) : null}
          {!hasDraw && !canDraw ? (
            <>
              <p className="bql-result-tip">答题分数达到60分才可参与抽奖</p>
              <button className="bql-primary" type="button" onClick={onRetry} disabled={retrying}>
                {retrying ? '准备题目中...' : '重新测试'}
              </button>
              <button className="bql-secondary" type="button" onClick={onHome}>返回首页</button>
            </>
          ) : null}
          {hasPrize ? (
            <button className="bql-prize-button" type="button" onClick={onOpenPrize}>我的奖品</button>
          ) : null}
          {hasDraw && !hasPrize ? (
            <button className="bql-secondary" type="button" disabled>当前无可执行操作</button>
          ) : null}
        </div>
      </section>
    </main>
  )
}

function WheelPage({ draw, spinning, targetIndex, spinKey, onDraw, onMyPrizes, onWheelFinish }) {
  const segments = useMemo(() => buildPhaseWheelSegments(), [])

  return (
    <main className="bql-phase-wheel-layout">
      <StageLayout className="bg-[#f5f7fb]">
        <div className="bql-phase-wheel-stage pql-stage relative overflow-hidden bg-[#f5f7fb] text-slate-900">
          <div className="pql-wheel-stage flex-1 px-[32px] pb-[88px] pt-[28px]">
            <section className="relative overflow-hidden rounded-[32px] bg-white px-[32px] py-[36px] text-center shadow-[0_20px_52px_rgba(15,23,42,0.08)]">
              <PhaseWheel
                segments={segments}
                targetIndex={targetIndex}
                drawing={spinning}
                draw={draw}
                spinKey={spinKey}
                assets={PHASE_WHEEL_ASSETS}
                onDraw={onDraw}
                onOpenPrize={onMyPrizes}
                onFinish={onWheelFinish}
              />
            </section>
          </div>
        </div>
      </StageLayout>
    </main>
  )
}

function MyPrizesModal({ config, prizes, onClose }) {
  return (
    <ModalMask>
      <section className="bql-profile-modal bql-prize-modal">
        <button className="bql-close" type="button" onClick={onClose} aria-label="关闭">×</button>
        <h2>我的奖品</h2>
        {prizes.length ? (
          <div className="bql-prize-list">
            {prizes.map((prize) => (
              <div className="bql-prize-item" key={prize.id}>
                <img src={getPrizeImageUrl(config, prize)} alt="" aria-hidden="true" />
                <em>{prize.prizeLevel || '中奖'}</em>
                <strong>{prize.prizeName || '奖品待公布'}</strong>
                <small>请联系中英人寿服务人员领取</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="bql-empty">暂无中奖记录</p>
        )}
      </section>
    </ModalMask>
  )
}

function DebugPanel({
  enabled,
  activityKey,
  view,
  attempt,
  draw,
  debugAccess,
  onResetMine,
  onResetAll,
  onGoQuiz,
  onLogState,
}) {
  if (!enabled) return null

  return (
    <div className="bql-debug-panel">
      <div className="bql-debug-title">DEBUG</div>
      <div className="bql-debug-meta">
        <div>activityKey: {activityKey || '-'}</div>
        <div>view: {view || '-'}</div>
        <div>attemptId: {attempt?.id || '-'}</div>
        <div>drawId: {draw?.id || '-'}</div>
        <div>identity: {debugAccess?.identityKey || '-'}</div>
      </div>
      <div className="bql-debug-actions">
        <button type="button" onClick={onResetMine}>重置我的测试数据</button>
        {debugAccess?.allowActivityReset ? (
          <button className="is-danger" type="button" onClick={onResetAll}>重置全部测试数据</button>
        ) : null}
        <button className="is-dark" type="button" onClick={onGoQuiz}>回到答题页</button>
        <button className="is-light" type="button" onClick={onLogState}>console.log 当前状态</button>
      </div>
    </div>
  )
}

export default function BrochureQuizLotteryApp({ routeParams }) {
  const tokenFromUrl = getTokenFromUrl()
  if (tokenFromUrl) {
    setToken(tokenFromUrl)
    window.location.replace(sanitizeUrlForWechat(window.location.href))
    return null
  }

  return <BrochureQuizLotteryMain routeParams={routeParams} />
}

function BrochureQuizLotteryMain({ routeParams }) {
  const activityKey = normalizeActivityKey(routeParams)
  const visitorId = useMemo(() => getVisitorId(), [])
  const [publicConfig, setPublicConfig] = useState(null)
  const [profile, setProfile] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [result, setResult] = useState(null)
  const [draw, setDraw] = useState(null)
  const [view, setView] = useState('home')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [profileOpen, setProfileOpen] = useState(false)
  const [myPrizesOpen, setMyPrizesOpen] = useState(false)
  const [myPrizes, setMyPrizes] = useState([])
  const [activityState, setActivityState] = useState('')
  const [activityWindow, setActivityWindow] = useState(null)
  const [availablePoolCount, setAvailablePoolCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('加载中...')
  const [error, setError] = useState('')
  const [quizError, setQuizError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [wheelSpinKey, setWheelSpinKey] = useState('')
  const [wheelTargetIndex, setWheelTargetIndex] = useState(null)
  const [debugAccess, setDebugAccess] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const toastTimerRef = useRef(null)
  const config = useMemo(() => mergeBrochureConfig(publicConfig), [publicConfig])
  const { authReady, blockedMessage } = useWechatAuth(activityKey, publicConfig)
  const defaultShareImage = assetUrl(config, config.home.logo)
  const shareActivity = useMemo(() => {
    if (!publicConfig) return null
    return {
      ...publicConfig,
      shareTitle: publicConfig.shareTitle || publicConfig.title || '中英人寿互动答题',
      shareDesc: publicConfig.shareDesc ?? '',
      shareImage: publicConfig.shareImage || defaultShareImage,
    }
  }, [defaultShareImage, publicConfig])
  const bgmConfig = publicConfig?.bgmConfig || publicConfig?.mobileConfig?.bgm
  const bgmEnabled = Boolean(bgmConfig?.enabled && bgmConfig?.url)
  const showLoading = loading || (publicConfig && !authReady && !blockedMessage)
  const newParticipationBlockedMessage = useMemo(
    () => resolveNewParticipationBlock({ activityState, activityWindow, availablePoolCount }),
    [activityState, activityWindow, availablePoolCount],
  )

  const handleWechatShareStatus = useCallback((status) => {
    if (status?.wxConfigStatus === 'failed' || status?.signatureStatus === 'failed' || status?.wxScriptLoadStatus === 'failed') {
      console.warn('[brochure-quiz-lottery-share] setup failed', status)
    }
  }, [])

  useWechatShare(activityKey, shareActivity, handleWechatShareStatus)

  const showCenteredToast = useCallback((message) => {
    const text = String(message || '').trim()
    if (!text) return
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToastMessage(text)
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage('')
      toastTimerRef.current = null
    }, 1500)
  }, [])

  const blockToastEvent = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
  }, [])

  useEffect(() => {
    let cancelled = false
    getPublicConfig(activityKey)
      .then((publicData) => {
        if (cancelled) return
        setPublicConfig(publicData)
        document.title = publicData?.title || '中英人寿互动答题'
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || '项目加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activityKey])

  useEffect(() => {
    if (!activityKey || !visitorId || !publicConfig || !authReady) return
    let cancelled = false
    getBootstrap(activityKey, visitorId)
      .then((bootstrap) => {
        if (cancelled) return
        setProfile(bootstrap.profile)
        setAttempt(bootstrap.attempt)
        setResult(bootstrap.result)
        setDraw(bootstrap.draw)
        setMyPrizes(bootstrap.myPrizes || [])
        setActivityState(bootstrap.state || '')
        setActivityWindow(bootstrap.activity?.activityWindow || null)
        setAvailablePoolCount(bootstrap.availablePoolCount ?? null)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || '项目加载失败')
      })
    return () => {
      cancelled = true
    }
  }, [activityKey, authReady, publicConfig, visitorId])

  useEffect(() => {
    trackPageView(activityKey, '/brochure-quiz-lottery', {
      activityType: BROCHURE_QUIZ_LOTTERY_ACTIVITY_TYPE,
    })
  }, [activityKey])

  useEffect(() => {
    if (!isDebugRequested || !activityKey || !visitorId) return
    let cancelled = false
    getDebugAccess(activityKey, visitorId)
      .then((data) => {
        if (!cancelled) setDebugAccess(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setDebugAccess(null)
          console.warn('[brochure-quiz-lottery debug access]', err)
        }
      })
    return () => {
      cancelled = true
    }
  }, [activityKey, visitorId])

  useEffect(() => {
    if (!bgmEnabled) return
    activityAudioService.setConfig(bgmConfig, { activityKey })
  }, [activityKey, bgmConfig, bgmEnabled])

  useEffect(() => {
    if (!bgmEnabled || !activityKey) return undefined

    let unlocked = false
    const unlockBgm = () => {
      if (unlocked) return
      const state = activityAudioService.getState()
      activityAudioService.setConfig(bgmConfig, { activityKey })
      if (state.playing && !state.mutedAutoplay) {
        unlocked = true
        return
      }
      if (state.mutedAutoplay) {
        activityAudioService.restoreAudibleElementState('brochure-first-gesture')
      } else {
        activityAudioService.toggle('brochure-first-gesture')
      }
      window.setTimeout(() => {
        const nextState = activityAudioService.getState()
        unlocked = Boolean(nextState.playing && !nextState.mutedAutoplay)
      }, 300)
    }

    window.addEventListener('touchstart', unlockBgm, { capture: true, passive: true })
    window.addEventListener('pointerdown', unlockBgm, { capture: true })
    window.addEventListener('click', unlockBgm, { capture: true })

    return () => {
      window.removeEventListener('touchstart', unlockBgm, { capture: true, passive: true })
      window.removeEventListener('pointerdown', unlockBgm, { capture: true })
      window.removeEventListener('click', unlockBgm, { capture: true })
    }
  }, [activityKey, bgmConfig, bgmEnabled])

  const resetLocalState = () => {
    setProfile(null)
    setAttempt(null)
    setResult(null)
    setDraw(null)
    setMyPrizes([])
    setActivityState('')
    setActivityWindow(null)
    setAvailablePoolCount(null)
    setAnswers({})
    setCurrentQuestionIndex(0)
    setQuizError('')
    setToastMessage('')
    setSpinning(false)
    setWheelSpinKey('')
    setWheelTargetIndex(null)
    setView('home')
  }

  const enterInteraction = async () => {
    if (draw) {
      setView('result')
      return
    }
    if (result || attempt?.status === 'submitted') {
      setView('result')
      return
    }
    if (attempt?.status === 'in_progress') {
      setView('quiz')
      return
    }
    if (newParticipationBlockedMessage) {
      showCenteredToast(newParticipationBlockedMessage)
      return
    }
    if (!profile) {
      setProfileOpen(true)
      return
    }
    try {
      const data = await startAttempt(activityKey, { visitorId })
      setAttempt(data.attempt)
      setAnswers({})
      setCurrentQuestionIndex(0)
      setView(data.attempt?.status === 'submitted' ? 'result' : 'quiz')
    } catch (err) {
      if (isActivityWindowError(err)) {
        showCenteredToast(err.message)
        return
      }
      setError(err?.message || '开始答题失败，请重试')
    }
  }

  const handleProfileSaved = async (data) => {
    const saved = await saveProfile(activityKey, data)
    setProfile(saved.profile)
    setProfileOpen(false)
    const started = await startAttempt(activityKey, { visitorId })
    setAttempt(started.attempt)
    setAnswers({})
    setCurrentQuestionIndex(0)
    setView(started.attempt?.status === 'submitted' ? 'result' : 'quiz')
  }

  const handleAnswer = (question, optionKey) => {
    setQuizError('')
    setAnswers((prev) => {
      const selected = prev[question.id] || []
      if (question.type === 'multiple') {
        return {
          ...prev,
          [question.id]: selected.includes(optionKey)
            ? selected.filter((item) => item !== optionKey)
            : [...selected, optionKey],
        }
      }
      return { ...prev, [question.id]: [optionKey] }
    })
  }

  const handleSubmit = async () => {
    const questions = attempt?.questions || []
    const incomplete = questions.some((question) => !(answers[question.id] || []).length)
    if (incomplete) {
      setQuizError('请完成所有题目')
      return
    }
    setSubmitting(true)
    setQuizError('')
    try {
      const payload = {
        visitorId,
        answers: questions.map((question) => ({
          questionId: question.id,
          answers: answers[question.id] || [],
        })),
      }
      const data = await submitAttempt(activityKey, attempt.id, payload)
      setResult(data.result)
      setAttempt((prev) => ({ ...prev, ...data.result }))
      setView('result')
    } catch (err) {
      setQuizError(err?.message || '提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuestionContinue = () => {
    const questions = attempt?.questions || []
    const question = questions[currentQuestionIndex]
    if (!question || !(answers[question.id] || []).length) {
      setQuizError('请选择答案')
      return
    }
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((index) => index + 1)
      setQuizError('')
      return
    }
    handleSubmit()
  }

  const handleRetry = async () => {
    if (newParticipationBlockedMessage) {
      showCenteredToast(newParticipationBlockedMessage)
      setView('result')
      return
    }
    setRetrying(true)
    setQuizError('')
    setError('')
    try {
      const data = await startAttempt(activityKey, { visitorId })
      setAttempt(data.attempt)
      setResult(null)
      setDraw(null)
      setAnswers({})
      setCurrentQuestionIndex(0)
      setSpinning(false)
      setWheelSpinKey('')
      setWheelTargetIndex(null)
      setView(data.attempt?.status === 'submitted' ? 'result' : 'quiz')
    } catch (err) {
      if (isActivityWindowError(err)) {
        showCenteredToast(err.message)
        setView('result')
        return
      }
      setError(err?.message || '重新测试失败，请重试')
    } finally {
      setRetrying(false)
    }
  }

  const handleDraw = async () => {
    if (!result?.id && !attempt?.id) return
    const score = Number((result || attempt)?.score || 0)
    if (score < MIN_DRAW_SCORE) {
      setView('result')
      return
    }
    setSpinning(true)
    try {
      const requestId = `bql_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const data = await drawPrize(activityKey, result?.id || attempt.id, { visitorId, requestId })
      setDraw(data.draw)
      setWheelTargetIndex(resolveWheelTargetIndex(data.draw))
      setWheelSpinKey(`bql-wheel-${Date.now()}`)
      trackEvent({
        activityKey,
        eventType: 'brochure_quiz_lottery_draw',
        page: '/brochure-quiz-lottery',
        extra: { activityType: BROCHURE_QUIZ_LOTTERY_ACTIVITY_TYPE, won: Boolean(data.draw?.won) },
      })
    } catch (err) {
      setSpinning(false)
      if (isActivityWindowError(err)) {
        showCenteredToast(err.message)
        setView('result')
        return
      }
      setError(err?.message || '抽奖失败，请重试')
    }
  }

  const handleWheelFinish = () => {
    setSpinning(false)
    setView('result')
    if (draw?.won) {
      openMyPrizes()
    }
  }

  const openMyPrizes = async () => {
    const data = await getMyPrizes(activityKey, visitorId)
    setMyPrizes(data.prizes || [])
    setMyPrizesOpen(true)
  }

  const handleDebugResetMine = async () => {
    if (!debugAccess?.canDebug) return
    setLoadingText('正在重置我的测试数据...')
    setLoading(true)
    try {
      const data = await resetDebugData(activityKey, {
        visitorId,
        confirmToken: DEBUG_RESET_TOKEN,
        scope: 'me',
      })
      console.log('[brochure-quiz-lottery debug reset mine]', data)
      resetLocalState()
    } catch (err) {
      setError(err?.message || '重置失败')
    } finally {
      setLoading(false)
      setLoadingText('加载中...')
    }
  }

  const handleDebugResetAll = async () => {
    if (!debugAccess?.canDebug || !debugAccess?.allowActivityReset) return
    if (!window.confirm('确认重置全部测试数据？会清空本活动所有用户的提交信息、答题和抽奖记录，并恢复奖池。')) return
    setLoadingText('正在重置全部测试数据...')
    setLoading(true)
    try {
      const data = await resetDebugData(activityKey, {
        visitorId,
        confirmToken: DEBUG_RESET_TOKEN,
        scope: 'activity',
      })
      console.log('[brochure-quiz-lottery debug reset all]', data)
      resetLocalState()
    } catch (err) {
      setError(err?.message || '重置全部数据失败')
    } finally {
      setLoading(false)
      setLoadingText('加载中...')
    }
  }

  const handleDebugGoQuiz = () => {
    if (!debugAccess?.canDebug || !attempt || attempt.status === 'submitted') return
    setCurrentQuestionIndex(0)
    setView('quiz')
  }

  const handleDebugLogState = () => {
    console.log('[brochure-quiz-lottery debug state]', {
      activityKey,
      visitorId,
      view,
      profile,
      attempt,
      result,
      draw,
      answers,
      currentQuestionIndex,
      myPrizes,
      debugAccess,
      activityState,
      activityWindow,
      availablePoolCount,
    })
  }

  const backgroundStyle = buildBackgroundStyle(config)

  if (showLoading) return <div className="bql-loading" style={backgroundStyle}>{loadingText}</div>
  if (blockedMessage) {
    return (
      <main className="bql-blocked" style={backgroundStyle}>
        <p>{blockedMessage}</p>
      </main>
    )
  }
  if (error) {
    return (
      <main className="bql-stage" style={backgroundStyle}>
        <section className="bql-panel">
          <h1>项目加载失败</h1>
          <p className="bql-form-error">{error}</p>
        </section>
      </main>
    )
  }

  return (
    <div className="bql-app" style={backgroundStyle}>
      {view === 'home' ? (
        <HomeCanvas
          config={config}
          currentSlide={currentSlide}
          onSlide={setCurrentSlide}
          onParticipate={enterInteraction}
          autoplaySlideAudio
          bgmEnabled={bgmEnabled}
        />
      ) : null}
      {view === 'quiz' ? (
        <QuizPage
          attempt={attempt}
          answers={answers}
          currentIndex={currentQuestionIndex}
          onAnswer={handleAnswer}
          onContinue={handleQuestionContinue}
          submitting={submitting}
          error={quizError}
        />
      ) : null}
      {view === 'result' ? (
        <ResultPage
          result={result || attempt}
          draw={draw}
          onGoWheel={() => setView('wheel')}
          onOpenPrize={openMyPrizes}
          onHome={() => setView('home')}
          onRetry={handleRetry}
          retrying={retrying}
        />
      ) : null}
      {view === 'wheel' ? (
        <WheelPage
          draw={draw}
          spinning={spinning}
          targetIndex={wheelTargetIndex}
          spinKey={wheelSpinKey}
          onDraw={handleDraw}
          onMyPrizes={openMyPrizes}
          onWheelFinish={handleWheelFinish}
        />
      ) : null}
      {profileOpen ? (
        <ProfileModal
          initialProfile={profile}
          visitorId={visitorId}
          onClose={() => setProfileOpen(false)}
          onSaved={handleProfileSaved}
        />
      ) : null}
      {myPrizesOpen ? <MyPrizesModal config={config} prizes={myPrizes} onClose={() => setMyPrizesOpen(false)} /> : null}
      <DebugPanel
        enabled={Boolean(isDebugRequested && debugAccess?.canDebug)}
        activityKey={activityKey}
        view={view}
        attempt={attempt}
        draw={draw}
        debugAccess={debugAccess}
        onResetMine={handleDebugResetMine}
        onResetAll={handleDebugResetAll}
        onGoQuiz={handleDebugGoQuiz}
        onLogState={handleDebugLogState}
      />
      {bgmEnabled ? <ActivityBgmPlayer bgm={bgmConfig} activityKey={activityKey} /> : null}
      {toastMessage ? (
        <div
          className="bql-toast-layer"
          role="status"
          aria-live="polite"
          onClick={blockToastEvent}
          onMouseDown={blockToastEvent}
          onPointerDown={blockToastEvent}
          onTouchMove={blockToastEvent}
        >
          <div className="bql-toast-message">{toastMessage}</div>
        </div>
      ) : null}
    </div>
  )
}
