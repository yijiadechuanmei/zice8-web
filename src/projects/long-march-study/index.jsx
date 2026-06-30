import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getVisitorId, trackPageView } from '../../shared/analytics'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import { enableMobileDebug } from '../../shared/debug/mobileDebug'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl } from '../../shared/utils/url'
import { setToken } from '../../shared/api/request'
import {
  answerQuiz,
  checkinLocation,
  finishQuiz,
  generateHonor,
  getBootstrap,
  getMine,
  getPublicConfig,
  getRank,
  resetDebugData,
  saveProfile,
  startQuiz,
  submitRecording,
  voteRecording,
} from './api'
import { LONG_MARCH_STUDY_ACTIVITY_KEY, longMarchStudyAssets } from './config'
import './styles.css'

const PAGE = {
  HOME: 'home',
  QUIZ: 'quiz',
  QUIZ_RESULT: 'quizResult',
  CHECKIN: 'checkin',
  CHECKIN_RESULT: 'checkinResult',
  RADIO: 'radio',
  UPLOAD: 'upload',
  HONORS: 'honors',
  RANK: 'rank',
  MINE: 'mine',
}

const DEBUG_RESET_CONFIRM_TOKEN = 'RESET_LONG_MARCH_2026'
const DEBUG_RESET_ALL_CONFIRM_TEXT = '重置全部'
const RADIO_STAGE_WIDTH = 750
const RADIO_STAGE_HEIGHT = 1448

function getWx() {
  return typeof window !== 'undefined' ? window.wx : null
}

function useStageScale(baseWidth = 750) {
  const resolve = () => (typeof window === 'undefined' ? 1 : Math.min(window.innerWidth, baseWidth) / baseWidth)
  const [scale, setScale] = useState(resolve)

  useEffect(() => {
    const update = () => setScale(resolve())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [baseWidth])

  return scale
}

export default function LongMarchStudyApp({ routeParams }) {
  const activityKey = routeParams?.activityKey || LONG_MARCH_STUDY_ACTIVITY_KEY
  const visitorId = useMemo(() => getVisitorId(), [])
  const debugEnabled = useMemo(() => ['1', 'mobile'].includes(getQueryParam('debug')), [])
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [page, setPage] = useState(PAGE.HOME)
  const [showProfile, setShowProfile] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [showDailyDone, setShowDailyDone] = useState(false)
  const [poster, setPoster] = useState(null)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [quizState, setQuizState] = useState(null)
  const [quizResult, setQuizResult] = useState(null)
  const [checkinResult, setCheckinResult] = useState(null)
  const [mine, setMine] = useState(null)
  const [shareStatus, setShareStatus] = useState({})

  useEffect(() => {
    if (window.location.pathname.startsWith('/long-march-study/')) {
      const canonicalPath = `/long_march_study/${encodeURIComponent(activityKey)}`
      window.history.replaceState(
        null,
        '',
        `${canonicalPath}${window.location.search}${window.location.hash}`,
      )
    }
  }, [activityKey])

  useEffect(() => {
    const token = getTokenFromUrl()
    if (token) setToken(token)
  }, [])

  useEffect(() => {
    if (getQueryParam('debug') === '1' || getQueryParam('debug') === 'mobile') {
      enableMobileDebug()
    }
  }, [])

  useEffect(() => {
    getPublicConfig(activityKey)
      .then(setPublicConfig)
      .catch((error) => setToast(error.message || '活动配置加载失败'))
  }, [activityKey])

  const { authReady, blockedMessage } = useWechatAuth(activityKey, publicConfig)

  const refresh = useCallback(async () => {
    if (!authReady) return
    setLoading(true)
    try {
      const data = await getBootstrap(activityKey, visitorId)
      setBootstrap(data)
    } catch (error) {
      setToast(error.message || '活动加载失败')
    } finally {
      setLoading(false)
    }
  }, [activityKey, authReady, visitorId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    trackPageView(activityKey, '/long-march-study', { pageKey: page })
  }, [activityKey, page])

  const shareActivity = useMemo(() => {
    const activity = bootstrap?.activity || publicConfig || {}
    return {
      ...activity,
      shareTitle: activity.shareTitle || '重走长征路 共筑爱国魂',
      shareDesc: activity.shareDesc || '完成红色任务，赢取积分与荣誉',
      shareImage: activity.shareImage,
    }
  }, [bootstrap, publicConfig])
  const handleWechatShareStatus = useCallback((nextStatus) => {
    setShareStatus((current) => ({ ...current, ...nextStatus }))
  }, [])
  useWechatShare(activityKey, shareActivity, handleWechatShareStatus)

  const config = bootstrap?.config || {}
  const profile = bootstrap?.profile
  const bgm = config.bgm || { enabled: false }

  const clearRuntimeState = useCallback(() => {
    setPage(PAGE.HOME)
    setShowProfile(false)
    setShowTasks(false)
    setShowRules(false)
    setShowDailyDone(false)
    setPoster(null)
    setQuizState(null)
    setQuizResult(null)
    setCheckinResult(null)
    setMine(null)
  }, [])

  const openJourney = () => {
    if (!profile) {
      setShowProfile(true)
      return
    }
    setShowTasks(true)
  }

  const openMine = async () => {
    if (!profile) {
      setShowProfile(true)
      return
    }
    try {
      const data = await getMine(activityKey, visitorId)
      setMine(data)
      setPage(PAGE.MINE)
    } catch (error) {
      setToast(error.message || '我的信息加载失败')
    }
  }

  const openRank = async () => {
    try {
      const data = await getRank(activityKey, visitorId)
      setBootstrap((current) => ({ ...current, rank: data }))
      setPage(PAGE.RANK)
    } catch (error) {
      setToast(error.message || '排行榜加载失败')
    }
  }

  const showPoster = (source = 'journey') => {
    const snapshot = {
      name: profile?.name || '',
      nickname: mine?.wechat?.nickname || '',
      avatar: mine?.wechat?.avatar || '',
      challengeDays: profile?.challengeDays || 0,
      totalPoints: profile?.totalPoints || 0,
      source,
    }
    setPoster(snapshot)
  }

  const resetDebugScope = async (scope) => {
    try {
      await resetDebugData(activityKey, {
        visitorId,
        confirmToken: DEBUG_RESET_CONFIRM_TOKEN,
        scope,
      })
      clearRuntimeState()
      await refresh()
      setToast(scope === 'activity' ? '全部调试数据已重置' : '我的调试数据已重置')
    } catch (error) {
      setToast(error.message || '重置失败')
    }
  }

  const resetAllDebugData = async () => {
    const firstConfirmed = window.confirm('确认重置本活动全部用户数据？该操作会清空全部长征研学档案、积分、答题、打卡、录音、投票和荣誉。')
    if (!firstConfirmed) return
    const secondConfirmed = window.prompt(`二次确认：请输入“${DEBUG_RESET_ALL_CONFIRM_TEXT}”`)
    if (secondConfirmed !== DEBUG_RESET_ALL_CONFIRM_TEXT) {
      setToast('二次确认未通过')
      return
    }
    await resetDebugScope('activity')
  }

  if (blockedMessage) return <MessageScreen title={blockedMessage} />
  if (loading && !bootstrap) return <MessageScreen title="研学活动加载中" />

  return (
    <main className="lm-page">
      {page === PAGE.HOME ? (
        <HomePage
          onStart={openJourney}
          onRules={() => setShowRules(true)}
          onMine={openMine}
          onRank={openRank}
        />
      ) : null}
      {page === PAGE.QUIZ ? (
        <QuizPage
          activityKey={activityKey}
          visitorId={visitorId}
          quizState={quizState}
          setQuizState={setQuizState}
          onResult={(result) => {
            setQuizResult(result)
            setBootstrap((current) => ({ ...current, profile: result.profile }))
            setPage(PAGE.QUIZ_RESULT)
          }}
          onBack={() => setPage(PAGE.HOME)}
          onDailyDone={() => setShowDailyDone(true)}
          onToast={setToast}
        />
      ) : null}
      {page === PAGE.QUIZ_RESULT ? (
        <QuizResultPage result={quizResult} onRank={() => setPage(PAGE.RANK)} onBack={() => setPage(PAGE.HOME)} />
      ) : null}
      {page === PAGE.CHECKIN ? (
        <CheckinPage
          config={config}
          nextCheckin={bootstrap?.nextCheckin}
          onCheckin={async (location) => {
            try {
              const result = await checkinLocation(activityKey, location.key, { visitorId })
              setCheckinResult(result)
              setBootstrap((current) => ({
                ...current,
                profile: result.profile,
                nextCheckin: result.nextCheckin,
              }))
              setPage(PAGE.CHECKIN_RESULT)
            } catch (error) {
              setToast(error.message || '打卡失败')
            }
          }}
        />
      ) : null}
      {page === PAGE.CHECKIN_RESULT ? (
        <CheckinResultPage result={checkinResult} onPoster={() => showPoster('checkin')} onRank={() => setPage(PAGE.RANK)} onBack={() => setPage(PAGE.HOME)} />
      ) : null}
      {page === PAGE.RADIO ? (
        <RadioPage
          activityKey={activityKey}
          visitorId={visitorId}
          config={config}
          recordings={bootstrap?.recordings}
          onUpload={() => setPage(PAGE.UPLOAD)}
          onBack={() => setPage(PAGE.HOME)}
          onVote={async (recording) => {
            try {
              const data = await voteRecording(activityKey, recording.id, { visitorId })
              setToast('已送出红星')
              setBootstrap((current) => ({
                ...current,
                recordings: {
                  ...current.recordings,
                  myVoteRecordingId: data.vote.recordingId,
                  all: current.recordings.all.map((item) => item.id === data.recording.id ? data.recording : item),
                  featured: current.recordings.featured.map((item) => item.id === data.recording.id ? data.recording : item),
                },
              }))
            } catch (error) {
              setToast(error.message || '投票失败')
            }
          }}
        />
      ) : null}
      {page === PAGE.UPLOAD ? (
        <UploadPage
          activityKey={activityKey}
          visitorId={visitorId}
          scripts={config.radioScripts || []}
          onDone={async () => {
            await refresh()
            setPage(PAGE.RADIO)
          }}
          onBack={() => setPage(PAGE.RADIO)}
          onToast={setToast}
        />
      ) : null}
      {page === PAGE.HONORS ? (
        <HonorsPage
          honors={bootstrap?.honors || []}
          onGenerate={async () => {
            try {
              const data = await generateHonor(activityKey, { visitorId, honorType: 'poster' })
              setBootstrap((current) => ({ ...current, honors: [data.honor, ...(current.honors || [])] }))
              setPoster(data.honor.snapshot)
            } catch (error) {
              setToast(error.message || '生成海报失败')
            }
          }}
          onOpen={(honor) => setPoster(honor.snapshot)}
        />
      ) : null}
      {page === PAGE.RANK ? <RankPage rank={bootstrap?.rank} /> : null}
      {page === PAGE.MINE ? (
        <MinePage
          mine={mine}
          onPage={setPage}
          onPoster={() => showPoster('mine')}
        />
      ) : null}

      {page !== PAGE.HOME && ![PAGE.QUIZ, PAGE.RADIO, PAGE.UPLOAD].includes(page) ? <button className="lm-back" type="button" onClick={() => setPage(PAGE.HOME)}>返回首页</button> : null}

      {showProfile ? (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          onSubmit={async (payload) => {
            try {
              const data = await saveProfile(activityKey, { ...payload, visitorId })
              setBootstrap((current) => ({ ...current, profile: data.profile }))
              setShowProfile(false)
              setShowTasks(true)
            } catch (error) {
              setToast(error.message || '资料提交失败')
            }
          }}
        />
      ) : null}
      {showTasks ? (
        <TaskModal
          onClose={() => setShowTasks(false)}
          onSelect={async (nextPage) => {
            setShowTasks(false)
            if (nextPage === PAGE.QUIZ) setQuizState(null)
            setPage(nextPage)
          }}
        />
      ) : null}
      {showRules ? <RulesModal rules={config.rules || []} onClose={() => setShowRules(false)} /> : null}
      {showDailyDone ? <DailyDoneModal onBack={() => { setShowDailyDone(false); setPage(PAGE.HOME) }} /> : null}
      {poster ? <PosterModal poster={poster} onClose={() => setPoster(null)} /> : null}
      {toast ? <Toast text={toast} onClose={() => setToast('')} /> : null}
      {debugEnabled ? (
        <DebugPanel
          activityKey={activityKey}
          page={page}
          visitorId={visitorId}
          identityKey={bootstrap?.identityKey}
          profile={profile}
          authReady={authReady}
          shareStatus={shareStatus}
          onResetMine={() => resetDebugScope('me')}
          onResetAll={resetAllDebugData}
          onLogState={() => console.log('[long-march-study debug state]', {
            activityKey,
            visitorId,
            page,
            bootstrap,
            profile,
            shareStatus,
          })}
        />
      ) : null}
      <ActivityBgmPlayer bgm={bgm} activityKey={activityKey} />
    </main>
  )
}

function DebugPanel({
  activityKey,
  page,
  visitorId,
  identityKey,
  profile,
  authReady,
  shareStatus,
  onResetMine,
  onResetAll,
  onLogState,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const shareLabel = shareStatus.shareConfigured
    ? '已配置'
    : shareStatus.wxConfigStatus === 'failed'
      ? '配置失败'
      : '初始化中'
  const userLabel = profile ? `已记录：${profile.name}` : '未提交资料'

  return (
    <div className={`lm-debug-panel ${collapsed ? 'is-collapsed' : ''}`}>
      <button className="lm-debug-header" type="button" onClick={() => setCollapsed((current) => !current)}>
        <span className="lm-debug-title">DEBUG</span>
        <span className="lm-debug-summary">{page} · {shareLabel}</span>
        <span className="lm-debug-toggle">{collapsed ? '展开' : '收起'}</span>
      </button>
      {!collapsed ? (
        <>
          <div className="lm-debug-meta">
            <div>activityKey: {activityKey}</div>
            <div>page: {page}</div>
            <div>visitorId: {visitorId}</div>
            <div>identity: {identityKey || '-'}</div>
            <div>用户记录: {userLabel}</div>
            <div>微信授权: {authReady ? 'ready' : 'pending'}</div>
            <div>微信分享: {shareLabel}</div>
            <div>shareTitle: {shareStatus.shareTitle || '-'}</div>
          </div>
          <div className="lm-debug-actions">
            <button type="button" onClick={onResetMine}>重置我的数据</button>
            <button className="is-danger" type="button" onClick={onResetAll}>重置全部数据</button>
            <button className="is-dark" type="button" onClick={onLogState}>console.log 状态</button>
          </div>
        </>
      ) : null}
    </div>
  )
}

function HomePage({ onStart, onRules, onMine, onRank }) {
  return (
    <section
      className="lm-home"
      style={{ backgroundImage: `url(${longMarchStudyAssets.home.background})` }}
    >
      <img className="lm-home-title-image" src={longMarchStudyAssets.home.title} alt="重走长征路 共筑爱国魂" />
      <div className="lm-home-side-actions" aria-label="首页快捷入口">
        <button type="button" onClick={onRules} aria-label="活动规则">
          <img src={longMarchStudyAssets.home.rulesButton} alt="" />
        </button>
        <button type="button" onClick={onMine} aria-label="我的">
          <img src={longMarchStudyAssets.home.mineButton} alt="" />
        </button>
        <button type="button" onClick={onRank} aria-label="排行榜">
          <img src={longMarchStudyAssets.home.rankButton} alt="" />
        </button>
      </div>
      <button className="lm-home-start" type="button" onClick={onStart} aria-label="开启研学之旅">
        <img src={longMarchStudyAssets.home.startButton} alt="" />
      </button>
    </section>
  )
}

function ProfileModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  return (
    <Modal title="填写研学信息" onClose={onClose} variant="profile">
      <div className="lm-profile-form">
        <label className="lm-field">
          <span className="lm-field-label">姓名</span>
          <input placeholder="姓名（必填）" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="lm-field">
          <span className="lm-field-label">电话</span>
          <input placeholder="电话（必填）" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" />
        </label>
      </div>
      <button className="lm-profile-submit" type="button" onClick={() => onSubmit({ name, phone })}>提&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;交</button>
    </Modal>
  )
}

function TaskModal({ onClose, onSelect }) {
  const tasks = longMarchStudyAssets.tasks
  return (
    <div className="lm-task-choice-mask">
      <section className="lm-task-choice" aria-label="玩法选择">
        <img className="lm-task-choice-bg" src={tasks.background} alt="" />
        <img className="lm-task-choice-title" src={tasks.title} alt="玩法选择" />
        <img className="lm-task-choice-route" src={tasks.route} alt="" />
        <button className="lm-task-choice-card is-quiz" type="button" onClick={() => onSelect(PAGE.QUIZ)} aria-label="每日红色答题">
          <img src={tasks.quiz} alt="" />
        </button>
        <button className="lm-task-choice-card is-checkin" type="button" onClick={() => onSelect(PAGE.CHECKIN)} aria-label="云上打卡·红色足迹">
          <img src={tasks.checkin} alt="" />
        </button>
        <button className="lm-task-choice-card is-radio" type="button" onClick={() => onSelect(PAGE.RADIO)} aria-label="云上红色电台">
          <img src={tasks.radio} alt="" />
        </button>
        <button className="lm-task-choice-card is-honors" type="button" onClick={() => onSelect(PAGE.HONORS)} aria-label="我的荣誉">
          <img src={tasks.honors} alt="" />
        </button>
        <button className="lm-task-choice-close" type="button" onClick={onClose}>返回首页</button>
      </section>
    </div>
  )
}

function QuizPage({ activityKey, visitorId, quizState, setQuizState, onResult, onBack, onDailyDone, onToast }) {
  const [index, setIndex] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const questions = quizState?.questions || []
  const question = questions[index]
  const questionCount = questions.length || 5
  const progressPercent = `${Math.min(index + 1, questionCount) / questionCount * 100}%`

  useEffect(() => {
    if (quizState) return
    setBusy(true)
    startQuiz(activityKey, { visitorId })
      .then((data) => setQuizState(data.attempt))
      .catch((error) => {
        if ((error.message || '').includes('今日已完成答题')) {
          onDailyDone()
          return
        }
        onToast(error.message || '今日答题不可用')
      })
      .finally(() => setBusy(false))
  }, [activityKey, onDailyDone, onToast, quizState, setQuizState, visitorId])

  const submitAnswer = async () => {
    if (!question || !selectedOptionId || submitting || feedback) return
    setSubmitting(true)
    try {
      const data = await answerQuiz(activityKey, quizState.id, {
        visitorId,
        questionId: question.id,
        selectedOptionId,
      })
      setQuizState(data.attempt)
      setFeedback(data.answer)
    } catch (error) {
      onToast(error.message || '提交答案失败')
    } finally {
      setSubmitting(false)
    }
  }

  const nextQuestion = async () => {
    setFeedback(null)
    setSelectedOptionId('')
    if (index + 1 >= questionCount) {
      const result = await finishQuiz(activityKey, quizState.id, { visitorId })
      onResult(result)
      return
    }
    setIndex(index + 1)
  }

  if (busy || !quizState || !question) {
    return (
      <section className="lm-quiz-page" style={{ backgroundImage: `url(${longMarchStudyAssets.quiz.background})` }}>
        <div className="lm-quiz-loading">题目加载中...</div>
      </section>
    )
  }

  return (
    <section className="lm-quiz-page" style={{ backgroundImage: `url(${longMarchStudyAssets.quiz.background})` }}>
      <div className="lm-quiz-stage">
        <button className="lm-quiz-back" type="button" onClick={onBack} aria-label="返回">←</button>
        <h1 className="lm-quiz-title">每日红色答题</h1>
        <div className="lm-quiz-progress-text">
          <span>答题进度</span>
          <strong>{index + 1}</strong>
          <span>/{questionCount}</span>
        </div>
        <div className="lm-quiz-progress-bar"><span style={{ width: progressPercent }} /></div>
        <img className="lm-quiz-card-bg" src={longMarchStudyAssets.quiz.card} alt="" />
        <div className="lm-quiz-content">
          <div className="lm-quiz-tag">单选题</div>
          <h2 className="lm-quiz-question">{index + 1}、{question.title}</h2>
          <div className="lm-quiz-options">
            {question.options.map((option, optionIndex) => {
              const letter = String.fromCharCode(65 + optionIndex)
              const isSelected = selectedOptionId === option.id
              const isCorrect = feedback?.answerId === option.id
              const isWrongSelected = feedback && isSelected && !feedback.correct
              return (
                <button
                  key={option.id}
                  className={`lm-quiz-option ${isSelected ? 'is-selected' : ''} ${isCorrect ? 'is-correct' : ''} ${isWrongSelected ? 'is-wrong' : ''}`}
                  type="button"
                  disabled={Boolean(feedback) || submitting}
                  onClick={() => setSelectedOptionId(option.id)}
                >
                  {isWrongSelected ? <span className="lm-quiz-option-mark is-wrong">×</span> : null}
                  {isCorrect ? <span className="lm-quiz-option-mark is-correct">✓</span> : null}
                  <span>{letter}.{option.text}</span>
                </button>
              )
            })}
          </div>
          <button
            className="lm-quiz-submit"
            type="button"
            disabled={!selectedOptionId || submitting || Boolean(feedback)}
            onClick={submitAnswer}
          >
            提&nbsp;&nbsp;&nbsp;&nbsp;交
          </button>
        </div>
      </div>
      {feedback ? (
        <QuizFeedbackModal question={question} feedback={feedback} onNext={nextQuestion} />
      ) : null}
    </section>
  )
}

function QuizFeedbackModal({ question, feedback, onNext }) {
  const answerIndex = (question?.options || []).findIndex((option) => option.id === feedback?.answerId)
  const answerLetter = answerIndex >= 0 ? String.fromCharCode(65 + answerIndex) : (feedback?.answerId || '').toUpperCase()
  return (
    <div className="lm-quiz-modal-mask">
      <section className="lm-quiz-feedback-panel" style={{ backgroundImage: `url(${longMarchStudyAssets.quiz.feedbackPanel})` }}>
        <div className="lm-quiz-feedback-status">{feedback.correct ? '回答正确' : '回答错误'}</div>
        <div className="lm-quiz-feedback-answer">
          <span>正确答案：</span><strong>{answerLetter}</strong>
        </div>
        <div className="lm-quiz-analysis">
          <strong>知识解析卡：</strong>
          <p>{feedback.analysis}</p>
        </div>
        <button className="lm-quiz-feedback-next" type="button" onClick={onNext}>下一题</button>
      </section>
    </div>
  )
}

function QuizResultPage({ result, onRank, onBack }) {
  const data = result?.result
  return (
    <div className="lm-quiz-modal-mask">
      <section className="lm-quiz-success-panel" style={{ backgroundImage: `url(${longMarchStudyAssets.quiz.successPanel})` }}>
        <h2>闯关成功</h2>
        <img src={longMarchStudyAssets.quiz.successMedal} alt="" />
        <div className="lm-quiz-success-correct">
          <span>答对：</span>
          <strong>{data?.correctCount || 0}</strong>
          <span>题</span>
        </div>
        <div className="lm-quiz-success-label">获得</div>
        <div className="lm-quiz-success-points-box" />
        <div className="lm-quiz-success-points"><strong>{data?.pointsEarned || 0}</strong><span>积分</span></div>
        <button className="lm-quiz-result-rank" type="button" onClick={onRank}>排行榜</button>
        <button className="lm-quiz-result-back" type="button" onClick={onBack}>返回首页</button>
      </section>
    </div>
  )
}

function DailyDoneModal({ onBack }) {
  return (
    <div className="lm-quiz-modal-mask">
      <section className="lm-quiz-done-panel" style={{ backgroundImage: `url(${longMarchStudyAssets.quiz.dailyDonePanel})` }}>
        <p>今日答题已完成<br />明天再来吧</p>
        <button type="button" onClick={onBack}>返回首页</button>
      </section>
    </div>
  )
}

function CheckinPage({ config, nextCheckin, onCheckin }) {
  const locations = config.locations || []
  return (
    <Panel title="云上打卡·红色足迹">
      <div className="lm-map">
        {locations.map((location, index) => (
          <button
            key={location.key}
            className={nextCheckin?.key === location.key ? 'is-next' : ''}
            type="button"
            onClick={() => nextCheckin?.key === location.key ? onCheckin(location) : null}
          >
            <span>{index + 1}</span>{location.title}
          </button>
        ))}
      </div>
      {nextCheckin ? (
        <div className="lm-location">
          <img src={nextCheckin.image} alt={nextCheckin.title} />
          <h2>{nextCheckin.title}</h2>
          <p>{nextCheckin.description}</p>
          <button className="lm-primary" type="button" onClick={() => onCheckin(nextCheckin)}>完成今日打卡</button>
        </div>
      ) : <p>所有地点已完成打卡。</p>}
    </Panel>
  )
}

function CheckinResultPage({ result, onPoster, onRank, onBack }) {
  return (
    <Panel title="打卡完成">
      <div className="lm-score">+{result?.checkin?.pointsEarned || 0}</div>
      <p>当前总积分：{result?.profile?.totalPoints || 0}</p>
      <div className="lm-actions">
        <button type="button" onClick={onPoster}>海报分享</button>
        <button type="button" onClick={onRank}>排行榜</button>
        <button type="button" onClick={onBack}>返回</button>
      </div>
    </Panel>
  )
}

function RadioShell({ title = '云上红色电台', onBack, children }) {
  const scale = useStageScale(RADIO_STAGE_WIDTH)
  return (
    <div className="lm-radio-viewport" style={{ width: RADIO_STAGE_WIDTH * scale, height: RADIO_STAGE_HEIGHT * scale }}>
      <section
        className="lm-radio-page"
        style={{
          backgroundImage: `url(${longMarchStudyAssets.radio.background})`,
          transform: `scale(${scale})`,
          '--lm-radio-back-icon': `url("${longMarchStudyAssets.radio.backIcon}")`,
        }}
      >
        <button className="lm-radio-back" type="button" onClick={onBack} aria-label="返回">
          <span aria-hidden="true" />
        </button>
        <div className="lm-radio-title">{title}</div>
        {children}
      </section>
    </div>
  )
}

function RadioPage({ recordings, onUpload, onVote, onBack }) {
  const [tab, setTab] = useState('featured')
  const [selectedRecordingId, setSelectedRecordingId] = useState('')
  const rows = tab === 'featured' ? recordings?.featured || [] : recordings?.all || []
  const allRows = [...(recordings?.featured || []), ...(recordings?.all || [])]
  const selectedRecording = selectedRecordingId
    ? allRows.find((item) => item.id === selectedRecordingId) || null
    : null

  if (selectedRecording) {
    return (
      <RadioDetailPage
        recording={selectedRecording}
        myVote={recordings?.myVoteRecordingId}
        onBack={() => setSelectedRecordingId('')}
        onVote={onVote}
      />
    )
  }

  return (
    <RadioShell onBack={onBack}>
      <div className="lm-radio-panel">
        <div className="lm-radio-tabs">
          <button className={tab === 'featured' ? 'is-active' : ''} type="button" onClick={() => setTab('featured')}>精选板块</button>
          <button className={tab === 'all' ? 'is-active' : ''} type="button" onClick={() => setTab('all')}>全部录音</button>
        </div>
        <RecordingList
          rows={rows}
          myVote={recordings?.myVoteRecordingId}
          onOpen={(recording) => setSelectedRecordingId(recording.id)}
          onVote={onVote}
        />
      </div>
      <button className="lm-radio-bottom-button" type="button" onClick={onUpload}>点击参赛</button>
    </RadioShell>
  )
}

function useUrlAudioPlayer() {
  const audioRef = useRef(null)
  const [playingId, setPlayingId] = useState('')

  useEffect(() => {
    const audio = new Audio()
    const clearPlaying = () => setPlayingId('')
    audioRef.current = audio
    audio.addEventListener('ended', clearPlaying)
    audio.addEventListener('error', clearPlaying)
    return () => {
      audio.pause()
      audio.removeEventListener('ended', clearPlaying)
      audio.removeEventListener('error', clearPlaying)
      audioRef.current = null
    }
  }, [])

  const toggleAudio = useCallback(async (recording, onMissing) => {
    if (!recording?.audioUrl) {
      onMissing?.()
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (playingId === recording.id && !audio.paused) {
      audio.pause()
      setPlayingId('')
      return
    }
    audio.pause()
    audio.src = recording.audioUrl
    audio.currentTime = 0
    try {
      await audio.play()
      setPlayingId(recording.id)
    } catch {
      setPlayingId('')
      onMissing?.('音频播放失败')
    }
  }, [playingId])

  return { playingId, toggleAudio }
}

function RecordingList({ rows, myVote, onOpen, onVote }) {
  const { playingId, toggleAudio } = useUrlAudioPlayer()

  if (!rows.length) {
    return <div className="lm-radio-empty">暂无审核通过的录音</div>
  }
  return (
    <div className="lm-radio-recordings">
      {rows.map((recording, index) => (
        <article
          className="lm-radio-row"
          key={recording.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(recording)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onOpen(recording)
            }
          }}
        >
          <div className="lm-radio-row-rank">
            <img src={longMarchStudyAssets.radio.rankBadge} alt="" />
            <span>{String(index + 1).padStart(2, '0')}</span>
          </div>
          <button
            className="lm-radio-row-play"
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              toggleAudio(recording)
            }}
            aria-label={playingId === recording.id ? '暂停音频' : '播放音频'}
          >
            <img src={playingId === recording.id ? longMarchStudyAssets.radio.pause : longMarchStudyAssets.radio.play} alt="" />
          </button>
          <div className="lm-radio-row-main">
            <strong>{recording.authorName || recording.title || '昵称'}</strong>
            <small>{recording.audioUrl ? recording.title || '点击查看录音详情' : recording.mediaId ? '微信录音待同步' : '录音审核中'}</small>
          </div>
          <div className="lm-radio-row-votes">
            <span aria-hidden="true">★</span>
            <em>{recording.voteCount || 0}</em>
          </div>
          <button
            className="lm-radio-row-vote"
            type="button"
            disabled={Boolean(myVote)}
            onClick={(event) => {
              event.stopPropagation()
              onVote(recording)
            }}
          >
            {myVote === recording.id ? '已送出' : '送红星'}
          </button>
        </article>
      ))}
    </div>
  )
}

function RadioDetailPage({ recording, myVote, onBack, onVote }) {
  const { playingId, toggleAudio } = useUrlAudioPlayer()
  const isPlaying = playingId === recording.id
  return (
    <RadioShell title="录音详情" onBack={onBack}>
      <section className="lm-radio-detail-panel">
        <button
          className="lm-radio-detail-play"
          type="button"
          onClick={() => toggleAudio(recording)}
          aria-label={isPlaying ? '暂停音频' : '播放音频'}
        >
          <img src={isPlaying ? longMarchStudyAssets.radio.pause : longMarchStudyAssets.radio.play} alt="" />
        </button>
        <h2>{recording.authorName || '昵称'}</h2>
        <p>{recording.title || '我的红色电台'}</p>
        <div className="lm-radio-detail-meta">
          <span>{recording.durationSec ? `${recording.durationSec}秒` : '录音作品'}</span>
          <span>{recording.voteCount || 0} 颗红星</span>
        </div>
        <button
          className="lm-radio-detail-vote"
          type="button"
          disabled={Boolean(myVote)}
          onClick={() => onVote(recording)}
        >
          {myVote === recording.id ? '已送出红星' : '送出红星'}
        </button>
      </section>
    </RadioShell>
  )
}

function RadioNoticeModal({ message, onClose }) {
  if (!message) return null
  return (
    <div className="lm-radio-notice-mask">
      <section className="lm-radio-notice-panel" style={{ backgroundImage: `url(${longMarchStudyAssets.radio.noticePanel})` }}>
        <p>{message}</p>
        <button type="button" onClick={onClose}>
          <img src={longMarchStudyAssets.radio.noticeButton} alt="" />
          <span>返回首页</span>
        </button>
      </section>
    </div>
  )
}

function formatWxError(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error.errMsg) return error.errMsg
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function UploadPage({ activityKey, visitorId, scripts, onDone, onBack, onToast }) {
  const [scriptKey, setScriptKey] = useState(scripts[0]?.key || '')
  const [step, setStep] = useState('scripts')
  const [recording, setRecording] = useState(false)
  const [localId, setLocalId] = useState('')
  const [mediaId, setMediaId] = useState('')
  const [recordDurationSec, setRecordDurationSec] = useState(0)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notice, setNotice] = useState('')
  const startedAtRef = useRef(0)
  const activeScript = scripts.find((item) => item.key === scriptKey) || scripts[0]
  const hasRecording = Boolean(localId || mediaId)

  useEffect(() => {
    const wx = getWx()
    if (wx?.onVoicePlayEnd) {
      wx.onVoicePlayEnd({
        success: (res) => {
          if (!res?.localId || res.localId === localId) {
            setPreviewPlaying(false)
          }
        },
      })
    }
    if (wx?.onVoiceRecordEnd) {
      wx.onVoiceRecordEnd({
        complete: (res) => {
          if (res?.localId) {
            setLocalId(res.localId)
            setRecordDurationSec(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))
            setRecording(false)
          }
        },
      })
    }
    return undefined
  }, [localId])

  const start = () => {
    if (recording) return
    const wx = getWx()
    startedAtRef.current = Date.now()
    setLocalId('')
    setMediaId('')
    setRecordDurationSec(0)
    setPreviewPlaying(false)
    if (wx?.startRecord) {
      wx.startRecord({
        success: () => {
          setRecording(true)
          onToast('录音已开始')
        },
        cancel: () => {
          onToast('用户拒绝录音授权')
        },
        fail: (error) => {
          const message = formatWxError(error) || '开始录音失败'
          onToast(message)
        },
      })
      return
    }
    setLocalId(`debug-local-${Date.now()}`)
    setRecording(true)
    onToast('当前非微信环境，已进入调试录音模式')
  }

  const stop = () => {
    if (!recording) return
    const wx = getWx()
    const nextDuration = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
    if (wx?.stopRecord) {
      wx.stopRecord({
        success: (res) => {
          setLocalId(res.localId)
          setRecordDurationSec(nextDuration)
          setRecording(false)
          onToast(res.localId ? '录音已完成' : '录音结束但未获取到音频')
        },
        fail: (error) => {
          const message = formatWxError(error) || '停止录音失败'
          setRecording(false)
          onToast(message)
        },
      })
      return
    }
    setLocalId(`debug-local-${Date.now()}`)
    setRecordDurationSec(nextDuration)
    setRecording(false)
    onToast('调试录音已完成')
  }

  const playPreview = () => {
    const wx = getWx()
    if (wx?.playVoice && localId) {
      wx.playVoice({
        localId,
        fail: (error) => {
          const message = formatWxError(error) || '播放录音失败'
          setPreviewPlaying(false)
          onToast(message)
        },
      })
      setPreviewPlaying(true)
      return
    }
    const message = localId ? '当前环境暂不支持试听微信录音' : '请先完成录音'
    onToast(message)
  }

  const pausePreview = () => {
    const wx = getWx()
    if (wx?.pauseVoice && localId) wx.pauseVoice({ localId })
    setPreviewPlaying(false)
  }

  const resetRecording = () => {
    const wx = getWx()
    if (wx?.stopVoice && localId) wx.stopVoice({ localId })
    setRecording(false)
    setLocalId('')
    setMediaId('')
    setRecordDurationSec(0)
    setPreviewPlaying(false)
  }

  const upload = async () => {
    if (uploading) return
    if (!localId && !mediaId) {
      onToast('请先完成录音')
      return
    }
    const submit = async (nextMediaId) => {
      await submitRecording(activityKey, {
        visitorId,
        title: activeScript?.title || '我的红色电台',
        scriptKey: activeScript?.key,
        mediaId: nextMediaId,
        durationSec: recordDurationSec,
      })
      setNotice('录音审核中\n审核通过后即可获得积分')
    }

    const wx = getWx()
    setUploading(true)
    if (wx?.uploadVoice && localId && !mediaId) {
      wx.uploadVoice({
        localId,
        isShowProgressTips: 1,
        success: async (res) => {
          try {
            const nextMediaId = res.serverId
            setMediaId(nextMediaId)
            if (!nextMediaId) throw new Error('微信上传未返回 serverId')
            await submit(nextMediaId)
          } catch (error) {
            if ((error.message || '').includes('只能上传一次')) {
              setNotice('每人只能上传一次')
              return
            }
            onToast(error.message || '上传失败')
          } finally {
            setUploading(false)
          }
        },
        fail: (error) => {
          const message = formatWxError(error) || '微信录音上传失败'
          setUploading(false)
          onToast(message)
        },
      })
      return
    }

    try {
      if (wx && localId && !mediaId && !wx.uploadVoice) {
        throw new Error('微信上传接口未就绪，请刷新页面后重试')
      }
      if (!wx && localId && !mediaId) {
        throw new Error('请在微信内完成录音上传')
      }
      await submit(mediaId || localId || `debug-media-${Date.now()}`)
    } catch (error) {
      if ((error.message || '').includes('只能上传一次')) {
        setNotice('每人只能上传一次')
        return
      }
      onToast(error.message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const primaryRecordAction = () => {
    if (recording) {
      stop()
      return
    }
    if (hasRecording) {
      upload()
      return
    }
    start()
  }

  return (
    <RadioShell onBack={step === 'scripts' ? onBack : () => setStep('scripts')}>
      {step === 'scripts' ? (
        <>
          <div className="lm-radio-script-panel">
            <h2>请选择参赛文稿</h2>
            <div className="lm-radio-script-list">
              {scripts.map((script) => (
                <button
                  className={script.key === activeScript?.key ? 'is-active' : ''}
                  key={script.key}
                  type="button"
                  onClick={() => setScriptKey(script.key)}
                >
                  <strong>{script.title}</strong>
                  <span>{script.content}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="lm-radio-bottom-button" type="button" onClick={() => setStep('record')}>进入录音</button>
        </>
      ) : (
        <>
          <div className="lm-radio-record-panel">
            <h2>{activeScript?.title || '文稿一'}</h2>
            <p>{activeScript?.content || '知识解析内容'}</p>
          </div>
          <div className="lm-radio-record-visual">
            {!recording && !hasRecording ? (
              <button className="is-base" type="button" onClick={start} aria-label="开始录音">
                <img src={longMarchStudyAssets.radio.recordBase} alt="" />
              </button>
            ) : null}
            {recording ? (
              <>
                <img className="is-mic" src={longMarchStudyAssets.radio.recordMic} alt="" />
                <img className="is-wave" src={longMarchStudyAssets.radio.recordWave} alt="" />
                <button className="lm-radio-record-hit" type="button" onClick={stop} aria-label="暂停录音" />
              </>
            ) : null}
            {!recording && hasRecording ? (
              <>
                <button className="is-people" type="button" onClick={previewPlaying ? pausePreview : playPreview} aria-label={previewPlaying ? '暂停试听' : '播放试听'}>
                  <img src={longMarchStudyAssets.radio.recordPeople} alt="" />
                </button>
                <button className="is-note" type="button" onClick={resetRecording} aria-label="取消录音">
                  <img src={longMarchStudyAssets.radio.recordNote} alt="" />
                </button>
              </>
            ) : null}
          </div>
          <div className="lm-radio-record-status">
            {recording ? '录音中，点击暂停完成录制' : hasRecording ? '录音已完成，可以试听或上传' : '请点击开始录音'}
          </div>
          <button className="lm-radio-confirm-button" type="button" onClick={primaryRecordAction} disabled={uploading}>
            {uploading ? '上传中' : recording ? '暂停录音' : hasRecording ? '确认上传' : '开始录音'}
          </button>
          <button className="lm-radio-return-button" type="button" onClick={() => setStep('scripts')}>返回</button>
        </>
      )}
      <RadioNoticeModal
        message={notice}
        onClose={async () => {
          const shouldDone = notice.includes('审核中')
          setNotice('')
          if (shouldDone) await onDone()
        }}
      />
    </RadioShell>
  )
}

function HonorsPage({ honors, onGenerate, onOpen }) {
  return (
    <Panel title="我的荣誉">
      <button className="lm-primary" type="button" onClick={onGenerate}>生成当前海报</button>
      <div className="lm-honors">
        {honors.map((honor) => (
          <button key={honor.id} type="button" onClick={() => onOpen(honor)}>
            <strong>{honor.title}</strong>
            <span>{honor.createdAt}</span>
          </button>
        ))}
      </div>
    </Panel>
  )
}

function RankPage({ rank }) {
  return (
    <Panel title="积分排行榜">
      <div className="lm-rank">
        {(rank?.rows || []).map((row) => (
          <div key={row.id}>
            <span>{row.rank}</span>
            <strong>{row.name}</strong>
            <em>{row.totalPoints} 分</em>
            <small>{row.titleBadge}</small>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function MinePage({ mine, onPage, onPoster }) {
  const profile = mine?.profile
  return (
    <Panel title="我的">
      <div className="lm-mine-card">
        {mine?.wechat?.avatar ? <img src={mine.wechat.avatar} alt="微信头像" /> : <div className="lm-avatar-placeholder" />}
        <div>
          <strong>{mine?.wechat?.nickname || profile?.name}</strong>
          <p>{profile?.name} · {profile?.phone}</p>
        </div>
      </div>
      <div className="lm-stats">
        <span>会员码<strong>{profile?.memberCode}</strong></span>
        <span>总积分<strong>{profile?.totalPoints}</strong></span>
        <span>剩余积分<strong>{profile?.remainingPoints}</strong></span>
        <span>闯关天数<strong>{profile?.challengeDays}</strong></span>
      </div>
      <div className="lm-task-grid">
        <button type="button">积分流水 {mine?.ledgers?.length || 0}</button>
        <button type="button">答题流水 {mine?.quizAttempts?.length || 0}</button>
        <button type="button">闯关流水 {mine?.checkins?.length || 0}</button>
        <button type="button" onClick={() => onPage(PAGE.HONORS)}>我的荣誉</button>
        <button type="button" onClick={onPoster}>我的海报</button>
        <button type="button" onClick={() => onPage(PAGE.RANK)}>积分排行榜</button>
      </div>
    </Panel>
  )
}

function RulesModal({ rules, onClose }) {
  return (
    <Modal title="活动规则" onClose={onClose} variant="rules">
      <ol className="lm-rules">{rules.map((rule) => <li key={rule}>{rule}</li>)}</ol>
    </Modal>
  )
}

function PosterModal({ poster, onClose }) {
  return (
    <Modal title="分享海报" onClose={onClose}>
      <div className="lm-poster">
        {poster.avatar ? <img src={poster.avatar} alt="头像" /> : <div className="lm-avatar-placeholder" />}
        <h2>{poster.nickname || poster.name || '研学用户'}</h2>
        <p>闯关天数：{poster.challengeDays || 0} 天</p>
        <p>累计积分：{poster.totalPoints || 0}</p>
        <strong>重走长征路 共筑爱国魂</strong>
      </div>
    </Modal>
  )
}

function Panel({ title, children }) {
  return (
    <section className="lm-panel">
      <h1>{title}</h1>
      {children}
    </section>
  )
}

function Modal({ title, children, onClose, variant = 'default' }) {
  const backgroundImage = {
    rules: longMarchStudyAssets.modal.rules,
    profile: longMarchStudyAssets.modal.profile,
  }[variant]
  const showClose = variant !== 'profile'
  const closeText = variant === 'rules' ? '返回' : '关闭'
  const closeOnMask = variant === 'profile'
  const handleMaskClick = (event) => {
    if (closeOnMask && event.target === event.currentTarget) onClose()
  }

  return (
    <div className={`lm-modal-mask lm-modal-mask-${variant}`} onClick={handleMaskClick}>
      <section
        className={`lm-modal lm-modal-${variant}`}
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          {showClose ? <button type="button" onClick={onClose}>{closeText}</button> : null}
        </header>
        {children}
      </section>
    </div>
  )
}

function Toast({ text, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 2600)
    return () => window.clearTimeout(timer)
  }, [onClose])
  return <div className="lm-toast">{text}</div>
}

function MessageScreen({ title }) {
  return <main className="lm-page"><div className="lm-message">{title}</div></main>
}
