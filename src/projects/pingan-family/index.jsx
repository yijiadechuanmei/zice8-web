import { useCallback, useEffect, useRef, useState } from 'react'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { trackPageView } from '../../shared/analytics'
import { assets } from './assets'
import Voucher from './Voucher'
import { activateStage, answer, draw, getConfig, getDrawResult, getRecords, getState, retry, saveProfile, start } from './api'
import './styles.css'

const KEY = 'dl1125'
const STAGES = ['初入课堂·基础认知关', '以案学法·情景进阶关', '挑战通关·综合法律关']
const WHEEL_LABELS = ['背包', '谢谢参与', '防晒帽', '谢谢参与', '抱枕被', '谢谢参与']
const formatAnswer = (value) => value?.split('').join('、')

function PrizeImage({ code }) { return <span className={`pfh-prize-image pfh-prize-${code}`} style={{ backgroundImage: `url(${assets.prizes})` }} aria-hidden="true" /> }
function Button({ children, onClick, disabled, secondary = false }) { return <button type="button" className={`pfh-button ${secondary ? 'pfh-button-secondary' : ''}`} onClick={onClick} disabled={disabled}>{children}</button> }
function Modal({ title, children, actions, onClose, className = '' }) { return <div className="pfh-modal-backdrop" role="presentation"><div className={`pfh-modal ${className}`} role="dialog" aria-modal="true" aria-label={title}><button className="pfh-close" type="button" onClick={onClose} aria-label="关闭">×</button><div className="pfh-modal-mark">✦</div><h2>{title}</h2>{children}<div className="pfh-modal-actions">{actions}</div></div></div> }
function RulesContent({ children }) {
  const scrollRef = useRef(null)
  const [progress, setProgress] = useState({ size: 1, offset: 0 })
  const updateProgress = useCallback(() => {
    const element = scrollRef.current
    if (!element) return
    const size = Math.min(1, element.clientHeight / element.scrollHeight)
    const offset = element.scrollHeight > element.clientHeight ? (element.scrollTop / (element.scrollHeight - element.clientHeight)) * (1 - size) : 0
    setProgress({ size, offset })
  }, [])
  useEffect(() => {
    updateProgress()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateProgress)
    if (observer) { observer.observe(scrollRef.current); observer.observe(scrollRef.current.firstElementChild) }
    window.addEventListener('resize', updateProgress)
    return () => { observer?.disconnect(); window.removeEventListener('resize', updateProgress) }
  }, [updateProgress])
  return <div className="pfh-rules-body">
    <div className="pfh-rules-scroll" ref={scrollRef} onScroll={updateProgress} role="region" aria-label="活动规则详细内容" tabIndex={0}><div className="pfh-rules-sections">{children}</div></div>
    {progress.size < 1 && <span className="pfh-rules-track" aria-hidden="true"><span style={{ height: `${progress.size * 100}%`, top: `${progress.offset * 100}%` }} /></span>}
  </div>
}

export default function PinganFamilyProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || KEY
  const [config, setConfig] = useState(null)
  const [state, setState] = useState(null)
  const [page, setPage] = useState('home')
  const [challenge, setChallenge] = useState(null)
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState('')
  const [profile, setProfile] = useState({ name: '', phone: '' })
  const [records, setRecords] = useState([])
  const [drawResult, setDrawResult] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [remainingSeconds, setRemainingSeconds] = useState(60)
  const timeoutSent = useRef('')
  const busyRef = useRef(false)
  const drawTimer = useRef(null)
  const answerTimer = useRef(null)
  const { authReady, blockedMessage } = useWechatAuth(activityKey, config)
  const refresh = useCallback(async () => {
    const next = await getState(activityKey)
    setState(next)
    setChallenge(next.challenge)
    return next
  }, [activityKey])

  useEffect(() => {
    document.title = '平安家庭·法治护航'
    trackPageView(activityKey, '/pfh')
    let mounted = true
    getConfig(activityKey).then((value) => { if (mounted) setConfig(value) }).catch((e) => { if (mounted) setError(e.message) })
    return () => { mounted = false; window.clearTimeout(drawTimer.current); window.clearTimeout(answerTimer.current) }
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
  useEffect(() => {
    if (!authReady || (page !== 'home' && page !== 'wheel')) return undefined
    const boundaries = [
      '2026-11-25T00:00:00+08:00',
      '2026-11-25T12:00:00+08:00',
      '2026-11-26T00:00:00+08:00',
      '2026-11-27T00:00:00+08:00',
      '2026-11-28T00:00:00+08:00',
    ].map((value) => new Date(value).getTime())
    let timer
    let active = true
    const schedule = () => {
      if (!active) return
      const next = boundaries.find((value) => value > Date.now())
      if (next) timer = window.setTimeout(() => { refresh().catch(() => {}); schedule() }, next - Date.now() + 1000)
    }
    schedule()
    return () => { active = false; window.clearTimeout(timer) }
  }, [authReady, page, refresh])
  const execute = async (fn) => { if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); try { return await fn() } catch (e) { setError(e.message || '操作失败，请重试') } finally { busyRef.current = false; setBusy(false) } }
  const activityStatus = state?.activityStatus || config?.activityWindow?.status || 'not_started'
  const active = activityStatus === 'active'
  const quizOpen = active && state?.quizOpen !== false
  const ready = authReady && Boolean(state)
  const chanceId = state?.unusedChanceIds?.[0]

  useEffect(() => {
    if (page !== 'quiz' || challenge?.status !== 'active' || !challenge?.question?.id || !challenge?.expiresAt) return undefined
    const token = `${challenge.id}:${challenge.stage}:${challenge.questionIndex}:${challenge.expiresAt}`
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((new Date(challenge.expiresAt).getTime() - Date.now()) / 1000))
      setRemainingSeconds(seconds)
      if (seconds === 0 && !busyRef.current && timeoutSent.current !== token) {
        timeoutSent.current = token
        submitAnswer('')
      }
    }
    tick()
    const interval = window.setInterval(tick, 250)
    return () => window.clearInterval(interval)
  // submitAnswer uses the current challenge and is intentionally invoked only for the active question.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, challenge?.id, challenge?.stage, challenge?.questionIndex, challenge?.expiresAt])

  async function begin() {
    if (!ready) { setError(blockedMessage || '请在微信中打开活动'); return }
    if (!active) { setError(activityStatus === 'ended' ? '活动已结束' : '活动尚未开始'); return }
    if (!quizOpen) { setError(state?.quizNotStarted ? '答题将于11月25日开始' : '答题时间已结束'); return }
    setError('')
    setPage('stages')
  }
  async function enterStage(stage) {
    if (!ready || !quizOpen || busy || (challenge && challenge.stage !== stage) || (!challenge && stage !== 1)) return
    await execute(async () => {
      const next = !challenge ? await start(activityKey) : challenge.status === 'stage_failed' || challenge.question ? await retry(activityKey, challenge.id) : await activateStage(activityKey, challenge.id)
      setChallenge(next)
      setSelected('')
      setFeedback(null)
      setPage('quiz')
    })
  }
  function selectOption(key) {
    if (feedback || toast) return
    setSelected((current) => challenge?.question?.multiple
      ? current.includes(key) ? current.replace(key, '') : [...current, key].sort().join('')
      : key)
  }
  async function submitAnswer(optionOverride) {
    const option = typeof optionOverride === 'string' ? optionOverride : selected
    if ((option && challenge?.question?.multiple && option.length < 2) || !challenge?.question || feedback || toast) return
    if (!option && typeof optionOverride !== 'string') return
    await execute(async () => {
      const result = await answer(activityKey, challenge.id, challenge.question.id, option)
      if (result.bankUpdated) { setChallenge(result.challenge); setSelected(''); setFeedback(null); setError('本关题目已更新，请重新作答'); return }
      if (result.correct) {
        setToast('回答正确')
        answerTimer.current = window.setTimeout(async () => {
          setToast('')
          setSelected('')
          if (result.completed) {
            let nextState = null
            try { nextState = await refresh() } catch (failure) { setError(failure.message || '通关状态刷新失败') }
            setPage('success')
            answerTimer.current = window.setTimeout(() => {
              if (nextState?.needsPrizeProfile) setPage('profile')
              else if (nextState?.won) showRecords()
              else setPage('wheel')
            }, 1800)
          } else {
            setChallenge(result.challenge)
            if (result.stagePassed) setPage('stages')
          }
        }, 1500)
        return
      }
      setChallenge(result.challenge)
      setFeedback(result)
      if (result.failed) setModal('failed')
    })
  }
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
      } catch (e) { setSpinning(false); await refresh().catch(() => {}); throw e }
    })
  }
  function openWheel() { window.clearTimeout(answerTimer.current); if (state?.needsPrizeProfile) { setPage('profile'); return }; if (state?.won) { showRecords(); return }; if (!state?.drawOpen) { setError(state?.drawExhausted ? '本时段奖品已发完，抽奖机会保留至下一时段' : '抽奖时间为11月25日至27日，当前不能抽奖'); setPage('home'); return }; setPage('wheel') }

  return <div className={`pfh-app pfh-page-${page}`} style={{ '--pfh-bg': `url(${page === 'home' ? assets.home : assets.quiz})` }}>
    <main className="pfh-shell">
      {page !== 'home' && <button className="pfh-back pfh-back-icon" type="button" aria-label="返回首页" title="返回首页" disabled={busy} onClick={() => { if (busyRef.current) return; window.clearTimeout(answerTimer.current); setToast(''); setModal(''); setPage('home'); execute(refresh) }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.8 4.8 7.6 12l7.2 7.2" /></svg></button>}
      {page === 'home' && <>
        <section className="pfh-hero">
          <h1><span>平安家庭</span><span>法治护航</span></h1>
          <p className="pfh-subtitle">——大浪街道反家庭暴力主题宣传活动</p>
        </section>
        <section className="pfh-home-actions"><div className="pfh-count">今日剩余成功通关次数 <strong>{state?.remainingToday ?? '—'}</strong> / 2</div><Button onClick={begin} disabled={!quizOpen || state?.remainingToday === 0 || busy}>{!quizOpen ? activityStatus === 'ended' ? '活动已结束' : state?.quizNotStarted ? '答题将于11月25日开始' : !active ? '活动即将开始' : '答题已结束' : state?.remainingToday === 0 ? '今日已完成' : challenge?.status === 'active' ? '进入关卡' : '开始答题'}</Button>{state?.needsPrizeProfile && <Button onClick={() => setPage('profile')} secondary>填写领奖信息</Button>}{chanceId && state?.drawOpen && <Button onClick={openWheel} secondary>使用抽奖机会（{state.unusedChanceIds.length}次）</Button>}{chanceId && state?.drawExhausted && <Button secondary disabled>本时段奖品已发完 · 资格保留{state.unusedChanceIds.length}次</Button>}<div className="pfh-links"><button type="button" onClick={() => setModal('rules')}>活动规则</button><button type="button" onClick={showRecords} disabled={!ready}>我的中奖记录</button></div>{error && <p className="pfh-error" role="alert">{error}</p>}</section>
        <footer className="pfh-hero-info"><p>主办单位：大浪街道党工委、办事处</p><p>承办单位：大浪街道妇女联合会</p></footer>
      </>}
      {page === 'stages' && <section className="pfh-stages-page">
        <div className="pfh-stages-heading"><p>平安家庭 · 法治护航</p><h2>三关知识挑战</h2><span>完成当前关卡，即可解锁下一关</span></div>
        <div className="pfh-stage-map">
          <svg className="pfh-map-trail" viewBox="0 0 360 440" preserveAspectRatio="none" aria-hidden="true"><path className="pfh-map-trail-base" d="M60 386 C30 330 55 290 210 265 C330 245 335 190 218 156 C70 115 30 114 65 65" /><path className="pfh-map-trail-dash" d="M60 386 C30 330 55 290 210 265 C330 245 335 190 218 156 C70 115 30 114 65 65" /></svg>
          {STAGES.map((title, index) => {
          const stage = index + 1
          const current = challenge?.stage || 1
          const completed = stage < current
          const locked = stage > current
          return <button className={`pfh-map-stop ${completed ? 'is-complete' : locked ? 'is-locked' : 'is-current'}`} type="button" key={stage} disabled={completed || locked || !quizOpen || busy} onClick={() => enterStage(stage)}>
            <span className="pfh-map-node">{completed ? '✓' : String(stage).padStart(2, '0')}</span>
            <span className="pfh-map-label"><strong>{title}</strong><small>{completed ? '已完成' : locked ? '待解锁' : challenge?.status === 'stage_failed' || challenge?.question ? '重新挑战' : '点击开始'}</small></span>
          </button>
          })}
        </div>
        <p className="pfh-stages-footnote">每日最多成功通关 2 次 · 未中奖通关得抽奖机会</p>
        {error && <p className="pfh-error" role="alert">{error}</p>}
      </section>}
      {page === 'quiz' && <section className="pfh-panel pfh-quiz-panel">
        <div className="pfh-stage-tag">第 {challenge?.stage} 关 / 共 3 关</div>
        <h2>{STAGES[(challenge?.stage || 1) - 1]}</h2>
        <div className="pfh-progress-label"><span>知识挑战</span><strong>{Math.min((challenge?.questionIndex || 0) + 1, challenge?.questionCount || 1)} / {challenge?.questionCount}</strong><span className={`pfh-timer ${remainingSeconds <= 10 ? 'is-urgent' : ''}`} role="timer">剩余 {remainingSeconds} 秒</span></div>
        <div className="pfh-progress"><span style={{ width: `${(((challenge?.questionIndex || 0) + 1) / (challenge?.questionCount || 1)) * 100}%` }} /></div>
        {challenge?.status === 'stage_failed' ? <><p>本关挑战未通过，已通关关卡保留。</p><Button onClick={retryStage} disabled={busy}>重新挑战本关</Button></> : <>
          <div className={`pfh-question ${challenge?.question?.multiple ? 'pfh-question-multiple' : ''}`}>{challenge?.question?.title}</div>
          {challenge?.question?.multiple && <p className="pfh-multiple-hint">多选题 · 请至少选择 2 项</p>}
          <div className="pfh-options">{challenge?.question?.options?.map((option) => <button type="button" key={option.key} className={(challenge?.question?.multiple ? selected.includes(option.key) : selected === option.key) ? 'selected' : ''} aria-pressed={challenge?.question?.multiple ? selected.includes(option.key) : selected === option.key} onClick={() => selectOption(option.key)} disabled={Boolean(feedback || toast)}><span>{option.key}</span>{option.text}</button>)}</div>
          {feedback && <div className={`pfh-feedback ${feedback.correct ? 'correct' : 'wrong'}`}>{feedback.correct ? '回答正确' : feedback.timedOut ? '答题超时' : `回答错误 · 正确答案 ${formatAnswer(feedback.correctAnswer)}`}{feedback.analysis && <p>{feedback.analysis}</p>}{!feedback.correct && !feedback.timedOut && !feedback.analysis && <p>原题库未提供本题解析。</p>}</div>}
          {!feedback && <Button onClick={() => submitAnswer()} disabled={!selected || (challenge?.question?.multiple && selected.length < 2) || busy || Boolean(toast)}>确认答案</Button>}
        </>}
        {error && <p className="pfh-error" role="alert">{error}</p>}
      </section>}
      {page === 'success' && <section className="pfh-panel pfh-result-panel"><div className="pfh-big-icon">✦</div><p className="pfh-kicker">三关全部通过</p><h2>闯关成功</h2><p>{state?.won ? state.wonByPhone ? '该登记手机号已获得活动奖品，本轮不再发放抽奖机会。' : '您已获得活动奖品，本轮不再发放抽奖机会。' : '本轮已获得 1 次幸运转盘抽奖资格'}</p>{state?.won ? <Button onClick={openWheel}>{state.needsPrizeProfile ? '填写领奖信息' : '查看我的中奖记录'}</Button> : <Button onClick={openWheel}>前往幸运转盘</Button>}<Button onClick={() => { window.clearTimeout(answerTimer.current); setPage('home') }} secondary>返回活动首页</Button></section>}
      {page === 'profile' && <section className="pfh-panel"><h2>填写领奖信息</h2><p>请在抽中奖品后填写姓名和手机号，供本活动兑奖记录使用。</p><form onSubmit={submitProfile}><label>姓名<input value={profile.name} maxLength={60} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} autoComplete="name" required /></label><label>手机号码<input type="tel" inputMode="numeric" maxLength={11} value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))} autoComplete="tel" required /></label><button type="submit" className="pfh-button" disabled={busy}>保存中奖记录</button></form>{error && <p className="pfh-error" role="alert">{error}</p>}</section>}
      {page === 'wheel' && <section className="pfh-wheel-page"><p className="pfh-wheel-count">剩余抽奖次数：<strong>{state?.unusedChanceIds?.length ?? 0}</strong></p><div className="pfh-wheel-wrap"><div className="pfh-pointer" /><div className="pfh-wheel" style={{ transform: `rotate(${rotation}deg)` }}>{WHEEL_LABELS.map((label, index) => <span key={index} className="pfh-wheel-label" style={{ transform: `translate(-50%, -50%) rotate(${index * 60}deg) translateY(calc(var(--pfh-wheel-size) * -.35)) rotate(${-index * 60}deg)` }}>{label}</span>)}</div><button type="button" className="pfh-wheel-center" onClick={spin} disabled={!state?.drawOpen || !chanceId || state?.won || spinning || busy || !state?.drawEnabled} aria-label="开始抽奖">{spinning ? '转动中' : '抽奖'}</button></div><div className="pfh-links"><button type="button" onClick={showRecords}>我的中奖记录</button></div><p className="pfh-draw-closed" style={{ visibility: state?.won || !state?.drawOpen || !state?.drawEnabled ? 'visible' : 'hidden' }}>{state?.won ? '您已获得活动奖品，不能再次抽奖' : !active ? activityStatus === 'ended' ? '活动已结束，不能再抽奖' : '活动尚未开始' : state?.drawExhausted ? '本时段奖品已发完，抽奖机会保留至下一时段' : !state?.drawOpen ? '抽奖时间为11月25日至27日，当前不能抽奖' : !state?.drawEnabled ? '抽奖当前暂停' : ''}</p>{error && <p className="pfh-error" role="alert">{error}</p>}</section>}
      {page === 'records' && <section className="pfh-panel pfh-records-panel">
        <h2>中奖记录</h2>
        {records.length ? records.map((item) => <article className="pfh-record" key={item.recordNo}>
          <div className="pfh-record-heading">
            <strong>{item.prizeName}</strong>
            <span>{item.redemptionStatus === 'registration_pending' ? '待填写领奖信息' : item.redemptionStatus === 'redeemed' ? '已兑奖' : '待兑奖'}</span>
          </div>
          <dl className="pfh-record-details">
            <div><dt>姓名</dt><dd>{item.name || '待填写'}</dd></div>
            <div><dt>手机号码</dt><dd>{item.phone || '待填写'}</dd></div>
            <div><dt>中奖时间</dt><dd>{new Date(item.drawnAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</dd></div>
            <div><dt>兑奖状态</dt><dd>{item.redemptionStatus === 'registration_pending' ? '待登记' : item.redemptionStatus === 'redeemed' ? '已兑奖' : '待兑奖'}</dd></div>
          </dl>
          <Voucher activityKey={activityKey} drawId={item.drawId} claimCode={item.claimCode} />
        </article>) : <p className="pfh-empty">{state?.wonByPhone ? '该手机号已有中奖记录，请使用原中奖微信账号查看。' : '暂无中奖记录'}</p>}
        {state?.needsPrizeProfile && <Button onClick={() => setPage('profile')}>填写领奖信息</Button>}
        {error && <p className="pfh-error" role="alert">{error}</p>}
        <Button onClick={() => setPage('home')} secondary>返回首页</Button>
      </section>}
    </main>
    {modal === 'rules' && <Modal title="活动规则" className="pfh-rules-modal" onClose={() => setModal('')} actions={<Button onClick={() => setModal('')}>我知道了</Button>}>
      <p className="pfh-rules-hint">上下滑动查看完整规则</p>
      <RulesContent>
        <section className="pfh-rule-section"><h3><span>01</span>活动时间</h3><dl><div><dt>答题时间</dt><dd>2026年11月25日至11月27日（北京时间）</dd></div><div><dt>兑奖日期</dt><dd>2026年11月30日至12月4日</dd></div><div><dt>兑奖地点</dt><dd>大浪街道便民服务中心D栋401</dd></div></dl></section>
        <section className="pfh-rule-section"><h3><span>02</span>三关答题</h3><ol><li>第一关随机抽取 10 道判断题；第二关 5 道单选题；第三关 5 道多选题。</li><li>每题限时 1 分钟。超时视为本关挑战失败，可重试当前关；已通过的关卡保留。</li><li>每关全部答对才可解锁下一关。每人每天最多成功通关 2 次；失败不占通关次数。</li></ol></section>
        <section className="pfh-rule-section"><h3><span>03</span>抽奖与中奖</h3><ol><li>未中奖时，每次完整通关获得 1 次抽奖机会；抽奖时间为 11 月 25–27 日，未使用机会须在此期间使用。</li><li>每人活动期间最多中奖 1 次。中奖后仍可答题，但不再获得抽奖机会，原有未用资格自动失效。</li><li>实物奖品为背包、防晒帽、抱枕被；各时段奖品数量有限，发完后抽奖资格保留至下一时段。</li></ol></section>
        <section className="pfh-rule-section"><h3><span>04</span>领奖登记</h3><ol><li>抽中奖品后填写姓名和手机号，完成中奖记录。</li><li>同一手机号只能领取一份奖品；重复登记的奖品不发放。</li><li>兑奖时请报登记姓名和手机号。工作人员核验中奖记录并登记兑奖，已兑奖奖品不能再次领取。</li></ol></section>
      </RulesContent>
    </Modal>}
    {toast && <div className="pfh-toast" role="status" aria-live="polite">{toast}</div>}
    {modal === 'failed' && <Modal title={feedback?.timedOut ? '答题超时' : '本关挑战未通过'} onClose={() => { setModal(''); if (feedback?.timedOut) setPage('stages') }} actions={<Button onClick={retryStage} disabled={busy}>重试当前关</Button>}><p>已通过的前面关卡仍然有效。本次失败不占成功通关次数。</p>{feedback?.correctAnswer && !feedback.timedOut && <p>正确答案：{formatAnswer(feedback.correctAnswer)}{feedback.analysis ? `。${feedback.analysis}` : '。原题库未提供本题解析。'}</p>}</Modal>}
    {modal === 'draw' && <Modal title={drawResult?.won ? '恭喜中奖' : '谢谢参与'} onClose={() => { setModal(''); if (drawResult?.won) setPage('profile') }} actions={<><Button onClick={() => { setModal(''); if (drawResult?.won) setPage('profile'); else showRecords() }}>{drawResult?.won ? '填写领奖信息' : '查看中奖记录'}</Button><Button onClick={() => { setModal(''); setPage('home') }} secondary>返回首页</Button></>}><div className="pfh-draw-result">{drawResult?.won && <><PrizeImage code={drawResult.prizeCode} /><small className="pfh-prize-disclaimer">图片仅供参考</small></>}<strong>{drawResult?.prizeName}</strong>{drawResult?.won && <><Voucher activityKey={activityKey} drawId={drawResult.id} claimCode={drawResult.claimCode} /><p>请填写姓名和手机号，兑奖时向工作人员报出登记信息。</p></>}</div></Modal>}
  </div>
}
