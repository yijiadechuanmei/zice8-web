import { useCallback, useEffect, useRef, useState } from 'react'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { assets } from './assets'
import { answer, draw, getConfig, getDrawResult, getRecords, getState, retry, saveProfile, start } from './api'
import './styles.css'

const KEY = 'dl1125'
const STAGES = ['初入课堂·基础认知关', '以案学法·情景进阶关', '挑战通关·综合法律关']
const PRIZES = [
  { code: 'backpack', name: '背包', stock: '50份' },
  { code: 'sun_hat', name: '防晒帽', stock: '50份' },
  { code: 'pillow_blanket', name: '抱枕被', stock: '50份' },
]
const WHEEL_LABELS = ['背包', '谢谢参与', '防晒帽', '谢谢参与', '抱枕被', '谢谢参与']

function PrizeImage({ code }) { return <span className={`pfh-prize-image pfh-prize-${code}`} style={{ backgroundImage: `url(${assets.prizes})` }} aria-hidden="true" /> }
function Button({ children, onClick, disabled, secondary = false }) { return <button type="button" className={`pfh-button ${secondary ? 'pfh-button-secondary' : ''}`} onClick={onClick} disabled={disabled}>{children}</button> }
function Modal({ title, children, actions, onClose }) { return <div className="pfh-modal-backdrop" role="presentation"><div className="pfh-modal" role="dialog" aria-modal="true" aria-label={title}><button className="pfh-close" type="button" onClick={onClose} aria-label="关闭">×</button><div className="pfh-modal-mark">✦</div><h2>{title}</h2>{children}<div className="pfh-modal-actions">{actions}</div></div></div> }

export default function PinganFamilyProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || KEY
  const [config, setConfig] = useState(null)
  const [state, setState] = useState(null)
  const [page, setPage] = useState('home')
  const [challenge, setChallenge] = useState(null)
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [modal, setModal] = useState('')
  const [profile, setProfile] = useState({ name: '', phone: '' })
  const [records, setRecords] = useState([])
  const [drawResult, setDrawResult] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const drawTimer = useRef(null)
  const { authReady, blockedMessage } = useWechatAuth(activityKey, config)
  const refresh = useCallback(async () => {
    const next = await getState(activityKey)
    setState(next)
    setChallenge(next.challenge)
    return next
  }, [activityKey])

  useEffect(() => {
    document.title = '平安家庭·法治护航'
    let mounted = true
    getConfig(activityKey).then((value) => { if (mounted) setConfig(value) }).catch((e) => { if (mounted) setError(e.message) })
    return () => { mounted = false; window.clearTimeout(drawTimer.current) }
  }, [activityKey])
  useEffect(() => {
    if (!authReady) return undefined
    let active = true
    getState(activityKey).then((next) => {
      if (!active) return
      setState(next)
      setChallenge(next.challenge)
    }).catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [authReady, activityKey])
  const execute = async (fn) => { if (busy) return; setBusy(true); setError(''); try { return await fn() } catch (e) { setError(e.message || '操作失败，请重试') } finally { setBusy(false) } }
  const activityStatus = state?.activityStatus || config?.activityWindow?.status || 'not_started'
  const active = activityStatus === 'active'
  const ready = authReady && Boolean(state)
  const chanceId = state?.unusedChanceIds?.[0]

  async function begin() {
    if (!ready) { setError(blockedMessage || '请在微信中打开活动'); return }
    if (!active) { setError(activityStatus === 'ended' ? '活动已结束' : '活动尚未开始'); return }
    await execute(async () => { const next = await start(activityKey); setChallenge(next); setSelected(''); setFeedback(null); setPage('quiz'); if (next.status === 'stage_failed') setModal('failed') })
  }
  async function submitAnswer() {
    if (!selected || !challenge?.question || feedback) return
    await execute(async () => {
      const result = await answer(activityKey, challenge.id, challenge.question.id, selected)
      setFeedback(result)
      if (result.completed) { setModal(''); await refresh(); return }
      if (result.stagePassed) setModal('passed')
      if (result.failed) setModal('failed')
    })
  }
  function nextQuestion() { const next = feedback?.challenge; setChallenge(next); setSelected(''); setFeedback(null) }
  function afterComplete() { setPage('success'); setFeedback(null); setSelected('') }
  async function retryStage() { await execute(async () => { const next = await retry(activityKey, challenge.id); setChallenge(next); setFeedback(null); setSelected(''); setModal(''); await refresh() }) }
  async function submitProfile(event) {
    event.preventDefault()
    if (!profile.name.trim() || !/^1[3-9]\d{9}$/.test(profile.phone.trim())) { setError('请填写姓名和有效的中国大陆手机号'); return }
    await execute(async () => { const saved = await saveProfile(activityKey, profile); await refresh(); setPage('records'); setRecords(await getRecords(activityKey)); if (saved.duplicatePhone) setError('该手机号已领取活动奖品，本次奖品不能重复发放。') })
  }
  async function showRecords() { await execute(async () => { setRecords(await getRecords(activityKey)); setPage('records') }) }
  async function spin() {
    if (!chanceId || state?.won || spinning || busy) return
    await execute(async () => {
      if (!state?.drawEnabled) { setError('正式奖品抽奖尚未开放，中奖参数待确认'); return }
      setSpinning(true)
      try {
        // Recover a saved result if the draw response was lost after the server committed it.
        let result
        try { result = await draw(activityKey, chanceId) } catch (e) {
          try { result = await getDrawResult(activityKey, chanceId) } catch { throw e }
        }
        const target = (360 - result.wheelIndex * 60) % 360
        setRotation((old) => old + 1800 + ((target - (old % 360) + 360) % 360))
        drawTimer.current = window.setTimeout(async () => {
          setDrawResult(result); setModal('draw'); setSpinning(false)
          try { await refresh() } catch { /* result remains visible and can be queried again */ }
        }, 5100)
      } catch (e) { setSpinning(false); throw e }
    })
  }
  function openWheel() { if (state?.needsPrizeProfile) { setPage('profile'); return }; if (state?.won) { showRecords(); return }; setPage('wheel') }

  return <div className={`pfh-app pfh-page-${page}`} style={{ '--pfh-bg': `url(${assets[page === 'home' ? 'home' : page === 'wheel' ? 'wheel' : 'quiz']})` }}>
    <main className="pfh-shell">
      {page !== 'home' && <button className="pfh-back" type="button" onClick={() => { setModal(''); setPage('home'); refresh().catch(() => {}) }}>‹ 返回首页</button>}
      {page === 'home' && <>
        <section className="pfh-hero">
          <div className="pfh-kicker">11·25 国际消除家庭暴力日</div>
          <h1><span>平安家庭</span><span>法治护航</span></h1>
          <p className="pfh-subtitle">——大浪街道“11·25国际消除家庭暴力日”主题宣传活动</p>
        </section>
        <section className="pfh-home-actions">{state?.won && <div className="pfh-won-banner" role="status">{state.needsPrizeProfile ? '恭喜抽中奖品，请填写领奖信息以确认中奖记录。' : state.wonByPhone ? '该登记手机号已获得活动奖品。' : `您已获得活动奖品${state.winningPrizeName ? `：${state.winningPrizeName}` : ''}。`}仍可继续参与知识答题。</div>}<div className="pfh-count">今日剩余成功通关次数 <strong>{state?.remainingToday ?? '—'}</strong> / 2</div><Button onClick={begin} disabled={!active || state?.remainingToday === 0 || busy}>{!active ? activityStatus === 'ended' ? '活动已结束' : '活动即将开始' : state?.remainingToday === 0 ? '今日已完成' : challenge?.status === 'active' ? '继续答题' : '开始答题'}</Button>{state?.needsPrizeProfile && <Button onClick={() => setPage('profile')} secondary>填写领奖信息</Button>}{chanceId && active && <Button onClick={openWheel} secondary>使用抽奖机会（{state.unusedChanceIds.length}次）</Button>}<div className="pfh-links"><button type="button" onClick={() => setModal('rules')}>活动规则</button><button type="button" onClick={showRecords} disabled={!ready}>我的抽奖记录</button></div>{error && <p className="pfh-error" role="alert">{error}</p>}</section>
        <footer className="pfh-hero-info"><p>主办单位：深圳市龙华区大浪街道办事处</p><p>承办单位：大浪街道妇女联合会</p></footer>
      </>}
      {page === 'quiz' && <section className="pfh-panel pfh-quiz-panel"><div className="pfh-stage-tag">第 {challenge?.stage} 关 / 共 3 关</div><h2>{STAGES[(challenge?.stage || 1) - 1]}</h2><div className="pfh-progress-label"><span>知识挑战</span><strong>{Math.min((challenge?.questionIndex || 0) + 1, challenge?.questionCount || 1)} / {challenge?.questionCount}</strong></div><div className="pfh-progress"><span style={{ width: `${(((challenge?.questionIndex || 0) + 1) / (challenge?.questionCount || 1)) * 100}%` }} /></div>{challenge?.status === 'stage_failed' ? <><p>本关挑战未通过，已通关关卡保留。</p><Button onClick={retryStage} disabled={busy}>重新挑战本关</Button></> : <><div className="pfh-question">{challenge?.question?.title}</div><div className="pfh-options">{challenge?.question?.options?.map((option) => <button type="button" key={option.key} className={selected === option.key ? 'selected' : ''} onClick={() => !feedback && setSelected(option.key)} disabled={Boolean(feedback)}><span>{option.key}</span>{option.text}</button>)}</div>{feedback && <div className={`pfh-feedback ${feedback.correct ? 'correct' : 'wrong'}`}>{feedback.correct ? '回答正确' : `回答错误 · 正确答案 ${feedback.correctAnswer}`}{feedback.analysis && <p>{feedback.analysis}</p>}{!feedback.correct && !feedback.analysis && <p>原题库未提供本题解析。</p>}</div>}{feedback?.completed ? <Button onClick={afterComplete}>查看通关结果</Button> : feedback?.correct && !feedback.stagePassed ? <Button onClick={nextQuestion}>下一题</Button> : !feedback ? <Button onClick={submitAnswer} disabled={!selected || busy}>确认答案</Button> : null}</>}{error && <p className="pfh-error" role="alert">{error}</p>}</section>}
      {page === 'success' && <section className="pfh-panel pfh-result-panel"><div className="pfh-big-icon">✦</div><p className="pfh-kicker">三关全部通过</p><h2>恭喜通关</h2><p>{state?.won ? state.wonByPhone ? '该登记手机号已获得活动奖品，本轮不再发放抽奖机会。' : '您已获得活动奖品，本轮不再发放抽奖机会。' : '本轮已获得 1 次幸运转盘抽奖资格'}</p>{state?.won ? <Button onClick={openWheel}>{state.needsPrizeProfile ? '填写领奖信息' : '查看我的抽奖记录'}</Button> : <Button onClick={openWheel}>前往幸运转盘</Button>}<Button onClick={() => setPage('home')} secondary>返回活动首页</Button></section>}
      {page === 'profile' && <section className="pfh-panel"><p className="pfh-kicker">中奖信息登记</p><h2>填写领奖信息</h2><p>请在抽中奖品后填写姓名和手机号，供本活动兑奖记录使用。</p><form onSubmit={submitProfile}><label>姓名<input value={profile.name} maxLength={60} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} autoComplete="name" required /></label><label>手机号码<input type="tel" inputMode="numeric" maxLength={11} value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} autoComplete="tel" required /></label><p className="pfh-privacy">处理主体：{state?.privacy?.controller || '待确认'}；保存期限：{state?.privacy?.retention || '待确认'}；联系渠道：{state?.privacy?.contact || '待确认'}。</p><button type="submit" className="pfh-button" disabled={busy}>保存中奖记录</button></form>{error && <p className="pfh-error" role="alert">{error}</p>}</section>}
      {page === 'wheel' && <section className="pfh-wheel-page"><p className="pfh-kicker">幸运转盘</p><h2>平安同行 · 好运相伴</h2><p className="pfh-wheel-count">剩余抽奖次数：<strong>{state?.unusedChanceIds?.length ?? 0}</strong></p><div className="pfh-wheel-wrap"><div className="pfh-pointer" /><div className="pfh-wheel" style={{ transform: `rotate(${rotation}deg)` }}>{WHEEL_LABELS.map((label, index) => <span key={index} className="pfh-wheel-label" style={{ transform: `translate(-50%, -50%) rotate(${index * 60}deg) translateY(-105px) rotate(${-index * 60}deg)` }}>{label}</span>)}</div><button type="button" className="pfh-wheel-center" onClick={spin} disabled={!active || !chanceId || state?.won || spinning || busy || !state?.drawEnabled} aria-label="开始抽奖">{spinning ? '转动中' : '抽奖'}</button></div>{(state?.won || !active || !state?.drawEnabled) && <p className="pfh-draw-closed">{state?.won ? '您已获得活动奖品，不能再次抽奖' : !active ? activityStatus === 'ended' ? '活动已结束，不能再抽奖' : '活动尚未开始' : '正式奖品抽奖参数待确认，当前暂未开放'}</p>}<div className="pfh-prize-list">{PRIZES.map((item) => <div key={item.code}><PrizeImage code={item.code} /><strong>{item.name}</strong><small>{item.stock}</small></div>)}</div><div className="pfh-links"><button type="button" onClick={showRecords}>我的抽奖记录</button><button type="button" onClick={() => setModal('rules')}>活动规则</button></div>{error && <p className="pfh-error" role="alert">{error}</p>}</section>}
      {page === 'records' && <section className="pfh-panel"><p className="pfh-kicker">我的参与记录</p><h2>抽奖记录</h2>{records.length ? records.map((item) => <article className="pfh-record" key={item.recordNo}><div><strong>{item.prizeName}</strong><span>{item.disqualified ? '重复手机号未发奖' : item.won ? item.redemptionStatus === 'registration_pending' ? '待填写领奖信息' : '已中奖' : '未中奖'}</span></div><p>编号：{item.recordNo}</p><p>姓名：{item.name || '待填写'} 手机：{item.maskedPhone || '待填写'}</p><p>抽奖时间：{new Date(item.drawnAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p><p>兑奖状态：{item.redemptionStatus === 'registration_pending' ? '待登记' : item.redemptionStatus === 'pending' ? '待兑奖' : item.redemptionStatus === 'redeemed' ? '已兑奖' : '不适用'}</p></article>) : <p className="pfh-empty">{state?.wonByPhone ? '该手机号已有中奖记录，请使用原中奖微信账号查看。' : '暂无抽奖记录'}</p>}{state?.needsPrizeProfile && <Button onClick={() => setPage('profile')}>填写领奖信息</Button>}{error && <p className="pfh-error" role="alert">{error}</p>}<Button onClick={() => setPage('home')} secondary>返回首页</Button></section>}
    </main>
    {modal === 'rules' && <Modal title="活动规则" onClose={() => setModal('')} actions={<Button onClick={() => setModal('')}>我知道了</Button>}><p>活动时间：2026年11月23日至11月29日（北京时间）。</p><p>三关分别随机抽取 10 道判断题、4 道单选题、2 道单选题。每关全部答对才可进入下一关；答错可重试当前关，已通过的关卡保留。</p><p>每人每天最多成功通关 2 次。未中奖时，每次完整通关获得 1 次抽奖机会，未使用机会在活动期间保留。每人活动期间最多中奖 1 次，中奖后可继续答题，但不再获得抽奖机会，原有未用资格自动失效。失败不占通关次数。</p><p>抽中奖品后填写姓名与手机号，完成领奖记录。同一手机号只能领取一份奖品；重复登记的奖品不发放。</p><p>实物奖品：背包、防晒帽、抱枕被各 50 份。兑奖日期：{state?.redemption?.date || '2026-11-29'}；地点：{state?.redemption?.place || '达聆儿童服务站'}。{state?.redemption?.note || '凭抽奖记录及姓名电话等信息兑奖；具体时段、详细地址和核销要求待公布。'}</p></Modal>}
    {modal === 'passed' && <Modal title="本关通过" onClose={() => { setModal(''); nextQuestion() }} actions={<Button onClick={() => { setModal(''); nextQuestion() }}>进入下一关</Button>}><p>答题全部正确，继续挑战！</p></Modal>}
    {modal === 'failed' && <Modal title="本关挑战未通过" onClose={() => setModal('')} actions={<Button onClick={retryStage} disabled={busy}>重试当前关</Button>}><p>已通过的前面关卡仍然有效。本次失败不占成功通关次数。</p>{feedback?.correctAnswer && <p>正确答案：{feedback.correctAnswer}{feedback.analysis ? `。${feedback.analysis}` : '。原题库未提供本题解析。'}</p>}</Modal>}
    {modal === 'draw' && <Modal title={drawResult?.won ? '恭喜中奖' : '谢谢参与'} onClose={() => { setModal(''); if (drawResult?.won) setPage('profile') }} actions={<><Button onClick={() => { setModal(''); if (drawResult?.won) setPage('profile'); else showRecords() }}>{drawResult?.won ? '填写领奖信息' : '查看抽奖记录'}</Button><Button onClick={() => { setModal(''); setPage('home') }} secondary>返回首页</Button></>}><div className="pfh-draw-result">{drawResult?.won && <PrizeImage code={drawResult.prizeCode} />}<strong>{drawResult?.prizeName}</strong>{drawResult?.won && <p>请填写姓名和手机号，完成中奖记录。</p>}</div></Modal>}
  </div>
}
