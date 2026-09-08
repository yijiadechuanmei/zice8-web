/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { request } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { trackPageView } from '../../shared/analytics'
import { Artwork, backId, otherBackId, Picture, PRIZE_ART, src } from './artwork'
import { Wheel, WHEEL_ANGLES } from './wheel'
import { formatCountdown, formatTime, makePoster } from './poster'
import './style.css'

const TYPE = 'cybersecurity_knowledge_challenge'
const DEFAULT_KEY = 'cybersecurity_knowledge_challenge_2026'
const DESIGN_WIDTH = 750
const HOME_HEIGHT = 1448
const title = '网络安全知识大闯关'
const STAGE_PLAYER_INITIAL_POSITION = { x: 127, y: 973 }
const STAGES = [
  { name: '第一关', topic: '智能时代', label: { x: 411, y: 824 }, marker: { x: 505, y: 880 }, player: { x: 484, y: 851 } },
  { name: '第二关', topic: '账号密码', label: { x: 103, y: 665 }, marker: { x: 201, y: 721 }, player: { x: 105, y: 708 } },
  { name: '第三关', topic: '信息保护', label: { x: 398, y: 511 }, marker: { x: 492, y: 567 }, player: { x: 482, y: 551 } },
  { name: '第四关', topic: 'AI安全', label: { x: 107, y: 371 }, marker: { x: 201, y: 427 }, player: { x: 120, y: 418 } },
  { name: '第五关', topic: '安全通行', label: { x: 394, y: 228 }, marker: { x: 488, y: 284 }, player: { x: 474, y: 261 } },
]
const STAGE_PROGRESS_BUTTON_ART = '00b25428c160db7d38ebf03bdc81dd3b_4874_326_89.png'
const NOTICE = {
  personal: {
    heading: '个人赛・用户须知',
    intro: '欢迎参加 "2026 年第三届“交盾杯”网络安全暨人工智能创新知识竞赛" 个人赛，为确保竞赛公平、有序进行，请参赛者仔细阅读并遵守以下须知：',
    items: [
      '报名时请填写真实姓名及单位信息，每位参赛者仅有一次正式答题机会，请提前做好准备；',
      '请在竞赛开放时间内完成答题，逾期未答视为放弃。',
      '本次答题共设 5 关，每关 10 道题，一共 50 道题，最多错三次即结束答题；',
      '答对次数越多，答题时间越短，错的越少，成绩越高，越有机会抽中幸运奖品！',
      '完成正式闯关后，系统将生成专属“个人成绩海报”，可保存分享；',
      '完成闯关即可参与“幸运转盘抽奖”，赢取幸运奖品；',
      '请使用网络稳定的手机或电脑作答，答题过程中请勿切换页面或中途退出，退出视为放弃本次成绩；',
      '请本人独立答题，禁止作弊、代答或使用外挂，违者取消参赛资格；',
      '请如实填写个人信息，文明答题、遵守竞赛纪律，本竞赛重在“以赛促学、以学促用”；',
      '本活动最终解释权归组织方所有，如有疑问可联系集团公司科创部工作人员。',
    ],
  },
  team: {
    heading: '团队赛・用户须知',
    intro: '欢迎参加 "2026 年第三届“交盾杯”网络安全暨人工智能创新知识竞赛团队赛，为确保竞赛公平、有序进行，请参赛团队仔细阅读并遵守以下须知：',
    items: [
      '请由团队负责人填写团队名称及邀请码完成报名，团队成员以报名提交信息为准；',
      '每个团队报名账号仅有一次正式答题机会，请提前做好准备；',
      '请在竞赛开放时间内完成答题，逾期未答视为放弃，具体时间以活动页面公告为准；',
      '本次答题共设 5 关，每关 10 道题，一共 50 道题，最多错五次即结束答题；',
      '团队成绩将结合答题正确率、答题用时等多个维度综合评定，表现优秀的团队可晋级决赛，决赛名单及荣誉不对外展示排名；',
      '晋级决赛的团队将获得相应荣誉与表彰；',
      '请使用网络稳定的手机或电脑作答，答题过程中请勿切换页面或中途退出，退出视为放弃本次成绩；',
      '团队成员请独立答题，禁止作弊、代答或使用外挂，违者取消团队参赛资格；',
      '请如实填写团队信息，文明答题、遵守竞赛纪律，鼓励组队“共同学习、共同进步”；',
      '本活动最终解释权归组织方所有，如有疑问可联系集团公司科创部工作人员。',
    ],
  },
}
const AUTO_SINGLE_ANSWERS = 'DAACDCCABCBCADDAADCBCAAABBDBAABADCCBABDDCACBBCCBBDDDABBBABDDDBBBCACCAACBCCABDBDABDCDDBBBDCDCADABAADDBADBDDADACCDCDACBADBBAACAACBADDCDBBDACABCABBCDBBCCADCACDBAABBACBADBCBABACACCCACBBACDCBCCBBAAABCACACCBABDADDBAAACDCDBCBBDBADDDBBDCABABACCBDCDACACBADBADDDDBBBDDDAABBCCABCDBADDBADCCACCDADDBCBBBCACDBBCABC'
const AUTO_MULTIPLE_ANSWERS = 'ABCD,ABCD,ABCD,ABCD,ABCD,ABCD,ABCD,ACD,BC,ABCD,ACD,ABCD,ACD,ACD,ABCD,ABCD,ABD,ABCD,ABCD,ABC,ABCD,ABC,ACD,ABCD,ABCD,ABCD,ABCD,ABCD,ABCD,ABCD,ABCD,ABC,ABCD,ABCD,ABCD,ABCD,ABCD,ABD,ABCD,AB,ABCD,BC,ABCD,ABCD,ABC,ABCD,ABCD,ABCD,AD,ABCD,ABCD,ABD,ABCD,ABCD,ACD,ABCD,ABCD,ABD,AD,ACD,ABCD,BD,CD,BC,CD,ABC,ABC,ABCD,ABCD,ABCD,ABD,ABCD,ABCD,AC,ABCD,ABCD,ABCD,AC,ABCD,BC,ABCD,ABCD,ABCD,AD,ABCD,BCD,ABD,ABCD,ABCD,ABCD,ABCD,ABC,ABCD,ABCD,ABCD,ABCD,AD,ABD,ABCD,ABCD,ABCD,BCD,ABCD,ABCD,ACD,ACD,ABC,ABD,ABCD,ABCD,ACD,ABC,ABC,ABD,ABC,BCD,ABCD,ACD,ABD,ABD,ACD,ABCD,ABCD,ABC,ABCD,ABCD,ABD,ABCD,ACD,ACD,ABCD,ABCD,ABCD,ABCD,ABCD,ACD,ABC,ABCD,BCD,ABCD,BCD,ABC,ABCD,ABD,BCD,BCD,ABCD,ABCD,BCD,ACD,ABCD,ABCD,ABCD,ABCD,ABCD,ABC,ABCD,BCD,BCD,ACD,ABC,ABCD,ABCD,ABCD,ABCD,ABCD,ABCD,BCD,ACD,AD,ABCD,ABCD,ABCD,ABCD,ABCD,ABCD,ABCD,ACD,BCD,ABD,ABC,ABD,ABCD,AC,BCD,BCD,ABCD,ABCD,ACD,BCD,ABCD,ACD,ABCD,ACD,ACD,ABD,BCD,ABCD,ABCD,ACD'.split(',')
const AUTO_BOOLEAN_ANSWERS = 'AAABAAABAAAAAABBAABAAAAABAAAABAAAAAABABAABABAAABAAABAABBAABAAABAABABABABBABBAABABBAABABAABAABBAABBAB'
const autoAnswer = (questionId) => {
  const [type, sequence] = questionId.split('-')
  const index = Number(sequence) - 1
  return type === 'multiple' ? AUTO_MULTIPLE_ANSWERS[index] : type === 'boolean' ? AUTO_BOOLEAN_ANSWERS[index] : AUTO_SINGLE_ANSWERS[index]
}
const labelMode = (mode) => mode === 'team' ? '团队' : '个人'
const INFO_ART = {
  personal: {
    panel: 'fa2512f2dc3d93f1f963c4f9410e4cfc_115624_736_913.png',
    title: '1de5e5b8a42b944fac624f08b3565858_20989_655_119.png',
    submit: 'e0fe5913b27491a1c96fadd63f113049_69258_639_91.png',
    panelTop: 303,
    titleTop: 92,
    submitTop: 1032,
    fields: [
      ['2acceb05365acabd7a01910c5fb1a187_1129_633_136.png', 330],
      ['53979a886bd9d70285e596e9fd09300e_1344_633_132.png', 504],
      ['ba70627213d16f75a233ea654aa9caad_1477_633_132.png', 674],
      ['afb482f110ad1d4d5d3f6273abf617b1_1507_633_132.png', 844],
    ],
  },
  team: {
    panel: '09c33fb1fb39ea8500de60634f24bb3a_116066_736_913.png',
    title: '944afe00424a6cd8e67781e976c76cf5_20689_655_119.png',
    submit: 'b7e70876b14d0186d09359ab4b963f01_69595_639_91.png',
    panelTop: 301,
    titleTop: 90,
    submitTop: 1030,
    fields: [
      ['2acceb05365acabd7a01910c5fb1a187_1129_633_136.png', 328],
      ['53979a886bd9d70285e596e9fd09300e_1344_633_132.png', 502],
      ['7d1ad753fca8afb290fc73a8e155f629_1550_633_132.png', 672],
      ['2fbbee8ccb5265181eb3ab87836ab0c7_1335_633_132.png', 841],
    ],
  },
}
const getStageScale = () => {
  if (typeof window === 'undefined') return 1
  const viewport = window.visualViewport
  const viewportWidth = viewport?.width || window.innerWidth
  return Math.min(viewportWidth / DESIGN_WIDTH, 1)
}
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16))
const rect = (left, top, width, height) => ({ position: 'absolute', left, top, width, height })

function Modal({ children, height = 850, onClose, label, scale }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.body.style.overflow = overflow; previous?.focus?.() }
  }, [])
  function keydown(event) {
    if (event.key === 'Escape' && onClose) onClose()
    if (event.key !== 'Tab') return
    const nodes = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
    if (!nodes.length) { event.preventDefault(); return }
    const first = nodes[0]; const last = nodes.at(-1)
    if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
  const fit = Math.min(scale, (window.innerHeight - 24) / height)
  return <div className="cyber-overlay" onKeyDown={keydown}><div style={{ width: 750 * fit, height: height * fit }}><section className="cyber-modal" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} style={{ width: 750, height, transform: `scale(${fit})` }}>{children}{onClose && <Picture id="text-9c7a54de95b1" x={673} y={0} w={52} h={52} onClick={onClose} label="关闭弹窗" />}</section></div></div>
}

function StageNavigation({ onHome }) {
  return <>
    <Picture id={backId} x={25} y={1} w={55} h={55} onClick={onHome} label="返回首页" />
    <Picture id="text-5ef4d1229e77" x={566} y={9} w={160} h={37} onClick={onHome} label="返回首页" />
  </>
}

function StageMap({ attempt, onStart, onHome }) {
  const answered = attempt?.answers?.length || 0
  const finished = attempt?.status === 'success'
  const unlocked = finished ? 5 : Math.min(5, Math.floor(answered / 10) + 1)
  const stage = STAGES[unlocked - 1]
  const [playerPosition, setPlayerPosition] = useState(STAGE_PLAYER_INITIAL_POSITION)
  const progressText = finished ? '5/5 完成' : `${unlocked}/5 开启`
  const buttonText = finished ? '查看答题结果' : `开始${stage.name}`
  const message = finished ? '五个关卡已全部点亮' : unlocked === 1 ? '第一关正在开启，准备开始挑战' : `${stage.name}正在开启，第${unlocked - 1}关已点亮`

  useEffect(() => {
    setPlayerPosition(STAGE_PLAYER_INITIAL_POSITION)
    const timer = window.setTimeout(() => setPlayerPosition(stage.player), 80)
    return () => window.clearTimeout(timer)
  }, [stage.player])

  return <>
    <Picture id="2194de0f17da7fc22aa700a189a841cc_1261078_750_1624.png" x={0} y={-88} w={750} h={1624} />
    <Picture id="30de1debbb1714c49d2b6b04a13e5497_112192_750_512.png" x={0} y={315} w={750} h={512} className="cyber-stage-map-art" />
    <Picture id="1647ce881ea4d8f7f69ada777314788e_300210_587_846.png" x={73} y={394} w={587} h={846} className="cyber-stage-map-art" />
    <Picture id="997c329a9e38549b2f1fb1ba10ecc586_17866_117_93.png" x={73} y={256} w={117} h={93} className="cyber-stage-map-art" />
    <Picture id="6de72bd1696230fe455d19db4d5bcc0e_30330_137_169.png" x={530} y={1104} w={137} h={169} className="cyber-stage-map-art" />
    <Picture id="875494a97eeb15ec84921d2887f84b50_54146_212_149.png" x={435} y={334} w={212} h={149} className="cyber-stage-map-art" />
    <Picture id="d7803d963a1241289233af1ec6ad6d29_50111_137_170.png" x={108} y={743} w={137} h={170} className="cyber-stage-map-art" />
    <Picture id="525467fba5e98dd44f7717b8fc6c73ae_65245_209_155.png" x={67} y={472} w={209} h={155} className="cyber-stage-map-art" />
    <Picture id="8d1308639b66166d0a87e115fa62f9ac_46149_181_150.png" x={458} y={914} w={181} h={150} className="cyber-stage-map-art" />
    <Picture id="fdd80e92cbd0968748ef064f6498f66e_44149_162_156.png" x={458} y={610} w={162} h={156} className="cyber-stage-map-art" />
    {STAGES.map((item, index) => <div key={item.name}>
      <Picture id="006b3a05a86b69d1f1156f67d7571683_3648_29_84.png" x={item.marker.x} y={item.marker.y} w={29} h={84} />
      {index + 1 === unlocked && <Picture id="7e9dd951990a8e791e76baedd0ee9759_22907_209_82.png" x={item.label.x} y={item.label.y} w={209} h={82} />}
      <div className={`cyber-stage-node ${index + 1 === unlocked ? 'active' : ''} ${index + 1 < unlocked || finished ? 'done' : ''}`} style={{ left: item.label.x, top: item.label.y }}><b>{item.name}</b><span>{item.topic}</span></div>
    </div>)}
    <Picture id="828c85aa3cde967068e859213aa9216c_45963_127_194.png" x={playerPosition.x} y={playerPosition.y} w={127} h={194} className="cyber-stage-player" />
    <Picture id="80067636d3a65fcd1f901079cc788d7a_11196_621_41.png" x={26} y={80} w={621} h={41} />
    <StageNavigation onHome={onHome} />
    <div className="cyber-stage-message">{message}</div>
    <Picture id={STAGE_PROGRESS_BUTTON_ART} x={33} y={1324} w={326} h={89} style={{ zIndex: 3 }} />
    <div className="cyber-stage-count">{progressText}</div>
    <Picture id="641404f72e15d9bea398ce8c78223a50_34376_324_91.png" x={388} y={1325} w={324} h={91} label={buttonText} onClick={onStart} className="cyber-stage-start" />
    <div className="cyber-stage-start-text">{buttonText}</div>
  </>
}

function StageComplete({ attempt, onContinue, onHome }) {
  const answered = attempt?.answers?.length || 0
  const stageNumber = Math.max(1, Math.min(5, Math.floor(answered / 10)))
  const stage = STAGES[stageNumber - 1]
  const answers = attempt?.answers?.slice((stageNumber - 1) * 10, stageNumber * 10) || []
  const score = answers.filter((answer) => answer.correct).length * 2
  const isFinalStage = attempt?.status === 'success'
  const continueText = isFinalStage ? '查看答题结果' : '查看关卡'
  return <>
    <Picture id="2194de0f17da7fc22aa700a189a841cc_1261078_750_1624.png" x={0} y={-88} w={750} h={1624} />
    <Picture id="57008aec5b5494a7e750d2996819d4cf_112316_736_831.png" x={10} y={263} w={736} h={831} className="cyber-stage-map-art" />
    <Picture id="6e599c6897b686225aa02c0a9a692cfe_105853_201_307.png" x={278} y={405} w={201} h={307} className="cyber-stage-map-art" />
    <Picture id="1a81f207ff9962000b9afc3f05676228_6971_287_169.png" x={80} y={862} w={287} h={169} />
    <Picture id="3e0605608f390d24f118a0ec6b175a22_5113_299_170.png" x={373} y={862} w={299} h={170} />
    <StageNavigation onHome={onHome} />
    <div className="cyber-stage-complete-title">{stage.name}已点亮</div>
    <div className="cyber-stage-complete-topic">{stage.topic}</div>
    <div className="cyber-stage-complete-copy">你已完成「{stage.topic}」主题挑战，{stage.name}跳台已点亮。</div>
    <b className="cyber-stage-complete-score">{score}</b>
    <b className="cyber-stage-complete-time">{formatTime(attempt?.durationSeconds || 0)}</b>
    <Picture id={STAGE_PROGRESS_BUTTON_ART} x={33} y={1128} w={326} h={89} style={{ zIndex: 3 }} />
    <div className="cyber-stage-complete-count">{stageNumber}/5 开启</div>
    <Picture id="641404f72e15d9bea398ce8c78223a50_34376_324_91.png" x={388} y={1129} w={324} h={91} label={continueText} onClick={onContinue} />
    <div className="cyber-stage-complete-button">{continueText}</div>
    <div className="cyber-stage-complete-footer">{stage.name}完成</div>
  </>
}

export default function CybersecurityKnowledgeChallengeProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || DEFAULT_KEY
  const base = `/cybersecurity-knowledge-challenge/activities/${encodeURIComponent(activityKey)}`
  const [config, setConfig] = useState(null)
  const authConfig = useMemo(() => config && ({ ...config, accessMode: 'wechat_required' }), [config])
  const { authReady, hasToken, reauth } = useWechatAuth(activityKey, authConfig, { allowNonWechatGuest: true, blockSnapshotUser: true })
  useWechatShare(activityKey, config)
  const [data, setData] = useState(null)
  const [page, setPage] = useState('home')
  const [mode, setMode] = useState('personal')
  const [modal, setModal] = useState('')
  const [noticeMode, setNoticeMode] = useState('personal')
  const [error, setError] = useState('')
  const [formToast, setFormToast] = useState('')
  const [answerToast, setAnswerToast] = useState('')
  const [submittedRemainingSeconds, setSubmittedRemainingSeconds] = useState(null)
  const [drawToast, setDrawToast] = useState('')
  const [answerFeedback, setAnswerFeedback] = useState(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [scale, setScale] = useState(getStageScale)
  const [scrollable, setScrollable] = useState(false)
  const [quizContentHeight, setQuizContentHeight] = useState(HOME_HEIGHT)
  const [now, setNow] = useState(() => Date.now())
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState([])
  const [form, setForm] = useState({ name: '', phone: '', companyName: '', departmentName: '', teamName: '' })
  const [poster, setPoster] = useState('')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const requestId = useRef(null)
  const qr = useRef(null)
  const appRef = useRef(null)
  const quizLayoutRef = useRef(null)
  const alive = useRef(true)
  const expireRetryAt = useRef(0)
  useEffect(() => {
    trackPageView(activityKey, '/cybersecurity-knowledge-challenge', {
      activityType: 'cybersecurity_knowledge_challenge',
    })
  }, [activityKey])
  const progress = data?.modes?.[mode]
  const attempt = progress?.attempt
  const currentQuestion = attempt?.currentQuestion
  const visibleQuestion = answerFeedback?.question ?? currentQuestion
  const remainingSeconds = Math.max(0, ((attempt?.deadline || 0) - now - offset) / 1000)
  const go = useCallback((next) => { setPage(next); setModal(''); setError(''); setFormToast(''); setAnswerToast(''); setSubmittedRemainingSeconds(null); setDrawToast(''); setAnswerFeedback(null); appRef.current?.scrollTo({ top: 0, behavior: 'instant' }); window.scrollTo({ top: 0, behavior: 'instant' }) }, [])
  const accept = useCallback((value) => { setOffset(value.serverNow - Date.now()); setData((previous) => ({ ...value, nickname: value.nickname || previous?.nickname || '', avatar: value.avatar || previous?.avatar || '' })); setNow(Date.now()); return value }, [])
  const showError = useCallback((err) => {
    if (Number(err?.status) === 401 && reauth('cybersecurity-api-401')) return
    setError(err.message || '请求失败，请重试')
  }, [reauth])
  const showFormToast = useCallback((message) => {
    setFormToast(message)
    window.setTimeout(() => setFormToast((current) => current === message ? '' : current), 1500)
  }, [])
  useEffect(() => {
    if (page !== 'quiz') {
      setQuizContentHeight(HOME_HEIGHT)
      return undefined
    }
    const layout = quizLayoutRef.current
    if (!layout) return undefined
    const updateHeight = () => {
      const nextHeight = Math.max(HOME_HEIGHT, Math.ceil(layout.offsetTop + layout.scrollHeight + 48))
      setQuizContentHeight((current) => current === nextHeight ? current : nextHeight)
    }
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(layout)
    return () => observer.disconnect()
  }, [page, visibleQuestion?.id])
  useEffect(() => {
    if (page === 'quiz') appRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [page, visibleQuestion?.id])
  const showDrawToast = useCallback((message) => {
    setDrawToast(message)
    window.setTimeout(() => setDrawToast((current) => current === message ? '' : current), 1500)
  }, [])
  const showDrawError = useCallback((err) => {
    if (Number(err?.status) === 401 && reauth('cybersecurity-draw-401')) return
    showDrawToast(err.message || '抽奖失败，请稍后再试')
  }, [reauth, showDrawToast])
  async function run(work, onError = showError) {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setError('')
    try { return await work() } catch (err) { onError(err) } finally { busyRef.current = false; if (alive.current) setBusy(false) }
  }
  const load = useCallback(async () => accept(await request(`${base}/state`)), [accept, base])
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    const resize = () => {
      const nextScale = getStageScale()
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      setScale(nextScale)
      setScrollable(HOME_HEIGHT * nextScale > viewportHeight + 2)
    }
    resize()
    window.addEventListener('resize', resize)
    window.visualViewport?.addEventListener('resize', resize)
    const timer = setInterval(() => setNow(Date.now()), 50)
    return () => {
      window.removeEventListener('resize', resize)
      window.visualViewport?.removeEventListener('resize', resize)
      clearInterval(timer)
    }
  }, [])
  useEffect(() => {
    let active = true
    request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true }).then((value) => { if (active) { setConfig(value); document.title = title } }).catch(showError)
    return () => { active = false }
  }, [activityKey, showError])
  useEffect(() => {
    if (!authReady || !hasToken) return
    let active = true
    load().then(() => {
      if (!active) return
    }).catch(showError)
    return () => { active = false }
  }, [authReady, hasToken, load, showError])
  useEffect(() => {
    if (page !== 'quiz' || answerToast || attempt?.status !== 'active' || remainingSeconds > 0 || Date.now() < expireRetryAt.current) return
    expireRetryAt.current = Date.now() + 500
    setSelected([])
    setAnswerFeedback(null)
    load().then((value) => {
      const nextAttempt = value.modes[mode].attempt
      if (nextAttempt?.status === 'failed') setModal('failed')
      else if (nextAttempt?.status === 'active' && nextAttempt.answers.length > 0 && nextAttempt.answers.length % 10 === 0) go('stageComplete')
    }).catch(showError)
  }, [answerToast, attempt?.status, remainingSeconds, page, load, mode, now, showError])

  async function leaveQuiz(destination) {
    if (page !== 'quiz' || attempt?.status !== 'active' || !attempt.timerRunning) {
      go(destination)
      return
    }
    await run(async () => {
      const value = accept(await request(`${base}/pause-question-timer`, {
        method: 'POST',
        body: JSON.stringify({ mode, attemptId: attempt.id }),
      }))
      if (value.modes[mode].attempt?.status === 'active') go(destination)
    })
  }
  const backTarget = page === 'details' || page === 'draw' ? 'result' : 'home'
  const leaveTarget = (destination) => page === 'quiz' ? leaveQuiz(destination) : go(destination)
  const navigation = { [backId]: { label: '返回', onClick: () => leaveTarget(backTarget) }, [otherBackId]: { label: '返回结果', onClick: () => leaveTarget('result') }, 'text-5ef4d1229e77': { label: '返回首页', onClick: () => leaveTarget('home') } }
  function chooseMode(nextMode) {
    setMode(nextMode)
    setNoticeMode(nextMode)
    const nextProgress = data?.modes?.[nextMode]
    if (!nextProgress?.succeeded && nextProgress?.remaining <= 0) {
      showFormToast('该身份的1次答题机会已用完')
      return
    }
    setModal('notice')
  }
  async function beginMode(nextMode) {
    setMode(nextMode); setSelected([]); setAnswerFeedback(null)
    if (!hasToken) { if (!reauth('cybersecurity-start')) setError('请在微信中打开活动并完成授权后参与'); return }
    await run(async () => {
      const value = await load(); const p = value.modes[nextMode]
      if (p.succeeded) { go('stage'); return }
      if (p.attempt?.status === 'active') { go('stage'); return }
      if (p.remaining <= 0) { showFormToast('该身份的1次答题机会已用完'); return }
      if (p.name && p.phone && p.companyName && p.departmentName) {
        const started = accept(await request(`${base}/start`, { method: 'POST', body: JSON.stringify({ name: p.name, phone: p.phone, companyName: p.companyName, departmentName: p.departmentName, teamName: p.teamName || '', mode: nextMode, requestId: uuid() }) }))
        if (started.modes[nextMode].attempt?.status === 'failed') setModal('failed')
        else go('stage')
        return
      }
      setForm({ name: p.name || '', phone: p.phone || '', companyName: p.companyName || '', departmentName: p.departmentName || '', teamName: p.teamName || '' })
      requestId.current = uuid(); go('register')
    })
  }
  function confirmNotice() {
    const nextMode = noticeMode
    setModal('')
    beginMode(nextMode)
  }
  async function start(event) {
    event.preventDefault()
    const payload = { ...form, name: form.name.trim(), phone: form.phone.trim(), companyName: form.companyName.trim(), departmentName: form.departmentName.trim(), mode, requestId: requestId.current }
    if (!payload.name || !payload.companyName || !payload.departmentName) { showFormToast('请完整填写参与信息'); return }
    if (!/^1[3-9]\d{9}$/.test(payload.phone)) { showFormToast('请输入正确的手机号码'); return }
    await run(async () => {
      const value = accept(await request(`${base}/start`, { method: 'POST', body: JSON.stringify(payload) }))
      setSelected([])
      if (value.modes[mode].attempt?.status === 'failed') { requestId.current = uuid(); setModal('failed') } else go('stage')
    })
  }
  async function submit() {
    if (!selected.length) { setError('请选择答案'); return }
    if (remainingSeconds <= 0 || answerToast) return
    setSubmittedRemainingSeconds(remainingSeconds)
    const submittedQuestion = currentQuestion
    const value = await run(async () => accept(await request(`${base}/answer`, { method: 'POST', body: JSON.stringify({ mode, attemptId: attempt.id, questionId: submittedQuestion.id, selected }) })))
    const nextAttempt = value?.modes?.[mode]?.attempt
    if (!nextAttempt) { setSubmittedRemainingSeconds(null); return }
    const submittedAnswer = nextAttempt.answers.at(-1)
    setSelected([])
    setAnswerFeedback({ question: submittedQuestion, answer: submittedAnswer })
    setAnswerToast(submittedAnswer?.correct ? '回答正确' : '回答错误')
    await new Promise((resolve) => setTimeout(resolve, 1500))
    if (!alive.current) return
    setAnswerToast('')
    setSubmittedRemainingSeconds(null)
    setAnswerFeedback(null)
    if (nextAttempt.status === 'failed') setModal('failed')
    else if (nextAttempt.status === 'success') go('stageComplete')
    else if (nextAttempt.answers.length > 0 && nextAttempt.answers.length % 10 === 0) go('stageComplete')
  }
  async function completeAll() {
    await run(async () => {
      let activeAttempt = attempt
      const stageEnd = Math.min(Math.ceil(((activeAttempt?.answers.length || 0) + 1) / 10) * 10, activeAttempt?.total || 50)
      while (activeAttempt?.status === 'active' && activeAttempt.currentQuestion && activeAttempt.answers.length < stageEnd) {
        const question = activeAttempt.currentQuestion
        const selected = autoAnswer(question.id)
        if (!selected) throw new Error('题库答案缺失')
        const value = accept(await request(`${base}/answer`, { method: 'POST', body: JSON.stringify({ mode, attemptId: activeAttempt.id, questionId: question.id, selected: selected.split('') }) }))
        activeAttempt = value.modes[mode].attempt
      }
      if (activeAttempt?.status === 'success') go('stageComplete')
      else if (activeAttempt?.status === 'active' && activeAttempt.answers.length > 0 && activeAttempt.answers.length % 10 === 0) go('stageComplete')
    })
  }
  async function draw() {
    if (spinning) return
    await run(async () => {
      if (progress?.draw) { setModal('prize'); return }
      const value = accept(await request(`${base}/draw`, { method: 'POST', body: JSON.stringify({ mode, requestId: uuid() }) }))
      const d = value.modes[mode].draw
      const angle = WHEEL_ANGLES[d.image] ?? 180
      setSpinning(true); setRotation((old) => old + 1800 + ((angle - old % 360 + 360) % 360))
      await new Promise((resolve) => setTimeout(resolve, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 3400))
      if (alive.current) { setSpinning(false); setModal('prize') }
    }, showDrawError)
  }
  function openDraw() {
    if (!progress?.draw) { go('draw'); return }
    showDrawToast('抽奖次数已用完')
    window.setTimeout(() => { if (alive.current) go('prizes') }, 1500)
  }
  async function generatePoster() {
    setModal('poster'); setPoster('')
    await run(async () => setPoster(await makePoster({ mode, progress, avatarUrl: data?.avatar, qrCanvas: qr.current?.querySelector('canvas') })))
  }
  function quizOption(option) {
    const q = visibleQuestion
    const picked = answerFeedback ? answerFeedback.answer.selected.includes(option.key) : selected.includes(option.key)
    const correct = answerFeedback?.answer.answer.includes(option.key)
    const wrong = answerFeedback && picked && !correct
    return <button key={option.key} type="button" className={`cyber-option ${picked ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} disabled={busy || Boolean(answerToast) || remainingSeconds <= 0} aria-pressed={picked} onClick={() => setSelected((old) => q.type === 'multiple' ? old.includes(option.key) ? old.filter((k) => k !== option.key) : [...old, option.key] : [option.key])}><span>{option.key}</span><span>{option.text}</span></button>
  }
  async function startStage() {
    setSelected([])
    setAnswerFeedback(null)
    setSubmittedRemainingSeconds(null)
    if (attempt?.status === 'success') go('result')
    else if (attempt?.status === 'active') {
      await run(async () => {
        const value = accept(await request(`${base}/start-question-timer`, {
          method: 'POST',
          body: JSON.stringify({ mode, attemptId: attempt.id }),
        }))
        if (value.modes[mode].attempt?.status === 'active') go('quiz')
      })
    }
  }
  const closeModal = () => setModal('')
  const modalProps = { scale, onClose: closeModal }
  const commonQuizOmit = ['63311aa', 'cb6c2c', 'text-787fd', '9864c6dc4877f0b0669b124d576091c1']
  const quizHeaderClasses = mode === 'team'
    ? { 'text-d5f05bdbe429': 'cyber-quiz-header', '1ae4acbbae23e256dc8f26a7f8f3f655': 'cyber-quiz-header', cd20dfb82be204876ded77bbb5f2976a: 'cyber-quiz-header', '5c1f7141eb2dc56bf6553d7a1da68386': 'cyber-quiz-header' }
    : { '209eb202d0d19b0402013f0dac1ddd03': 'cyber-quiz-header', '316c8f7fa3659bc4861ebbdcbdb1a330': 'cyber-quiz-header', '6aa715f7a20b07dec3973991268b2398': 'cyber-quiz-header', '5c1f7141eb2dc56bf6553d7a1da68386': 'cyber-quiz-header' }
  const infoArt = INFO_ART[mode]
  const stageHeight = page === 'quiz' ? quizContentHeight : HOME_HEIGHT
  return <div ref={appRef} className={`cyber-app cyber-${mode} ${scrollable || page === 'quiz' ? 'cyber-scrollable' : ''}`} aria-busy={busy}>
    <div className="cyber-stage-wrap" style={{ width: DESIGN_WIDTH * scale, height: stageHeight * scale }}>
      <div className="cyber-stage" style={{ height: stageHeight, transform: `scale(${scale})` }}>
        <div className="cyber-page" key={page}>
          {page === 'home' && <>
            <Artwork page={1} classes={{
              '06d5feaa3577e2fc6f0e117058f6786a': 'cyber-pulse',
              b2e70d6e70341633565031697c3c7896: 'cyber-pulse cyber-pulse-delay',
              a70528fc49f038acb66a2ef22bb445ed: 'cyber-float-one',
              f118cea1a1b86c389d53cae4600ca41b: 'cyber-float-two',
              bc6c61cb68d3b844004b151d3edceeda: 'cyber-float-three',
              '6ad6e59452342d9d857adb8a2ca7b39a': 'cyber-float-four',
              '7f089e56a121b2640a14cb0fa10e3a6a': 'cyber-float-five',
              '80257d6a1f8e159ed6fed329464bc906': 'cyber-float-six',
            }} actions={{ '06d5feaa3577e2fc6f0e117058f6786a': { label: '个人闯关', onClick: () => chooseMode('personal') }, b2e70d6e70341633565031697c3c7896: { label: '团队闯关', onClick: () => chooseMode('team') }, '31695a5bf339bd55a32fe0eed9c22b8e': { label: '活动规则', onClick: () => go('choose') }, '739f9f21f54b72ca51ec21114b0e625b': { label: '我的奖品', onClick: () => { if (hasToken) run(async () => { await load(); go('prizes') }); else setError('请在微信中完成授权后查看奖品') } } }} />
          </>}
          {page === 'choose' && <Artwork page={2} actions={{ ...navigation, a92dbb46d90efd589d31942056deb1f7: { label: '返回首页', onClick: () => go('home') }, c42ebc15530f0f8b314fa0990da30880: { label: '返回首页', onClick: () => go('home') }, '721fe211ae2323400e635f0e02932a5a': { label: '进入个人闯关', onClick: () => chooseMode('personal'), disabled: busy }, '17312b9131744f111979488d00e96209': { label: '进入团队闯关', onClick: () => chooseMode('team'), disabled: busy } }} />}
          {page === 'register' && <>
            <Picture id="2194de0f17da7fc22aa700a189a841cc" x={0} y={-88} w={750} h={1624} />
            <img className="cyber-register-panel cyber-quiz-enter" style={{ top: infoArt.panelTop }} src={src(infoArt.panel)} alt="" draggable={false} />
            {infoArt.fields.map(([image, top], index) => <img key={image} className={`cyber-register-field-art cyber-art-enter cyber-art-enter-${index + 1}`} style={rect(67, top, 633, image.startsWith('2acceb') ? 136 : 132)} src={src(image)} alt="" draggable={false} />)}
            <img className="cyber-register-title cyber-art-enter cyber-art-enter-0" style={{ top: infoArt.titleTop }} src={src(infoArt.title)} alt={`${labelMode(mode)}参与信息`} draggable={false} />
            <form className="cyber-register-page" noValidate onSubmit={start}>
              <input aria-label="姓名" autoComplete="name" required maxLength={40} placeholder="点击输入姓名" value={form.name} readOnly={Boolean(progress?.used)} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input aria-label="手机号码" autoComplete="tel" required inputMode="tel" pattern="1[3-9][0-9]{9}" maxLength={11} placeholder="点击输入手机号码" value={form.phone} readOnly={Boolean(progress?.used)} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input aria-label="公司名称" required maxLength={80} placeholder="点击输入公司名称" value={form.companyName} readOnly={Boolean(progress?.used)} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              <input aria-label="部门名称" required maxLength={80} placeholder="点击输入部门名称" value={form.departmentName} readOnly={Boolean(progress?.used)} onChange={(e) => setForm({ ...form, departmentName: e.target.value })} />
              <button className="cyber-register-submit" style={{ top: infoArt.submitTop }} type="submit" disabled={busy} aria-label="开始答题"><img src={src(infoArt.submit)} alt="" draggable={false} /></button>
            </form>
            <Picture id="a92dbb46d90efd589d31942056deb1f7" x={25} y={1} w={55} h={55} style={{ zIndex: 4 }} onClick={() => go('home')} label="返回" />
            <Picture id="c42ebc15530f0f8b314fa0990da30880" x={566} y={9} w={160} h={37} style={{ zIndex: 4 }} onClick={() => go('home')} label="返回首页" />
          </>}
          {page === 'stage' && <StageMap attempt={attempt} onStart={startStage} onHome={() => go('home')} />}
          {page === 'stageComplete' && <StageComplete attempt={attempt} onContinue={() => go(attempt?.status === 'success' ? 'result' : 'stage')} onHome={() => go('home')} />}
          {page === 'quiz' && <>
            <Artwork page={mode === 'team' ? 4 : 3} omit={commonQuizOmit} classes={quizHeaderClasses} actions={{ ...navigation, '5c1f7141eb2dc56bf6553d7a1da68386': { label: '直接完成答题', onClick: completeAll, disabled: busy } }} />
            <div className="cyber-quiz-guide">当前分类：{visibleQuestion?.category || ''}<br />答题过程中可查看进度与剩余时间</div>
            <div className="cyber-quiz-timer cyber-quiz-enter" role="timer">{formatCountdown(submittedRemainingSeconds ?? remainingSeconds)}</div>
            <div className="cyber-progress cyber-quiz-enter"><b>{String(((attempt?.answers.length || 0) % 10) + 1).padStart(2, '0')}</b><span>/10</span></div>
            <div ref={quizLayoutRef} className="cyber-quiz-layout">
              <div className="cyber-quiz-panel" style={{ backgroundImage: `url(${src('62e9b04468b5b55aa5d7a283e50734d3_75675_712_987.png')})` }}>
                <div className="cyber-quiz-flow">
                  <div className="cyber-question-content cyber-question-enter" key={visibleQuestion?.id}>
                    <h2>{visibleQuestion?.title || '题目加载中…'}{visibleQuestion && `（${visibleQuestion.type === 'multiple' ? '多选' : visibleQuestion.type === 'boolean' ? '判断' : '单选'}）`}</h2>
                  </div>
                  <div className="cyber-errors cyber-quiz-enter">累计错题：{attempt?.errors || 0}/3</div>
                  <div className="cyber-options" key={`options-${visibleQuestion?.id || 'loading'}`}>{visibleQuestion?.options?.map(quizOption)}</div>
                </div>
              </div>
              <button type="button" className="cyber-submit-answer cyber-art-enter cyber-art-enter-5" aria-label="提交答案" onClick={submit} disabled={busy || Boolean(answerToast) || remainingSeconds <= 0}><img src={src('33ad7d9d9142da327a8526b780312e8d_48782_674_91.png')} alt="" draggable={false} /></button>
            </div>
          </>}
          {page === 'result' && <>
            <Artwork page={mode === 'team' ? 6 : 5} omit={['text-d16b2a1cbe55']} actions={{ ...navigation, '081adbf88a30ead37291580219ccb2dd': { label: '生成个人主题海报', onClick: generatePoster, disabled: busy }, d2dfd044bddffcd80c0b4c9868e41375: { label: '生成团队主题海报', onClick: generatePoster, disabled: busy }, f9b8b4230f06e1a083c7c548d535247f: { label: '转盘抽奖', onClick: openDraw }, '807580b62daea1aa9f081e4f049d7276': { label: '转盘抽奖', onClick: openDraw }, 'text-f88ab9fd5abf': { label: '答题详情', onClick: () => go('details') }, 'text-3b584898787c': { label: '答题详情', onClick: () => go('details') } }} />
            <div className="cyber-result-values cyber-quiz-enter"><b>{attempt?.score ?? 0}</b><b>{formatTime(attempt?.durationSeconds || 0)}</b><b>{progress?.draw ? 0 : 1}</b></div>
          </>}
          {page === 'details' && <>
            <Artwork page={7} actions={{ ...navigation, 'text-6071b7c9ff8a': { label: '返回首页', onClick: () => go('home') } }} />
            <div className="cyber-details cyber-quiz-enter">{attempt?.answers?.filter((a) => !a.correct).map((a, index) => <article key={a.questionId}><header><b>{index + 1} / {a.category}</b><span className="bad">错误</span></header><h3>{a.title}</h3><p>你的答案：{a.selected} 正确答案：{a.answer}</p><p>{a.explanation}</p></article>)}</div>
          </>}
          {page === 'draw' && <>
            <Artwork page={8} omit={['f79d5d674a55f547e986be446f382a91']} actions={{ ...navigation, ef793ee88f81c81ffda0704aeaadb071: { label: progress?.draw ? '查看抽奖结果' : '开始抽奖', onClick: draw, disabled: busy || spinning }, 'text-fbe1639180d7': { label: '返回结果', onClick: () => go('result'), disabled: spinning } }} />
            <Wheel rotation={rotation} prizes={data?.lottery?.prizes} />
            <Picture id="f85af1000c81149e6069211e18180b33" x={266} y={482} w={237} h={267} className="cyber-art-enter cyber-art-enter-3" />
            <p className="cyber-draw-state cyber-quiz-enter">{progress?.draw ? '本次抽奖已完成，可查看结果' : data?.lottery?.enabled ? '闯关成功，获得1次抽奖机会' : '抽奖暂未开放，资格已为你保留'}</p>
          </>}
          {page === 'prizes' && <>
            <Artwork page={9} omit={['ccd59680942cf673e3b24e4169db0a0a']} actions={{ ...navigation, 'text-259fa5eb4a6e': { label: '返回首页', onClick: () => go('home') } }} />
            <div className="cyber-prizes cyber-quiz-enter">{['personal', 'team'].map((m) => ({ mode: m, draw: data?.modes[m]?.draw })).filter((p) => p.draw?.prizeId).map(({ mode: m, draw: d }) => <article key={m}><img src={src(PRIZE_ART[d.image])} alt={d.name} /><div><h3>{d.name}<small>数量：1</small></h3><p>{labelMode(m)}闯关 · {d.redeemedAt ? '已核销' : '待领取'}</p><p>核销码号码：<strong>{d.code}</strong></p></div></article>)}{!['personal', 'team'].some((m) => data?.modes[m]?.draw?.prizeId) && <p className="cyber-empty">暂无中奖记录</p>}</div>
          </>}
        </div>
      </div>
    </div>
    {error && <div className="cyber-toast-layer"><div className="cyber-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="关闭提示">×</button></div></div>}
    {formToast && <div className="cyber-toast-layer"><div className="cyber-toast" role="status">{formToast}</div></div>}
    {answerToast && <div className="cyber-toast-layer"><div className="cyber-toast" role="status">{answerToast}</div></div>}
    {drawToast && <div className="cyber-toast-layer"><div className="cyber-toast" role="status">{drawToast}</div></div>}
    {modal === 'notice' && <Modal scale={scale} height={1624} label={NOTICE[noticeMode].heading}>
      <Picture id="3e3176187510559c98b15d0a91e2e225_141194_736_856.png" x={7} y={265} w={736} h={856} />
      <Picture id="text-9c7a54de95b1" x={672} y={214} w={52} h={52} onClick={confirmNotice} label="阅读并继续答题" />
      <section className="cyber-notice-content">
        <p>{NOTICE[noticeMode].intro}</p>
        <ol>{NOTICE[noticeMode].items.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>
    </Modal>}
    {(modal === 'failed' || modal === 'exhausted') && <Modal scale={scale} height={736} label="闯关失败"><Picture id="f528abf49fc758b9fb87bb73325d26fd" x={7} y={50} w={736} h={676} /><Picture id="14dba9edc1f271124020174158ee6a13" x={245} y={167} w={258} h={258} /><Picture id="text-e7b2e7bc3382" x={205} y={460} w={341} h={39} /><p className="cyber-failure-copy">{modal === 'exhausted' ? '答题机会已用完，感谢参与' : attempt?.reason === 'timeout' ? '答题时间已结束，本次答题机会已用完' : '累计答错3题，本次答题机会已用完'}</p><Picture id="text-6071b7c9ff8a" x={223} y={580} w={308} h={89} onClick={() => go('home')} label="返回首页" /></Modal>}
    {modal === 'poster' && <Modal {...modalProps} height={1410} label="我的主题海报">{poster ? <img className="cyber-poster" src={poster} alt={`${progress?.name}的网络安全闯关成绩海报，长按保存`} /> : <div className="cyber-poster-loading">{busy ? '正在合成海报…' : <button type="button" onClick={generatePoster}>重新生成海报</button>}</div>}<p className="cyber-save-tip">长按海报保存图片，分享你的闯关成果</p></Modal>}
    {modal === 'prize' && <Modal scale={scale} height={925} label="抽奖结果"><Picture id="6ba690d2f0dfd483ba9a72685c0a1509" x={7} y={60} w={736} h={840} /><Picture id="18ef814db8126e2d97db42999153391d" x={166} y={143} w={404} h={352} /><Picture id={PRIZE_ART[progress?.draw?.image] || PRIZE_ART.none} x={282} y={236} w={186} h={170} /><div className="cyber-prize-result"><h2>{progress?.draw?.prizeId ? `恭喜获得${progress.draw.name}` : '谢谢参与'}</h2>{progress?.draw?.prizeId ? <><p>核销码号码：<strong>{progress.draw.code}</strong></p><p>请前往集团科创部核销领取</p></> : <p>感谢参与网络安全知识大闯关</p>}</div><Picture id="text-6071b7c9ff8a" x={43} y={770} w={308} h={89} onClick={() => go('home')} label="返回首页" /><Picture id="53ab4740aecbaf208b2f290acfdc3dbf" x={376} y={769} w={324} h={91} onClick={() => go('prizes')} label="前往我的奖品" /></Modal>}
    <div ref={qr} className="cyber-qr-source" aria-hidden="true"><QRCodeCanvas value={`${window.location.origin}/${TYPE}/${activityKey}`} size={384} marginSize={2} level="M" /></div>
  </div>
}
