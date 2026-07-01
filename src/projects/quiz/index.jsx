/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react'
import { getToken, setToken } from '../../shared/api/request'
import { trackPageView } from '../../shared/analytics'
import { activityAudioService } from '../../shared/audio/activityAudioService'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import { enableMobileDebug } from '../../shared/debug/mobileDebug'
import { buildBootDebug, buildTokenDebug, debugLog, isQuizAuthDebugEnabled, setQuizAuthDebugState } from '../../shared/debug/quizAuthDebug'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl, isWechatBrowser, sanitizeUrlForWechat } from '../../shared/utils/url'
import {
  debugLogin,
  finishAttempt,
  getBootstrap,
  getCurrentAttempt,
  getPublicConfig,
  getRank,
  isUnauthorizedError,
  resetFengchengDebugData,
  resetDemoActivity,
  startAttempt,
  submitAnswer,
  submitProfile,
  submitTimeout,
} from './api'
import LoadingState from './components/LoadingState'
import QuizLoadingOverlay from './components/QuizLoadingOverlay'
import QuizToast from './components/QuizToast'
import {
  FengchengHomePage,
  FengchengDebugPage,
  FengchengQuestionPage,
  FengchengQuizPreviewApp,
  FengchengRankPage,
  FengchengResultPage,
} from './fengcheng/FengchengQuiz'
import { createFengchengLocalPublicConfig, isFengchengQuiz } from './fengcheng/config'
import LayoutPreview from './dev/LayoutPreview'
import { QUIZ_VERSION, quizAssets } from './assets'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import QuestionPage from './pages/QuestionPage'
import RankPage from './pages/RankPage'
import ResultPage from './pages/ResultPage'
import RulePage from './pages/RulePage'
import './quiz.css'

const DEFAULT_ACTIVITY_KEY = 'quiz_demo_dragon_boat'
const FEEDBACK_DELAY_MS = 1500
const FENGCHENG_FEEDBACK_DELAY_MS = 120
const QUIZ_RANK_PAGE_SIZE = 50

export default function QuizApp({ routeParams }) {
  const layoutPreview = getQueryParam('layout') === '1'
  if (layoutPreview) return <LayoutPreview />

  const fengchengPreview = getQueryParam('fengcheng_preview') === '1'
  if (fengchengPreview) return <FengchengQuizPreviewApp />

  const tokenFromUrl = getTokenFromUrl()
  if (tokenFromUrl) {
    setToken(tokenFromUrl)
    window.location.replace(sanitizeUrlForWechat(window.location.href))
    return null
  }

  return <QuizMain routeParams={routeParams} />
}

function QuizMain({ routeParams }) {
  const activityKey = routeParams?.activityKey || getQueryParam('activity_key') || DEFAULT_ACTIVITY_KEY
  const debug = getQueryParam('debug') === '1'
  const debugAuth = isQuizAuthDebugEnabled()
  const [page, setPage] = useState('home')
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [current, setCurrent] = useState(null)
  const [result, setResult] = useState(null)
  const [activeAttemptId, setActiveAttemptId] = useState(null)
  const [resultAttemptId, setResultAttemptId] = useState(null)
  const [ranks, setRanks] = useState([])
  const [rankOffset, setRankOffset] = useState(0)
  const [rankHasMore, setRankHasMore] = useState(true)
  const [rankLoading, setRankLoading] = useState(false)
  const [rankError, setRankError] = useState('')
  const [fengchengProfileOpen, setFengchengProfileOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const toastTimerRef = useRef(null)
  const rankRequestRef = useRef(false)
  const debugPcLoginRef = useRef(false)
  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, publicConfig)

  useEffect(() => {
    activityAudioService.init({ activityKey })
    return () => {
      activityAudioService.destroy()
    }
  }, [activityKey])

  useEffect(() => {
    if (!activityKey) return
    trackPageView(activityKey, '/quiz', {
      activityType: 'quiz',
      pageKey: 'home',
    })
  }, [activityKey])

  useEffect(() => {
    if (!debugAuth) return
    enableMobileDebug()
    debugLog('[QuizAuthDebug] debug mode enabled')
    debugLog('[QuizAuthDebug] boot', buildBootDebug(activityKey))
    debugLog('[QuizAuthDebug] zice8 token', buildTokenDebug())
    setQuizAuthDebugState({
      ...buildBootDebug(activityKey),
      ...buildTokenDebug(),
    })
  }, [activityKey, debugAuth])

  const showToast = useCallback((message, duration = 1500) => {
    if (!message) return
    setToast(message)
    window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => {
      setToast('')
    }, duration)
  }, [])

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current)
  }, [])

  const showError = useCallback((err) => {
    showToast(err?.message || '请求失败')
  }, [showToast])

  const handleUnauthorized = useCallback((err, reason, options = {}) => {
    if (!isUnauthorizedError(err)) return false

    const { bootstrapUnauthorized = false } = options
    if (bootstrapUnauthorized) {
      debugLog('[QuizAuthDebug] bootstrap unauthorized', {
        willClearToken: true,
        willReauth: true,
      })
    } else {
      debugLog('[QuizAuthDebug] protected api unauthorized', {
        endpoint: reason,
        willClearToken: true,
        willReauth: true,
      })
    }

    setQuizAuthDebugState({
      lastAuthStep: `reauth-${reason}`,
    })
    showToast('登录已失效，正在重新进入活动', 1800)
    reauth(reason)
    return true
  }, [reauth, showToast])

  const handleWechatShareStatus = useCallback((status) => {
    if (status?.wxConfigStatus === 'failed' || status?.signatureStatus === 'failed' || status?.wxScriptLoadStatus === 'failed') {
      console.warn('[quiz-share] setup failed', status)
    }
  }, [])

  const shareActivity = bootstrap?.activity || publicConfig
    ? {
        ...(bootstrap?.activity || publicConfig),
        shareTitle: bootstrap?.shareConfig?.title || bootstrap?.activity?.shareTitle || publicConfig?.shareTitle || bootstrap?.activity?.title || publicConfig?.title || '端午知识竞赛',
        shareDesc: bootstrap?.shareConfig?.desc ?? bootstrap?.activity?.shareDesc ?? publicConfig?.shareDesc ?? '',
        shareImage: bootstrap?.shareConfig?.imgUrl || bootstrap?.activity?.shareImage || publicConfig?.shareImage || quizAssets.common.logoEvent,
      }
    : null
  const bgmConfig = bootstrap?.bgmConfig || publicConfig?.bgmConfig
  const fengchengSkin = isFengchengQuiz(activityKey, bootstrap, publicConfig)

  useWechatShare(activityKey, shareActivity, handleWechatShareStatus)

  useEffect(() => {
    if (!activityKey) return
    getPublicConfig(activityKey)
      .then((config) => {
        setPublicConfig(config)
        setError('')
        debugLog('[QuizAuthDebug] config', {
          accessMode: config?.accessMode || config?.access_mode || '',
          oauthScope: config?.oauthScope || config?.oauth_scope || '',
          requireUserinfo: Boolean(config?.requireUserinfo || config?.require_userinfo),
        })
        setQuizAuthDebugState({
          accessMode: config?.accessMode || config?.access_mode || '',
          oauthScope: config?.oauthScope || config?.oauth_scope || '',
          requireUserinfo: Boolean(config?.requireUserinfo || config?.require_userinfo),
        })
      })
      .catch((err) => {
        if (isFengchengQuiz(activityKey)) {
          setPublicConfig(createFengchengLocalPublicConfig())
          setError('')
          setLoading(false)
          return
        }
        setError(err.message || '活动加载失败')
        setLoading(false)
      })
  }, [activityKey])

  const loadBootstrap = useCallback(async (options = {}) => {
    const { resetPage = true, withLoading = true } = options
    if (withLoading) setLoading(true)
    try {
      const data = await getBootstrap(activityKey)
      setBootstrap(data)
      document.title = data?.activity?.title || '端午知识竞赛'
      debugLog('[QuizAuthDebug] bootstrap', {
        activityKey,
        profileCompleted: Boolean(data?.profileCompleted),
        accessMode: data?.activity?.accessMode || data?.activity?.access_mode || publicConfig?.accessMode || publicConfig?.access_mode || '',
      })
      setQuizAuthDebugState({
        profileCompleted: Boolean(data?.profileCompleted),
        bootstrapLoaded: true,
      })
      if (resetPage) {
        setCurrent(null)
        setResult(null)
        setActiveAttemptId(null)
        setResultAttemptId(null)
        setFeedback(null)
        setPage('home')
      }
    } catch (err) {
      if (handleUnauthorized(err, 'bootstrap-401', { bootstrapUnauthorized: true })) return
      showError(err)
    } finally {
      if (withLoading) setLoading(false)
    }
  }, [activityKey, handleUnauthorized, publicConfig, showError])

  useEffect(() => {
    if (!publicConfig || !authReady) return
    if (!getToken()) {
      if (debug && fengchengSkin && !isWechatBrowser()) {
        if (debugPcLoginRef.current) return
        debugPcLoginRef.current = true
        setLoading(true)
        debugLogin(activityKey)
          .then((data) => {
            if (!data?.token) throw new Error('调试登录失败，缺少 token')
            setToken(data.token)
            return loadBootstrap()
          })
          .catch((err) => {
            debugPcLoginRef.current = false
            showError(err)
            setLoading(false)
          })
        return
      }
      setLoading(false)
      return
    }
    loadBootstrap()
  }, [activityKey, authReady, debug, fengchengSkin, loadBootstrap, publicConfig, showError])

  function startAuthorize() {
    debugLog('[QuizAuthDebug] oauth redirect', {
      reason: 'start-without-token',
      redirectUrl: sanitizeUrlForWechat(window.location.href),
    })
    setQuizAuthDebugState({
      lastAuthStep: 'start-authorize',
      lastOauthRedirectUrl: sanitizeUrlForWechat(window.location.href),
    })
    reauth('start-without-token')
  }

  function isAttemptLimitReached(data = bootstrap) {
    return data?.remainingTodayAttempts === 0 || data?.remainingTotalAttempts === 0
  }

  function showAttemptUsedAndOpenRank() {
    showToast('答题次数已用完', 1500)
    window.setTimeout(() => {
      openRank().catch(showError)
    }, 1500)
  }

  async function handleStart() {
    if (!getToken()) return startAuthorize()
    if (!bootstrap?.profileCompleted) {
      if (fengchengSkin) {
        setPage('home')
        setFengchengProfileOpen(true)
        return
      }
      return setPage('profile')
    }
    if (fengchengSkin && isAttemptLimitReached()) {
      showAttemptUsedAndOpenRank()
      return
    }
    await doStartAttempt()
  }

  async function doStartAttempt() {
    setSubmitting(true)
    try {
      const timestamp = Date.now()
      const data = await startAttempt(activityKey, {
        requestId: `web-start-${timestamp}`,
        clientNonce: `web-${timestamp}`,
      })
      const attemptId = data.attemptId || data.current?.attemptId || data.currentAttempt?.attemptId
      if (!attemptId) throw new Error('开始答题失败，缺少 attemptId')
      setActiveAttemptId(attemptId)
      setResultAttemptId(null)
      const currentData = data.currentQuestion ? data : await getCurrentAttempt(activityKey, attemptId)
      setCurrent(currentData)
      setFeedback(null)
      setPage('question')
    } catch (err) {
      if (handleUnauthorized(err, 'start-attempt-401')) return
      if (fengchengSkin && /答题次数已用完/.test(err?.message || '')) {
        showAttemptUsedAndOpenRank()
        return
      }
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleProfileSubmit(profile) {
    setSubmitting(true)
    try {
      const profileResult = await submitProfile(activityKey, profile)
      setBootstrap((value) => ({ ...(value || {}), participant: profileResult.participant, profileCompleted: true }))
      setFengchengProfileOpen(false)
      if (fengchengSkin && profileResult?.canStart === false) {
        showAttemptUsedAndOpenRank()
        return
      }
      await doStartAttempt()
    } catch (err) {
      if (handleUnauthorized(err, 'participant-profile-401')) return
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAnswer(questionId, selectedOptions) {
    if (submitting || feedback) return
    setSubmitting(true)
    try {
      const data = await submitAnswer(activityKey, current.attemptId, {
        questionId,
        selectedOptions,
        requestId: `web-answer-${Date.now()}-${questionId}`,
      })
      setFeedback(data)
      window.setTimeout(() => advanceAfterFeedback(data), fengchengSkin ? FENGCHENG_FEEDBACK_DELAY_MS : FEEDBACK_DELAY_MS)
    } catch (err) {
      if (handleUnauthorized(err, 'answer-401')) return
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleTimeout(questionId) {
    if (submitting || feedback) return
    setSubmitting(true)
    try {
      const data = await submitTimeout(activityKey, current.attemptId, {
        questionId,
        requestId: `web-timeout-${Date.now()}-${questionId}`,
      })
      setFeedback(data)
      window.setTimeout(() => advanceAfterFeedback(data), FEEDBACK_DELAY_MS)
    } catch (err) {
      if (handleUnauthorized(err, 'timeout-401')) return
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function advanceAfterFeedback(answerResult) {
    try {
      if (answerResult.shouldFinish) {
        await handleFinish()
        return
      }
      if (answerResult.current?.currentQuestion) {
        setCurrent(answerResult.current)
      } else {
        const latest = await getCurrentAttempt(activityKey, current.attemptId)
        if (latest.shouldFinish || !latest.currentQuestion) {
          await handleFinish()
          return
        }
        setCurrent(latest)
      }
      setFeedback(null)
    } catch (err) {
      showError(err)
    }
  }

  async function handleFinish() {
    setSubmitting(true)
    try {
      const data = await finishAttempt(activityKey, current.attemptId)
      setResultAttemptId(current.attemptId)
      setActiveAttemptId(null)
      setResult(data)
      setFeedback(null)
      setPage('result')
      loadBootstrap({ resetPage: false, withLoading: false }).catch(() => {})
    } catch (err) {
      if (handleUnauthorized(err, 'finish-401')) return
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function openRank() {
    setPage('rank')
    await loadRankPage({ reset: true })
  }

  const loadRankPage = useCallback(async ({ reset = false } = {}) => {
    if (rankRequestRef.current) return
    if (!reset && !rankHasMore) return

    const requestOffset = reset ? 0 : rankOffset
    rankRequestRef.current = true
    setRankLoading(true)
    setRankError('')

    try {
      const data = await getRank(activityKey, requestOffset, QUIZ_RANK_PAGE_SIZE)
      const incomingItems = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.list)
          ? data.list
          : []

      setRanks((current) => {
        if (reset) return incomingItems

        const seen = new Set(
          current.map((item) => item.userId || item.participantId || `${item.rank}-${item.participantName}-${item.totalScore}-${item.totalTimeMs}`),
        )
        const next = [...current]
        incomingItems.forEach((item) => {
          const key = item.userId || item.participantId || `${item.rank}-${item.participantName}-${item.totalScore}-${item.totalTimeMs}`
          if (seen.has(key)) return
          seen.add(key)
          next.push(item)
        })
        return next
      })

      const resolvedNextOffset = Number.isFinite(Number(data?.nextOffset))
        ? Number(data.nextOffset)
        : requestOffset + incomingItems.length
      const resolvedTotal = Number.isFinite(Number(data?.total)) ? Number(data.total) : requestOffset + incomingItems.length
      const resolvedHasMore = typeof data?.hasMore === 'boolean'
        ? data.hasMore
        : resolvedNextOffset < resolvedTotal

      setRankOffset(resolvedNextOffset)
      setRankHasMore(resolvedHasMore)
    } catch (err) {
      setRankError(err?.message || '排行榜加载失败')
      if (reset) setRanks([])
    } finally {
      rankRequestRef.current = false
      setRankLoading(false)
    }
  }, [activityKey, rankHasMore, rankOffset])

  async function handleReset() {
    if (!debug) return
    const confirmed = window.confirm('确认重置当前答题活动数据？不会影响其他活动。')
    if (!confirmed) return
    setSubmitting(true)
    try {
      await resetDemoActivity(activityKey)
      setCurrent(null)
      setResult(null)
      setFeedback(null)
      setPage('home')
      await loadBootstrap()
      showToast('当前答题活动已重置')
    } catch (err) {
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFengchengDebugReset(scope) {
    if (!fengchengSkin || !debug) return
    const resetAll = scope === 'activity'
    const confirmed = window.confirm(
      resetAll
        ? '确认清除凤城项目全部用户的提交信息、答题记录和排行榜？'
        : '确认清除你自己的提交信息、答题记录和排行榜？',
    )
    if (!confirmed) return
    setSubmitting(true)
    try {
      await resetFengchengDebugData(activityKey, resetAll ? 'activity' : 'me')
      setCurrent(null)
      setResult(null)
      setActiveAttemptId(null)
      setResultAttemptId(null)
      setFeedback(null)
      setRanks([])
      setRankOffset(0)
      setRankHasMore(true)
      setFengchengProfileOpen(false)
      await loadBootstrap({ resetPage: false, withLoading: false })
      setPage('home')
      showToast(resetAll ? '全部项目数据已清除' : '我的数据已清除')
    } catch (err) {
      if (handleUnauthorized(err, 'fengcheng-debug-reset-401')) return
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  function backHome() {
    setActiveAttemptId(null)
    setPage('home')
    setFeedback(null)
    setFengchengProfileOpen(false)
  }

  if (blockedMessage) {
    return (
      <main className="quiz-loading-page" style={{ '--quiz-common-bg': `url(${quizAssets.common.bg})` }}>
        <div className="px-6 text-center text-white">
          <div className="text-[24px] font-bold">{blockedMessage}</div>
          <div className="mt-3 text-[14px] text-white/75">请复制链接到微信后访问</div>
        </div>
        {debugAuth ? <div className="quiz-version-badge">v{QUIZ_VERSION}</div> : null}
      </main>
    )
  }

  if (error) {
    return (
      <main className="quiz-loading-page" style={{ '--quiz-common-bg': `url(${quizAssets.common.bg})` }}>
        <div className="px-6 text-center text-white">{error}</div>
        {debugAuth ? <div className="quiz-version-badge">v{QUIZ_VERSION}</div> : null}
      </main>
    )
  }

  if (loading || !publicConfig || !authReady) return <LoadingState text="答题活动加载中..." />

  if (fengchengSkin) {
    return (
      <div className="quiz-app">
        {page === 'home' ? (
          <FengchengHomePage
            publicConfig={publicConfig}
            profile={bootstrap?.participant}
            profileModalOpen={fengchengProfileOpen}
            submitting={submitting}
            onStart={handleStart}
            onCloseProfile={() => setFengchengProfileOpen(false)}
            onSubmitProfile={handleProfileSubmit}
          />
        ) : null}
        {page === 'question' ? (
          <FengchengQuestionPage
            publicConfig={publicConfig}
            current={current ? { ...current, attemptId: activeAttemptId || current.attemptId } : current}
            feedback={feedback}
            submitting={submitting}
            onAnswer={handleAnswer}
            onTimeout={handleTimeout}
            showToast={showToast}
          />
        ) : null}
        {page === 'result' ? (
          <FengchengResultPage
            publicConfig={publicConfig}
            result={result ? { ...result, attemptId: resultAttemptId || result.attemptId } : result}
            onRetry={backHome}
            onOpenRank={openRank}
          />
        ) : null}
        {page === 'rank' ? (
          <FengchengRankPage
            publicConfig={publicConfig}
            ranks={ranks}
            loading={rankLoading}
            hasMore={rankHasMore}
            error={rankError}
            onLoadMore={() => loadRankPage()}
            onRetry={() => loadRankPage({ reset: !ranks.length })}
            onBack={backHome}
          />
        ) : null}
        {page === 'debug' ? (
          <FengchengDebugPage
            publicConfig={publicConfig}
            resetting={submitting}
            onResetMine={() => handleFengchengDebugReset('me')}
            onResetAll={() => handleFengchengDebugReset('activity')}
            onBack={backHome}
          />
        ) : null}
        <ActivityBgmPlayer bgm={bgmConfig} activityKey={activityKey} />
        <QuizLoadingOverlay visible={submitting} />
        <QuizToast visible={Boolean(toast)} message={toast} />
        {debug ? (
          <button className="fengcheng-debug-entry" type="button" onClick={() => setPage('debug')}>
            DEBUG
          </button>
        ) : null}
        {debugAuth ? <div className="quiz-version-badge">v{QUIZ_VERSION}</div> : null}
      </div>
    )
  }

  return (
    <div className="quiz-app" style={{ '--quiz-common-bg': `url(${quizAssets.common.bg})` }}>
      {page === 'home' ? (
        <HomePage
          bootstrap={bootstrap}
          debug={debug}
          onOpenRule={() => setPage('rule')}
          onStart={handleStart}
          onOpenRank={openRank}
          onReset={handleReset}
        />
      ) : null}
      {page === 'rule' ? <RulePage onBack={backHome} /> : null}
      {page === 'profile' ? (
        <ProfilePage
          participant={bootstrap?.participant}
          submitting={submitting}
          onSubmit={handleProfileSubmit}
          onBack={backHome}
          showToast={showToast}
        />
      ) : null}
      {page === 'question' ? (
        <QuestionPage
          current={current ? { ...current, attemptId: activeAttemptId || current.attemptId } : current}
          feedback={feedback}
          submitting={submitting}
          onAnswer={handleAnswer}
          onTimeout={handleTimeout}
          showToast={showToast}
        />
      ) : null}
      {page === 'result' ? <ResultPage result={result ? { ...result, attemptId: resultAttemptId || result.attemptId } : result} onOpenRank={openRank} onBack={backHome} /> : null}
      {page === 'rank' ? (
        <RankPage
          ranks={ranks}
          loading={rankLoading}
          hasMore={rankHasMore}
          error={rankError}
          onLoadMore={() => loadRankPage()}
          onRetry={() => loadRankPage({ reset: !ranks.length })}
          onBack={backHome}
        />
      ) : null}
      <ActivityBgmPlayer bgm={bgmConfig} activityKey={activityKey} />
      <QuizLoadingOverlay visible={submitting} />
      <QuizToast visible={Boolean(toast)} message={toast} />
      {debugAuth ? <div className="quiz-version-badge">v{QUIZ_VERSION}</div> : null}
    </div>
  )
}
