import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { getGallery, getMine, submitProfile, uploadPhoto } from './api'
import './style.css'

const TYPE = 'winter_meet'
const KEY = 'gyzy26'
const steps = ['cover', 'schedule', 'form', 'gallery', 'end']
const agenda = [
  ['13:30–13:50', '联学联建'],
  ['13:50–14:20', '签到入场'],
  ['14:20–14:30', '中场休息'],
  ['14:30–16:40', '暖冬相逢，心动赴约'],
  ['16:40–17:00', '自由交流合影留念'],
]
const initialForm = { name: '', gender: '', phone: '', company: '', interests: '' }
const asset = (name) => `https://assets.zice8.com/${TYPE}/${KEY}/${name}.png`

export default function WinterMeet({ routeParams }) {
  const activityKey = routeParams?.activityKey || KEY
  const [config, setConfig] = useState(null)
  const [page, setPage] = useState(() => window.location.pathname.endsWith('/gallery') ? 3 : 0)
  const [form, setForm] = useState(initialForm)
  const [upload, setUpload] = useState(null)
  const [gallery, setGallery] = useState([])
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const fileInput = useRef(null)
  const touchStart = useRef(null)
  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, config)

  useEffect(() => {
    let alive = true
    request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })
      .then((data) => { if (alive) setConfig(data) })
      .catch((error) => { if (alive) setMessage(error.message) })
    return () => { alive = false }
  }, [activityKey])

  const loadGallery = useCallback(async () => {
    try { const data = await getGallery(activityKey); setGallery(data.list || []) }
    catch (error) { setMessage(error.message || '展示加载失败') }
  }, [activityKey])

  useEffect(() => { if (page === 3) { void getGallery(activityKey).then((data) => setGallery(data.list || [])).catch((error) => setMessage(error.message || '展示加载失败')) } }, [page, activityKey])
  useEffect(() => {
    if (!authReady) return
    getMine(activityKey).then((data) => {
      if (!data.profile) return
      setForm({ name: data.profile.name || '', gender: data.profile.gender || '', phone: data.profile.phone || '', company: data.profile.company || '', interests: data.profile.interests || '' })
    }).catch(() => {})
  }, [activityKey, authReady])

  const next = () => { setMessage(''); setPage((current) => Math.min(steps.length - 1, current + 1)) }
  const previous = () => { setMessage(''); setPage((current) => Math.max(0, current - 1)) }
  const onTouchEnd = (event) => {
    if (touchStart.current === null || event.target.closest('input, button, select, .wm-gallery-list, .wm-dialog')) return
    const distance = touchStart.current - event.changedTouches[0].clientY
    touchStart.current = null
    if (distance > 70 && page !== 2) next()
    if (distance < -70 && page !== 2) previous()
  }
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  async function choosePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024 || !file.size) { setMessage('请选择不超过 10MB 的 JPG、PNG 或 WebP 图片'); return }
    if (!authReady) { setMessage(blockedMessage || '请在微信中打开并完成登录'); return }
    setBusy('upload'); setMessage('正在上传照片…')
    try { const result = await uploadPhoto(activityKey, file, (progress) => setMessage(`照片上传中 ${progress}%`)); setUpload(result); setMessage('照片已上传') }
    catch (error) { if (error.status === 401) reauth('winter-meet-upload'); setMessage(error.message || '上传失败') }
    finally { setBusy('') }
  }

  async function submit(event) {
    event.preventDefault()
    if (!upload) { setMessage('请先上传生活照'); return }
    if (!authReady) { setMessage(blockedMessage || '请在微信中打开并完成登录'); return }
    setBusy('submit'); setMessage('')
    try { await submitProfile(activityKey, { ...form, uploadToken: upload.uploadToken }); await loadGallery(); setPage(3); setMessage('提交成功') }
    catch (error) { if (error.status === 401) reauth('winter-meet-submit'); setMessage(error.message || '提交失败，请重试') }
    finally { setBusy('') }
  }

  if (!config) return <main className="wm-loading" role="status">{message || '加载中…'}</main>
  return <main className="wm-shell" onTouchStart={(event) => { touchStart.current = event.touches[0].clientY }} onTouchEnd={onTouchEnd}>
    <div className="wm-stage" style={{ backgroundImage: `url(${asset('shared-heart-background')})` }}>
      <div className="wm-brand"><span>△ 广发银行 CGB</span><i /> <span>◉ 中信银行</span></div>
      {page === 0 && <section className="wm-cover" aria-label="活动封面"><h1>广遇知己<br /><span>信赴冬月</span></h1><p>广发银行 | 中信银行冬月暖心联谊活动</p></section>}
      {page === 1 && <section className="wm-schedule"><div className="wm-event-meta">活动时间：12月5日 14:00–17:00<br />活动地点：环球金融中心 1110</div><div className="wm-schedule-panel"><h2>活动流程</h2><div className="wm-rule" />{agenda.map(([time, title]) => <div className="wm-agenda-row" key={time}><time>{time}</time><span className="wm-agenda-dot" /><strong>{title}</strong></div>)}</div></section>}
      {page === 2 && <section className="wm-form-section"><form className="wm-form-panel" onSubmit={submit}><h2>基本信息</h2><div className="wm-rule" /><label><span>姓名：</span><input name="name" value={form.name} onChange={update} required maxLength={100} /></label><label><span>性别：</span><select name="gender" value={form.gender} onChange={update} required><option value="">请选择</option><option>男</option><option>女</option><option>其他</option></select></label><label><span>手机号：</span><input name="phone" value={form.phone} onChange={update} required type="tel" inputMode="numeric" pattern="1[0-9]{10}" maxLength={11} /></label><label><span>单位：</span><input name="company" value={form.company} onChange={update} required maxLength={100} /></label><label><span>兴趣爱好：</span><input name="interests" value={form.interests} onChange={update} required maxLength={200} /></label><button className="wm-photo-input" type="button" onClick={() => fileInput.current?.click()}><span>{upload ? '生活照已上传，点击更换' : '生活照：点击上传'}</span><span aria-hidden="true">▣</span></button><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choosePhoto} /><button className="wm-submit" type="submit" disabled={Boolean(busy)}>{busy === 'submit' ? '提交中…' : '提交信息'}</button></form></section>}
      {page === 3 && <section className="wm-gallery" aria-label="照片展示"><div className="wm-gallery-list">{gallery.length ? gallery.map((item) => <button className="wm-person-card" key={item.id} onClick={() => setSelected(item)}><img src={item.photoUrl} alt={`${item.name}的生活照`} /><span className="wm-card-icons">♥ ◯ ▽</span><small>姓名：{item.name}</small><small>单位：{item.company}</small><small>兴趣爱好：{item.interests}</small></button>) : <div className="wm-empty">期待第一张相遇的照片</div>}</div></section>}
      {page === 4 && <section className="wm-ending"><h2>期待<br /><span>您的光临</span></h2></section>}
      {message && <p className="wm-message" role="status">{message}</p>}
      {page < 4 && page !== 2 && <button className="wm-next" type="button" onClick={next} aria-label="下一页"><span /></button>}
      {page === 4 && <button className="wm-next" type="button" onClick={() => setPage(0)} aria-label="返回首页"><span /></button>}
      {page > 0 && <button className="wm-back" type="button" onClick={previous}>上一页</button>}
    </div>
    {selected && <div className="wm-dialog" role="dialog" aria-modal="true" onClick={() => setSelected(null)}><div className="wm-dialog-card" onClick={(event) => event.stopPropagation()}><button onClick={() => setSelected(null)} aria-label="关闭">×</button><img src={selected.photoUrl} alt={`${selected.name}的生活照`} /><p>{selected.name}</p><p>{selected.company}</p><p>{selected.interests}</p></div></div>}
  </main>
}
