/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL, getToken, setToken } from '../../shared/api/request'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import {
  finishAttempt,
  getBootstrap,
  getCurrentAttempt,
  getRank,
  getResult,
  resetDemoActivity,
  startAttempt,
  submitAnswer,
  submitProfile,
  submitTimeout,
} from './api'
import LoadingState from './components/LoadingState'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import QuestionPage from './pages/QuestionPage'
import RankPage from './pages/RankPage'
import ResultPage from './pages/ResultPage'
import RulePage from './pages/RulePage'
import './quiz.css'

const DEFAULT_ACTIVITY_KEY = 'quiz_demo_dragon_boat'
const ATTEMPT_KEY_PREFIX = 'quiz_attempt_'
const FEEDBACK_DELAY_MS = 1500

export default function QuizApp() {
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
  const [ranks, setRanks] = useState([])
  const [rankLoading, setRankLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState('')

  const attemptStorageKey = `${ATTEMPT_KEY_PREFIX}${activityKey}`

  const showError = useCallback((err) => {
    setError(err?.message || '请求失败')
  }, [])

  const loadBootstrap = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getBootstrap(activityKey)
      setBootstrap(data)
      document.title = data?.activity?.title || '端午知识竞赛'
      if (data?.currentAttempt?.status === 'in_progress') {
        await resumeAttempt(data.currentAttempt.attemptId)
      } else {
        const storedAttemptId = localStorage.getItem(attemptStorageKey)
        if (storedAttemptId) await tryResumeStoredAttempt(storedAttemptId)
      }
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }, [activityKey, attemptStorageKey, showError])

  useEffect(() => {
    if (!getToken()) {
      setLoading(false)
      setError('请先通过微信授权进入活动')
      return
    }
    loadBootstrap()
  }, [loadBootstrap])

  async function tryResumeStoredAttempt(attemptId) {
    try {
      const data = await getCurrentAttempt(activityKey, attemptId)
      if (data.status === 'finished') {
        localStorage.removeItem(attemptStorageKey)
        return
      }
      setCurrent(data)
      setPage('question')
    } catch {
      localStorage.removeItem(attemptStorageKey)
    }
  }

  async function resumeAttempt(attemptId) {
    const data = await getCurrentAttempt(activityKey, attemptId)
    if (data.status === 'finished') {
      const resultData = await getResult(activityKey, attemptId)
      setResult(resultData)
      localStorage.removeItem(attemptStorageKey)
      setPage('result')
      return
    }
    localStorage.setItem(attemptStorageKey, attemptId)
    setCurrent(data)
    setPage('question')
  }

  function startAuthorize() {
    const redirectUrl = encodeURIComponent(sanitizeUrlForWechat(window.location.href))
    window.location.href = `${API_BASE_URL}/wechat/oauth/redirect?activity_key=${encodeURIComponent(activityKey)}&redirect_url=${redirectUrl}`
  }

  async function handleStart() {
    setError('')
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
      localStorage.setItem(attemptStorageKey, attemptId)
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
    setError('')
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
    setError('')
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
    setError('')
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
      setResult(data)
      localStorage.removeItem(attemptStorageKey)
      setFeedback(null)
      setPage('result')
      loadBootstrap().catch(() => {})
    } catch (err) {
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function openRank() {
    setRankLoading(true)
    setError('')
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
    setError('')
    try {
      await resetDemoActivity(activityKey)
      localStorage.removeItem(attemptStorageKey)
      setCurrent(null)
      setResult(null)
      setFeedback(null)
      setPage('home')
      await loadBootstrap()
      setError('当前答题活动已重置')
    } catch (err) {
      showError(err)
    } finally {
      setSubmitting(false)
    }
  }

  function backHome() {
    setPage('home')
    setFeedback(null)
  }

  if (loading) return <LoadingState text="答题活动加载中..." />

  return (
    <div className="quiz-app">
      {error ? (
        <div className="quiz-error-bar">
          <span>{error}</span>
          {!getToken() ? <button type="button" onClick={startAuthorize}>去授权</button> : null}
          <button type="button" onClick={() => setError('')}>关闭</button>
        </div>
      ) : null}
      {page === 'home' ? (
        <HomePage
          bootstrap={bootstrap}
          debug={debug}
          onOpenRule={() => setPage('rule')}
          onStart={handleStart}
          onOpenRank={openRank}
          onResume={() => resumeAttempt(bootstrap.currentAttempt.attemptId).catch(showError)}
          onReset={handleReset}
        />
      ) : null}
      {page === 'rule' ? <RulePage onBack={backHome} /> : null}
      {page === 'profile' ? (
        <ProfilePage participant={bootstrap?.participant} submitting={submitting} onSubmit={handleProfileSubmit} onBack={backHome} />
      ) : null}
      {page === 'question' ? (
        <QuestionPage current={current} feedback={feedback} submitting={submitting} onAnswer={handleAnswer} onTimeout={handleTimeout} />
      ) : null}
      {page === 'result' ? <ResultPage result={result} onOpenRank={openRank} onBack={backHome} /> : null}
      {page === 'rank' ? <RankPage ranks={ranks} loading={rankLoading} onBack={backHome} /> : null}
    </div>
  )
}
