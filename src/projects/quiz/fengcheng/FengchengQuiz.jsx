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
          <div className="fengcheng-home-title-fallback">
            <span>凤城实验学校“为先币”系列活动</span>
            <strong>亲子时政<br />“最强拍档”挑战赛</strong>
          </div>
          <img className="fengcheng-home-title" src={assets.homeTitle} alt={publicConfig?.title || '亲子时政“最强拍档”挑战赛'} />
          <button className="fengcheng-home-start" type="button" onClick={onStart} aria-label="开始挑战">
            <img src={assets.homeStartButton} alt="" aria-hidden="true" />
            <span>开始挑战</span>
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
        />
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
      key={question.questionId}
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
  const [remainingSeconds, setRemainingSeconds] = useState(
    current?.remainingSeconds ?? question?.timeLimitSeconds ?? 60,
  )
  const timeoutRef = useRef(false)

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
  }, [onTimeout, question, remainingSeconds, submitting])

  const totalQuestions = current?.totalQuestions || current?.questionCount || 30
  const questionSort = question.questionSort || current?.currentQuestionSort || 1
  const timerText = `00:${String(remainingSeconds).padStart(2, '0')}`

  return (
    <StageBackground publicConfig={publicConfig} className="fengcheng-question-page">
      <HeaderTitle />
      <div className="fengcheng-question-meta">
        <span>第 <strong>{questionSort}</strong> 题 / 共 {totalQuestions} 题</span>
        <span className="fengcheng-timer"><ClockCircleOutlined />倒计时 <strong>{timerText}</strong></span>
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
              onClick={() => setSelected(value)}
              disabled={submitting}
            >
              <strong>{label}.</strong>
              <span>{option.content}</span>
            </button>
          )
        })}
      </section>

      <button
        className="fengcheng-primary-button fengcheng-question-next"
        type="button"
        disabled={!selected || submitting}
        onClick={() => onAnswer(question.questionId, [selected])}
      >
        <span>下一题</span>
      </button>
    </StageBackground>
  )
}

export function FengchengResultPage({ publicConfig, result, onRetry, onOpenRank }) {
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
        <button className="fengcheng-primary-button fengcheng-result-retry" type="button" onClick={onRetry}>
          再来一次
        </button>
        <button className="fengcheng-blue-button fengcheng-result-rank" type="button" onClick={onOpenRank}>
          查看排行榜
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
          <div className="fengcheng-rank-title-fallback">排行榜</div>
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
            <span>返回首页</span>
          </button>
        </DesignStage>
      </section>
    </main>
  )
}

function HeaderTitle() {
  return (
    <div className="fengcheng-header-title">
      <i />
      <span>★</span>
      <strong>亲子时政 <em>“最强拍档”</em> 挑战赛</strong>
      <span>★</span>
      <i />
    </div>
  )
}
