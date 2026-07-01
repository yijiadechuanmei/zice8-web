import { useEffect, useRef, useState } from 'react'
import { ClockCircleOutlined } from '@ant-design/icons'
import DesignStage from '../components/DesignStage'
import {
  FENGCHENG_ACTIVITY_KEY,
  formatFengchengDuration,
  getFengchengAssets,
} from './config'
import './fengcheng.css'

const PREVIEW_QUESTION = {
  attemptId: 'preview-attempt',
  currentQuestion: {
    questionId: 'preview-question-1',
    questionSort: 1,
    title: '我国的首都是哪座城市？',
    type: 'single',
    timeLimitSeconds: 60,
    options: [
      { id: 'A', label: 'A', content: '上海' },
      { id: 'B', label: 'B', content: '北京' },
      { id: 'C', label: 'C', content: '广州' },
      { id: 'D', label: 'D', content: '深圳' },
    ],
  },
  currentQuestionSort: 1,
  totalQuestions: 30,
  remainingSeconds: 56,
}

const PREVIEW_RANKS = [
  { rank: 1, participantName: '陈同学', department: '三年级1班', totalScore: 300, totalTimeMs: 78000 },
  { rank: 2, participantName: '林同学', department: '四年级2班', totalScore: 290, totalTimeMs: 82000 },
  { rank: 3, participantName: '周同学', department: '五年级3班', totalScore: 280, totalTimeMs: 91000 },
  { rank: 4, participantName: '王同学', department: '二年级1班', totalScore: 270, totalTimeMs: 96000 },
  { rank: 5, participantName: '李同学', department: '六年级2班', totalScore: 260, totalTimeMs: 108000 },
]

export function FengchengQuizPreviewApp() {
  const [page, setPage] = useState('home')
  const [profileOpen, setProfileOpen] = useState(false)
  const [selectedName, setSelectedName] = useState('')
  const [selectedClass, setSelectedClass] = useState('')
  const publicConfig = {
    activityKey: FENGCHENG_ACTIVITY_KEY,
    title: '凤城实验学校“为先币”系列活动 · 亲子时政“最强拍档”挑战赛',
    mobileConfig: {},
  }

  function startPreview(profile) {
    setSelectedName(profile.name)
    setSelectedClass(profile.department)
    setProfileOpen(false)
    setPage('question')
  }

  return (
    <FengchengFrame publicConfig={publicConfig}>
      {page === 'home' ? (
        <FengchengHomePage
          publicConfig={publicConfig}
          profileModalOpen={profileOpen}
          profile={{ name: selectedName, department: selectedClass }}
          onStart={() => setProfileOpen(true)}
          onCloseProfile={() => setProfileOpen(false)}
          onSubmitProfile={startPreview}
          submitting={false}
        />
      ) : null}
      {page === 'question' ? (
        <FengchengQuestionPage
          publicConfig={publicConfig}
          current={PREVIEW_QUESTION}
          submitting={false}
          onAnswer={() => setPage('result')}
          onTimeout={() => setPage('result')}
        />
      ) : null}
      {page === 'result' ? (
        <FengchengResultPage
          publicConfig={publicConfig}
          result={{ totalScore: 80, totalTimeMs: 88000 }}
          onRetry={() => setPage('home')}
          onOpenRank={() => setPage('rank')}
        />
      ) : null}
      {page === 'rank' ? (
        <FengchengRankPage
          publicConfig={publicConfig}
          ranks={PREVIEW_RANKS}
          loading={false}
          hasMore={false}
          onBack={() => setPage('home')}
        />
      ) : null}
    </FengchengFrame>
  )
}

function FengchengFrame({ children }) {
  return <div className="fengcheng-quiz-app">{children}</div>
}

function formatSeconds(seconds) {
  const totalSeconds = Math.max(Math.floor(Number(seconds || 0)), 0)
  const minutes = Math.floor(totalSeconds / 60)
  const restSeconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`
}

function StageBackground({ publicConfig, children, className = '' }) {
  const assets = getFengchengAssets(publicConfig)
  return (
    <main className={`fengcheng-page ${className}`}>
      <section className="fengcheng-stage-wrap">
        <DesignStage height={1624} fitToViewport>
          <div className="fengcheng-bg-fallback" />
          <img className="fengcheng-page-bg" src={assets.pageBackground} alt="" aria-hidden="true" />
          <img className="fengcheng-page-foreground" src={assets.pageForeground} alt="" aria-hidden="true" />
          {children}
        </DesignStage>
      </section>
    </main>
  )
}

export function FengchengHomePage({
  publicConfig,
  profile,
  profileModalOpen,
  submitting,
  onStart,
  onCloseProfile,
  onSubmitProfile,
}) {
  const assets = getFengchengAssets(publicConfig)

  return (
    <main className="fengcheng-page fengcheng-home-page">
      <section className="fengcheng-stage-wrap">
        <DesignStage height={1448} fitToViewport>
          <div className="fengcheng-bg-fallback" />
          <img className="fengcheng-home-bg" src={assets.homeBackground} alt="" aria-hidden="true" />
          <img className="fengcheng-home-foreground" src={assets.homeForeground} alt="" aria-hidden="true" />
          <img className="fengcheng-home-title" src={assets.homeTitle} alt={publicConfig?.title || '亲子时政“最强拍档”挑战赛'} />
          <button className="fengcheng-home-start" type="button" onClick={onStart} aria-label="开始挑战">
            <img src={assets.homeStartButton} alt="" aria-hidden="true" />
          </button>
          {profileModalOpen ? (
            <FengchengProfileModal
              assets={assets}
              profile={profile}
              submitting={submitting}
              onClose={onCloseProfile}
              onSubmit={onSubmitProfile}
            />
          ) : null}
        </DesignStage>
      </section>
    </main>
  )
}

function FengchengProfileModal({ assets, profile, submitting, onClose, onSubmit }) {
  const [name, setName] = useState(profile?.name || '')
  const [department, setDepartment] = useState(profile?.department || '')

  function submit() {
    const normalizedName = name.trim()
    const normalizedDepartment = department.trim()
    if (!normalizedName || !normalizedDepartment) return
    onSubmit({ name: normalizedName, department: normalizedDepartment })
  }

  return (
    <div className="fengcheng-modal-layer">
      <div className="fengcheng-modal-mask" />
      <section className="fengcheng-profile-modal" aria-label="提交信息">
        <img className="fengcheng-profile-modal-bg" src={assets.profileModal} alt="" aria-hidden="true" />
        <button className="fengcheng-profile-close" type="button" onClick={onClose} aria-label="关闭" />
        <label className="fengcheng-profile-input fengcheng-profile-input-name">
          <span className="sr-only">姓名</span>
          <input value={name} maxLength={100} placeholder="请输入姓名" onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="fengcheng-profile-input fengcheng-profile-input-class">
          <span className="sr-only">班级</span>
          <input value={department} maxLength={100} placeholder="请输入班级" onChange={(event) => setDepartment(event.target.value)} />
        </label>
        <button
          className="fengcheng-profile-submit"
          type="button"
          onClick={submit}
          disabled={submitting || !name.trim() || !department.trim()}
          aria-label="提交并开始答题"
        >
          <img src={assets.homeStartButton} alt="" aria-hidden="true" />
        </button>
      </section>
    </div>
  )
}

export function FengchengQuestionPage({
  publicConfig,
  current,
  submitting,
  onAnswer,
  onTimeout,
}) {
  const question = current?.currentQuestion

  if (!question) {
    return (
      <StageBackground publicConfig={publicConfig}>
        <p className="fengcheng-question-empty">题目加载中...</p>
      </StageBackground>
    )
  }

  return (
    <FengchengQuestionContent
      publicConfig={publicConfig}
      current={current}
      question={question}
      submitting={submitting}
      onAnswer={onAnswer}
      onTimeout={onTimeout}
    />
  )
}

function FengchengQuestionContent({
  publicConfig,
  current,
  question,
  submitting,
  onAnswer,
  onTimeout,
}) {
  const [selected, setSelected] = useState('')
  const limitSeconds = question?.timeLimitSeconds ?? current?.questionTimeLimitSeconds ?? 60
  const initialRemainingSeconds =
    current?.remainingSeconds !== null && current?.remainingSeconds !== undefined
      ? Math.max(Number(current.remainingSeconds), 0)
      : Number(limitSeconds)
  const [remainingSeconds, setRemainingSeconds] = useState(initialRemainingSeconds)
  const timeoutRef = useRef(false)
  const answerTimerRef = useRef(null)

  useEffect(() => () => {
    if (answerTimerRef.current) window.clearTimeout(answerTimerRef.current)
  }, [])

  useEffect(() => {
    setSelected('')
    timeoutRef.current = false
    setRemainingSeconds(initialRemainingSeconds)
  }, [question.questionId, initialRemainingSeconds])

  useEffect(() => {
    if (submitting) return undefined
    if (remainingSeconds <= 0) {
      if (!timeoutRef.current) {
        timeoutRef.current = true
        onTimeout(question.questionId)
      }
      return undefined
    }
    const timer = window.setTimeout(() => {
      setRemainingSeconds((value) => Math.max(value - 1, 0))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [onTimeout, question.questionId, remainingSeconds, submitting])

  function handleOptionSelect(value) {
    if (selected || submitting || timeoutRef.current) return
    setSelected(value)
    answerTimerRef.current = window.setTimeout(() => {
      onAnswer(question.questionId, [value])
    }, 80)
  }

  const totalQuestions = current?.totalQuestions || current?.questionCount || 30
  const questionSort = question.questionSort || current?.currentQuestionSort || 1
  const timerText = formatSeconds(remainingSeconds)

  return (
    <StageBackground publicConfig={publicConfig} className="fengcheng-question-page">
      <div className="fengcheng-question-meta">
        <span>第 <strong>{questionSort}</strong> 题 / 共 {totalQuestions} 题</span>
        <span className="fengcheng-timer"><ClockCircleOutlined /><strong>{timerText}</strong></span>
      </div>

      <section className="fengcheng-question-card">
        <span className="fengcheng-q-badge">Q</span>
        <h1>{question.title}</h1>
      </section>

      <section className="fengcheng-option-list">
        {(question.options || []).map((option, index) => {
          const label = option.label || String.fromCharCode(65 + index)
          const value = option.id || label
          return (
            <button
              key={value}
              type="button"
              className={`fengcheng-option ${selected === value ? 'is-selected' : ''}`}
              onClick={() => handleOptionSelect(value)}
              disabled={submitting || Boolean(selected)}
            >
              <strong>{label}.</strong>
              <span>{option.content}</span>
            </button>
          )
        })}
      </section>
    </StageBackground>
  )
}

export function FengchengDebugPage({
  publicConfig,
  resetting = false,
  onResetMine,
  onResetAll,
  onBack,
}) {
  return (
    <StageBackground publicConfig={publicConfig} className="fengcheng-debug-page">
      <section className="fengcheng-debug-panel" aria-label="调试工具">
        <h1>调试工具</h1>
        <p>清理凤城答题记录、排行榜和提交信息。</p>
        <button type="button" disabled={resetting} onClick={onResetMine}>
          清除我的数据
        </button>
        <button className="is-danger" type="button" disabled={resetting} onClick={onResetAll}>
          清除全部项目数据
        </button>
        <button className="is-muted" type="button" disabled={resetting} onClick={onBack}>
          返回首页
        </button>
      </section>
    </StageBackground>
  )
}

export function FengchengResultPage({ publicConfig, result, onRetry, onOpenRank }) {
  const assets = getFengchengAssets(publicConfig)
  return (
    <StageBackground publicConfig={publicConfig} className="fengcheng-result-page">
      <section className="fengcheng-result-card">
        <div className="fengcheng-section-title"><i /> ★ 本次得分 ★ <i /></div>
        <div className="fengcheng-score-row">
          <strong>{result?.totalScore ?? 0}</strong>
          <span>分</span>
        </div>
        <div className="fengcheng-result-divider" />
        <div className="fengcheng-time-row">
          <ClockCircleOutlined />
          <span>用时</span>
          <strong>{formatFengchengDuration(result?.totalTimeMs)}</strong>
        </div>
        <button className="fengcheng-image-button fengcheng-result-retry" type="button" onClick={onRetry} aria-label="再来一次">
          <img src={assets.homeStartButton} alt="" aria-hidden="true" />
        </button>
        <button className="fengcheng-image-button fengcheng-result-rank" type="button" onClick={onOpenRank} aria-label="查看排行榜">
          <img src={assets.rankHomeButton} alt="" aria-hidden="true" />
        </button>
      </section>
    </StageBackground>
  )
}

export function FengchengRankPage({
  publicConfig,
  ranks = [],
  loading = false,
  hasMore = false,
  error = '',
  onLoadMore,
  onRetry,
  onBack,
}) {
  const assets = getFengchengAssets(publicConfig)
  return (
    <main className="fengcheng-page fengcheng-rank-page">
      <section className="fengcheng-stage-wrap">
        <DesignStage height={1448} fitToViewport>
          <div className="fengcheng-bg-fallback" />
          <img className="fengcheng-home-bg" src={assets.homeBackground} alt="" aria-hidden="true" />
          <img className="fengcheng-home-foreground" src={assets.homeForeground} alt="" aria-hidden="true" />
          <img className="fengcheng-rank-title" src={assets.rankTitle} alt="排行榜" />
          <section className="fengcheng-rank-panel">
            <div className="fengcheng-rank-head">
              <span>排名</span>
              <span>姓名</span>
              <span>班级</span>
              <span>得分</span>
              <span>用时</span>
            </div>
            <div className="fengcheng-rank-list">
              {ranks.map((item, index) => (
                <div className="fengcheng-rank-row" key={`${item.rank || index}-${item.userId || item.participantName}`}>
                  <strong>{item.rank || index + 1}</strong>
                  <span>{item.participantName || item.name || '未填写'}</span>
                  <span>{item.department || '-'}</span>
                  <span>{item.totalScore || 0}</span>
                  <span>{formatFengchengDuration(item.totalTimeMs)}</span>
                </div>
              ))}
              {!loading && !ranks.length && !error ? <p className="fengcheng-rank-empty">暂无排行</p> : null}
              {loading ? <p className="fengcheng-rank-empty">加载中...</p> : null}
              {!loading && error ? (
                <button className="fengcheng-rank-retry" type="button" onClick={onRetry}>
                  加载失败，点击重试
                </button>
              ) : null}
              {!loading && hasMore ? (
                <button className="fengcheng-rank-more" type="button" onClick={onLoadMore}>
                  加载更多
                </button>
              ) : null}
            </div>
          </section>
          <button className="fengcheng-rank-back" type="button" onClick={onBack} aria-label="返回首页">
            <img src={assets.rankHomeButton} alt="" aria-hidden="true" />
          </button>
        </DesignStage>
      </section>
    </main>
  )
}
