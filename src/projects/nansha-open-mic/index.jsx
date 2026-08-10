import { useEffect, useState } from 'react'
import {
  AudioOutlined,
  AuditOutlined,
  BarChartOutlined,
  CaretRightFilled,
  CloseOutlined,
  FullscreenOutlined,
  LeftOutlined,
  RightOutlined,
  SoundOutlined,
  UserOutlined,
  VideoCameraFilled,
} from '@ant-design/icons'
import { QRCodeCanvas } from 'qrcode.react'
import { getBootstrap, getPublicConfig } from './api'
import './styles.css'

const ACTIVITY_TYPE = 'nansha_open_mic'
const ACTIVITY_KEY = 'nansha_new_voice_2026'
const ASSET_BASE_URL = `https://assets.zice8.com/${ACTIVITY_TYPE}/${ACTIVITY_KEY}`
const MAIN_VISUAL_URL = `${ASSET_BASE_URL}/1.png?v=20260811`
const REVIEW_MAIN_VISUAL_URL = `${ASSET_BASE_URL}/1-1.png?v=20260811`
const POSTER_BACKGROUND_URL = `${ASSET_BASE_URL}/hb.png?v=20260811`
const MICROPHONE_VISUAL_URL = `${ASSET_BASE_URL}/3.png`
const RULES_TITLE_VISUAL_URL = `${ASSET_BASE_URL}/4.png?v=20260811-rules`
const RANKING_THEME_VISUAL_URL = `${ASSET_BASE_URL}/6.png?v=20260810-ranking`
const VOTE_SUCCESS_VISUAL_URL = `${ASSET_BASE_URL}/tpcg.png`
const VOTE_FAILURE_VISUAL_URL = `${ASSET_BASE_URL}/tpsb.png`

const VOTE_WORKS = Array.from({ length: 6 }, (_, index) => ({ id: index + 1 }))

export default function NanshaOpenMicProject() {
  const [view, setView] = useState('upload-home')
  const [rulesOrigin, setRulesOrigin] = useState('upload-home')
  const [activityPhase, setActivityPhase] = useState('upload')
  const [selectedVideoName, setSelectedVideoName] = useState('')
  const [uploadDialog, setUploadDialog] = useState('')
  const [nextUploadResult, setNextUploadResult] = useState('success')
  const [voteDialog, setVoteDialog] = useState('')
  const [nextVoteResult, setNextVoteResult] = useState('success')
  const [posterOpen, setPosterOpen] = useState(false)
  const [myEntry, setMyEntry] = useState(null)
  const [voteQuota, setVoteQuota] = useState({ remaining: 10 })
  const homeView = activityPhase === 'vote'
    ? 'vote-home'
    : activityPhase === 'publicity'
      ? 'publicity-ranking'
      : 'upload-home'

  useEffect(() => {
    let alive = true
    let previousPhase = null

    function refreshActivityState() {
      Promise.allSettled([getPublicConfig(ACTIVITY_KEY), getBootstrap(ACTIVITY_KEY)])
        .then(([publicResult, bootstrapResult]) => {
        const publicData = publicResult.status === 'fulfilled' ? publicResult.value : null
        const bootstrapData = bootstrapResult.status === 'fulfilled' ? bootstrapResult.value : null
        const phase = publicData?.phase || bootstrapData?.phase
        if (!alive || !['upload', 'vote', 'publicity', 'closed'].includes(phase)) return
        setActivityPhase(phase)
        if (bootstrapData) {
          setMyEntry(bootstrapData.myEntry || null)
          setVoteQuota(bootstrapData.voteQuota || { remaining: bootstrapData.rules?.dailyVoteLimit || 10 })
        }
        const phaseChanged = previousPhase !== null && previousPhase !== phase
        if (phaseChanged) {
          setUploadDialog('')
          setVoteDialog('')
          setView((current) => (
            phase === 'publicity'
              ? 'publicity-ranking'
              : current === 'rules'
                ? current
                : (phase === 'vote' ? 'vote-home' : 'upload-home')
          ))
        } else {
          setView((current) => {
            if (phase === 'publicity') return 'publicity-ranking'
            if (current === 'rules') return current
            const currentIsWrongHome = phase === 'vote' ? current === 'upload-home' : current === 'vote-home' || current === 'ranking'
            return currentIsWrongHome ? (phase === 'vote' ? 'vote-home' : 'upload-home') : current
          })
        }
        previousPhase = phase
        })
        .catch(() => {})
    }

    refreshActivityState()
    const intervalId = window.setInterval(refreshActivityState, 5000)
    window.addEventListener('focus', refreshActivityState)
    return () => {
      alive = false
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshActivityState)
    }
  }, [])

  function goBack() {
    if (view === 'rules') {
      setView(rulesOrigin)
      return
    }
    if (view === 'my-votes') {
      setView('my')
      return
    }
    if (view === 'work-detail') {
      setView('vote-home')
      return
    }
    setView(view === 'work' ? 'my' : homeView)
  }

  function openRules() {
    setRulesOrigin(view)
    setView('rules')
  }

  function openUpload() {
    setView('upload')
  }

  function completeUpload() {
    setUploadDialog(nextUploadResult)
    setNextUploadResult((current) => (current === 'success' ? 'failure' : 'success'))
  }

  function closeUploadDialog() {
    const isSuccess = uploadDialog === 'success'
    setUploadDialog('')
    if (isSuccess) setView('my')
  }

  function openVoteDialog() {
    setVoteDialog('vote')
  }

  function confirmVote() {
    setVoteDialog(nextVoteResult)
    setNextVoteResult((current) => (current === 'success' ? 'failure' : 'success'))
  }

  function closeVoteDialog() {
    setVoteDialog('')
  }

  return (
    <main className="nansha-open-mic-page">
      {view === 'vote-home' && activityPhase === 'vote' ? <VoteHome visualUrl={REVIEW_MAIN_VISUAL_URL} onShowRules={openRules} onRanking={() => setView('ranking')} onMy={() => setView('my')} onWork={() => setView('work-detail')} /> : null}
      {view === 'ranking' && activityPhase === 'vote' ? <RankingPage onShowRules={openRules} onHome={() => setView('vote-home')} onMy={() => setView('my')} onWork={() => setView('work-detail')} /> : null}
      {view === 'publicity-ranking' && activityPhase === 'publicity' ? <PublicityRankingPage /> : null}
      {view === 'upload-home' && activityPhase === 'upload' && !myEntry ? <UploadHome onShowRules={openRules} onUpload={openUpload} /> : null}
      {view === 'upload-home' && activityPhase !== 'vote' && myEntry ? <ReviewHome onShowRules={openRules} showReviewNotice /> : null}
      {view === 'upload-home' && activityPhase === 'closed' && !myEntry ? <ReviewHome onShowRules={openRules} /> : null}
      {view === 'my' && activityPhase !== 'publicity' ? <MyPage activityPhase={activityPhase} myEntry={myEntry} voteQuota={voteQuota} onBack={goBack} onShowRules={openRules} onOpenWork={() => setView('work')} onOpenVotes={() => setView('my-votes')} /> : null}
      {view === 'my-votes' && activityPhase === 'vote' ? <MyVotesPage onBack={goBack} onShowRules={openRules} onHome={() => setView('vote-home')} onRanking={() => setView('ranking')} onMy={() => setView('my')} /> : null}
      {view === 'work-detail' && activityPhase === 'vote' ? <WorkDetailPage onBack={goBack} onShowRules={openRules} onVote={openVoteDialog} onShare={() => setPosterOpen(true)} /> : null}
      {view === 'work' ? <MyWorkPage onBack={goBack} onShowRules={openRules} /> : null}
      {view === 'upload' ? (
        <UploadPage
          onBack={goBack}
          onShowRules={openRules}
          selectedVideoName={selectedVideoName}
          onSelectVideo={(event) => setSelectedVideoName(event.target.files?.[0]?.name || '')}
          onSubmit={completeUpload}
        />
      ) : null}
      {view === 'rules' ? <RulesPage onBack={goBack} /> : null}

      {view === 'upload-home' && activityPhase !== 'vote' ? <BottomNavigation active="home" onHome={() => setView('upload-home')} onMy={() => setView('my')} /> : null}
      {view === 'my' && activityPhase === 'vote' ? <VoteBottomNavigation active="my" onHome={() => setView('vote-home')} onRanking={() => setView('ranking')} onMy={() => setView('my')} /> : null}
      {view === 'my' && activityPhase !== 'vote' && activityPhase !== 'publicity' ? <BottomNavigation active="my" onHome={() => setView(homeView)} onMy={() => setView('my')} /> : null}

      {uploadDialog ? <UploadResultDialog status={uploadDialog} onConfirm={closeUploadDialog} /> : null}
      {voteDialog === 'vote' ? <VoteDialog onConfirm={confirmVote} onClose={closeVoteDialog} /> : null}
      {voteDialog === 'success' || voteDialog === 'failure' ? <VoteResultDialog status={voteDialog} onConfirm={closeVoteDialog} /> : null}
      {posterOpen ? <VotePosterDialog onClose={() => setPosterOpen(false)} /> : null}
    </main>
  )
}

function UploadHome({ onShowRules, onUpload }) {
  return (
    <div className="nansha-upload-home">
      <header className="nansha-upload-home-header"><h1>首页</h1></header>
      <section className="nansha-upload-hero">
        <img className="nansha-main-visual" src={MAIN_VISUAL_URL} alt="南沙新声 全民开麦" />
        <ActivityRulesTrigger onClick={onShowRules} />
      </section>
      <section className="nansha-upload-shell">
        <article className="nansha-upload-paper">
          <span className="nansha-upload-cyan-wedge" aria-hidden="true" />
          <section className="nansha-upload-countdown" aria-label="距离上传截止还有五天">
            <div className="nansha-countdown-label">距离上传截止还有</div>
            <strong>5天 00:00:00</strong>
          </section>
          <button className="nansha-upload-button" type="button" onClick={onUpload}>上传作品</button>
          <section className="nansha-upload-section nansha-upload-benefits" aria-label="优秀作品可获得">
            <h2>优秀作品可获得：</h2>
            <ul>
              <li>√南沙特色礼品</li>
              <li>√纳入区宣讲人才库</li>
              <li>√登上官方舞台</li>
              <li>√专业演讲指导与打磨</li>
              <li>√官方流量扶持曝光</li>
            </ul>
          </section>
          <section className="nansha-upload-section nansha-upload-story" aria-label="作品要求">
            <h2>我们需要这样的作品：</h2>
            <p>1.从上述六大主题中任选其一，结合真实经历，讲述你与南沙的故事：</p>
            <p className="nansha-upload-themes">筑梦湾区 人人有梦 | 科创先锋 人人有为<br />文化传承 人人有责 | 乡村振兴 人人有益<br />时代青年 人人有志 | 暖心民生 人人有爱</p>
            <p>2.使用手机或相机，录制1-2分钟宣讲视频，分辨率不低于1080P；</p>
            <p>3.故事完整、逻辑清楚、重点突出、真实生动，展现南沙的发展变化与城市温度；</p>
            <p>4.不限宣讲风格及语种，含粤语、普通话、外国语（需配中文字幕）；</p>
            <p>5.遵守法律法规及公序良俗，不得出现低俗恶搞、虚假表述及负面炒作等内容；</p>
            <p>6.作品须为原创，所使用的音乐、图片及视频等素材须无版权纠纷；</p>
            <p>7.作品一经提交，即视为作者授权主办方合规使用，未经主办方许可，不得擅自对外发布。</p>
            <p>8.我们将主动联系通过初选的视频作者，对接后续相关事宜；若未收到我方联系，则代表未通过。</p>
          </section>
          <section className="nansha-upload-organizers" aria-label="主办单位信息">
            <p><b>主办单位：</b><span>中共广州市南沙区委宣传部<br />中共广州市南沙区委社会工作部</span></p>
            <p><b>支持单位：</b><span>区委统战部、区人社局、区农业农村局、<br />开发区港澳办、区总工会、团区委</span></p>
            <p><b>协办单位：</b><span>南沙区图书馆、南沙区文化馆</span></p>
          </section>
        </article>
        <p className="nansha-upload-disclaimer">*本次活动最终解释权归主办方所有</p>
      </section>
    </div>
  )
}

function ReviewHome({ onShowRules, showReviewNotice = false }) {
  return (
    <section className="nansha-status-home">
      <header className="nansha-upload-home-header"><h1>首页</h1></header>
      <section className="nansha-upload-hero">
        <img className="nansha-main-visual" src={REVIEW_MAIN_VISUAL_URL} alt="南沙新声 全民开麦" />
        <ActivityRulesTrigger onClick={onShowRules} />
      </section>
      <section className="nansha-status-countdown" aria-label="报名截止">
        <div className="nansha-countdown-label">报名已截止</div>
        <strong>0天 00:00:00</strong>
      </section>
      {showReviewNotice ? <div className="nansha-status-review-notice">作品审核中<br />敬请期待</div> : null}
    </section>
  )
}

function VoteHome({ visualUrl, onShowRules, onRanking, onMy, onWork }) {
  return (
    <section className="nansha-vote-home">
      <header className="nansha-upload-home-header"><h1>首页</h1></header>
      <section className="nansha-vote-visual-wrap">
        <img className="nansha-vote-main-visual" src={visualUrl} alt="南沙新声 全民开麦" />
        <ActivityRulesTrigger onClick={onShowRules} label="投票说明" />
      </section>
      <section className="nansha-vote-stage">
        <section className="nansha-vote-heading">
          <strong>今日剩余票数:10</strong>
          <p>请投出您宝贵的一票，选出优秀宣讲代表</p>
        </section>
        <section className="nansha-vote-work-panel" aria-label="参赛作品">
          {VOTE_WORKS.map((work) => (
            <article className="nansha-vote-work-card" key={work.id}>
              <button className="nansha-vote-video-placeholder" type="button" aria-label={`查看作品${work.id}`} onClick={onWork}><CaretRightFilled /></button>
              <p>作品名称：代用名<br />作者：代用名<br />票数：0000票</p>
            </article>
          ))}
        </section>
      </section>
      <nav className="nansha-vote-bottom-nav" aria-label="投票阶段底部导航">
        <button className="is-active" type="button"><AudioOutlined aria-hidden="true" /><span>首页</span></button>
        <button type="button" onClick={onRanking}><BarChartOutlined aria-hidden="true" /><span>排行榜</span></button>
        <button type="button" onClick={onMy}><UserOutlined aria-hidden="true" /><span>我的</span></button>
      </nav>
    </section>
  )
}

function RankingPage({ onShowRules, onHome, onMy, onWork }) {
  return (
    <section className="nansha-ranking-page">
      <header className="nansha-ranking-header"><h1>排行榜</h1></header>
      <main className="nansha-ranking-stage">
        <img className="nansha-ranking-theme" src={RANKING_THEME_VISUAL_URL} alt="南沙新声 全民开麦" />
        <img className="nansha-ranking-microphone" src={MICROPHONE_VISUAL_URL} alt="" />
        <ActivityRulesTrigger onClick={onShowRules} className="nansha-ranking-rules-trigger" />
        <section className="nansha-ranking-board" aria-label="作品排行榜">
          <div className="nansha-ranking-columns"><span>排行</span><span>作品</span><span>票数</span></div>
          <div className="nansha-ranking-list">
            {Array.from({ length: 7 }, (_, index) => <RankingRow key={index} rank={index + 1} onWork={onWork} />)}
          </div>
          <p className="nansha-ranking-note">(截取前50/100排名)</p>
        </section>
        <section className="nansha-ranking-organizers" aria-label="主办单位信息">
          <p><b>主办单位：</b>中共广州市南沙区委宣传部、中共广州市南沙区委社会工作部</p>
          <p><b>支持单位：</b><span>中共广州市南沙区委统战部、区人力资源社会保障局、区农业农村局、<br />区文化广电旅游体育局、开发区港澳办、区总工会、团区委</span></p>
          <p><b>协办单位：</b>南沙区图书馆、南沙区文化馆</p>
        </section>
        <nav className="nansha-vote-bottom-nav nansha-ranking-bottom-nav" aria-label="排行榜底部导航">
          <button type="button" onClick={onHome}><AudioOutlined aria-hidden="true" /><span>首页</span></button>
          <button className="is-active" type="button"><BarChartOutlined aria-hidden="true" /><span>排行榜</span></button>
          <button type="button" onClick={onMy}><UserOutlined aria-hidden="true" /><span>我的</span></button>
        </nav>
      </main>
    </section>
  )
}

function PublicityRankingPage() {
  return (
    <section className="nansha-publicity-page">
      <header className="nansha-upload-home-header"><h1>首页</h1></header>
      <section className="nansha-publicity-visual-wrap">
        <img className="nansha-publicity-main-visual" src={REVIEW_MAIN_VISUAL_URL} alt="南沙新声 全民开麦" />
      </section>
      <section className="nansha-publicity-heading">
        <h1>南沙新声 · 全民开麦</h1>
        <p>投票结果排行榜</p>
      </section>
      <section className="nansha-publicity-board" aria-label="投票结果排行榜">
        <div className="nansha-publicity-columns"><span>排行</span><span>作品</span><span>票数</span></div>
        <div className="nansha-publicity-list">
          {Array.from({ length: 7 }, (_, index) => <PublicityRankingRow key={index} rank={index + 1} />)}
        </div>
      </section>
    </section>
  )
}

function PublicityRankingRow({ rank }) {
  return (
    <div className={`nansha-publicity-row rank-${rank}`}>
      <span className="nansha-publicity-number">{rank}</span>
      <p>作品名xxxx<br />作者xxxx</p>
      <span className="nansha-publicity-votes">0000000票&nbsp; &gt;</span>
    </div>
  )
}

function RankingRow({ rank, onWork }) {
  return (
    <div className={`nansha-ranking-row rank-${rank}`} role="button" tabIndex={0} onClick={onWork} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onWork() }}>
      <span className="nansha-ranking-number">{rank}</span>
      <p>作品名xxxx<br />作者xxxx</p>
      <span className="nansha-ranking-votes">0000000票&nbsp; &gt;</span>
    </div>
  )
}

function MyPage({ activityPhase, myEntry, voteQuota, onBack, onShowRules, onOpenWork, onOpenVotes }) {
  const isVotePhase = activityPhase === 'vote'
  const workStatus = myEntry?.reviewStatus === 'approved' ? '审核通过' : '审核中'
  const workVotes = String(myEntry?.voteCount ?? 0).padStart(6, '0')
  const remainingVotes = voteQuota?.remaining ?? 10
  return (
    <section className="nansha-sub-page nansha-my-page">
      <PageHeader title="我的" onBack={onBack} />
      <section className="nansha-profile-banner">
        <span className="nansha-profile-avatar" aria-hidden="true"><i /></span>
        <span className="nansha-profile-name">昵称</span>
        <img className="nansha-profile-microphone" src={MICROPHONE_VISUAL_URL} alt="" />
      </section>
      <ActivityRulesTrigger onClick={onShowRules} fixed />
      {isVotePhase ? (
        <section className="nansha-my-summary-list" aria-label="我的活动信息">
          {myEntry ? <MySummaryRow icon={<VideoCameraFilled />} title="我的作品" status={workStatus} detail={`获票数：${workVotes}票`} onClick={onOpenWork} /> : null}
          <MySummaryRow icon={<AuditOutlined />} title="我的投票" detail={`今日剩余票数：${remainingVotes}票`} onClick={onOpenVotes} />
        </section>
      ) : (
        <button className="nansha-my-work-row" type="button" onClick={onOpenWork}>
          <VideoCameraFilled className="nansha-work-icon" aria-hidden="true" />
          <b>我的作品</b>
          <em>审核中</em>
          <RightOutlined className="nansha-row-chevron" aria-hidden="true" />
        </button>
      )}
    </section>
  )
}

function MySummaryRow({ icon, title, status, detail, onClick }) {
  return (
    <button className="nansha-my-summary-row" type="button" onClick={onClick}>
      <span className="nansha-summary-icon" aria-hidden="true">{icon}</span>
      <b className="nansha-summary-title">{title}</b>
      {status ? <em className={`nansha-summary-status${status === '审核通过' ? ' is-approved' : ''}`}>{status}</em> : null}
      <span className="nansha-summary-detail">{detail}</span>
      <RightOutlined className="nansha-summary-chevron" aria-hidden="true" />
    </button>
  )
}

function MyVotesPage({ onBack, onShowRules, onHome, onRanking, onMy }) {
  return (
    <section className="nansha-my-votes-page">
      <PageHeader title="我的投票" onBack={onBack} />
      <main className="nansha-my-votes-stage">
        <img className="nansha-my-votes-microphone" src={MICROPHONE_VISUAL_URL} alt="" />
        <ActivityRulesTrigger onClick={onShowRules} fixed />
        <section className="nansha-my-votes-board" aria-label="我的投票详情">
          <div className="nansha-my-votes-list">
            {Array.from({ length: 7 }, (_, index) => <MyVoteRow key={index} />)}
          </div>
        </section>
        <VoteBottomNavigation active="my" onHome={onHome} onRanking={onRanking} onMy={onMy} />
      </main>
    </section>
  )
}

function MyVoteRow() {
  return (
    <button className="nansha-my-vote-row" type="button">
      <span className="nansha-my-vote-title">投票名称</span>
      <span className="nansha-my-vote-detail">画得票数：00000票</span>
      <RightOutlined className="nansha-my-vote-chevron" aria-hidden="true" />
    </button>
  )
}

function WorkDetailPage({ onBack, onShowRules, onVote, onShare }) {
  return (
    <section className="nansha-sub-page nansha-work-detail-page">
      <PageHeader title="作品名" onBack={onBack} />
      <ActivityRulesTrigger onClick={onShowRules} fixed label="投票说明" />
      <div className="nansha-video-placeholder" aria-label="视频将在预览时播放">
        <span>视频将在预览时播放</span>
        <div className="nansha-video-controls"><CaretRightFilled aria-hidden="true" /><b>0:00 / 0:00</b><SoundOutlined aria-hidden="true" /><FullscreenOutlined aria-hidden="true" /></div>
      </div>
      <section className="nansha-work-detail-info">
        <h1>我的作品</h1>
        <p>作者</p>
        <div className="nansha-detail-description">作品简介</div>
        <div className="nansha-detail-actions">
          <button className="nansha-detail-vote-button" type="button" onClick={onVote}>投票</button>
          <button className="nansha-detail-share-button" type="button" onClick={onShare}>拉票</button>
        </div>
      </section>
    </section>
  )
}

function VotePosterDialog({ onClose }) {
  const posterUrl = typeof window !== 'undefined' ? window.location.href : `${ASSET_BASE_URL}`
  return (
    <section className="nansha-poster-overlay" role="dialog" aria-modal="true" aria-label="拉票海报">
      <div className="nansha-poster-card" aria-label="长按图片保存海报">
        <img className="nansha-poster-background" src={POSTER_BACKGROUND_URL} alt="南沙新声全民开麦拉票海报背景" draggable="false" />
        <span className="nansha-poster-avatar" aria-hidden="true"><UserOutlined /></span>
        <div className="nansha-poster-work-info">
          <strong>作品</strong>
          <span>作者</span>
        </div>
        <div className="nansha-poster-video-cover" aria-label="作品封面" />
        <QRCodeCanvas className="nansha-poster-qrcode" value={posterUrl} size={166} includeMargin={false} />
      </div>
      <button className="nansha-poster-close" type="button" onClick={onClose} aria-label="关闭拉票海报"><CloseOutlined /></button>
    </section>
  )
}

function MyWorkPage({ onBack, onShowRules }) {
  return (
    <section className="nansha-sub-page nansha-work-page">
      <PageHeader title="我的作品" onBack={onBack} />
      <ActivityRulesTrigger onClick={onShowRules} fixed />
      <div className="nansha-video-placeholder" aria-label="视频将在预览时播放">
        <span>视频将在预览时播放</span>
        <div className="nansha-video-controls"><CaretRightFilled aria-hidden="true" /><b>0:00 / 0:00</b><SoundOutlined aria-hidden="true" /><FullscreenOutlined aria-hidden="true" /></div>
      </div>
      <section className="nansha-work-info">
        <h1>我的作品</h1>
        <p className="nansha-work-status">作品状态：审核中</p>
        <p>作者</p>
        <div className="nansha-work-description">作品简介</div>
      </section>
    </section>
  )
}

function UploadPage({ onBack, onShowRules, selectedVideoName, onSelectVideo, onSubmit }) {
  return (
    <section className="nansha-sub-page nansha-upload-page">
      <PageHeader title="上传视频" onBack={onBack} />
      <ActivityRulesTrigger onClick={onShowRules} fixed />
      <form className="nansha-upload-form" onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
        <label className={`nansha-video-picker${selectedVideoName ? ' has-file' : ''}`}>
          <input type="file" accept="video/*" onChange={onSelectVideo} />
          <b>{selectedVideoName || '+'}</b>
        </label>
        <input aria-label="作品名称" placeholder="请输入作品名称" />
        <input aria-label="作者名称" placeholder="请输入作者名称" />
        <input aria-label="手机号码" inputMode="tel" placeholder="请输入手机号码" />
        <textarea aria-label="作品简介" placeholder="请输入作品简介" />
        <button type="submit">点击确认上传</button>
      </form>
    </section>
  )
}

function PageHeader({ title, onBack, className = '' }) {
  return (
    <header className={`nansha-page-header ${className}`}>
      <button type="button" onClick={onBack}><LeftOutlined aria-hidden="true" /><span>返回</span></button>
      <h1>{title}</h1>
    </header>
  )
}

function ActivityRulesTrigger({ onClick, fixed = false, label = '活动说明', className = '' }) {
  return <button className={`nansha-rules-trigger${fixed ? ' is-fixed' : ''} ${className}`} type="button" onClick={onClick}>{label}</button>
}

function RulesPage({ onBack }) {
  return (
    <section className="nansha-rules-page">
      <PageHeader title="活动说明" onBack={onBack} className="nansha-rules-header" />
      <div className="nansha-rules-stage">
        <article className="nansha-rules-paper">
          <svg className="nansha-rules-paper-shape" viewBox="0 0 690 1636" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0H147L127 64C273 35 415 29 544 55C612 69 658 101 690 142V1636H0Z" fill="#fff" />
          </svg>
          <div className="nansha-rules-content">
            <img className="nansha-rules-title-visual" src={RULES_TITLE_VISUAL_URL} alt="南沙新声 全民开麦 我们需要这样的作品" />
            <p className="nansha-rules-intro">每人1-2分钟，拿起手机开拍<br />分享你的南沙故事</p>

            <section className="nansha-rules-section nansha-rules-benefits">
              <h2 className="nansha-rules-section-title" style={{ '--highlight-width': 'calc(var(--nansha-unit) * 30.4)' }}>优秀作品可获得</h2>
              <ul>
                <li>√&nbsp; 南沙特色礼品</li>
                <li>√&nbsp; 纳入区宣讲人才库</li>
                <li>√&nbsp; 登上官方舞台</li>
                <li>√&nbsp; 专业演讲指导与打磨</li>
                <li>√&nbsp; 官方流量扶持曝光</li>
              </ul>
            </section>

            <section className="nansha-rules-section nansha-rules-story">
              <h2 className="nansha-rules-section-title" style={{ '--highlight-width': 'calc(var(--nansha-unit) * 40.8)' }}>你的故事 可以这样表达</h2>
              <p>1.从下方六大主题中任选其一，结合真实经历，讲述你与南沙的故事；</p>
              <p className="nansha-rules-themes">筑梦湾区 人人有梦 | 科创先锋 人人有为<br />文化传承 人人有责 | 乡村振兴 人人有益<br />时代青年 人人有志 | 暖心民生 人人有爱</p>
              <p>2.使用手机或相机，录制1-2分钟宣讲视频，分辨率不低于1080P；</p>
              <p>3.故事完整、逻辑清楚、重点突出、真实生动，展现南沙的发展变化与城市温度；</p>
              <p>4.不限宣讲风格及语种，含粤语、普通话、外国语（需配中文字幕）；</p>
              <p>5.遵守法律法规及公序良俗，不得出现低俗恶搞、虚假表述及负面炒作等内容；</p>
              <p>6.作品须为原创，所使用的音乐、图片及视频等素材须无版权纠纷；</p>
              <p>7.作品一经提交，即视为作者授权主办方合规使用，未经主办方许可，不得擅自对外发布。</p>
              <p>8.我们将主动联系通过初选的视频作者，对接后续相关事宜；若未收到我方联系，则代表初选未通过。</p>
            </section>

            <section className="nansha-rules-organizers" aria-label="主办单位信息">
              <p><b>主办单位：</b><span>中共广州市南沙区委宣传部、<br />中共广州市南沙区委社会工作部</span></p>
              <p><b>支持单位：</b><span>区委统战部、区人社局、区农业农村局、<br />开发区港澳办、区总工会、团区委</span></p>
              <p><b>协办单位：</b><span>南沙区图书馆、南沙区文化馆</span></p>
            </section>
          </div>
        </article>
        <img className="nansha-rules-microphone" src={MICROPHONE_VISUAL_URL} alt="" />
        <p className="nansha-rules-disclaimer">*本次活动最终解释权归主办方所有</p>
      </div>
    </section>
  )
}

function UploadResultDialog({ status, onConfirm }) {
  const isSuccess = status === 'success'
  return (
    <section className="nansha-upload-result-overlay" role="dialog" aria-modal="true" aria-label={isSuccess ? '上传成功' : '上传失败'}>
      <div className={`nansha-upload-result-card ${isSuccess ? 'is-success' : 'is-failure'}`}>
        <span className="nansha-upload-result-top-arc" aria-hidden="true" />
        <h2>{isSuccess ? '上传成功!' : '上传失败...'}</h2>
        <p className="nansha-upload-result-message">
          {isSuccess ? (
            <>
              <span>作品已上传，可在“我的作品”中查看</span>
              <span>我们将主动联系通过初选的视频作者，对接后续相关事宜，<br />若未收到我方联系，则代表初选未通过。</span>
            </>
          ) : '上传失败，请重新上传'}
        </p>
        <button className="nansha-upload-result-confirm" type="button" onClick={onConfirm}>确定</button>
      </div>
    </section>
  )
}

function VoteDialog({ onConfirm, onClose }) {
  return (
    <section className="nansha-vote-overlay" role="dialog" aria-modal="true" aria-label="投票">
      <div className="nansha-vote-dialog-card">
        <button className="nansha-dialog-close" type="button" onClick={onClose} aria-label="关闭投票弹窗"><CloseOutlined /></button>
        <svg className="nansha-vote-dialog-shape" viewBox="0 0 426 426" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 0H426V20C270 20 122 38 0 76Z" fill="#173b98" />
          <path d="M0 424C180 424 316 416 426 399V426H0Z" fill="#173b98" />
        </svg>
        <div className="nansha-vote-dialog-content">
          <p className="nansha-vote-quota-label">当前拥有每日票数:</p>
          <strong className="nansha-vote-quota-value">10票</strong>
          <label className="nansha-vote-select-label" htmlFor="nansha-vote-count">当前视频投出票数</label>
          <div className="nansha-vote-select-wrap">
            <select id="nansha-vote-count" defaultValue="1" aria-label="当前视频投出票数">
              {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
            </select>
            <span aria-hidden="true">⌄</span>
          </div>
          <button className="nansha-vote-confirm-button" type="button" onClick={onConfirm}>确定投票</button>
        </div>
      </div>
    </section>
  )
}

function VoteResultDialog({ status, onConfirm }) {
  const isSuccess = status === 'success'
  return (
    <section className="nansha-vote-overlay" role="dialog" aria-modal="true" aria-label={isSuccess ? '投票成功' : '投票失败'}>
      <div className={`nansha-vote-result-card ${isSuccess ? 'is-success' : 'is-failure'}`}>
        <img className="nansha-vote-result-image" src={isSuccess ? VOTE_SUCCESS_VISUAL_URL : VOTE_FAILURE_VISUAL_URL} alt={isSuccess ? '投票成功' : '投票失败，请重新投票'} />
        <button className="nansha-dialog-close" type="button" onClick={onConfirm} aria-label="关闭投票结果弹窗"><CloseOutlined /></button>
      </div>
    </section>
  )
}

function VoteBottomNavigation({ active, onHome, onRanking, onMy }) {
  return (
    <nav className="nansha-vote-bottom-nav" aria-label="投票阶段底部导航">
      <button className={active === 'home' ? 'is-active' : ''} type="button" onClick={onHome}><AudioOutlined aria-hidden="true" /><span>首页</span></button>
      <button className={active === 'ranking' ? 'is-active' : ''} type="button" onClick={onRanking}><BarChartOutlined aria-hidden="true" /><span>排行榜</span></button>
      <button className={active === 'my' ? 'is-active' : ''} type="button" onClick={onMy}><UserOutlined aria-hidden="true" /><span>我的</span></button>
    </nav>
  )
}

function BottomNavigation({ active, onHome, onMy }) {
  return (
    <nav className="nansha-bottom-nav" aria-label="底部导航">
      <button className={active === 'home' ? 'is-active' : ''} type="button" onClick={onHome}><AudioOutlined className="nansha-nav-icon" aria-hidden="true" /><span>首页</span></button>
      <button className={active === 'my' ? 'is-active' : ''} type="button" onClick={onMy}><UserOutlined className="nansha-nav-icon" aria-hidden="true" /><span>我的</span></button>
    </nav>
  )
}
