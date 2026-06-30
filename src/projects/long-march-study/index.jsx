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

function getWx() {
  return typeof window !== 'undefined' ? window.wx : null
}

export default function LongMarchStudyApp({ routeParams }) {
  const activityKey = routeParams?.activityKey || LONG_MARCH_STUDY_ACTIVITY_KEY
  const visitorId = useMemo(() => getVisitorId(), [])
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [page, setPage] = useState(PAGE.HOME)
  const [showProfile, setShowProfile] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [poster, setPoster] = useState(null)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)
  const [quizState, setQuizState] = useState(null)
  const [quizResult, setQuizResult] = useState(null)
  const [checkinResult, setCheckinResult] = useState(null)
  const [mine, setMine] = useState(null)

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
  useWechatShare(activityKey, shareActivity)

  const config = bootstrap?.config || {}
  const profile = bootstrap?.profile
  const bgm = config.bgm || { enabled: false }

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

  if (blockedMessage) return <MessageScreen title={blockedMessage} />
  if (loading && !bootstrap) return <MessageScreen title="研学活动加载中" />

  return (
    <main className="lm-page">
      {page === PAGE.HOME ? (
        <HomePage
          profile={profile}
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
          onToast={setToast}
        />
      ) : null}
      {page === PAGE.QUIZ_RESULT ? (
        <QuizResultPage result={quizResult} onPoster={() => showPoster('quiz')} onRank={() => setPage(PAGE.RANK)} />
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
            setToast('录音已提交，等待审核')
            setPage(PAGE.RADIO)
          }}
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

      {page !== PAGE.HOME ? <button className="lm-back" type="button" onClick={() => setPage(PAGE.HOME)}>返回首页</button> : null}

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
      {poster ? <PosterModal poster={poster} onClose={() => setPoster(null)} /> : null}
      {toast ? <Toast text={toast} onClose={() => setToast('')} /> : null}
      <ActivityBgmPlayer bgm={bgm} activityKey={activityKey} />
    </main>
  )
}

function HomePage({ profile, onStart, onRules, onMine, onRank }) {
  return (
    <section
      className="lm-home"
      style={{ backgroundImage: `url(${longMarchStudyAssets.home.background})` }}
    >
      <img className="lm-home-title-image" src={longMarchStudyAssets.home.title} alt="重走长征路 共筑爱国魂" />
      <div className="lm-home-side-actions" aria-label="首页快捷入口">
        <button type="button" onClick={onRules}>活动规则</button>
        <button type="button" onClick={onMine}>我的</button>
        <button type="button" onClick={onRank}>排行榜</button>
      </div>
      {profile ? (
        <div className="lm-profile-pill">
          <span>{profile.name}</span>
          <strong>{profile.totalPoints} 积分</strong>
        </div>
      ) : null}
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
  return (
    <Modal title="任务中心" onClose={onClose}>
      <div className="lm-task-grid">
        <button type="button" onClick={() => onSelect(PAGE.QUIZ)}>每日红色答题</button>
        <button type="button" onClick={() => onSelect(PAGE.CHECKIN)}>云上打卡·红色足迹</button>
        <button type="button" onClick={() => onSelect(PAGE.RADIO)}>云上红色电台</button>
        <button type="button" onClick={() => onSelect(PAGE.HONORS)}>我的荣誉</button>
      </div>
    </Modal>
  )
}

function QuizPage({ activityKey, visitorId, quizState, setQuizState, onResult, onToast }) {
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (quizState) return
    setBusy(true)
    startQuiz(activityKey, { visitorId })
      .then((data) => setQuizState(data.attempt))
      .catch((error) => onToast(error.message || '今日答题不可用'))
      .finally(() => setBusy(false))
  }, [activityKey, onToast, quizState, setQuizState, visitorId])

  if (busy || !quizState) return <Panel title="每日红色答题"><p>题目加载中...</p></Panel>
  const question = quizState.questions[index]
  if (!question) return <Panel title="每日红色答题"><button className="lm-primary" type="button" onClick={async () => onResult(await finishQuiz(activityKey, quizState.id, { visitorId }))}>查看结果</button></Panel>

  return (
    <Panel title={`第 ${index + 1} 题 / ${quizState.questions.length}`}>
      <h2 className="lm-question">{question.title}</h2>
      <div className="lm-options">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={Boolean(feedback)}
            onClick={async () => {
              try {
                const data = await answerQuiz(activityKey, quizState.id, { visitorId, questionId: question.id, selectedOptionId: option.id })
                setQuizState(data.attempt)
                setFeedback(data.answer)
              } catch (error) {
                onToast(error.message || '提交答案失败')
              }
            }}
          >
            {option.text}
          </button>
        ))}
      </div>
      {feedback ? (
        <div className={`lm-feedback ${feedback.correct ? 'is-correct' : 'is-wrong'}`}>
          <strong>{feedback.correct ? '回答正确' : '回答错误'}</strong>
          <p>{feedback.analysis}</p>
          <button className="lm-primary" type="button" onClick={async () => {
            setFeedback(null)
            if (index + 1 >= quizState.questions.length) {
              const result = await finishQuiz(activityKey, quizState.id, { visitorId })
              onResult(result)
            } else {
              setIndex(index + 1)
            }
          }}>继续</button>
        </div>
      ) : null}
    </Panel>
  )
}

function QuizResultPage({ result, onPoster, onRank }) {
  const data = result?.result
  return (
    <Panel title="答题结果">
      <div className="lm-score">{data?.score || 0}</div>
      <p>答对 {data?.correctCount || 0} 题，获得 {data?.pointsEarned || 0} 积分</p>
      <div className="lm-actions">
        <button type="button" onClick={onPoster}>分享海报</button>
        <button type="button" onClick={onRank}>排行榜</button>
      </div>
    </Panel>
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

function RadioPage({ recordings, onUpload, onVote }) {
  return (
    <Panel title="云上红色电台">
      <h3>精选</h3>
      <RecordingList rows={recordings?.featured || []} myVote={recordings?.myVoteRecordingId} onVote={onVote} />
      <h3>全部录音</h3>
      <RecordingList rows={recordings?.all || []} myVote={recordings?.myVoteRecordingId} onVote={onVote} />
      <button className="lm-upload-button" type="button" onClick={onUpload}>上传录音</button>
    </Panel>
  )
}

function RecordingList({ rows, myVote, onVote }) {
  if (!rows.length) return <p className="lm-empty">暂无审核通过的录音</p>
  return (
    <div className="lm-recordings">
      {rows.map((recording) => (
        <article key={recording.id}>
          <div>
            <strong>{recording.title}</strong>
            <span>{recording.authorName || '研学用户'} · {recording.voteCount} 红星</span>
          </div>
          {recording.audioUrl ? <audio controls src={recording.audioUrl} /> : <p>微信素材：{recording.mediaId || '待同步音频'}</p>}
          <button type="button" disabled={Boolean(myVote)} onClick={() => onVote(recording)}>
            {myVote === recording.id ? '已投票' : '送红星'}
          </button>
        </article>
      ))}
    </div>
  )
}

function UploadPage({ activityKey, visitorId, scripts, onDone, onToast }) {
  const [scriptKey, setScriptKey] = useState(scripts[0]?.key || '')
  const [expanded, setExpanded] = useState(false)
  const [recording, setRecording] = useState(false)
  const [localId, setLocalId] = useState('')
  const [mediaId, setMediaId] = useState('')
  const [title, setTitle] = useState('我的红色电台')
  const startedAtRef = useRef(0)
  const activeScript = scripts.find((item) => item.key === scriptKey) || scripts[0]

  const start = () => {
    const wx = getWx()
    startedAtRef.current = Date.now()
    if (wx?.startRecord) {
      wx.startRecord()
      setRecording(true)
      return
    }
    setLocalId(`debug-local-${Date.now()}`)
    setRecording(true)
    onToast('当前非微信环境，已进入调试录音模式')
  }

  const stop = () => {
    const wx = getWx()
    if (wx?.stopRecord) {
      wx.stopRecord({
        success: (res) => {
          setLocalId(res.localId)
          setRecording(false)
        },
        fail: () => {
          setRecording(false)
          onToast('停止录音失败')
        },
      })
      return
    }
    setRecording(false)
  }

  const upload = () => {
    const wx = getWx()
    if (wx?.uploadVoice && localId && !mediaId) {
      wx.uploadVoice({
        localId,
        isShowProgressTips: 1,
        success: async (res) => {
          const nextMediaId = res.serverId
          setMediaId(nextMediaId)
          await submitRecording(activityKey, {
            visitorId,
            title,
            scriptKey: activeScript?.key,
            mediaId: nextMediaId,
            durationSec: Math.round((Date.now() - startedAtRef.current) / 1000),
          })
          onDone()
        },
        fail: () => onToast('微信录音上传失败'),
      })
      return
    }
    submitRecording(activityKey, {
      visitorId,
      title,
      scriptKey: activeScript?.key,
      mediaId: mediaId || localId || `debug-media-${Date.now()}`,
      durationSec: Math.round((Date.now() - startedAtRef.current) / 1000),
    }).then(onDone).catch((error) => onToast(error.message || '上传失败'))
  }

  return (
    <Panel title="上传录音">
      <label className="lm-field">录音标题<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="lm-field">选择文稿
        <select value={scriptKey} onChange={(event) => setScriptKey(event.target.value)}>
          {scripts.map((script) => <option key={script.key} value={script.key}>{script.title}</option>)}
        </select>
      </label>
      {activeScript ? (
        <div className="lm-script">
          <button type="button" onClick={() => setExpanded(!expanded)}>{expanded ? '收起文稿' : '展开文稿'}</button>
          {expanded ? <p>{activeScript.content}</p> : null}
        </div>
      ) : null}
      <button className="lm-primary" type="button" onClick={recording ? stop : start}>{recording ? '结束录音' : '开始录音'}</button>
      <button className="lm-secondary" type="button" disabled={!localId && !mediaId} onClick={upload}>上传审核</button>
    </Panel>
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

  return (
    <div className={`lm-modal-mask lm-modal-mask-${variant}`}>
      <section
        className={`lm-modal lm-modal-${variant}`}
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})` } : undefined}
      >
        <header><h2>{title}</h2><button type="button" onClick={onClose}>关闭</button></header>
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
