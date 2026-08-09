import { useEffect, useState } from 'react'
import {
  AudioOutlined,
  AuditOutlined,
  BarChartOutlined,
  CaretRightFilled,
  FullscreenOutlined,
  LeftOutlined,
  RightOutlined,
  SoundOutlined,
  UserOutlined,
  VideoCameraFilled,
} from '@ant-design/icons'
import { getBootstrap } from './api'
import './styles.css'

const ACTIVITY_TYPE = 'nansha_open_mic'
const ACTIVITY_KEY = 'nansha_new_voice_2026'
const ASSET_BASE_URL = `https://assets.zice8.com/${ACTIVITY_TYPE}/${ACTIVITY_KEY}`
const MAIN_VISUAL_URL = `${ASSET_BASE_URL}/1.png?v=20260809`
const TITLE_VISUAL_URL = `${ASSET_BASE_URL}/2.png?v=20260809`
const MICROPHONE_VISUAL_URL = `${ASSET_BASE_URL}/3.png`
const RULES_TITLE_VISUAL_URL = `${ASSET_BASE_URL}/4.png?v=20260809-rules`
const RANKING_THEME_VISUAL_URL = `${ASSET_BASE_URL}/6.png?v=20260810-ranking`

const RULES = [
  '从六大主题中任选其一，结合真实经历，讲述你与南沙的故事。',
  '故事完整、逻辑清楚、重点突出，展现南沙的发展变化与城市温度。',
  '语言通俗易懂，可采用生活化、口语化表达，演讲语种不限。',
  '遵守法律法规及公序良俗，不得出现低俗恶搞、虚假表述及负面炒作等内容。',
  '作品须为原创，所使用的音乐、图片及视频等素材须取得合法授权',
]

const VOTE_WORKS = Array.from({ length: 6 }, (_, index) => ({ id: index + 1 }))

export default function NanshaOpenMicProject() {
  const [view, setView] = useState('vote-home')
  const [rulesOrigin, setRulesOrigin] = useState('vote-home')
  const [activityPhase, setActivityPhase] = useState('vote')
  const [selectedVideoName, setSelectedVideoName] = useState('')
  const [uploadDialog, setUploadDialog] = useState('')
  const [nextUploadResult, setNextUploadResult] = useState('success')
  const [voteDialog, setVoteDialog] = useState('')
  const [nextVoteResult, setNextVoteResult] = useState('success')
  const [myEntry, setMyEntry] = useState(null)
  const [voteQuota, setVoteQuota] = useState({ remaining: 10 })
  const homeView = activityPhase === 'upload' ? 'upload-home' : 'vote-home'

  useEffect(() => {
    let alive = true
    getBootstrap(ACTIVITY_KEY)
      .then((data) => {
        const phase = data?.phase
        if (!alive || (phase !== 'upload' && phase !== 'vote')) return
        setActivityPhase(phase)
        setMyEntry(data?.myEntry || null)
        setVoteQuota(data?.voteQuota || { remaining: data?.rules?.dailyVoteLimit || 10 })
        setView((current) => (current === 'vote-home' || current === 'upload-home' ? (phase === 'upload' ? 'upload-home' : 'vote-home') : current))
      })
      .catch(() => {})
    return () => { alive = false }
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
      {view === 'vote-home' && activityPhase === 'vote' ? <VoteHome onShowRules={openRules} onRanking={() => setView('ranking')} onMy={() => setView('my')} onWork={() => setView('work-detail')} /> : null}
      {view === 'ranking' && activityPhase === 'vote' ? <RankingPage onShowRules={openRules} onHome={() => setView('vote-home')} onMy={() => setView('my')} onWork={() => setView('work-detail')} /> : null}
      {view === 'upload-home' && activityPhase === 'upload' ? <UploadHome onShowRules={openRules} onUpload={openUpload} /> : null}
      {view === 'my' ? <MyPage activityPhase={activityPhase} myEntry={myEntry} voteQuota={voteQuota} onBack={goBack} onShowRules={openRules} onOpenWork={() => setView('work')} onOpenVotes={() => setView('my-votes')} /> : null}
      {view === 'my-votes' && activityPhase === 'vote' ? <MyVotesPage onBack={goBack} onShowRules={openRules} onHome={() => setView('vote-home')} onRanking={() => setView('ranking')} onMy={() => setView('my')} /> : null}
      {view === 'work-detail' && activityPhase === 'vote' ? <WorkDetailPage onBack={goBack} onShowRules={openRules} onVote={openVoteDialog} /> : null}
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

      {view === 'my' && activityPhase === 'vote' ? <VoteBottomNavigation active="my" onHome={() => setView('vote-home')} onRanking={() => setView('ranking')} onMy={() => setView('my')} /> : null}
      {view === 'my' && activityPhase !== 'vote' ? <BottomNavigation onHome={() => setView(homeView)} onMy={() => setView('my')} /> : null}

      {uploadDialog ? <UploadResultDialog status={uploadDialog} onConfirm={closeUploadDialog} /> : null}
      {voteDialog === 'vote' ? <VoteDialog onConfirm={confirmVote} /> : null}
      {voteDialog === 'success' || voteDialog === 'failure' ? <VoteResultDialog status={voteDialog} onConfirm={closeVoteDialog} /> : null}
    </main>
  )
}

function UploadHome({ onShowRules, onUpload }) {
  return (
    <div className="nansha-home-view">
      <section className="nansha-main-visual-wrap">
        <img className="nansha-main-visual" src={MAIN_VISUAL_URL} alt="南沙新声 全民开麦" />
        <ActivityRulesTrigger onClick={onShowRules} />
      </section>
      <img className="nansha-title-visual" src={TITLE_VISUAL_URL} alt="南沙新声 全民开麦 南沙宣讲员招募中" />
      <section className="nansha-countdown" aria-label="距离上传截止还有五天">
        <div className="nansha-countdown-label">距离上传截止还有</div>
        <strong>5天 00:00:00</strong>
      </section>
      <button className="nansha-upload-button" type="button" onClick={onUpload}>上传作品</button>
      <section className="nansha-rule-panel" aria-label="报名要求"><RuleList /></section>
      <section className="nansha-organizer-panel" aria-label="主办单位信息">
        <p><b>主办单位：</b><span>中共广州市南沙区委宣传部<br />中共广州市南沙区委社会工作部</span></p>
        <p><b>支持单位：</b><span>区委统战部、区人社局、区农业农村局、<br />开发区港澳办、区总工会、团区委</span></p>
        <p><b>协办单位：</b><span>南沙区图书馆、南沙区文化馆</span></p>
      </section>
      <p className="nansha-disclaimer">*本次活动最终解释权归主办方所有</p>
    </div>
  )
}

function VoteHome({ onShowRules, onRanking, onMy, onWork }) {
  return (
    <section className="nansha-vote-home">
      <section className="nansha-vote-visual-wrap">
        <img className="nansha-vote-main-visual" src={MAIN_VISUAL_URL} alt="南沙新声 全民开麦" />
        <ActivityRulesTrigger onClick={onShowRules} />
      </section>
      <section className="nansha-vote-heading">
        <h1>南沙新声 · 全民开麦</h1>
        <p>为你心仪的作品投出宝贵的一票吧</p>
        <strong>今日剩余票数:10</strong>
      </section>
      <section className="nansha-vote-work-panel" aria-label="参赛作品">
        {VOTE_WORKS.map((work) => (
          <article className="nansha-vote-work-card" key={work.id}>
            <button className="nansha-vote-video-placeholder" type="button" aria-label={`查看作品${work.id}`} onClick={onWork}><CaretRightFilled /></button>
            <p>作品名称：代用名<br />作者：代用名<br />票数：0000票</p>
          </article>
        ))}
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

function WorkDetailPage({ onBack, onShowRules, onVote }) {
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
          <button className="nansha-detail-share-button" type="button">拉票</button>
        </div>
      </section>
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

function RuleList() {
  return <ol>{RULES.map((rule, index) => <li key={rule}><b>{index + 1}.</b><span>{rule}</span></li>)}</ol>
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
            </section>

            <section className="nansha-rules-extra">
              <p><b>报名时间：</b><strong>2026年8月13日至25日</strong></p>
              <p><b>视频要求：</b><span>1.录制1—2分钟宣讲视频，9:16竖屏形式<br />2.MP4格式，画面清晰简洁，分辨率不低于1080P</span></p>
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
        <p>{isSuccess ? <>作品已上传，后台审核中。<br />审核成功后将显示在“我的作品”中</> : '上传失败，请重新上传'}</p>
        <button className="nansha-upload-result-confirm" type="button" onClick={onConfirm}>确定</button>
      </div>
    </section>
  )
}

function VoteDialog({ onConfirm }) {
  return (
    <section className="nansha-vote-overlay" role="dialog" aria-modal="true" aria-label="投票">
      <div className="nansha-vote-dialog-card">
        <svg className="nansha-vote-dialog-shape" viewBox="0 0 426 468" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 41H426V61C270 61 122 78 0 118Z" fill="#173b98" />
        </svg>
        <div className="nansha-vote-dialog-content">
          <p className="nansha-vote-quota-label">当前拥有每日票数:</p>
          <strong className="nansha-vote-quota-value">10票</strong>
          <label className="nansha-vote-select-label" htmlFor="nansha-vote-count">当前视频投出票数</label>
          <select id="nansha-vote-count" defaultValue="1" aria-label="当前视频投出票数">
            {Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
          </select>
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
      <div className={`nansha-vote-result-card ${isSuccess ? 'is-success' : 'is-failure'}`} role="button" tabIndex={0} onClick={onConfirm} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onConfirm() }}>
        {isSuccess ? <VoteSpark /> : null}
        <img className="nansha-vote-result-microphone" src={MICROPHONE_VISUAL_URL} alt="" />
        <h2>{isSuccess ? <>投票<br />成功</> : <>投票失败<br />请重新投票</>}</h2>
        {!isSuccess ? <span className="nansha-vote-failure-bars" aria-hidden="true"><i /><i /><i /></span> : null}
      </div>
    </section>
  )
}

function VoteSpark() {
  return (
    <svg className="nansha-vote-spark" viewBox="0 0 72 72" aria-hidden="true">
      <path d="M13 20 44 4l6 36-34 8Z" fill="#f9c82e" />
      <path d="M0 52 38 45 32 61 4 69Z" fill="#f9c82e" />
      <path d="M36 0 57 2 60 25 42 16Z" fill="#f9c82e" />
    </svg>
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

function BottomNavigation({ onHome, onMy }) {
  return (
    <nav className="nansha-bottom-nav" aria-label="底部导航">
      <button className="is-active" type="button" onClick={onHome}><AudioOutlined className="nansha-nav-icon" aria-hidden="true" /><span>首页</span></button>
      <button type="button" onClick={onMy}><UserOutlined className="nansha-nav-icon" aria-hidden="true" /><span>我的</span></button>
    </nav>
  )
}
