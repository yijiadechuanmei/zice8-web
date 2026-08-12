import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { setToken } from '../../shared/api/request'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { activityAudioService } from '../../shared/audio/activityAudioService'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import {
  createAuthorization,
  drawPrize,
  getDebugState,
  getDrawAvailability,
  getDrawStatus,
  getBootstrap,
  getPublicConfig,
  previewAnswer,
  resetDebugData,
  submitAnswer,
  syncAuthorization,
  syncPayout,
} from './api'
import {
  NANHAI_ART,
  NANHAI_INSPECTION_CHALLENGE_TITLE,
  nanhaiAsset,
} from './config'
import './styles.css'

const FALLBACK_SEGMENTS = [
  { label: '谢谢参与', amount: 0, probability: 30 },
  { label: '0.28元红包', amount: 28, probability: 50 },
  { label: '0.38元红包', amount: 38, probability: 10 },
  { label: '0.68元红包', amount: 68, probability: 4 },
  { label: '0.88元红包', amount: 88, probability: 3 },
  { label: '1.28元红包', amount: 128, probability: 2 },
  { label: '1.88元红包', amount: 188, probability: 1 },
]

// 新整盘从顶部“谢谢参与”开始顺时针共七个扇区。索引是抽奖结果的唯一落位依据：
// 后端保存的 wheelStopIndex 与这里一一对应，不能再由金额反推，避免库存、未中奖等
// 没有金额的结果沿用上一轮指针位置。
const WHEEL_POINTER_ANGLE_BY_STOP_INDEX = [
  0,
  360 / 7,
  360 / 7 * 2,
  360 / 7 * 3,
  360 / 7 * 4,
  360 / 7 * 5,
  360 / 7 * 6,
]

const WHEEL_STOP_INDEX_BY_AMOUNT = {
  0: 0,
  28: 1,
  38: 2,
  68: 3,
  88: 4,
  128: 5,
  188: 6,
}

const DRAW_STATUS_POLL_LIMIT = 5
const DRAW_STATUS_POLL_INTERVAL_MS = 1800

const NANHAI_BGM = {
  enabled: true,
  url: NANHAI_ART.home.audio,
  loop: true,
  autoplay: true,
  showControl: true,
  volume: 0.58,
}

function NanhaiAudioControl({ bgm }) {
  const [audioState, setAudioState] = useState(() => activityAudioService.getState())
  const enabled = Boolean(bgm?.enabled && bgm?.url)
  const audible = audioState.playing && !audioState.mutedAutoplay

  useEffect(() => activityAudioService.subscribe(setAudioState), [])

  if (!enabled) return null

  function toggleAudio() {
    if (audioState.mutedAutoplay) {
      activityAudioService.play('nanhai-audio-control', { manual: true, forcePrepare: true })
      return
    }
    activityAudioService.toggle('nanhai-audio-control')
  }

  return (
    <button
      type="button"
      className={`nh-audio-control ${audible ? 'is-playing' : 'is-muted'}`}
      onClick={toggleAudio}
      aria-label={audible ? '关闭背景音乐' : '打开背景音乐'}
      aria-pressed={audible}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5v5h4l5 4V5.5l-5 4H4Z" />
        {audible ? (
          <>
            <path d="M16 9a4 4 0 0 1 0 6" />
            <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
          </>
        ) : <path d="m16 9 5 5m0-5-5 5" />}
      </svg>
      <span className="nh-audio-control__label">{audible ? '音乐已开' : '音乐已关'}</span>
    </button>
  )
}

export default function NanhaiInspectionChallenge({ routeParams }) {
  const tokenFromUrl = getTokenFromUrl()
  if (tokenFromUrl) {
    setToken(tokenFromUrl)
    window.location.replace(sanitizeUrlForWechat(window.location.href))
    return null
  }
  return <NanhaiInspectionChallengeMain routeParams={routeParams} />
}

function NanhaiInspectionChallengeMain({ routeParams }) {
  const activityKey = routeParams?.activityKey || ''
  const debugMode = new URLSearchParams(window.location.search).has('debug')
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [previewSeenQuestionCodes, setPreviewSeenQuestionCodes] = useState({})
  const [page, setPage] = useState('home')
  const [activeLevel, setActiveLevel] = useState(null)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(null)
  const [selectedOption, setSelectedOption] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [wheelRotation, setWheelRotation] = useState(0)
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [pageTransitioning, setPageTransitioning] = useState(false)
  const [levelAdvanceToast, setLevelAdvanceToast] = useState('')
  const [shareGuideOpen, setShareGuideOpen] = useState(false)
  const [debugPanelOpen, setDebugPanelOpen] = useState(false)
  const [debugState, setDebugState] = useState(null)
  const pageTransitionTimer = useRef(null)
  const levelAdvanceTimer = useRef(null)
  const wheelSpinFrame = useRef(null)
  const wheelSpinRotation = useRef(0)
  const canceledAuthorizationNo = useRef(null)

  const shareActivity = useMemo(() => ({
    title: bootstrap?.activity?.shareTitle || NANHAI_INSPECTION_CHALLENGE_TITLE,
    shareTitle: bootstrap?.activity?.shareTitle || NANHAI_INSPECTION_CHALLENGE_TITLE,
    shareDesc: bootstrap?.activity?.shareDesc || '巡检幸福南海，学习工伤预防知识',
    shareImage: bootstrap?.activity?.shareImage || bootstrap?.config?.shareImage,
  }), [bootstrap])
  useWechatShare(activityKey, shareActivity)
  // 正式链接和 debug 链接都必须使用真实微信身份；debug 只决定是否展示
  // 服务端白名单调试面板，不再把正式链接降级成无身份预览。
  const { authReady, blockedMessage, hasToken, reauth } = useWechatAuth(activityKey, publicConfig)
  const readyToBootstrap = authReady

  useEffect(() => {
    let alive = true
    getPublicConfig(activityKey)
      .then((data) => alive && setPublicConfig(data))
      .catch((err) => alive && setError(readError(err, '活动配置加载失败')))
    return () => { alive = false }
  }, [activityKey])

  useEffect(() => {
    if (!readyToBootstrap) return undefined
    let alive = true
    getBootstrap(activityKey, debugMode)
      .then((data) => {
        if (!alive) return
        setBootstrap(data)
        setPreviewSeenQuestionCodes(buildPreviewSeenQuestionCodes(data.levels))
        if (data.state === 'lottery') setPage('success')
      })
      .catch((err) => {
        if (!alive) return
        const message = readError(err, '活动加载失败')
        const identityRejected = /真实参与模式需要微信登录|微信用户与活动帐号不匹配|Invalid token payload/i.test(message)
        if (identityRejected && reauth(hasToken ? 'nanhai-token-mismatch' : 'nanhai-missing-token')) return
        setError(message)
      })
    trackPageView(activityKey, '/nanhai-inspection-challenge', {
      activityType: 'nanhai_inspection_challenge',
    })
    return () => { alive = false }
  }, [activityKey, debugMode, hasToken, readyToBootstrap, reauth])

  useEffect(() => () => {
    window.clearTimeout(pageTransitionTimer.current)
    window.clearTimeout(levelAdvanceTimer.current)
    if (wheelSpinFrame.current) window.cancelAnimationFrame(wheelSpinFrame.current)
  }, [])

  const progress = bootstrap?.progress
  const preview = Boolean(bootstrap?.preview)
  const correctCodes = new Set(progress?.correctQuestionCodes || [])
  const segments = bootstrap?.config?.wheelSegments || FALLBACK_SEGMENTS
  const bgmConfig = publicConfig?.bgmConfig || publicConfig?.mobileConfig?.bgm || NANHAI_BGM
  const bgmPlayerConfig = useMemo(() => ({ ...bgmConfig, showControl: false }), [bgmConfig])

  function navigate(nextPage) {
    if (nextPage === page || pageTransitioning) return
    setPageTransitioning(true)
    window.clearTimeout(pageTransitionTimer.current)
    pageTransitionTimer.current = window.setTimeout(() => {
      setPage(nextPage)
      setPageTransitioning(false)
    }, 220)
  }

  function startWheelSpin() {
    if (wheelSpinFrame.current) window.cancelAnimationFrame(wheelSpinFrame.current)
    const startedAt = window.performance.now()
    const initialRotation = wheelSpinRotation.current
    setWheelSpinning(true)
    const tick = (now) => {
      // 用同一条实时角度轨迹驱动快转。停止时从当前实际角度继续向前缓停，
      // 避免移除 CSS 无限动画后回到旧角度、再倒退到“谢谢参与”。
      const rotation = initialRotation + (now - startedAt) * 0.9
      wheelSpinRotation.current = rotation
      setWheelRotation(rotation)
      wheelSpinFrame.current = window.requestAnimationFrame(tick)
    }
    wheelSpinFrame.current = window.requestAnimationFrame(tick)
  }

  function stopWheelAt(wheelStopIndex) {
    if (wheelSpinFrame.current) window.cancelAnimationFrame(wheelSpinFrame.current)
    wheelSpinFrame.current = null
    setWheelSpinning(false)
    const rotation = spinPointerToStopIndex(wheelSpinRotation.current, wheelStopIndex)
    wheelSpinRotation.current = rotation
    setWheelRotation(rotation)
  }

  function stopWheelSpin() {
    if (wheelSpinFrame.current) window.cancelAnimationFrame(wheelSpinFrame.current)
    wheelSpinFrame.current = null
    setWheelSpinning(false)
  }

  function openScene(level) {
    if (!isLevelAvailable(level, progress)) {
      setError('请先完成上一关')
      return
    }
    setActiveLevel(level)
    window.clearTimeout(levelAdvanceTimer.current)
    setLevelAdvanceToast('')
    navigate('scene')
    trackEvent(activityKey, 'level_open', { levelNo: level.levelNo })
  }

  function openQuestion(index) {
    if (!activeLevel) return
    setActiveQuestionIndex(index)
    setSelectedOption('')
    setFeedback(null)
    setError('')
    trackEvent(activityKey, 'question_open', {
      levelNo: activeLevel.levelNo,
      questionCode: activeLevel.questions[index]?.code,
    })
  }

  function handlePreviewCompleteAll() {
    if (!preview) return
    setBootstrap((current) => ({
      ...current,
      progress: buildPreviewCompletedProgress(current),
    }))
    setActiveLevel(null)
    setActiveQuestionIndex(null)
    navigate('success')
    trackEvent(activityKey, 'preview_complete_all', { activityType: 'nanhai_inspection_challenge' })
  }

  function reviewChallenge() {
    if (pageTransitioning) return
    setPageTransitioning(true)
    window.clearTimeout(pageTransitionTimer.current)
    pageTransitionTimer.current = window.setTimeout(() => {
      setBootstrap((current) => ({
        ...current,
        reviewMode: true,
        levels: current.reviewLevels || current.levels,
        progress: {
          ...current.progress,
          currentLevel: 5,
          completedLevels: 5,
          status: 'completed',
          correctQuestionCodes: (current.reviewLevels || current.levels || [])
            .flatMap((level) => level.questions.map((question) => question.code)),
        },
      }))
      setActiveLevel(null)
      setActiveQuestionIndex(null)
      setFeedback(null)
      setSelectedOption('')
      setPage('map')
      setPageTransitioning(false)
    }, 220)
    trackEvent(activityKey, 'challenge_review', { activityType: 'nanhai_inspection_challenge' })
  }

  async function handleAnswer() {
    const question = activeLevel?.questions?.[activeQuestionIndex]
    if (!question || !selectedOption || busy) return
    setBusy('answer')
    try {
      // 审核链接的“再次复习”会展示本关全部 6 个点位；预览接口仍以 2 个
      // 活动题位为一组校验。因此按本次点击题目动态带上它和一个辅助题位，
      // 而不是把展示中的全部点位误传为当前活动题位。
      const previewActiveQuestionCodes = preview
        ? buildPreviewActiveQuestionCodes(activeLevel, activeQuestionIndex)
        : []
      const payload = {
        questionCode: question.code,
        selectedOption,
        requestId: createRequestId('answer'),
        ...(preview ? {
          shownQuestionCodes: previewSeenQuestionCodes[activeLevel.levelNo] || activeLevel.questions.map((item) => item.code),
          activeQuestionCodes: previewActiveQuestionCodes,
          correctQuestionCodes: previewActiveQuestionCodes.filter((code) => correctCodes.has(code)),
        } : {}),
      }
      const result = preview
        ? await previewAnswer(activityKey, activeLevel.levelNo, payload)
        : await submitAnswer(activityKey, activeLevel.levelNo, payload, debugMode)
      const reviewing = Boolean(bootstrap?.reviewMode)
      const nextPreviewProgress = preview && !reviewing
        ? buildPreviewProgress(bootstrap, result.correct ? question.code : null, !result.correct)
        : null
      const nextCorrectQuestionCodes = result.correct
        ? Array.from(new Set([...(progress?.correctQuestionCodes || []), question.code]))
        : (progress?.correctQuestionCodes || [])
      // 复习模式的 6 个点位都必须继续保留；接口返回的 2 道随机题仅用于
      // 正常闯关时替换错误题，不能覆盖复习地图。
      const nextLevelQuestions = !reviewing && Array.isArray(result.levelQuestions) && result.levelQuestions.length === 2
        ? result.levelQuestions
        : activeLevel.questions
      const nextActiveLevel = { ...activeLevel, questions: nextLevelQuestions }
      const justUnlockedQuestion = result.correct && !correctCodes.has(question.code)
      const completedCurrentLevel = justUnlockedQuestion && activeLevel.questions.every(
        (item) => nextCorrectQuestionCodes.includes(item.code),
      )
      const completedAll = completedCurrentLevel && activeLevel.levelNo === 5
      setBootstrap((current) => ({
        ...current,
        levels: current.levels.map((level) => (
          level.levelNo === activeLevel.levelNo
            ? { ...level, questions: nextLevelQuestions }
            : level
        )),
        progress: {
          ...current.progress,
          ...(nextPreviewProgress || (!reviewing ? result.progress : {})),
          correctQuestionCodes: preview
            ? (nextPreviewProgress?.correctQuestionCodes || current.progress.correctQuestionCodes)
            : nextCorrectQuestionCodes,
        },
      }))
      setActiveLevel(nextActiveLevel)
      if (preview && !result.correct) {
        setPreviewSeenQuestionCodes((current) => ({
          ...current,
          [activeLevel.levelNo]: Array.from(new Set([
            ...(current[activeLevel.levelNo] || activeLevel.questions.map((item) => item.code)),
            ...nextLevelQuestions.map((item) => item.code),
          ])),
        }))
      }
      if (completedCurrentLevel) {
        setFeedback(null)
        setSelectedOption('')
        setActiveQuestionIndex(null)
        const message = completedAll ? '恭喜完成全部关卡，闯关成功！' : '闯关成功，进入下一关'
        setLevelAdvanceToast(message)
        window.clearTimeout(levelAdvanceTimer.current)
        levelAdvanceTimer.current = window.setTimeout(() => {
          setLevelAdvanceToast('')
          if (completedAll) {
            setActiveLevel(null)
            navigate('success')
            return
          }
          const nextLevel = bootstrap?.levels?.find((level) => level.levelNo === activeLevel.levelNo + 1)
          if (nextLevel) {
            scrollSceneToTop()
            setActiveLevel(nextLevel)
            window.requestAnimationFrame(scrollSceneToTop)
          }
        }, 1500)
      }
      if (!completedCurrentLevel) {
        setFeedback({
          correct: result.correct,
          explanation: result.explanation,
          completedAll,
          completedCurrentLevel,
        })
      }
      trackEvent(activityKey, 'question_answer', {
        levelNo: activeLevel.levelNo,
        questionCode: question.code,
        correct: result.correct,
      })
    } catch (err) {
      setError(readError(err, '提交答案失败'))
    } finally {
      setBusy('')
    }
  }

  function closeFeedback() {
    const shouldGuideToNextPin = feedback?.correct && !bootstrap?.reviewMode
    setFeedback(null)
    setSelectedOption('')
    setActiveQuestionIndex(null)
    if (shouldGuideToNextPin) {
      setLevelAdvanceToast('手动滑动画面继续寻找其他安全隐患')
      window.clearTimeout(levelAdvanceTimer.current)
      levelAdvanceTimer.current = window.setTimeout(() => setLevelAdvanceToast(''), 2600)
    }
  }

  function returnToMap() {
    window.clearTimeout(levelAdvanceTimer.current)
    setLevelAdvanceToast('')
    setActiveQuestionIndex(null)
    setFeedback(null)
    navigate('map')
  }

  async function resolveAuthorizationForDraw() {
    setBusy('authorization-check')
    try {
      const latestBootstrap = await getBootstrap(activityKey, debugMode)
      setBootstrap(latestBootstrap)
      if (!latestBootstrap.authorization) return null

      const authorization = await syncAuthorization(activityKey, debugMode)
      setBootstrap((current) => ({ ...current, authorization }))
      return authorization
    } finally {
      setBusy('')
    }
  }

  async function handleAuthorization(existingAuthorization = null, force = false) {
    if (busy && !force) return
    setBusy('authorization')
    setError('')
    let authorization = existingAuthorization
    try {
      // 已有待确认授权时复用同一笔微信授权，避免每次点击都新建一笔并占用场景名额。
      const renewCanceledAuthorization = Boolean(
        authorization?.outAuthorizationNo
        && authorization.outAuthorizationNo === canceledAuthorizationNo.current,
      )
      // 待确认单必须带微信 package 才能重新拉起；缺失时交给后端关闭
      // 这笔异常原单后再新建，避免前端反复报“微信未返回授权参数”。
      if (!authorization || authorization.state !== 'WAIT_USER_CONFIRM' || !authorization.packageInfo || renewCanceledAuthorization) {
        authorization = await createAuthorization(activityKey, debugMode, renewCanceledAuthorization)
        canceledAuthorizationNo.current = null
      }
      setBootstrap((current) => ({ ...current, authorization }))
      if (!authorization.effective) {
        if (!authorization.packageInfo) throw new Error('微信未返回授权参数')
        await invokeMerchantTransferAuthorization(authorization)
        await wait(900)
        authorization = await syncAuthorization(activityKey, debugMode)
        setBootstrap((current) => ({ ...current, authorization }))
      }
      if (!authorization.effective) {
        if (authorization.state === 'WAIT_USER_CONFIRM') {
          setLevelAdvanceToast('授权状态同步中，请稍后再次点击抽奖')
          window.clearTimeout(levelAdvanceTimer.current)
          levelAdvanceTimer.current = window.setTimeout(() => setLevelAdvanceToast(''), 2200)
          return
        }
        throw new Error(`授权状态：${authorization.state}`)
      }
      setLevelAdvanceToast('授权完成，请再次点击抽奖')
      window.clearTimeout(levelAdvanceTimer.current)
      levelAdvanceTimer.current = window.setTimeout(() => setLevelAdvanceToast(''), 2200)
    } catch (err) {
      if (isMerchantTransferAuthorizationCanceled(err)) {
        // 用户关闭微信授权页是可预期行为。先尝试同步原单；下次点击会以
        // renew=1 让后端关闭原待确认单后再创建，避免复用已取消的 package。
        canceledAuthorizationNo.current = authorization?.outAuthorizationNo || null
        try {
          await wait(700)
          const synced = await syncAuthorization(activityKey, debugMode)
          setBootstrap((current) => ({ ...current, authorization: synced }))
        } catch {
          // 回调可能尚未到达；保留本次取消标记，下次点击仍会安全更新原授权单。
        }
        setLevelAdvanceToast('已取消授权，再次点击抽奖可重新发起授权')
        window.clearTimeout(levelAdvanceTimer.current)
        levelAdvanceTimer.current = window.setTimeout(() => setLevelAdvanceToast(''), 2600)
        return
      }
      setError(readError(err, '微信零钱转账授权失败'))
    } finally {
      setBusy('')
    }
  }

  async function waitForFinalDraw(initialResult) {
    let result = initialResult
    for (let attempt = 0; result && !result.final && attempt < DRAW_STATUS_POLL_LIMIT; attempt += 1) {
      await wait(DRAW_STATUS_POLL_INTERVAL_MS)
      result = await getDrawStatus(activityKey, debugMode)
      if (result) setBootstrap((current) => ({ ...current, draw: result }))
    }
    return result
  }

  async function handleDraw() {
    if (busy || wheelSpinning) return
    if (preview) {
      const prize = pickPreviewSegment(segments)
      const won = Number(prize.amount) > 0
      setBusy('preview-draw')
      startWheelSpin()
      setError('')
      try {
        // 测试模式也按真实流程展示：先持续转动，再缓停到已确定奖项，
        // 最后保留结果，不会在指针仍转动时直接跳转分享页。
        await wait(950)
        stopWheelAt(wheelStopIndexForAmount(prize.amount))
        await wait(2250)
        await revealDrawResult({
          preview: true,
          won,
          prizeAmount: won ? prize.amount : null,
          prizeAmountYuan: won ? Number(prize.amount) / 100 : null,
          message: won
            ? `测试抽中 ${prize.label} 微信红包；不创建红包、库存或发放流水。`
            : '测试未中奖；不创建红包、库存或发放流水。',
        })
      } finally {
        stopWheelSpin()
        setBusy('')
      }
      return
    }
    try {
      const availability = await getDrawAvailability(activityKey)
      if (availability?.available === false) {
        setError(availability.message || '抽奖暂缓，请稍后再试')
        return
      }
    } catch (err) {
      setError(readError(err, '抽奖状态检查失败，请稍后重试'))
      return
    }
    let authorization
    try {
      // 抽奖前始终从服务端查询并同步微信授权状态。已经生效的用户直接抽奖，
      // 只有确认尚未授权时才会调起新的微信授权流程。
      authorization = await resolveAuthorizationForDraw()
    } catch (err) {
      setError(readError(err, '微信授权状态查询失败，请稍后重试'))
      return
    }
    if (!authorization?.effective) {
      await handleAuthorization(authorization)
      return
    }
    setBusy('draw')
    startWheelSpin()
    setError('')
    try {
      let result = await drawPrize(activityKey, createRequestId('draw'), debugMode)
      setBootstrap((current) => ({ ...current, draw: result }))
      result = await waitForFinalDraw(result)
      if (!result) throw new Error('未查询到本次抽奖记录')
      if (!result.final) {
        stopWheelSpin()
        setError('微信正在确认发放结果，已停止转盘，请稍后重新进入活动查看')
        return
      }
      stopWheelAt(wheelStopIndexForResult(result))
      await wait(2250)
      await revealDrawResult(result)
      trackEvent(activityKey, 'lottery_result', {
        won: result.won,
        controlCode: result.controlCode,
        prizeAmount: result.prizeAmount,
      })
    } catch (err) {
      if (isTransferAuthorizationRequired(err)) {
        // 抽奖前的转账预校验发现用户已在微信侧取消授权。后端已确认原
        // 商户单未被受理并关闭旧授权；这里直接重新拉起官方授权页，不能
        // 继续转盘或新建第二次抽奖。
        stopWheelSpin()
        await handleAuthorization(null, true)
        return
      }
      // 即使首个响应丢失，也先反查唯一抽奖记录；一旦已消费机会，继续等待微信终态。
      try {
        let recovered = await getDrawStatus(activityKey, debugMode)
        recovered = await waitForFinalDraw(recovered)
        if (recovered?.final) {
          stopWheelAt(wheelStopIndexForResult(recovered))
          await wait(2250)
          await revealDrawResult(recovered)
          return
        }
        if (recovered) {
          stopWheelSpin()
          setError('微信正在确认发放结果，已停止转盘，请稍后重新进入活动查看')
          return
        }
      } catch {
        // 原始错误更能说明用户当前操作失败；后台仍会继续处理已创建的发放单。
      }
      setError(readError(err, '抽奖状态确认失败，请稍后重新进入活动'))
    } finally {
      setBusy('')
      stopWheelSpin()
    }
  }

  async function handleSyncPayout() {
    const payoutNo = bootstrap?.draw?.payoutNo
    if (!payoutNo || busy) return
    setBusy('sync')
    try {
      const draw = await syncPayout(activityKey, payoutNo, debugMode)
      setBootstrap((current) => ({ ...current, draw }))
    } catch (err) {
      setError(readError(err, '发放状态同步失败'))
    } finally {
      setBusy('')
    }
  }

  async function revealDrawResult(result) {
    setBootstrap((current) => ({ ...current, draw: result }))
    // 只有微信已确认成功的结果才会进入中奖页；在停盘后的 1.5 秒内保留
    // “奖品发放中”过渡，未中奖则直接展示结果页。
    if (result?.won) {
      setBusy('draw-result')
      await wait(1500)
    }
    navigate('share')
  }

  async function openDebugPanel() {
    if (!debugMode || busy) return
    setBusy('debug-state')
    try {
      const state = await getDebugState(activityKey)
      setDebugState(state)
      if (String(state?.userId || '') === '1') {
        if (window.confirm('确认重置本活动全部测试数据？答题、抽奖、中奖及发放测试记录都会清空。')) {
          await resetAllDebugData()
        }
        return
      }
      setDebugPanelOpen(true)
    } catch (err) {
      setError(readError(err, 'debug 状态加载失败'))
    } finally {
      setBusy('')
    }
  }

  async function handleDebugReset() {
    if (String(debugState?.userId || '') !== '1' || busy) return
    if (!window.confirm('确认重置本活动全部测试数据？答题、抽奖、中奖及发放测试记录都会清空。')) return
    await resetAllDebugData()
  }

  async function resetAllDebugData() {
    setBusy('debug-reset')
    try {
      await resetDebugData(activityKey)
      const data = await getBootstrap(activityKey, true)
      setBootstrap(data)
      setPreviewSeenQuestionCodes(buildPreviewSeenQuestionCodes(data.levels))
      setActiveLevel(null)
      setActiveQuestionIndex(null)
      setFeedback(null)
      setDebugPanelOpen(false)
      setPage('home')
      setLevelAdvanceToast('全部测试数据已重置')
      window.clearTimeout(levelAdvanceTimer.current)
      levelAdvanceTimer.current = window.setTimeout(() => setLevelAdvanceToast(''), 1800)
    } catch (err) {
      setError(readError(err, '重置失败'))
    } finally {
      setBusy('')
    }
  }

  if (blockedMessage) return <ErrorView error={blockedMessage} />
  if (!bootstrap && !error) return <LoadingView />
  if (!bootstrap) return <ErrorView error={error} />

  return (
    <main className="nh-challenge">
      <ActivityBgmPlayer bgm={bgmPlayerConfig} activityKey={activityKey} />
      <NanhaiAudioControl bgm={bgmConfig} />
      {preview ? <button className="nh-preview-badge" onClick={() => navigate('home')}>测试模式 · 不计入答题或抽奖</button> : null}
      {bootstrap.debug ? <button className="nh-debug-badge" onClick={openDebugPanel}>DEBUG · 真实参与数据</button> : null}
      <div key={page} className={`nh-page-stage ${pageTransitioning ? 'is-leaving' : ''}`}>
      {page === 'home' ? <HomePage onStart={() => navigate('rules')} /> : null}
      {page === 'rules' ? <RulesPage onEnter={() => navigate('map')} /> : null}
      {page === 'map' ? (
        <MapPage
          levels={bootstrap.levels || []}
          progress={progress}
          correctCodes={correctCodes}
          onOpenLevel={openScene}
          preview={preview}
          onDebugComplete={handlePreviewCompleteAll}
        />
      ) : null}
      {page === 'scene' && activeLevel ? (
        <ScenePage
          level={activeLevel}
          correctCodes={correctCodes}
          onOpenQuestion={openQuestion}
          onBack={returnToMap}
        />
      ) : null}
      {page === 'success' ? <SuccessPage rotation={wheelRotation} spinning={wheelSpinning} onDraw={handleDraw} /> : null}
      {page === 'share' ? (
        <SharePage draw={bootstrap.draw} busy={busy} preview={preview} onSync={handleSyncPayout} onReview={reviewChallenge} onShare={() => setShareGuideOpen(true)} />
      ) : null}
      </div>
      {activeLevel && activeQuestionIndex !== null ? createPortal(
        <QuestionDialog
          level={activeLevel}
          questionIndex={activeQuestionIndex}
          selectedOption={selectedOption}
          busy={busy === 'answer'}
          onSelect={setSelectedOption}
          onSubmit={handleAnswer}
          onClose={() => { setActiveQuestionIndex(null); setSelectedOption('') }}
        />,
        document.body,
      ) : null}
      {feedback ? createPortal(<AnswerFeedback feedback={feedback} onClose={closeFeedback} />, document.body) : null}
      {levelAdvanceToast ? createPortal(
        <NanhaiToast text={levelAdvanceToast} />,
        document.body,
      ) : null}
      {operationLoadingText(busy) ? createPortal(
        <OperationLoading message={operationLoadingText(busy)} />,
        document.body,
      ) : null}
      {shareGuideOpen ? createPortal(<ShareGuide onClose={() => setShareGuideOpen(false)} />, document.body) : null}
      {debugPanelOpen ? createPortal(
        <DebugPanel state={debugState} busy={busy} onRefresh={openDebugPanel} onReset={handleDebugReset} onClose={() => setDebugPanelOpen(false)} />,
        document.body,
      ) : null}
      {error ? createPortal(
        <NanhaiToast text={error} dismissible onClose={() => setError('')} />,
        document.body,
      ) : null}
    </main>
  )
}

function HomePage({ onStart }) {
  return <ArtPage art={NANHAI_ART.home} onAction={{ start: onStart }} className="nh-home-page" />
}

function RulesPage({ onEnter }) {
  return (
    <ArtPage
      art={NANHAI_ART.rules}
      onAction={{ 'enter-map': onEnter }}
      className="nh-rules-page"
      rotatedChildren={<RulesContent />}
    />
  )
}

function RulesContent() {
  return (
    <article className="nh-rules-content" aria-label="活动规则">
      <section>
        <h2>一、活动介绍</h2>
        <p>《幸福南海巡检图·工伤预防知识大闯关》是面向全民的工伤预防公益科普互动活动，依托工厂、工地、园区、社区、校园五大真实场景出题，以趣味答题闯关的形式，普及安全生产、工伤防护知识，提升各类从业人群的安全防范意识。活动全程免费参与，旨在以学促知、以考促学，筑牢职场与生活安全防线。</p>
        <p className="nh-rules-content__time">活动时间：即日起至8月15日</p>
      </section>
      <section>
        <h2>二、参与规则</h2>
        <ol>
          <li>参与人群：全体市民，重点覆盖制造业职工、建筑工人、园区从业者、新业态骑手、社区灵活就业人员、校园师生等群体。</li>
          <li>参与限制：每位微信用户可多次作答闯关练习，但仅可解锁一次随机抽奖资格、参与一次抽奖，重复闯关无法再次获得抽奖机会。</li>
          <li>参与规范：活动禁止任何作弊答题、恶意刷奖、批量操作等违规行为，一经核查发现，将直接取消用户闯关及中奖资格。</li>
        </ol>
      </section>
      <section>
        <h2>三、答题闯关流程</h2>
        <ol>
          <li>用户进入活动页面后，点击「开始答题」即可参与闯关，全程共10道工伤预防基础知识选择题。</li>
          <li>题目覆盖五大核心场景，贴合日常工作与生活场景，无答题时间限制，可仔细阅读题目后作答。</li>
          <li>逐题完成作答，依次答完全部10道题目，即可完成闯关，系统自动判定闯关成功。</li>
        </ol>
      </section>
      <section>
        <h2>四、抽奖资格说明</h2>
        <ol>
          <li>资格解锁条件：用户完整完成全部10道题目答题、成功通关闯关后，即可自动解锁随机抽奖资格。</li>
          <li>资格有效期：用户首次闯关成功后解锁抽奖资格，资格仅限本次活动单次使用，不可累积、不可转让，多次重复闯关不叠加抽奖次数。</li>
          <li>中奖规则：本次抽奖为随机抽奖奖励，闯关达标用户均可参与。</li>
        </ol>
      </section>
      <section>
        <h2>五、发放须知</h2>
        <ol>
          <li>本次游戏是随机发放，抽奖成功后将自动发放至用户微信账户。</li>
          <li>用户可通过微信服务账单、微信零钱明细查询到账情况，无需额外操作领取。</li>
          <li>若出现发放延迟到账、发放异常等问题，可稍后重新查看，系统将统一补发处理。</li>
        </ol>
      </section>
    </article>
  )
}

function SuccessPage({ rotation, spinning, onDraw }) {
  const success = NANHAI_ART.success
  const [baseFilename, baseLeft, baseTop, baseWidth, baseHeight] = success.wheel.base
  const [ringFilename, ringLeft, ringTop, ringWidth, ringHeight] = success.wheel.ring
  const [pointerFilename, pointerLeft, pointerTop, pointerWidth, pointerHeight] = success.wheel.pointer
  const ringCenterX = ringLeft + ringWidth / 2
  const ringCenterY = ringTop + ringHeight / 2
  return (
    <ArtPage
      art={success}
      onAction={{ draw: onDraw }}
      className="nh-success-page"
      rotatedChildren={(
        <>
          <img className="nh-success-wheel-base" src={nanhaiAsset(baseFilename)} style={sourceRect(success.canvas, baseLeft, baseTop, baseWidth, baseHeight)} alt="" />
          <img className="nh-success-wheel-ring" src={nanhaiAsset(ringFilename)} style={sourceRect(success.canvas, ringLeft, ringTop, ringWidth, ringHeight)} alt="" />
          <div
            className={`nh-success-wheel-pointer-spin ${spinning ? 'is-spinning' : ''}`}
            style={{ ...sourcePoint(success.canvas, ringCenterX, ringCenterY), '--pointer-rotation': `${rotation}deg` }}
          >
            <img className="nh-success-wheel-pointer" src={nanhaiAsset(pointerFilename)} style={sourceRect(success.canvas, pointerLeft, pointerTop, pointerWidth, pointerHeight)} alt="" />
          </div>
        </>
      )}
    />
  )
}

function ArtPage({ art, onAction = {}, children, rotatedChildren, className = '' }) {
  const [canvasW, canvasH] = art.canvas
  return (
    <section
      className={`nh-art-page ${className}`}
      style={{ '--canvas-w': canvasW, '--canvas-h': canvasH }}
    >
      <div className="nh-art-page__frame">
        <div className="nh-art-page__rotated">
          <img className="nh-art-page__background" src={nanhaiAsset(art.background)} alt="" />
          {(art.layers || []).map((layer) => (
            <ArtLayer key={`${layer[0]}-${layer[1]}-${layer[2]}`} layer={layer} canvas={art.canvas} onAction={onAction[layer[5]]} />
          ))}
          {rotatedChildren}
        </div>
        {children ? <div className="nh-art-page__overlay">{children}</div> : null}
      </div>
    </section>
  )
}

function ArtLayer({ layer, canvas, onAction, className = '' }) {
  const [filename, left, top, width, height] = layer
  const style = {
    left: `${(left / canvas[0]) * 100}%`,
    top: `${(top / canvas[1]) * 100}%`,
    width: `${(width / canvas[0]) * 100}%`,
    height: `${(height / canvas[1]) * 100}%`,
  }
  if (onAction) {
    return <button className="nh-art-page__tap" style={style} onClick={onAction} aria-label="进入下一页"><img src={nanhaiAsset(filename)} alt="" /></button>
  }
  return <img className={`nh-art-page__layer ${className}`} style={style} src={nanhaiAsset(filename)} alt="" />
}

function MapPage({ levels, progress, correctCodes, onOpenLevel, preview, onDebugComplete }) {
  const map = NANHAI_ART.map
  const [selectedLevelNo, setSelectedLevelNo] = useState(null)
  const selectedLevel = levels.find((level) => level.levelNo === selectedLevelNo)
  const currentAvailableLevel = levels.find((level) => (
    levelStatus(level, progress, correctCodes) === 'available'
  ))
  const startLevel = selectedLevel || currentAvailableLevel
  return (
    <ArtPage
      art={map}
      onAction={{
        // 未选关卡时，开始按钮直接进入当前进度；选中已通关关卡后，
        // 同一按钮则进入对应的复习关卡。
        'start-scene': startLevel ? () => onOpenLevel(startLevel) : undefined,
        'debug-complete': preview ? onDebugComplete : undefined,
      }}
      className="nh-map-page"
      rotatedChildren={map.cards.map((card, index) => {
        const status = levelStatus(levels[index], progress, correctCodes)
        const unlockedLock = map.unlockedLocks[index]
        return (
          <Fragment key={card[0]}>
            <ArtLayer
              key={card[0]}
              layer={card}
              canvas={map.canvas}
              className={`nh-map-card is-${status}${selectedLevelNo === levels[index].levelNo ? ' is-selected' : ''}`}
            />
            {status === 'completed' ? (
              <img
                className="nh-map-unlocked-lock"
                src={nanhaiAsset(NANHAI_ART.unlockedLock)}
                style={sourceRect(map.canvas, ...unlockedLock)}
                alt=""
              />
            ) : null}
          </Fragment>
        )
      })}
    >
      <div className="nh-map-page__nodes">
        {levels.map((level, index) => {
          const card = map.cards[index]
          const status = levelStatus(level, progress, correctCodes)
          const position = rotatedRect(map.canvas, card[1], card[2], card[3], card[4])
          return (
            <button
              key={level.levelNo}
              className={`nh-map-node is-${status}`}
              style={position}
              onClick={() => status !== 'locked' && setSelectedLevelNo(level.levelNo)}
              aria-pressed={selectedLevelNo === level.levelNo}
              aria-label={`${level.title} ${status === 'completed' ? '已解锁' : status === 'available' ? '未解锁' : '未开放'}`}
            >
              <span>{status === 'completed' ? '已解锁' : status === 'available' ? '未解锁' : '暂未开放'}</span>
            </button>
          )
        })}
      </div>
    </ArtPage>
  )
}

function ScenePage({ level, correctCodes, onOpenQuestion, onBack }) {
  const scene = NANHAI_ART.scenes[level.levelNo - 1]
  return (
    <section className="nh-scene-page">
      <ArtPage
        art={scene}
        className="nh-scene-page__art"
        rotatedChildren={(
          <div className="nh-scene-pins">
            {level.questions.map((question, index) => {
              const defaultPinIndex = Number(question.code.slice(-2)) - 1
              const pinIndex = scene.questionPinIndexes?.[question.code] ?? defaultPinIndex
              const pin = scene.pins[pinIndex] || scene.pins[index]
              const completed = correctCodes.has(question.code)
              return (
                <button
                  key={question.code}
                  className={`nh-scene-pin ${completed ? 'is-completed' : ''}`}
                  style={sourceRect(scene.canvas, pin[1], pin[2], 82, 82)}
                  onClick={() => onOpenQuestion(index)}
                  aria-label={`第${pinIndex + 1}题${completed ? '已解锁' : '点击答题'}`}
                >
                  <img className="nh-scene-pin__trigger" src={nanhaiAsset(completed ? 'green.png' : pin[0])} alt="" />
                  {completed ? <span>已解锁</span> : null}
                </button>
              )
            })}
          </div>
        )}
      />
      {createPortal(
        <div className="nh-scene-back-anchor"><button className="nh-scene-back" onClick={onBack}>返回</button></div>,
        document.body,
      )}
    </section>
  )
}

function QuestionDialog({ level, questionIndex, selectedOption, busy, onSelect, onSubmit, onClose }) {
  const question = level.questions[questionIndex]
  return (
    <div className="nh-question-mask" role="presentation">
      <section className="nh-question-dialog" role="dialog" aria-modal="true" aria-label={`${level.title}第${questionIndex + 1}题`}>
        <img className="nh-question-dialog__panel" src={nanhaiAsset(NANHAI_ART.questionPanel)} alt="" />
        <button className="nh-question-dialog__dismiss" onClick={onClose} aria-label="关闭" />
        <div className="nh-question-dialog__type">{question.questionType}</div>
        <p className="nh-question-dialog__count">{level.title} · 第 {questionIndex + 1} / {level.questions.length} 题</p>
        <h1>{question.title}</h1>
        <div className={`nh-question-options ${question.options.length === 2 ? 'is-judge' : ''}`}>
          {question.options.map((option) => (
            <button
              key={option.key}
              className={selectedOption === option.key ? 'is-selected' : ''}
              onClick={() => onSelect(option.key)}
              disabled={busy}
            >
              <i className={question.options.length === 2 ? 'nh-radio' : 'nh-option-key'}>{question.options.length === 2 ? null : option.key}</i><span>{option.text}</span>
            </button>
          ))}
        </div>
        <button className="nh-question-dialog__submit" disabled={!selectedOption || busy} onClick={onSubmit}>
          {busy ? '提交中…' : '提交答案'}
        </button>
        <button className="nh-question-dialog__cancel" onClick={onClose}>关闭</button>
      </section>
    </div>
  )
}

function AnswerFeedback({ feedback, onClose }) {
  return (
    <div className="nh-answer-mask" role="presentation">
      <section className="nh-answer-feedback" role="dialog" aria-modal="true">
        <img
          className="nh-answer-feedback__result"
          src={nanhaiAsset(feedback.correct ? NANHAI_ART.answerPanel : NANHAI_ART.answerCorrect)}
          alt=""
        />
        <button onClick={onClose} aria-label="继续答题"><img src={nanhaiAsset(NANHAI_ART.answerClose)} alt="继续" /></button>
      </section>
    </div>
  )
}

function SharePage({ draw, busy, preview, onSync, onReview, onShare }) {
  const won = draw?.won
  const shareArt = won ? NANHAI_ART.share : {
    ...NANHAI_ART.share,
    layers: NANHAI_ART.share.layers.map((layer) => (
      layer[5] === 'result-panel' ? [NANHAI_ART.share.noWinPanel, ...layer.slice(1)] : layer
    )),
  }
  const payoutSuccess = draw?.payoutStatus === 'success'
  const prizeAmount = Number.isFinite(Number(draw?.prizeAmountYuan)) ? String(draw.prizeAmountYuan) : ''
  return (
    <section className="nh-share-page">
      <ArtPage
        art={shareArt}
        onAction={{ review: onReview, share: onShare }}
        rotatedChildren={won && prizeAmount ? (
          <div className="nh-share-prize-amount" style={sourceRect(shareArt.canvas, 559, 367, 261, 134)}><div>{prizeAmount}</div></div>
        ) : null}
      />
      {!preview ? (
        <div className="nh-share-page__result">
          <strong>{won ? `恭喜抽中 ${draw.prizeAmountYuan} 元微信红包` : '本次未中奖'}</strong>
          <span>{draw?.message}</span>
          {won ? <small>发放状态：{payoutStatusText(draw.payoutStatus)}{draw.wechatState ? ` · ${draw.wechatState}` : ''}</small> : null}
          {won && !payoutSuccess && draw.payoutNo ? <button disabled={Boolean(busy)} onClick={onSync}>{busy === 'sync' ? '同步中…' : '查询发放状态'}</button> : null}
        </div>
      ) : null}
    </section>
  )
}

function ShareGuide({ onClose }) {
  return (
    <button className="nh-share-guide" onClick={onClose} aria-label="关闭分享提示">
      <span className="nh-share-guide__arrow" aria-hidden="true">↗</span>
      <span className="nh-share-guide__text">点击「···」分享给好友</span>
    </button>
  )
}

function DebugPanel({ state, busy, onRefresh, onReset, onClose }) {
  // 用返回的真实用户 ID 决定调试入口展示；后端 reset 接口仍会再次强制校验
  // userId=1，前端仅负责让超级测试用户看得到可执行的重置操作。
  const canResetAll = String(state?.userId || '') === '1'
  return (
    <div className="nh-debug-mask">
      <section className="nh-debug-panel" role="dialog" aria-modal="true" aria-label="真实参与调试数据">
        <header><strong>真实参与状态 · userId={state?.userId || '-'}</strong><button onClick={onClose}>关闭</button></header>
        <div className="nh-debug-panel__actions">
          <button disabled={Boolean(busy)} onClick={onRefresh}>刷新数据</button>
          {canResetAll ? <button className="is-danger" disabled={Boolean(busy)} onClick={onReset}>重置全部测试数据</button> : null}
        </div>
        {canResetAll ? <p className="nh-debug-panel__reset-tip">仅测试阶段的 userId=1 可重置本活动全部测试数据。</p> : null}
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </section>
    </div>
  )
}

function LoadingView() {
  return <main className="nh-challenge nh-loading"><i /><p>正在打开幸福南海巡检图…</p></main>
}

function OperationLoading({ message }) {
  return (
    <div className="nh-operation-loading" role="status" aria-live="polite">
      <span className="nh-operation-loading__content"><i />{message}</span>
    </div>
  )
}

function NanhaiToast({ text, dismissible = false, onClose }) {
  return (
    <div className="nh-toast-mask" role="presentation">
      {dismissible ? (
        <button className="nh-toast" type="button" onClick={onClose} aria-label="关闭提示">{text}</button>
      ) : (
        <div className="nh-level-advance-toast" role="status" aria-live="polite">{text}</div>
      )}
    </div>
  )
}

function operationLoadingText(busy) {
  if (busy === 'authorization-check') return '正在核验微信授权…'
  if (busy === 'authorization') return '正在唤起微信授权…'
  if (busy === 'draw-result') return '奖品发放中'
  // 转盘本身就是抽奖中的状态反馈，不再叠加加载遮罩；授权、查单等非视觉流程
  // 仍保留加载提示。
  if (busy === 'draw' || busy === 'preview-draw') return ''
  if (busy === 'sync') return '正在查询发放状态…'
  if (busy === 'debug-state') return '正在读取调试数据…'
  if (busy === 'debug-reset') return '正在重置全部测试数据…'
  return ''
}

function ErrorView({ error }) {
  return <main className="nh-challenge nh-error-page"><h1>页面暂时无法打开</h1><p>{error}</p></main>
}

function isLevelAvailable(level, progress) {
  return level.levelNo <= Math.max(progress?.currentLevel || 1, progress?.completedLevels || 0)
}

function levelStatus(level, progress, correctCodes) {
  if (level.questions?.every((question) => correctCodes.has(question.code))) return 'completed'
  return isLevelAvailable(level, progress) ? 'available' : 'locked'
}

function rotatedRect([canvasW, canvasH], left, top, width, height) {
  return {
    left: `${((canvasH - top - height) / canvasH) * 100}%`,
    top: `${(left / canvasW) * 100}%`,
    width: `${(height / canvasH) * 100}%`,
    height: `${(width / canvasW) * 100}%`,
  }
}

function sourceRect([canvasW, canvasH], left, top, width, height) {
  return {
    left: `${(left / canvasW) * 100}%`,
    top: `${(top / canvasH) * 100}%`,
    width: `${(width / canvasW) * 100}%`,
    height: `${(height / canvasH) * 100}%`,
  }
}

function sourcePoint([canvasW, canvasH], left, top) {
  return {
    '--pointer-origin-x': `${(left / canvasW) * 100}%`,
    '--pointer-origin-y': `${(top / canvasH) * 100}%`,
  }
}

function wheelStopIndexForAmount(prizeAmount) {
  return WHEEL_STOP_INDEX_BY_AMOUNT[Number(prizeAmount)] ?? 0
}

function wheelStopIndexForResult(result) {
  // 兼容已存在的旧失败记录：不管后端遗留了什么候选奖品落点，只要最终未
  // 中奖，就永远停在“谢谢参与”（索引 0）。
  if (!result?.won) return 0
  return Number.isInteger(result.wheelStopIndex)
    ? result.wheelStopIndex
    : wheelStopIndexForAmount(result.prizeAmount)
}

function spinPointerToStopIndex(currentRotation, wheelStopIndex) {
  const targetAngle = WHEEL_POINTER_ANGLE_BY_STOP_INDEX[Number(wheelStopIndex)]
  if (targetAngle === undefined) return currentRotation + 720
  const currentAngle = ((currentRotation % 360) + 360) % 360
  const remainingAngle = (targetAngle - currentAngle + 360) % 360
  // 两圈加上到目标扇区的余量，配合缓停曲线的初始速度与快转阶段一致，
  // 整个过程只会向前，不会有突发加速或倒退。
  return currentRotation + 720 + remainingAngle
}

function pickPreviewSegment(segments) {
  const items = Array.isArray(segments) && segments.length ? segments : FALLBACK_SEGMENTS
  const hasProbability = items.some((item) => Number.isFinite(Number(item?.probability)))
  if (!hasProbability) {
    return items[Math.floor(Math.random() * items.length)] || FALLBACK_SEGMENTS[0]
  }
  const totalProbability = items.reduce((sum, item) => sum + Math.max(Number(item?.probability) || 0, 0), 0)
  if (totalProbability <= 0) return FALLBACK_SEGMENTS[0]
  let cursor = Math.random() * totalProbability
  for (const item of items) {
    cursor -= Math.max(Number(item?.probability) || 0, 0)
    if (cursor < 0) return item
  }
  return items[items.length - 1] || FALLBACK_SEGMENTS[0]
}

function payoutStatusText(status) {
  const labels = { pending: '待发起', accepted: '已受理', processing: '发放中', success: '已到账', failed: '发放失败' }
  return labels[status] || status || '-'
}

function createRequestId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`.slice(0, 100)
}

function buildPreviewProgress(bootstrap, newlyCorrectCode, wrongAnswer = false) {
  const currentProgress = bootstrap?.progress || {}
  const correctQuestionCodes = Array.from(new Set([
    ...(currentProgress.correctQuestionCodes || []),
    ...(newlyCorrectCode ? [newlyCorrectCode] : []),
  ]))
  const levels = bootstrap?.levels || []
  const completedLevels = levels.reduce((count, level) => (
    level.questions.every((question) => correctQuestionCodes.includes(question.code)) ? count + 1 : count
  ), 0)
  return {
    ...currentProgress,
    currentLevel: Math.min(completedLevels + 1, 5),
    completedLevels,
    correctCount: correctQuestionCodes.length,
    wrongCount: (currentProgress.wrongCount || 0) + (wrongAnswer ? 1 : 0),
    status: completedLevels >= 5 ? 'completed' : 'in_progress',
    correctQuestionCodes,
  }
}

function buildPreviewSeenQuestionCodes(levels) {
  return Object.fromEntries((levels || []).map((level) => [
    level.levelNo,
    (level.questions || []).map((question) => question.code),
  ]))
}

function buildPreviewActiveQuestionCodes(level, questionIndex) {
  const questions = level?.questions || []
  const selectedCode = questions[questionIndex]?.code
  const codes = Array.from(new Set(questions.map((question) => question.code).filter(Boolean)))
  if (codes.length <= 2) return codes
  return Array.from(new Set([selectedCode, ...codes])).filter(Boolean).slice(0, 2)
}

function buildPreviewCompletedProgress(bootstrap) {
  const currentProgress = bootstrap?.progress || {}
  const correctQuestionCodes = (bootstrap?.levels || []).flatMap((level) => level.questions.map((question) => question.code))
  return {
    ...currentProgress,
    currentLevel: 5,
    completedLevels: 5,
    correctCount: correctQuestionCodes.length,
    status: 'completed',
    correctQuestionCodes,
  }
}

function readError(error, fallback) {
  const message = error?.response?.data?.message || error?.message
  return typeof message === 'string' && message ? message : fallback
}

function scrollSceneToTop() {
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  window.scrollTo(0, 0)
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function invokeMerchantTransferAuthorization(authorization) {
  return new Promise((resolve, reject) => {
    const invoke = () => {
      if (!window.WeixinJSBridge?.invoke) {
        reject(new Error('请在微信内打开活动'))
        return
      }
      window.WeixinJSBridge.invoke('requestMerchantTransfer', {
        mchId: authorization.mchId,
        appId: authorization.appId,
        package: authorization.packageInfo,
      }, (result) => {
        const message = result?.err_msg || result?.errMsg || ''
        if (/:(ok|success)$/i.test(message)) resolve(result)
        else {
          const error = new Error(message || '微信授权未完成')
          if (/(?:cancel|user_cancel)$/i.test(message)) {
            error.code = 'merchant_transfer_authorization_canceled'
          }
          reject(error)
        }
      })
    }
    if (window.WeixinJSBridge?.invoke) invoke()
    else document.addEventListener('WeixinJSBridgeReady', invoke, { once: true })
  })
}

function isMerchantTransferAuthorizationCanceled(error) {
  return error?.code === 'merchant_transfer_authorization_canceled'
}

function isTransferAuthorizationRequired(error) {
  const message = error?.response?.message || error?.message || ''
  return String(message).includes('TRANSFER_AUTHORIZATION_REQUIRED')
}
