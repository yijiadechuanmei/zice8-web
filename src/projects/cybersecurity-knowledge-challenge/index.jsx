/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { request } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { Artwork, backId, otherBackId, Picture, PRIZE_ART, src } from './artwork'
import { Wheel, WHEEL_ANGLES } from './wheel'
import { formatTime, makePoster } from './poster'
import './style.css'

const TYPE = 'cybersecurity_knowledge_challenge'
const DEFAULT_KEY = 'cybersecurity_knowledge_challenge_2026'
const title = '网络安全知识大闯关'
const labelMode = (mode) => mode === 'team' ? '团队' : '个人'
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
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [scale, setScale] = useState(() => Math.min(window.innerWidth, 750) / 750)
  const [now, setNow] = useState(() => Date.now())
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState([])
  const [reviewIndex, setReviewIndex] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', teamName: '' })
  const [poster, setPoster] = useState('')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const requestId = useRef(null)
  const qr = useRef(null)
  const alive = useRef(true)
  const expireRetryAt = useRef(0)
  const progress = data?.modes?.[mode]
  const attempt = progress?.attempt
  const isReview = reviewIndex !== null
  const currentQuestion = isReview ? attempt?.answers?.[reviewIndex] : attempt?.currentQuestion
  const remainingSeconds = Math.max(0, Math.ceil(((attempt?.deadline || 0) - now - offset) / 1000))
  const go = useCallback((next) => { setPage(next); setModal(''); setError(''); window.scrollTo({ top: 0, behavior: 'instant' }) }, [])
  const accept = useCallback((value) => { setOffset(value.serverNow - Date.now()); setData(value); setNow(Date.now()); return value }, [])
  const showError = useCallback((err) => {
    if (Number(err?.status) === 401 && reauth('cybersecurity-api-401')) return
    setError(err.message || '请求失败，请重试')
  }, [reauth])
  async function run(work) {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true); setError('')
    try { return await work() } catch (err) { showError(err) } finally { busyRef.current = false; if (alive.current) setBusy(false) }
  }
  const load = useCallback(async () => accept(await request(`${base}/state`)), [accept, base])
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    const resize = () => setScale(Math.min(window.innerWidth, 750) / 750)
    window.addEventListener('resize', resize)
    const timer = setInterval(() => setNow(Date.now()), 500)
    return () => { window.removeEventListener('resize', resize); clearInterval(timer) }
  }, [])
  useEffect(() => {
    let active = true
    request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true }).then((value) => { if (active) { setConfig(value); document.title = title } }).catch(showError)
    return () => { active = false }
  }, [activityKey, showError])
  useEffect(() => {
    if (!authReady || !hasToken) return
    let active = true
    load().then((value) => {
      if (!active) return
      const activeMode = ['personal', 'team'].find((m) => value.modes[m].attempt?.status === 'active')
      if (activeMode) { setMode(activeMode); setPage('quiz') }
    }).catch(showError)
    return () => { active = false }
  }, [authReady, hasToken, load, showError])
  useEffect(() => {
    if (page !== 'quiz' || attempt?.status !== 'active' || remainingSeconds > 0 || Date.now() < expireRetryAt.current) return
    expireRetryAt.current = Date.now() + 3000
    load().then((value) => { if (value.modes[mode].attempt?.status === 'failed') setModal('failed') }).catch(showError)
  }, [attempt?.status, remainingSeconds, page, load, mode, now, showError])

  const backTarget = page === 'details' || page === 'draw' ? 'result' : 'home'
  const navigation = { [backId]: { label: '返回', onClick: () => go(backTarget) }, [otherBackId]: { label: '返回结果', onClick: () => go('result') }, 'text-5ef4d1229e77': { label: '返回首页', onClick: () => go('home') } }
  async function chooseMode(nextMode) {
    setMode(nextMode); setSelected([]); setReviewIndex(null)
    if (!hasToken) { if (!reauth('cybersecurity-start')) setError('请在微信中打开活动并完成授权后参与'); return }
    await run(async () => {
      const value = await load(); const p = value.modes[nextMode]
      if (p.succeeded) { go('result'); return }
      if (p.attempt?.status === 'active') { go('quiz'); return }
      if (p.remaining <= 0) { setModal('exhausted'); return }
      setForm({ name: p.name || value.nickname || '', phone: p.phone || '', teamName: p.teamName || '' })
      requestId.current = uuid(); setModal('register')
    })
  }
  async function start(event) {
    event.preventDefault()
    await run(async () => {
      const payload = { ...form, name: form.name.trim(), phone: form.phone.trim(), teamName: mode === 'team' ? form.teamName.trim() : '', mode, requestId: requestId.current }
      const value = accept(await request(`${base}/start`, { method: 'POST', body: JSON.stringify(payload) }))
      setSelected([]); setReviewIndex(null)
      if (value.modes[mode].attempt?.status === 'failed') { requestId.current = uuid(); setModal('failed') } else go('quiz')
    })
  }
  async function submit() {
    if (isReview) { setReviewIndex((v) => v + 1 < attempt.answers.length ? v + 1 : null); setSelected([]); return }
    if (!selected.length || remainingSeconds <= 0) return
    await run(async () => {
      const index = attempt.answers.length
      const value = accept(await request(`${base}/answer`, { method: 'POST', body: JSON.stringify({ mode, attemptId: attempt.id, questionId: currentQuestion.id, selected }) }))
      const a = value.modes[mode].attempt
      setSelected([])
      if (a.status === 'failed') setModal('failed')
      else if (a.status === 'success') go('result')
      else setReviewIndex(index)
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
    })
  }
  async function generatePoster() {
    setModal('poster'); setPoster('')
    await run(async () => setPoster(await makePoster({ mode, progress, qrCanvas: qr.current?.querySelector('canvas') })))
  }
  function quizOption(option) {
    const q = currentQuestion
    const picked = isReview ? q.selected.includes(option.key) : selected.includes(option.key)
    const correct = isReview && q.answer.includes(option.key)
    const wrong = isReview && picked && !correct
    return <button key={option.key} type="button" className={`cyber-option ${picked ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'wrong' : ''}`} disabled={isReview || busy || remainingSeconds <= 0} aria-pressed={picked} onClick={() => setSelected((old) => q.type === 'multiple' ? old.includes(option.key) ? old.filter((k) => k !== option.key) : [...old, option.key] : [option.key])}><span>{option.key}</span><span>{option.text}</span></button>
  }
  const closeModal = () => setModal('')
  const modalProps = { scale, onClose: closeModal }
  const commonQuizOmit = ['63311aa', 'cb6c2c', 'text-787fd', '6aa715', 'cd20df', '5c1f714']
  return <div className={`cyber-app cyber-${mode}`} aria-busy={busy}>
    <div className="cyber-stage-wrap" style={{ width: 750 * scale, height: 1624 * scale }}>
      <div className="cyber-stage" style={{ transform: `scale(${scale})` }}>
        <div className="cyber-page" key={page}>
          {page === 'home' && <>
            <Artwork page={1} omit={['text-3e63f29b2543']} actions={{ '06d5feaa3577e2fc6f0e117058f6786a': { label: '个人闯关', onClick: () => chooseMode('personal') }, b2e70d6e70341633565031697c3c7896: { label: '团队闯关', onClick: () => chooseMode('team') }, 'text-34aa4cc01a58': { label: '活动规则', onClick: () => go('choose') } }} classes={{ '95e7bc9d0c3c9a2257f91795ba29ff92': 'cyber-enter', f5121483110c6ccf8067f3557519bce1: 'cyber-float', a70528fc49f038acb66a2ef22bb445ed: 'cyber-float-delay', f118cea1a1b86c389d53cae4600ca41b: 'cyber-float-delay' }} />
            <button type="button" className="cyber-my-prizes" onClick={() => { if (hasToken) run(async () => { await load(); go('prizes') }); else setError('请在微信中完成授权后查看奖品') }}>我的奖品</button>
          </>}
          {page === 'choose' && <Artwork page={2} actions={{ ...navigation, '721fe211ae2323400e635f0e02932a5a': { label: '进入个人闯关', onClick: () => chooseMode('personal'), disabled: busy }, '17312b9131744f111979488d00e96209': { label: '进入团队闯关', onClick: () => chooseMode('team'), disabled: busy } }} />}
          {page === 'quiz' && <>
            <Artwork page={mode === 'team' ? 4 : 3} omit={commonQuizOmit} actions={navigation} />
            <div className="cyber-category">当前分类：{currentQuestion?.category || '网络安全'}<br /><small>答题过程中可查看进度与剩余时间</small></div>
            <div className="cyber-timer" role="timer">◷ {formatTime(remainingSeconds)}</div>
            <div className="cyber-progress">{String(isReview ? reviewIndex + 1 : (attempt?.answers.length || 0) + 1).padStart(2, '0')}<small>/{attempt?.total || 20}</small></div>
            <div className="cyber-question-content" key={`${currentQuestion?.id}-${isReview}`}>
              <div className="cyber-question-type">{currentQuestion?.type === 'multiple' ? '多选题（选择所有正确选项）' : currentQuestion?.type === 'boolean' ? '判断题' : '单选题'}</div>
              <h2>{currentQuestion?.title || '题目加载中…'}</h2>
              <div className="cyber-errors">累计错题：{attempt?.errors || 0}/3</div>
              <div className="cyber-options">{currentQuestion?.options.map(quizOption)}</div>
              {isReview && <div className="cyber-answer-feedback" role="status"><b>{currentQuestion.correct ? '回答正确' : '回答错误'} · 正确答案：{currentQuestion.answer}</b><p>{currentQuestion.explanation}</p></div>}
            </div>
            <Picture id="text-787fd8f87377" x={33} y={1324} w={326} h={89} label="上一题" disabled={!attempt?.answers.length || busy || reviewIndex === 0} onClick={() => { setReviewIndex((v) => v === null ? attempt.answers.length - 1 : Math.max(0, v - 1)); setSelected([]) }} />
            {isReview ? <button className="cyber-next" style={rect(388, 1325, 324, 91)} type="button" onClick={submit}>下一题</button> : <Picture id={mode === 'team' ? 'cb6c2c29073ce3719598c1a7e00c9d9f' : '63311aa61c0b69f56a72019152e0c156'} x={388} y={1325} w={324} h={91} label="提交答案" onClick={submit} disabled={busy || !selected.length || remainingSeconds <= 0} />}
          </>}
          {page === 'result' && <>
            <Artwork page={mode === 'team' ? 6 : 5} omit={['text-d16b2a1cbe55']} actions={{ ...navigation, '081adbf88a30ead37291580219ccb2dd': { label: '生成个人主题海报', onClick: generatePoster, disabled: busy }, d2dfd044bddffcd80c0b4c9868e41375: { label: '生成团队主题海报', onClick: generatePoster, disabled: busy }, f9b8b4230f06e1a083c7c548d535247f: { label: '转盘抽奖', onClick: () => go('draw') }, '807580b62daea1aa9f081e4f049d7276': { label: '转盘抽奖', onClick: () => go('draw') }, 'text-f88ab9fd5abf': { label: '答题详情', onClick: () => go('details') }, 'text-3b584898787c': { label: '答题详情', onClick: () => go('details') } }} />
            <div className="cyber-result-values"><b>{attempt?.score ?? 0}</b><b>{formatTime(attempt?.durationSeconds || 0)}</b><b>{progress?.draw ? 0 : 1}</b></div>
            {mode === 'team' && <div className="cyber-result-team">{progress?.teamName}</div>}
          </>}
          {page === 'details' && <>
            <Artwork page={7} actions={{ ...navigation, 'text-6071b7c9ff8a': { label: '返回首页', onClick: () => go('home') } }} />
            <div className="cyber-details">{attempt?.answers?.map((a, index) => <article key={a.questionId}><header><b>{index + 1} / {a.category}</b><span className={a.correct ? 'ok' : 'bad'}>{a.correct ? '正确' : '错误'}</span></header><h3>{a.title}</h3><p>你的答案：{a.selected} 正确答案：{a.answer}</p><p>{a.explanation}</p></article>)}</div>
          </>}
          {page === 'draw' && <>
            <Artwork page={8} omit={['f79d5d674a55f547e986be446f382a91']} actions={{ ...navigation, ef793ee88f81c81ffda0704aeaadb071: { label: progress?.draw ? '查看抽奖结果' : '开始抽奖', onClick: draw, disabled: busy || spinning }, 'text-fbe1639180d7': { label: '返回结果', onClick: () => go('result'), disabled: spinning } }} />
            <Wheel rotation={rotation} prizes={data?.lottery?.prizes} />
            <Picture id="f85af1000c81149e6069211e18180b33" x={266} y={482} w={237} h={267} />
            <p className="cyber-draw-state">{progress?.draw ? '本次抽奖已完成，可查看结果' : data?.lottery?.enabled ? '闯关成功，获得1次抽奖机会' : '抽奖暂未开放，资格已为你保留'}</p>
          </>}
          {page === 'prizes' && <>
            <Artwork page={9} omit={['ccd59680942cf673e3b24e4169db0a0a']} actions={{ ...navigation, 'text-259fa5eb4a6e': { label: '返回首页', onClick: () => go('home') } }} />
            <div className="cyber-prizes">{['personal', 'team'].map((m) => ({ mode: m, draw: data?.modes[m]?.draw })).filter((p) => p.draw?.prizeId).map(({ mode: m, draw: d }) => <article key={m}><img src={src(PRIZE_ART[d.image])} alt={d.name} /><div><h3>{d.name}<small>数量：1</small></h3><p>{labelMode(m)}闯关 · {d.redeemedAt ? '已核销' : '待领取'}</p><p>核销码号码：<strong>{d.code}</strong></p></div></article>)}{!['personal', 'team'].some((m) => data?.modes[m]?.draw?.prizeId) && <p className="cyber-empty">暂无中奖记录</p>}</div>
          </>}
        </div>
      </div>
    </div>
    {error && <div className="cyber-toast" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="关闭提示">×</button></div>}
    {busy && !spinning && <div className="cyber-busy" role="status">正在处理…</div>}
    {modal === 'rules' && <Modal {...modalProps} height={930} label="活动规则"><Picture id="3e3176187510559c98b15d0a91e2e225" x={7} y={60} w={736} h={856} /><div className="cyber-rules"><p>个人与团队为两种独立参与身份，每个账号每种身份各有3次答题机会，各只能成功闯关一次。</p><p>团队由三个人共用同一个账号答题，共享团队身份的次数与成绩。</p><p>每轮随机抽取20题，限时5分钟。单选题和判断题选择一个答案；多选题须全部选对，少选、多选均记为答错。</p><p>每答对一题得5分。累计答错3题或时间用尽，本轮闯关失败，返回首页后可使用剩余机会重新挑战。</p><p>中途返回或刷新不会重置时间，可继续本轮答题。已提交的答案不能修改。</p><p>成功完成后可查看结果、合成海报，并获得该身份1次抽奖机会。中奖后凭核销码前往集团科创部领取。</p></div></Modal>}
    {modal === 'register' && <Modal {...modalProps} height={890} label={`${labelMode(mode)}参与信息`}><Picture id="3e3176187510559c98b15d0a91e2e225" x={7} y={60} w={736} h={820} /><form className="cyber-register" onSubmit={start}><h2>{labelMode(mode)}闯关</h2><p>剩余 {progress?.remaining ?? 3} 次机会{mode === 'team' ? ' · 三人共用同一账号答题' : ''}</p><label>姓名<input autoComplete="name" required maxLength={40} value={form.name} readOnly={Boolean(progress?.used)} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>手机号<input autoComplete="tel" required inputMode="tel" pattern="1[3-9][0-9]{9}" maxLength={11} value={form.phone} readOnly={Boolean(progress?.used)} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>{mode === 'team' && <label>团队名称<input required maxLength={60} value={form.teamName} readOnly={Boolean(progress?.used)} onChange={(e) => setForm({ ...form, teamName: e.target.value })} /></label>}<small>信息用于记录成绩与奖品领取。开始后消耗1次机会，计时持续进行。</small><button type="submit" disabled={busy}>开始答题</button></form></Modal>}
    {(modal === 'failed' || modal === 'exhausted') && <Modal scale={scale} height={736} label="闯关失败"><Picture id="f528abf49fc758b9fb87bb73325d26fd" x={7} y={50} w={736} h={676} /><Picture id="14dba9edc1f271124020174158ee6a13" x={245} y={167} w={258} h={258} /><Picture id="text-e7b2e7bc3382" x={205} y={460} w={341} h={39} /><p className="cyber-failure-copy">{modal === 'exhausted' ? '3次机会已用完，感谢参与' : attempt?.reason === 'timeout' ? `答题时间已结束，剩余${progress?.remaining || 0}次机会` : `累计答错3题，剩余${progress?.remaining || 0}次机会`}</p><Picture id="text-6071b7c9ff8a" x={223} y={580} w={308} h={89} onClick={() => go('home')} label="返回首页" /></Modal>}
    {modal === 'poster' && <Modal {...modalProps} height={1410} label="我的主题海报">{poster ? <img className="cyber-poster" src={poster} alt={`${progress?.name}的网络安全闯关成绩海报，长按保存`} /> : <div className="cyber-poster-loading">{busy ? '正在合成海报…' : <button type="button" onClick={generatePoster}>重新生成海报</button>}</div>}<p className="cyber-save-tip">长按海报保存图片，分享你的闯关成果</p></Modal>}
    {modal === 'prize' && <Modal scale={scale} height={925} label="抽奖结果"><Picture id="6ba690d2f0dfd483ba9a72685c0a1509" x={7} y={60} w={736} h={840} /><Picture id="18ef814db8126e2d97db42999153391d" x={166} y={143} w={404} h={352} /><Picture id={PRIZE_ART[progress?.draw?.image] || PRIZE_ART.none} x={282} y={236} w={186} h={170} /><div className="cyber-prize-result"><h2>{progress?.draw?.prizeId ? `恭喜获得${progress.draw.name}` : '谢谢参与'}</h2>{progress?.draw?.prizeId ? <><p>核销码号码：<strong>{progress.draw.code}</strong></p><p>请前往集团科创部核销领取</p></> : <p>感谢参与网络安全知识大闯关</p>}</div><Picture id="text-6071b7c9ff8a" x={43} y={770} w={308} h={89} onClick={() => go('home')} label="返回首页" /><Picture id="53ab4740aecbaf208b2f290acfdc3dbf" x={376} y={769} w={324} h={91} onClick={() => go('prizes')} label="前往我的奖品" /></Modal>}
    <div ref={qr} className="cyber-qr-source" aria-hidden="true"><QRCodeCanvas value={`${window.location.origin}/${TYPE}/${activityKey}`} size={384} marginSize={2} level="M" /></div>
  </div>
}
