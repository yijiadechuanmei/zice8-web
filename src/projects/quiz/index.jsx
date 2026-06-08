/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE_URL, getToken, setToken } from '../../shared/api/request'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import {
  finishAttempt,
  getBootstrap,
  getCurrentAttempt,
  getRank,
  resetDemoActivity,
  startAttempt,
  submitAnswer,
  submitProfile,
  submitTimeout,
} from './api'
import LoadingState from './components/LoadingState'
import QuizLoadingOverlay from './components/QuizLoadingOverlay'
import QuizToast from './components/QuizToast'
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

export default function QuizApp() {
  const layoutPreview = getQueryParam('layout') === '1'
  if (layoutPreview) return <LayoutPreview />

  const tokenFromUrl = getTokenFromUrl()
  if (tokenFromUrl) {
    setToken(tokenFromUrl)
    window.location.replace(sanitizeUrlForWechat(window.location.href))
    return null
  }

  return <QuizMain />
}

function QuizMain() {
  const activityKey = getQueryParam('activity_key') || DEFAULT_ACTIVITY_KEY
  const debug = getQueryParam('debug') === '1'
  const [page, setPage] = useState('home')
  const [bootstrap, setBootstrap] = useState(null)
  const [current, setCurrent] = useState(null)
  const [result, setResult] = useState(null)
  const [activeAttemptId, setActiveAttemptId] = useState(null)
  const [resultAttemptId, setResultAttemptId] = useState(null)
  const [ranks, setRanks] = useState([])
  const [rankLoading, setRankLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef(null)

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

  const handleWechatShareStatus = useCallback((status) => {
    if (status?.wxConfigStatus === 'failed' || status?.signatureStatus === 'failed' || status?.wxScriptLoadStatus === 'failed') {
      console.warn('[quiz-share] setup failed', status)
    }
  }, [])

  const shareActivity = bootstrap?.activity
    ? {
        ...bootstrap.activity,
        shareTitle: bootstrap.shareConfig?.title || bootstrap.activity.shareTitle || bootstrap.activity.title || '端午知识竞赛',
        shareDesc: bootstrap.shareConfig?.desc || bootstrap.activity.shareDesc || '参与端午答题挑战，赢取活动排名',
        shareImage: bootstrap.shareConfig?.imgUrl || bootstrap.activity.shareImage || quizAssets.common.logoEvent,
      }
    : null

  useWechatShare(activityKey, shareActivity, handleWechatShareStatus)

  const loadBootstrap = useCallback(async (options = {}) => {
    const { resetPage = true, withLoading = true } = options
    if (withLoading) setLoading(true)
    try {
      const data = await getBootstrap(activityKey)
      setBootstrap(data)
      document.title = data?.activity?.title || '端午知识竞赛'
      if (resetPage) {
        setCurrent(null)
        setResult(null)
        setActiveAttemptId(null)
        setResultAttemptId(null)
        setFeedback(null)
        setPage('home')
      }
    } catch (err) {
      showError(err)
    } finally {
      if (withLoading) setLoading(false)
    }
  }, [activityKey, showError])

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      showToast('请先通过微信授权进入活动')
      return
    }
    loadBootstrap()
  }, [loadBootstrap, showToast])

  function startAuthorize() {
    const redirectUrl = encodeURIComponent(sanitizeUrlForWechat(window.location.href))
    window.location.href = `${API_BASE_URL}/wechat/oauth/redirect?activity_key=${encodeURIComponent(activityKey)}&redirect_url=${redirectUrl}`
  }

  async function handleStart() {
    if (!getToken()) return startAuthorize()
    if (!bootstrap?.profileCompleted) return setPage('profile')
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
      await doStartAttempt()
    } catch (err) {
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
      window.setTimeout(() => advanceAfterFeedback(data), FEEDBACK_DELAY_MS)
    } catch (err) {
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
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function openRank() {
    setRankLoading(true)
    try {
      const data = await getRank(activityKey)
      setRanks(data?.list || [])
      setPage('rank')
    } catch (err) {
      showError(err)
    } finally {
      setRankLoading(false)
    }
  }

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

  function backHome() {
    setActiveAttemptId(null)
    setPage('home')
    setFeedback(null)
  }

  if (loading) return <LoadingState text="答题活动加载中..." />

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
      {page === 'rank' ? <RankPage ranks={ranks} loading={rankLoading} onBack={backHome} /> : null}
      <QuizLoadingOverlay visible={submitting} />
      <QuizToast visible={Boolean(toast)} message={toast} />
      <div className="quiz-version-badge">v{QUIZ_VERSION}</div>
    </div>
  )
}
