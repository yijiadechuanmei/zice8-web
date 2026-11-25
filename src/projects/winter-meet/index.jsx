import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { getGallery, getMine, submitProfile, uploadPhoto } from './api'
import './style.css'

const TYPE = 'winter_meet'
const KEY = 'gyzy26'
const initialForm = { name: '', gender: '', phone: '', company: '', interests: '' }
const asset = (name) => `https://assets.zice8.com/${TYPE}/${KEY}/${name}.png`
const fields = [
  { name: 'phone', label: '手机号', maxLength: 11, type: 'tel' },
  { name: 'company', label: '单位', maxLength: 100 },
  { name: 'interests', label: '兴趣爱好', maxLength: 200 },
]

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

function CameraIcon() {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 10h5l2-3h10l2 3h5v16H4z" /><circle cx="16" cy="18" r="5" /></svg>
}

export default function WinterMeet({ routeParams }) {
  const activityKey = routeParams?.activityKey || KEY
  const [config, setConfig] = useState(null)
  const [page, setPage] = useState(() => window.location.pathname.endsWith('/gallery') ? 3 : 0)
  const [direction, setDirection] = useState('up')
  const [form, setForm] = useState(initialForm)
  const [upload, setUpload] = useState(null)
  const [gallery, setGallery] = useState([])
  const [galleryPage, setGalleryPage] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [keyboardShift, setKeyboardShift] = useState(0)
  const fileInput = useRef(null)
  const gestureStart = useRef(null)
  const lastWheelAt = useRef(0)
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
    let alive = true
    getMine(activityKey).then((data) => {
      if (!alive) return
      const profile = data.profile
      setSubmitted(Boolean(profile?.photoUrl))
      if (!profile) return
      setForm({ name: profile.name || '', gender: profile.gender || '', phone: profile.phone || '', company: profile.company || '', interests: profile.interests || '' })
      if (profile.photoUrl) setPage((current) => current === 2 ? 3 : current)
    }).catch(() => {})
    return () => { alive = false }
  }, [activityKey, authReady])
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    let frame = 0
    const keepFocusedFieldVisible = () => {
      const active = document.activeElement
      if (!(active instanceof HTMLInputElement) || active.type === 'file' || viewport.height >= window.innerHeight - 120) {
        setKeyboardShift(0)
        return
      }
      const visibleBottom = viewport.offsetTop + viewport.height - 20
      setKeyboardShift((current) => Math.max(0, Math.ceil(active.getBoundingClientRect().bottom + current - visibleBottom)))
    }
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(keepFocusedFieldVisible)
    }
    viewport.addEventListener('resize', scheduleUpdate)
    window.addEventListener('focusin', scheduleUpdate)
    window.addEventListener('focusout', scheduleUpdate)
    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener('resize', scheduleUpdate)
      window.removeEventListener('focusin', scheduleUpdate)
      window.removeEventListener('focusout', scheduleUpdate)
    }
  }, [])

  const changePage = (target, motion) => { setDirection(motion); setMessage(''); setPage(target) }
  const previous = () => {
    if (page === 0) return
    if (page === 3 && submitted) changePage(1, 'down')
    else changePage(page - 1, 'down')
  }
  const next = () => {
    if (page === 0) changePage(1, 'up')
    else if (page === 1) changePage(submitted ? 3 : 2, 'up')
    else if (page === 2) void submit()
    else if (page === 3) changePage(4, 'up')
    else changePage(0, 'up')
  }
  const onTouchEnd = (event) => {
    const start = gestureStart.current
    gestureStart.current = null
    if (!start || event.target.closest('input, .wm-dialog')) return
    const distanceX = start.x - event.changedTouches[0].clientX
    const distanceY = start.y - event.changedTouches[0].clientY
    if (page === 3 && Math.abs(distanceX) > 65 && Math.abs(distanceX) > Math.abs(distanceY)) {
      setGalleryPage((current) => Math.min(Math.max(0, Math.ceil(gallery.length / 4) - 1), Math.max(0, current + (distanceX > 0 ? 1 : -1))))
      return
    }
    if (Math.abs(distanceY) < 65 || Math.abs(distanceY) < Math.abs(distanceX)) return
    if (distanceY > 0) next()
    else previous()
  }
  const onWheel = (event) => {
    if (Math.abs(event.deltaY) < 25 || Date.now() - lastWheelAt.current < 650) return
    lastWheelAt.current = Date.now()
    if (event.deltaY > 0) next()
    else previous()
  }
  const onKeyDown = (event) => {
    if (event.target.closest('input, button')) return
    if (event.key === 'ArrowUp' || event.key === 'PageDown') { event.preventDefault(); next() }
    if (event.key === 'ArrowDown' || event.key === 'PageUp') { event.preventDefault(); previous() }
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

  async function submit() {
    if (busy) return
    const cleaned = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
    if (!cleaned.name || !cleaned.gender || !/^1\d{10}$/.test(cleaned.phone) || !cleaned.company || !cleaned.interests) { setMessage('请填写完整且正确的报名信息'); return }
    if (!upload) { setMessage('请先上传生活照'); return }
    if (!authReady) { setMessage(blockedMessage || '请在微信中打开并完成登录'); return }
    setBusy('submit'); setMessage('')
    try {
      await submitProfile(activityKey, { ...cleaned, uploadToken: upload.uploadToken })
      setSubmitted(true)
      await loadGallery()
      changePage(3, 'up')
      setMessage('提交成功')
    } catch (error) { if (error.status === 401) reauth('winter-meet-submit'); setMessage(error.message || '提交失败，请重试') }
    finally { setBusy('') }
  }

  if (!config) return <main className="wm-loading" role="status">{message || '加载中…'}</main>
  const visibleGallery = Array.from({ length: 4 }, (_, index) => gallery[galleryPage * 4 + index])
  return <main className="wm-shell" tabIndex={0} onTouchStart={(event) => { gestureStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }} onTouchEnd={onTouchEnd} onWheel={onWheel} onKeyDown={onKeyDown}>
    <div className="wm-stage" style={{ '--wm-keyboard-shift': `${keyboardShift}px` }}>
      <Art name="shared-heart-background" className="wm-background" />
      <Art name="shared-brand-logo-strip" className="wm-brand" />
      {page === 0 && <section key="cover" className={`wm-scene wm-enter-${direction}`} aria-label="活动封面"><Art name="cover-event-title" className="wm-cover-title" alt="广遇知己 信赴冬约" /></section>}
      {page === 1 && <section key="schedule" className={`wm-scene wm-enter-${direction}`} aria-label="活动流程"><Art name="schedule-event-details" className="wm-event-details" alt="活动时间：12月5日14点至17点；活动地点：环球金融中心1110" /><Art name="schedule-panel" className="wm-schedule-panel" alt="活动流程" /></section>}
      {page === 2 && <section key="form" className={`wm-scene wm-enter-${direction}`} aria-label="基本信息"><form onSubmit={(event) => { event.preventDefault(); void submit() }} noValidate>
        <Art name="form-panel" className="wm-form-panel" />
        <div className="wm-form-fields">
          <label className="wm-form-field"><span>姓名：</span><input name="name" aria-label="姓名" value={form.name} onChange={update} maxLength={100} autoComplete="name" /></label>
          <div className="wm-form-field wm-gender-field" role="group" aria-label="性别"><span>性别：</span><div className="wm-gender-options">{['男', '女', '其他'].map((gender) => <button key={gender} type="button" aria-pressed={form.gender === gender} onClick={() => setForm((current) => ({ ...current, gender }))}>{gender}</button>)}</div></div>
          {fields.map(({ name, label, maxLength, type }) => <label className="wm-form-field" key={name}><span>{label}：</span><input name={name} aria-label={label} value={form[name]} onChange={update} maxLength={maxLength} type={type || 'text'} inputMode={type === 'tel' ? 'numeric' : undefined} autoComplete={name === 'phone' ? 'tel' : 'off'} /></label>)}
          <button className="wm-upload-field" type="button" onClick={() => fileInput.current?.click()} aria-label={upload ? '更换生活照' : '上传生活照'}><span>生活照：</span>{upload ? <><img src={upload.fileUrl} alt="已上传的生活照" /><em>点击更换</em></> : <em>点击上传</em>}<CameraIcon /></button>
        </div>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choosePhoto} />
        <button className="wm-submit" type="submit" disabled={Boolean(busy)}>{busy === 'submit' ? '提交中…' : '提交信息'}</button>
      </form></section>}
      {page === 3 && <section key="gallery" className={`wm-gallery-list wm-enter-${direction}`} aria-label="照片展示">{visibleGallery.map((item, index) => <GalleryCard key={item?.id || `empty-${index}`} item={item} onClick={setSelected} />)}{gallery.length > 4 && <span className="wm-gallery-page">{galleryPage + 1} / {Math.ceil(gallery.length / 4)}</span>}</section>}
      {page === 4 && <section key="ending" className={`wm-scene wm-enter-${direction}`} aria-label="结束页"><Art name="ending-invitation-title" className="wm-ending-title" alt="期待您的光临" /></section>}
      {message && <p className="wm-message" role="status">{message}</p>}
      <Art name="shared-up-arrow" className={page === 2 ? "wm-next wm-next-form" : "wm-next"} alt="上滑进入下一页" />
    </div>
    {selected && <div className="wm-dialog" role="dialog" aria-modal="true" onClick={() => setSelected(null)}><div className="wm-dialog-card" onClick={(event) => event.stopPropagation()}><button onClick={() => setSelected(null)} aria-label="关闭">×</button><img src={selected.photoUrl} alt={`${selected.name}的生活照`} /><p>{selected.name}</p><p>{selected.company}</p><p>{selected.interests}</p></div></div>}
  </main>
}
