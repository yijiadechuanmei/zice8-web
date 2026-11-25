import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { getGallery, getMine, submitProfile, uploadPhoto } from './api'
import './style.css'

const TYPE = 'winter_meet'
const KEY = 'gyzy26'
const SCENES = ['cover', 'schedule', 'form', 'gallery', 'ending']
const FIELDS = ['name', 'gender', 'phone', 'company', 'interests']
const initialForm = { name: '', gender: '', phone: '', company: '', interests: '' }
const asset = (name) => `https://assets.zice8.com/${TYPE}/${KEY}/${name}.png`

function Art({ name, className = '', alt = '' }) {
  return <img className={`wm-art ${className}`} src={asset(name)} alt={alt} draggable="false" />
}

function GalleryCard({ item, onClick }) {
  const content = <>
    <Art name="gallery-photo-card-template" className="wm-card-art" />
    {item && <>
      <img className="wm-card-photo" src={item.photoUrl} alt={`${item.name}的生活照`} />
      <span className="wm-card-value wm-card-name">{item.name}</span>
      <span className="wm-card-value wm-card-company">{item.company}</span>
      <span className="wm-card-value wm-card-interests">{item.interests}</span>
    </>}
  </>
  return item
    ? <button className="wm-card" type="button" onClick={() => onClick(item)} aria-label={`查看${item.name}的照片`}>{content}</button>
    : <div className="wm-card" aria-hidden="true">{content}</div>
}

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

  useEffect(() => {
    if (page !== 3) return
    void getGallery(activityKey).then((data) => setGallery(data.list || [])).catch((error) => setMessage(error.message || '展示加载失败'))
  }, [page, activityKey])
  useEffect(() => {
    if (!authReady) return
    getMine(activityKey).then((data) => {
      if (!data.profile) return
      setForm({ name: data.profile.name || '', gender: data.profile.gender || '', phone: data.profile.phone || '', company: data.profile.company || '', interests: data.profile.interests || '' })
    }).catch(() => {})
  }, [activityKey, authReady])

  const next = () => { setMessage(''); setPage((current) => Math.min(SCENES.length - 1, current + 1)) }
  const previous = () => { setMessage(''); setPage((current) => Math.max(0, current - 1)) }
  const onTouchEnd = (event) => {
    const started = touchStart.current
    touchStart.current = null
    if (started === null || event.target.closest('input, button, select, .wm-gallery-list, .wm-dialog')) return
    const distance = started - event.changedTouches[0].clientY
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
    <svg className="wm-svg-filter" aria-hidden="true"><filter id="wm-white-key" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -5 -5 -5 0 15" /><feComposite in2="SourceAlpha" operator="in" /></filter></svg>
    <div className="wm-stage">
      <Art name="shared-heart-background" className="wm-background" />
      <Art name="shared-brand-logo-strip" className="wm-brand" />
      {page === 0 && <section className="wm-scene" aria-label="活动封面"><Art name="cover-event-title" className="wm-cover-title" alt="广遇知己 信赴冬约" /></section>}
      {page === 1 && <section className="wm-scene" aria-label="活动流程"><Art name="schedule-panel" className="wm-schedule-panel" alt="活动流程：联学联建、签到入场、中场休息、暖冬相逢、自由交流合影" /></section>}
      {page === 2 && <section className="wm-scene" aria-label="基本信息"><form onSubmit={submit}>
        <Art name="form-panel" className="wm-form-panel" />
        {FIELDS.map((field, index) => <div className="wm-field" style={{ top: `calc(var(--u) * ${470 + index * 116})` }} key={field}>
          <Art name={`form-field-${field}`} alt={field} />
          {field === 'gender'
            ? <select name="gender" aria-label="性别" value={form.gender} onChange={update} required><option value=""> </option><option>男</option><option>女</option><option>其他</option></select>
            : <input name={field} aria-label={{ name: '姓名', phone: '手机号', company: '单位', interests: '兴趣爱好' }[field]} value={form[field]} onChange={update} required maxLength={field === 'phone' ? 11 : field === 'interests' ? 200 : 100} type={field === 'phone' ? 'tel' : 'text'} inputMode={field === 'phone' ? 'numeric' : undefined} pattern={field === 'phone' ? '1[0-9]{10}' : undefined} />}
        </div>)}
        <div className="wm-field wm-photo-field"><Art name="form-field-life-photo" alt="生活照" /><button type="button" aria-label={upload ? '更换生活照' : '上传生活照'} onClick={() => fileInput.current?.click()} /></div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choosePhoto} />
        <button className="wm-submit" type="submit" disabled={Boolean(busy)} aria-label={busy === 'submit' ? '提交中' : '提交信息'}><Art name="form-submit-success-button" /></button>
      </form></section>}
      {page === 3 && <section className="wm-gallery-list" aria-label="照片展示">{Array.from({ length: Math.max(4, gallery.length) }, (_, index) => <GalleryCard key={gallery[index]?.id || `empty-${index}`} item={gallery[index]} onClick={setSelected} />)}</section>}
      {page === 4 && <section className="wm-scene" aria-label="结束页"><Art name="ending-invitation-title" className="wm-ending-title" alt="期待您的光临" /></section>}
      {message && <p className="wm-message" role="status">{message}</p>}
      {page !== 2 && <button className="wm-next" type="button" onClick={page === 4 ? () => setPage(0) : next} aria-label={page === 4 ? '返回首页' : '下一页'}><Art name="shared-up-arrow" /></button>}
    </div>
    {selected && <div className="wm-dialog" role="dialog" aria-modal="true" onClick={() => setSelected(null)}><div className="wm-dialog-card" onClick={(event) => event.stopPropagation()}><button onClick={() => setSelected(null)} aria-label="关闭">×</button><img src={selected.photoUrl} alt={`${selected.name}的生活照`} /><p>{selected.name}</p><p>{selected.company}</p><p>{selected.interests}</p></div></div>}
  </main>
}
