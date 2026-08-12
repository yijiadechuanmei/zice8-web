import { useEffect, useRef, useState } from 'react'
import {
  AudioOutlined,
  AuditOutlined,
  BarChartOutlined,
  CaretRightFilled,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  UserOutlined,
  VideoCameraFilled,
} from '@ant-design/icons'
import { QRCodeCanvas } from 'qrcode.react'
import { castVote, createEntry, createUploadPolicy, getBootstrap, getEntries, getMyVotes, getPublicConfig, replaceEntryVideo, uploadFileToOss } from './api'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
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

function createRequestId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `nansha-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function assertVideoFileSignature(file) {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer())
  const isIsoMedia = bytes.length >= 8 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
  const isWebm = bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  if (!isIsoMedia && !isWebm) throw new Error('请选择 MP4、MOV 或 WebM 视频')
}

function getUploadVideoContentType(file) {
  const name = String(file?.name || '').toLowerCase()
  if (name.endsWith('.mov')) return 'video/quicktime'
  if (name.endsWith('.webm')) return 'video/webm'
  return 'video/mp4'
}

function isImageCoverUrl(url) {
  return /\.(?:jpe?g|png|webp)(?:[?#]|$)/i.test(String(url || '')) || /\/covers\//.test(String(url || ''))
}

function loadCanvasImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`无法加载海报素材：${url}`))
    image.src = url
  })
}

function drawCoverImage(context, image, x, y, width, height) {
  if (!image) {
    context.fillStyle = '#aaa'
    context.fillRect(x, y, width, height)
    context.fillStyle = '#050505'
    context.font = 'bold 42px sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText('▶', x + width / 2, y + height / 2)
    return
  }
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.save()
  context.beginPath()
  context.rect(x, y, width, height)
  context.clip()
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
  context.restore()
}

function drawAvatarImage(context, image, centerX, centerY, radius) {
  context.save()
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.clip()
  if (image) {
    const scale = Math.max((radius * 2) / image.width, (radius * 2) / image.height)
    const width = image.width * scale
    const height = image.height * scale
    context.drawImage(image, centerX - width / 2, centerY - height / 2, width, height)
  } else {
    context.fillStyle = '#000'
    context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2)
    context.fillStyle = '#fff'
    context.beginPath()
    context.arc(centerX, centerY - radius * .28, radius * .25, 0, Math.PI * 2)
    context.fill()
    context.beginPath()
    context.ellipse(centerX, centerY + radius * .39, radius * .47, radius * .33, 0, Math.PI, 0)
    context.fill()
  }
  context.restore()
}

export default function NanshaOpenMicProject() {
  const [publicConfig, setPublicConfig] = useState(null)
  const [view, setView] = useState('upload-home')
  const [rulesOrigin, setRulesOrigin] = useState('upload-home')
  const [activityPhase, setActivityPhase] = useState('upload')
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [videoCoverPreview, setVideoCoverPreview] = useState('')
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoError, setVideoError] = useState('')
  const [videoReplacementEntry, setVideoReplacementEntry] = useState(null)
  const [uploadDialog, setUploadDialog] = useState('')
  const [voteDialog, setVoteDialog] = useState('')
  const [posterOpen, setPosterOpen] = useState(false)
  const [myEntry, setMyEntry] = useState(null)
  const [myProfile, setMyProfile] = useState({ nickname: '微信用户', avatar: '' })
  const [voteQuota, setVoteQuota] = useState({ remaining: 10 })
  const [entries, setEntries] = useState([])
  const [myVotes, setMyVotes] = useState([])
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [sharedEntryId, setSharedEntryId] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('entryId') || '')
  const { authReady, blockedMessage, authStatus } = useWechatAuth(ACTIVITY_KEY, publicConfig)
  const homeView = activityPhase === 'vote'
    ? 'vote-home'
    : activityPhase === 'publicity'
      ? 'publicity-ranking'
      : 'upload-home'

  useEffect(() => {
    let alive = true
    getPublicConfig(ACTIVITY_KEY)
      .then((config) => {
        if (!alive) return
        setPublicConfig(config || {})
        if (['upload', 'vote', 'publicity', 'closed'].includes(config?.phase)) {
          setActivityPhase(config.phase)
        }
      })
      .catch(() => {
        if (alive) setPublicConfig({})
      })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!authReady) return undefined
    let alive = true
    let previousPhase = null

    async function refreshActivityState() {
      Promise.allSettled([getPublicConfig(ACTIVITY_KEY), getBootstrap(ACTIVITY_KEY)])
        .then(([publicResult, bootstrapResult]) => {
        const publicData = publicResult.status === 'fulfilled' ? publicResult.value : null
        const bootstrapData = bootstrapResult.status === 'fulfilled' ? bootstrapResult.value : null
        const phase = publicData?.phase || bootstrapData?.phase
        if (!alive || !['upload', 'vote', 'publicity', 'closed'].includes(phase)) return
        setActivityPhase(phase)
        if (bootstrapData) {
          setMyEntry(bootstrapData.myEntry || null)
          setMyProfile(bootstrapData.profile || { nickname: '微信用户', avatar: '' })
          setVoteQuota(bootstrapData.voteQuota || { remaining: bootstrapData.rules?.dailyVoteLimit || 10 })
        }
        if (bootstrapData && ['vote', 'publicity'].includes(phase)) {
          getEntries(ACTIVITY_KEY, 1, 50).then((result) => {
            if (!alive) return
            const list = result?.list || []
            setEntries(list)
            if (sharedEntryId && phase === 'vote') {
              const sharedEntry = list.find((entry) => entry.id === sharedEntryId)
              if (sharedEntry) {
                setSelectedEntry(sharedEntry)
                setView('work-detail')
              }
              setSharedEntryId('')
            }
          }).catch(() => {})
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
  }, [authReady, sharedEntryId])

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
    setVideoReplacementEntry(null)
    setSelectedVideo(null)
    setVideoCoverPreview('')
    setVideoError('')
    setView('upload')
  }

  function openVideoReplacement(entry) {
    setSelectedVideo(null)
    setVideoCoverPreview('')
    setUploadProgress(0)
    setVideoError('')
    setVideoReplacementEntry(entry)
    setView('upload')
  }

  async function selectVideo(file) {
    if (!file) return
    if (!/\.(mp4|mov|webm)$/i.test(file.name || '')) {
      setVideoError('请选择 MP4、MOV 或 WebM 视频')
      return
    }
    setSelectedVideo(file)
    setVideoCoverPreview('')
    setUploadProgress(0)
    setVideoError('')
    try {
      await assertVideoFileSignature(file)
    } catch (error) {
      setSelectedVideo(null)
      setVideoCoverPreview('')
      setVideoError(error instanceof Error ? error.message : '请选择 MP4、MOV 或 WebM 视频')
    }
  }

  async function completeUpload(form) {
    if (!selectedVideo) return { error: '请先选择视频文件' }
    try {
      setUploadingVideo(true)
      setUploadProgress(0)
      const videoPolicy = await createUploadPolicy(ACTIVITY_KEY, {
        kind: 'video',
        fileName: selectedVideo.name,
        // Mobile browsers sometimes label an otherwise valid MOV/MP4 as
        // application/octet-stream. The extension is the reliable user-facing
        // contract; the cloud service still verifies/transcodes the payload.
        contentType: getUploadVideoContentType(selectedVideo),
        size: selectedVideo.size,
        replace: Boolean(videoReplacementEntry),
      })
      setUploadProgress(1)
      const videoUrl = await uploadFileToOss(videoPolicy, selectedVideo, setUploadProgress)
      const coverUrl = ''
      const result = videoReplacementEntry
        ? await replaceEntryVideo(ACTIVITY_KEY, videoReplacementEntry.id, { videoUrl, coverUrl })
        : await createEntry(ACTIVITY_KEY, { ...form, videoUrl, coverUrl })
      if (result.entry?.mediaStatus === 'failed') {
        setMyEntry(result.entry)
        throw new Error(result.entry.mediaError || '视频适配失败，请上传 H.264/AAC 编码的 MP4 视频')
      }
      setVideoCoverPreview(result.entry?.coverUrl || '')
      setMyEntry(result.entry)
      setSelectedVideo(null)
      setVideoReplacementEntry(null)
      setUploadDialog('success')
      return { ok: true }
    } catch (error) {
      setVideoError(error?.message || '上传失败，请上传 H.264/AAC 编码的 MP4 视频')
      setUploadDialog('failure')
      return { error: error?.message || '上传失败，请重新上传' }
    } finally {
      setUploadingVideo(false)
    }
  }

  function closeUploadDialog() {
    const isSuccess = uploadDialog === 'success'
    setUploadDialog('')
    if (isSuccess) setView('my')
  }

  function openWork(entry) {
    setSelectedEntry(entry)
    setView('work-detail')
  }

  function openVoteDialog() {
    if (!selectedEntry) return
    setVoteDialog('vote')
  }

  function openVoteDialogForEntry(entry) {
    if (!entry) return
    setSelectedEntry(entry)
    setVoteDialog('vote')
  }

  function openPosterForEntry(entry) {
    if (!entry) return
    setSelectedEntry(entry)
    setPosterOpen(true)
  }

  async function confirmVote(quantity) {
    if (!selectedEntry) return
    try {
      const result = await castVote(ACTIVITY_KEY, selectedEntry.id, { quantity, requestId: createRequestId() })
      setVoteQuota((current) => ({ ...current, used: result.used, remaining: result.remaining, limit: result.limit }))
      setEntries((current) => current.map((entry) => entry.id === selectedEntry.id ? { ...entry, voteCount: result.voteCount } : entry))
      setSelectedEntry((current) => current ? { ...current, voteCount: result.voteCount } : current)
      setVoteDialog('success')
    } catch {
      setVoteDialog('failure')
    }
  }

  async function openMyVotes() {
    try { setMyVotes((await getMyVotes(ACTIVITY_KEY)).list || []) } catch { setMyVotes([]) }
    setView('my-votes')
  }

  function closeVoteDialog() {
    setVoteDialog('')
  }

  if (blockedMessage) {
    return <main className="nansha-open-mic-page"><section className="nansha-auth-message">{blockedMessage}</section></main>
  }

  if (!publicConfig || !authReady) {
    return <main className="nansha-open-mic-page"><section className="nansha-auth-message">{authStatus === 'redirecting' ? '正在进入微信授权…' : '活动加载中…'}</section></main>
  }

  return (
    <main className="nansha-open-mic-page">
      {view === 'vote-home' && activityPhase === 'vote' ? <VoteHome visualUrl={REVIEW_MAIN_VISUAL_URL} entries={entries} voteQuota={voteQuota} onShowRules={openRules} onRanking={() => setView('ranking')} onMy={() => setView('my')} onWork={openWork} /> : null}
      {view === 'ranking' && activityPhase === 'vote' ? <RankingPage entries={entries} onShowRules={openRules} onHome={() => setView('vote-home')} onMy={() => setView('my')} onWork={openWork} /> : null}
      {view === 'publicity-ranking' && activityPhase === 'publicity' ? <PublicityRankingPage entries={entries} /> : null}
      {view === 'upload-home' && activityPhase === 'upload' && !myEntry ? <UploadHome onShowRules={openRules} onUpload={openUpload} /> : null}
      {view === 'upload-home' && activityPhase !== 'vote' && myEntry ? <ReviewHome onShowRules={openRules} showReviewNotice /> : null}
      {view === 'upload-home' && activityPhase === 'closed' && !myEntry ? <ReviewHome onShowRules={openRules} /> : null}
      {view === 'my' && activityPhase !== 'publicity' ? <MyPage activityPhase={activityPhase} myEntry={myEntry} profile={myProfile} voteQuota={voteQuota} onBack={goBack} onShowRules={openRules} onOpenWork={() => setView('work')} onOpenVotes={openMyVotes} /> : null}
      {view === 'my-votes' && activityPhase === 'vote' ? <MyVotesPage votes={myVotes} onBack={goBack} onShowRules={openRules} onHome={() => setView('vote-home')} onRanking={() => setView('ranking')} onMy={() => setView('my')} /> : null}
      {view === 'work-detail' && activityPhase === 'vote' && selectedEntry ? <WorkDetailPage entry={selectedEntry} onBack={goBack} onShowRules={openRules} onVote={openVoteDialog} onShare={() => openPosterForEntry(selectedEntry)} /> : null}
      {view === 'work' && myEntry ? <MyWorkPage entry={myEntry} activityPhase={activityPhase} onBack={goBack} onShowRules={openRules} onReplaceVideo={openVideoReplacement} onVote={() => openVoteDialogForEntry(myEntry)} onShare={() => openPosterForEntry(myEntry)} /> : null}
      {view === 'upload' ? (
        <UploadPage
          onBack={goBack}
          onShowRules={openRules}
          selectedVideoName={selectedVideo?.name || ''}
          coverPreview={videoCoverPreview}
          uploadProgress={uploadProgress}
          uploadingVideo={uploadingVideo}
          videoError={videoError}
          onSelectVideo={(event) => selectVideo(event.target.files?.[0])}
          onSubmit={completeUpload}
          replacementEntry={videoReplacementEntry}
        />
      ) : null}
      {view === 'rules' ? <RulesPage onBack={goBack} /> : null}

      {view === 'upload-home' && activityPhase !== 'vote' ? <BottomNavigation active="home" onHome={() => setView('upload-home')} onMy={() => setView('my')} /> : null}
      {view === 'my' && activityPhase === 'vote' ? <VoteBottomNavigation active="my" onHome={() => setView('vote-home')} onRanking={() => setView('ranking')} onMy={() => setView('my')} /> : null}
      {view === 'my' && activityPhase !== 'vote' && activityPhase !== 'publicity' ? <BottomNavigation active="my" onHome={() => setView(homeView)} onMy={() => setView('my')} /> : null}

      {uploadDialog ? <UploadResultDialog status={uploadDialog} errorMessage={videoError} onConfirm={closeUploadDialog} /> : null}
      {voteDialog === 'vote' ? <VoteDialog remaining={voteQuota?.remaining ?? 0} onConfirm={confirmVote} onClose={closeVoteDialog} /> : null}
      {voteDialog === 'success' || voteDialog === 'failure' ? <VoteResultDialog status={voteDialog} onConfirm={closeVoteDialog} /> : null}
      {posterOpen && selectedEntry ? <VotePosterDialog entry={selectedEntry} onClose={() => setPosterOpen(false)} /> : null}
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

function VoteHome({ visualUrl, entries, voteQuota, onShowRules, onRanking, onMy, onWork }) {
  return (
    <section className="nansha-vote-home">
      <header className="nansha-upload-home-header"><h1>首页</h1></header>
      <section className="nansha-vote-visual-wrap">
        <img className="nansha-vote-main-visual" src={visualUrl} alt="南沙新声 全民开麦" />
        <ActivityRulesTrigger onClick={onShowRules} label="投票说明" />
      </section>
      <section className="nansha-vote-stage">
        <section className="nansha-vote-heading">
          <strong>今日剩余票数:{voteQuota?.remaining ?? 0}</strong>
          <p>请投出您宝贵的一票，选出优秀宣讲代表</p>
        </section>
        <section className="nansha-vote-work-panel" aria-label="参赛作品">
          {entries.map((work) => (
            <article className="nansha-vote-work-card" key={work.id}>
              <button className="nansha-vote-video-placeholder" type="button" aria-label={`查看作品${work.workName}`} onClick={() => onWork(work)} style={work.coverUrl ? { backgroundImage: `url(${work.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><CaretRightFilled /></button>
              <p>
                <span className="nansha-work-card-title-line"><span className="nansha-work-card-title-label">作品名称：</span><span className="nansha-work-card-title" title={work.workName}>{work.workName}</span></span>
                <span>作者：{work.authorName}</span>
                <span>票数：{work.voteCount || 0}票</span>
              </p>
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

function RankingPage({ entries, onShowRules, onHome, onMy, onWork }) {
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
            {entries.map((entry, index) => <RankingRow key={entry.id} rank={index + 1} entry={entry} onWork={onWork} />)}
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

function PublicityRankingPage({ entries }) {
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
          {entries.map((entry, index) => <PublicityRankingRow key={entry.id} rank={index + 1} entry={entry} />)}
        </div>
      </section>
    </section>
  )
}

function PublicityRankingRow({ rank, entry }) {
  return (
    <div className={`nansha-publicity-row rank-${rank}`}>
      <span className="nansha-publicity-number">{rank}</span>
      <p><span className="nansha-publicity-work-name" title={entry.workName}>{entry.workName}</span><br /><span>{entry.authorName}</span></p>
      <span className="nansha-publicity-votes">{entry.voteCount || 0}票&nbsp; &gt;</span>
    </div>
  )
}

function RankingRow({ rank, entry, onWork }) {
  return (
    <div className={`nansha-ranking-row rank-${rank}`} role="button" tabIndex={0} onClick={() => onWork(entry)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onWork(entry) }}>
      <span className="nansha-ranking-number">{rank}</span>
      <p><span className="nansha-ranking-work-name" title={entry.workName}>{entry.workName}</span><br /><span>{entry.authorName}</span></p>
      <span className="nansha-ranking-votes">{entry.voteCount || 0}票&nbsp; &gt;</span>
    </div>
  )
}

function MyPage({ activityPhase, myEntry, profile, voteQuota, onBack, onShowRules, onOpenWork, onOpenVotes }) {
  const isVotePhase = activityPhase === 'vote'
  const workStatus = myEntry?.reviewStatus === 'published' ? '审核成功' : myEntry?.reviewStatus === 'rejected' ? '未通过' : '审核中'
  const workVotes = myEntry?.voteCount ?? 0
  const remainingVotes = voteQuota?.remaining ?? 10
  return (
    <section className="nansha-sub-page nansha-my-page">
      <PageHeader title="我的" onBack={onBack} />
      <section className="nansha-profile-banner">
        <span className={`nansha-profile-avatar${profile?.avatar ? ' has-image' : ''}`} aria-hidden="true">{profile?.avatar ? <img src={profile.avatar} alt="" referrerPolicy="no-referrer" /> : <i />}</span>
        <span className="nansha-profile-name">{profile?.nickname || '微信用户'}</span>
        <img className="nansha-profile-microphone" src={MICROPHONE_VISUAL_URL} alt="" />
      </section>
      <ActivityRulesTrigger onClick={onShowRules} fixed />
      {isVotePhase ? (
        <section className="nansha-my-summary-list" aria-label="我的活动信息">
          {myEntry ? <MySummaryRow icon={<VideoCameraFilled />} title="我的作品" status={workStatus} detail={`获票数：${workVotes}票`} onClick={onOpenWork} /> : null}
          <MySummaryRow icon={<AuditOutlined />} title="我的投票" detail={`今日剩余票数：${remainingVotes}票`} onClick={onOpenVotes} />
        </section>
      ) : myEntry ? (
        <button className="nansha-my-work-row" type="button" onClick={onOpenWork}>
          <VideoCameraFilled className="nansha-work-icon" aria-hidden="true" />
          <b>我的作品</b>
          <em>{workStatus}</em>
          <RightOutlined className="nansha-row-chevron" aria-hidden="true" />
        </button>
      ) : null}
    </section>
  )
}

function MySummaryRow({ icon, title, status, detail, onClick }) {
  return (
    <button className="nansha-my-summary-row" type="button" onClick={onClick}>
      <span className="nansha-summary-icon" aria-hidden="true">{icon}</span>
      <b className="nansha-summary-title">{title}</b>
      {status ? <em className={`nansha-summary-status${status === '审核成功' ? ' is-approved' : ''}`}>{status}</em> : null}
      <span className="nansha-summary-detail">{detail}</span>
      <RightOutlined className="nansha-summary-chevron" aria-hidden="true" />
    </button>
  )
}

function MyVotesPage({ votes, onBack, onShowRules, onHome, onRanking, onMy }) {
  return (
    <section className="nansha-my-votes-page">
      <PageHeader title="我的投票" onBack={onBack} />
      <main className="nansha-my-votes-stage">
        <img className="nansha-my-votes-microphone" src={MICROPHONE_VISUAL_URL} alt="" />
        <ActivityRulesTrigger onClick={onShowRules} fixed />
        <section className="nansha-my-votes-board" aria-label="我的投票详情">
          <div className="nansha-my-votes-list">
            {votes.map((vote) => <MyVoteRow key={vote.id} vote={vote} />)}
          </div>
        </section>
        <VoteBottomNavigation active="my" onHome={onHome} onRanking={onRanking} onMy={onMy} />
      </main>
    </section>
  )
}

function MyVoteRow({ vote }) {
  return (
    <button className="nansha-my-vote-row" type="button">
      <span className="nansha-my-vote-title">{vote.workName}</span>
      <span className="nansha-my-vote-detail">本次投票：{vote.quantity}票</span>
      <RightOutlined className="nansha-my-vote-chevron" aria-hidden="true" />
    </button>
  )
}

function WorkDetailPage({ entry, onBack, onShowRules, onVote, onShare }) {
  return (
    <section className="nansha-sub-page nansha-work-detail-page">
      <PageHeader title={entry.workName} onBack={onBack} />
      <ActivityRulesTrigger onClick={onShowRules} fixed label="投票说明" />
      <NanshaPlaybackVideo entry={entry} />
      <section className="nansha-work-detail-info">
        <h1>{entry.workName}</h1>
        <p>{entry.authorName}</p>
        <div className="nansha-detail-description">{entry.description}</div>
        <div className="nansha-detail-actions">
          <button className="nansha-detail-vote-button" type="button" onClick={onVote}>投票</button>
          <button className="nansha-detail-share-button" type="button" onClick={onShare}>拉票</button>
        </div>
      </section>
    </section>
  )
}

function VotePosterDialog({ entry, onClose }) {
  const posterUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?entryId=${encodeURIComponent(entry.id)}` : `${ASSET_BASE_URL}`
  const qrSourceRef = useRef(null)
  const [posterImage, setPosterImage] = useState('')
  const [posterError, setPosterError] = useState('')

  useEffect(() => {
    let disposed = false
    let retryTimer = null
    let attempts = 0

    const composePoster = async () => {
      const qrCanvas = qrSourceRef.current?.querySelector('canvas')
      if (!qrCanvas) {
        attempts += 1
        if (attempts < 10) retryTimer = window.setTimeout(composePoster, 32)
        return
      }
      try {
        const [background, avatar, cover] = await Promise.all([
          loadCanvasImage(POSTER_BACKGROUND_URL),
          entry.authorAvatar ? loadCanvasImage(entry.authorAvatar).catch(() => null) : Promise.resolve(null),
          entry.coverUrl ? loadCanvasImage(entry.coverUrl).catch(() => null) : Promise.resolve(null),
        ])
        if (disposed) return
        const width = 527
        const height = 1033
        const pixelRatio = 2
        const canvas = document.createElement('canvas')
        canvas.width = width * pixelRatio
        canvas.height = height * pixelRatio
        const context = canvas.getContext('2d')
        if (!context) throw new Error('当前浏览器不支持海报合成')
        context.scale(pixelRatio, pixelRatio)
        context.drawImage(background, 0, 0, width, height)

        drawAvatarImage(context, avatar, 263.5, 282, 58)
        context.fillStyle = '#050505'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.font = '800 28px "PingFang SC", "Microsoft YaHei", sans-serif'
        context.fillText(entry.workName.slice(0, 16), width / 2, 368)
        context.font = '400 22px "PingFang SC", "Microsoft YaHei", sans-serif'
        context.fillText(entry.authorName.slice(0, 20), width / 2, 400)
        drawCoverImage(context, cover, 52.7, 455.5, 421.6, 265.5)
        context.strokeStyle = '#333'
        context.lineWidth = 1
        context.strokeRect(52.7, 455.5, 421.6, 265.5)
        context.fillStyle = '#fff'
        context.fillRect(310.9, 757.5, 166, 166)
        context.drawImage(qrCanvas, 310.9, 757.5, 166, 166)
        setPosterImage(canvas.toDataURL('image/png'))
      } catch (error) {
        if (!disposed) setPosterError(error instanceof Error ? error.message : '海报合成失败，请稍后重试')
      }
    }

    composePoster()
    return () => {
      disposed = true
      if (retryTimer) window.clearTimeout(retryTimer)
    }
  }, [entry.authorAvatar, entry.authorName, entry.coverUrl, entry.workName, posterUrl])

  return (
    <section className="nansha-poster-overlay" role="dialog" aria-modal="true" aria-label="拉票海报">
      <div className="nansha-poster-positioner">
        <div className="nansha-poster-card" aria-label="长按图片保存海报">
          <div ref={qrSourceRef} className="nansha-poster-qrcode-source" aria-hidden="true"><QRCodeCanvas value={posterUrl} size={166} includeMargin={false} /></div>
          {posterImage ? <img className="nansha-poster-composite" src={posterImage} alt="南沙新声全民开麦拉票海报，长按图片保存" draggable="false" /> : <div className="nansha-poster-generating">{posterError || '正在合成海报…'}</div>}
        </div>
        <button className="nansha-poster-close" type="button" onClick={onClose} aria-label="关闭拉票海报"><CloseOutlined /></button>
      </div>
    </section>
  )
}

function MyWorkPage({ entry, activityPhase, onBack, onShowRules, onReplaceVideo, onVote, onShare }) {
  const isApprovedForVoting = activityPhase === 'vote' && entry.reviewStatus === 'published'
  return (
    <section className="nansha-sub-page nansha-work-page">
      <PageHeader title="我的作品" onBack={onBack} />
      <ActivityRulesTrigger onClick={onShowRules} fixed />
      <NanshaPlaybackVideo entry={entry} onReplaceVideo={() => onReplaceVideo(entry)} />
      <section className="nansha-work-info">
        <h1>{entry.workName}</h1>
        <p className="nansha-work-status">作品状态：{entry.reviewStatus === 'published' ? '审核成功' : entry.reviewStatus === 'rejected' ? '未通过' : '审核中'}</p>
        <p>{entry.authorName}</p>
        <div className="nansha-work-description">{entry.description}</div>
        {isApprovedForVoting ? <div className="nansha-detail-actions nansha-my-work-actions">
          <button className="nansha-detail-vote-button" type="button" onClick={onVote}>投票</button>
          <button className="nansha-detail-share-button" type="button" onClick={onShare}>拉票</button>
        </div> : null}
      </section>
    </section>
  )
}

function NanshaPlaybackVideo({ entry, onReplaceVideo }) {
  const [failed, setFailed] = useState(false)
  const isProcessing = ['queued', 'processing', 'cover_submitting', 'cover_processing'].includes(entry.mediaStatus)
  const needsReplacement = entry.mediaStatus === 'failed' || failed
  if (isProcessing || needsReplacement) {
    return (
      <div className="nansha-video-placeholder nansha-video-playback-error">
        <p>{isProcessing ? '视频处理中，封面生成后即可查看' : onReplaceVideo ? (entry.mediaError || '视频文件不可播放，请重新上传视频') : '视频加载失败，请刷新后重试'}</p>
        {!isProcessing && onReplaceVideo ? <button type="button" onClick={onReplaceVideo}>重新上传视频</button> : null}
      </div>
    )
  }
  return (
    <video
      key={entry.id}
      className="nansha-video-placeholder"
      src={entry.videoUrl}
      poster={isImageCoverUrl(entry.coverUrl) ? entry.coverUrl : undefined}
      controls
      playsInline
      webkit-playsinline="true"
      x5-playsinline="true"
      x5-video-player-type="h5"
      preload="metadata"
      onError={() => setFailed(true)}
    >
      当前浏览器不支持视频播放
    </video>
  )
}

function UploadPage({ onBack, onShowRules, selectedVideoName, coverPreview, uploadProgress, uploadingVideo, videoError, onSelectVideo, onSubmit, replacementEntry }) {
  const [form, setForm] = useState({ workName: replacementEntry?.workName || '', authorName: replacementEntry?.authorName || '', phone: replacementEntry?.phone || '', description: replacementEntry?.description || '' })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFormError('')
  }
  async function submit(event) {
    event.preventDefault()
    if (submitting) return
    if (!selectedVideoName) {
      setFormError('请先选择视频文件')
      return
    }
    if (!form.workName.trim() || !form.authorName.trim() || !form.phone.trim() || !form.description.trim()) {
      setFormError('请完整填写作品信息')
      return
    }
    if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) {
      setFormError('请输入正确的手机号码')
      return
    }
    setSubmitting(true)
    try {
      const result = await onSubmit({
        workName: form.workName.trim(),
        authorName: form.authorName.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
      })
      if (result?.error) setFormError(result.error)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <section className="nansha-sub-page nansha-upload-page">
      <PageHeader title={replacementEntry ? '重新上传视频' : '上传视频'} onBack={onBack} />
      <ActivityRulesTrigger onClick={onShowRules} fixed />
      <form className="nansha-upload-form" onSubmit={submit}>
        <label className={`nansha-video-picker${selectedVideoName ? ' has-file' : ''}${coverPreview ? ' has-cover' : ''}`}>
          <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={onSelectVideo} />
          {coverPreview ? <img src={coverPreview} alt="视频首帧封面预览" /> : null}
          <b>{selectedVideoName || '+'}</b>
          {selectedVideoName ? <span className="nansha-video-picker-progress">{uploadingVideo ? `视频上传中 ${uploadProgress}%` : '上传后自动适配并生成封面'}</span> : null}
        </label>
        {selectedVideoName && (submitting || uploadingVideo) ? <section className="nansha-upload-progress-panel" aria-live="polite"><p>视频上传进度：{uploadProgress}%</p><div role="progressbar" aria-label="视频上传进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadProgress}><i style={{ width: `${Math.max(0, Math.min(uploadProgress, 100))}%` }} /></div></section> : null}
        <input name="workName" aria-label="作品名称" value={form.workName} onChange={(event) => update('workName', event.target.value)} placeholder="请输入作品名称" maxLength={100} />
        <input name="authorName" aria-label="作者名称" value={form.authorName} onChange={(event) => update('authorName', event.target.value)} placeholder="请输入作者名称" maxLength={100} />
        <input name="phone" aria-label="手机号码" value={form.phone} onChange={(event) => update('phone', event.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="tel" maxLength={11} placeholder="请输入手机号码" />
        <textarea name="description" aria-label="作品简介" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="请输入作品简介" maxLength={1000} />
        {formError || videoError ? <p className="nansha-upload-form-error" role="alert">{formError || videoError}</p> : null}
        <button type="submit" disabled={submitting}>{submitting ? '上传中…' : '点击确认上传'}</button>
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

function UploadResultDialog({ status, errorMessage, onConfirm }) {
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
          ) : <>
            <span>{errorMessage || '上传失败，请重新上传'}</span>
            <span className="nansha-upload-result-format-tip">支持 MP4、MOV、WebM，系统将自动转码</span>
          </>}
        </p>
        <button className="nansha-upload-result-confirm" type="button" onClick={onConfirm}>确定</button>
      </div>
    </section>
  )
}

function VoteDialog({ remaining, onConfirm, onClose }) {
  const [quantity, setQuantity] = useState(1)
  const max = Math.max(1, Number(remaining || 0))
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
          <strong className="nansha-vote-quota-value">{remaining}票</strong>
          <label className="nansha-vote-select-label" htmlFor="nansha-vote-count">当前视频投出票数</label>
          <div className="nansha-vote-select-wrap">
            <select id="nansha-vote-count" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} aria-label="当前视频投出票数">
              {Array.from({ length: max }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
            </select>
            <span aria-hidden="true">⌄</span>
          </div>
          <button className="nansha-vote-confirm-button" type="button" disabled={!remaining} onClick={() => onConfirm(quantity)}>确定投票</button>
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
