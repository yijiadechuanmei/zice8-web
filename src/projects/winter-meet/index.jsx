import { useCallback, useEffect, useRef, useState } from 'react'
import { request } from '../../shared/api/request'
import { trackPageView } from '../../shared/analytics'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import { getGallery, getMine, submitProfile, uploadPhoto } from './api'
import CropDialog from './CropDialog.jsx'
import { visibleGallery } from './mockGallery.js'
import './style.css'

const TYPE = 'winter_meet'
const KEY = 'gyzy26'
const PHOTO_RATIO = 371 / 287
const EMPTY_BGM = {}
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

function GalleryIcons() {
  return <div className="wm-card-icons" aria-hidden="true">
    <svg className="wm-heart-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.2 2.8 12.5C-2 7.8 4.9.9 9.7 5.4L12 7.6l2.3-2.2c4.8-4.5 11.7 2.4 6.9 7.1z" /></svg>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 20l1-4.1A8.5 8.5 0 1 1 20 11.5z" /></svg>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinejoin="round"><path d="M2 4 22 3l-8 19-3-8zM11 14 22 3" /></svg>
  </div>
}

function GalleryCard({ item, onPhotoClick }) {
  return <article className="wm-card">
    {item
      ? <button className="wm-card-photo-button" type="button" onClick={() => onPhotoClick(item.photoUrl)} aria-label={`放大${item.name}的照片`}><img src={item.photoUrl} alt={`${item.name}的生活照`} loading="lazy" decoding="async" /></button>
      : <div className="wm-card-photo-empty">暂无照片</div>}
    <GalleryIcons />
    {[['姓名', item?.name], ['单位', item?.company], ['兴趣爱好', item?.interests]].map(([label, value]) => <div className="wm-card-row" key={label}><strong>{label}：</strong><span className="wm-card-line">{value || ''}</span></div>)}
  </article>
}

function CameraIcon() {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 10h5l2-3h10l2 3h5v16H4z" /><circle cx="16" cy="18" r="5" /></svg>
}

export default function WinterMeet({ routeParams }) {
  const activityKey = routeParams?.activityKey || KEY
  const debugMode = new URLSearchParams(window.location.search).has('debug')
  const [config, setConfig] = useState(null)
  const [page, setPage] = useState(() => window.location.pathname.endsWith('/gallery') ? 3 : 0)
  const [direction, setDirection] = useState('up')
  const [form, setForm] = useState(initialForm)
  const [upload, setUpload] = useState(null)
  const [gallery, setGallery] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState('')
  const [cropSource, setCropSource] = useState(null)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [keyboardShift, setKeyboardShift] = useState(0)
  const fileInput = useRef(null)
  const cropImage = useRef(null)
  const cropUrl = useRef('')
  const gestureStart = useRef(null)
  const lastWheelAt = useRef(0)
  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, config)
  const shownGallery = visibleGallery(gallery, debugMode ? '' : form.gender)

  useEffect(() => () => { if (cropUrl.current) URL.revokeObjectURL(cropUrl.current) }, [])
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 1500)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    let alive = true
    request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })
      .then((data) => { if (alive) { setConfig(data); trackPageView(activityKey, '/winter-meet', { activityType: TYPE }) } })
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

  const changePage = (target, motion) => { setDirection(motion); setPage(target) }
  const previous = () => {
    if (page === 0) return
    if (page === 3 && (submitted || debugMode)) changePage(1, 'down')
    else changePage(page - 1, 'down')
  }
  const next = () => {
    if (page === 0) changePage(1, 'up')
    else if (page === 1) changePage(submitted || debugMode ? 3 : 2, 'up')
    else if (page === 2) void submit()
    else if (page === 3) changePage(4, 'up')
    else changePage(0, 'up')
  }
  const onTouchEnd = (event) => {
    const start = gestureStart.current
    gestureStart.current = null
    if (!start || message || cropSource || selectedPhoto || event.target.closest('input, .wm-gallery-list, .wm-crop-dialog, .wm-photo-preview')) return
    const distanceX = start.x - event.changedTouches[0].clientX
    const distanceY = start.y - event.changedTouches[0].clientY
    if (Math.abs(distanceY) < 65 || Math.abs(distanceY) < Math.abs(distanceX)) return
    if (distanceY > 0) next()
    else previous()
  }
  const onWheel = (event) => {
    if (message || cropSource || selectedPhoto || event.target.closest('.wm-gallery-list')) return
    if (Math.abs(event.deltaY) < 25 || Date.now() - lastWheelAt.current < 650) return
    lastWheelAt.current = Date.now()
    if (event.deltaY > 0) next()
    else previous()
  }
  const onKeyDown = (event) => {
    if (message || cropSource || selectedPhoto) return
    if (event.target.closest('input, button')) return
    if (event.key === 'ArrowUp' || event.key === 'PageDown') { event.preventDefault(); next() }
    if (event.key === 'ArrowDown' || event.key === 'PageUp') { event.preventDefault(); previous() }
  }
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  function closeCrop() {
    setCropSource(null)
    cropImage.current = null
    if (cropUrl.current) URL.revokeObjectURL(cropUrl.current)
    cropUrl.current = ''
  }

  function choosePhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if ((!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) || file.size > 20 * 1024 * 1024 || !file.size) { setMessage('请选择不超过 20MB 的图片'); return }
    if (!authReady) { setMessage(blockedMessage || '请在微信中打开并完成登录'); return }
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      cropUrl.current = url
      cropImage.current = image
      setCropSource({ url, width: image.naturalWidth, height: image.naturalHeight })
      setMessage('')
    }
    image.onerror = () => { URL.revokeObjectURL(url); setMessage('图片无法读取，请换一张') }
    image.src = url
  }

  async function confirmCrop(geometry) {
    if (!cropImage.current || busy) return
    setBusy('upload'); setMessage('正在上传照片…')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 742
      canvas.height = Math.round(canvas.width / PHOTO_RATIO)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('当前浏览器无法裁切图片')
      const factor = canvas.width / geometry.frameWidth
      context.drawImage(cropImage.current,
        ((geometry.frameWidth - geometry.imageWidth) / 2 + geometry.x) * factor,
        ((geometry.frameHeight - geometry.imageHeight) / 2 + geometry.y) * factor,
        geometry.imageWidth * factor, geometry.imageHeight * factor)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) throw new Error('照片裁切失败，请重试')
      const file = new File([blob], 'winter-meet-photo.jpg', { type: 'image/jpeg' })
      const result = await uploadPhoto(activityKey, file, (progress) => setMessage(`照片上传中 ${progress}%`))
      setUpload(result)
      closeCrop()
      setMessage('照片已上传')
    }
    catch (error) { if (error.status === 401) reauth('winter-meet-upload'); setMessage(error.message || '上传失败') }
    finally { setBusy('') }
  }

  async function submit() {
    if (busy) return
    const cleaned = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]))
    if (!cleaned.name || !['男', '女'].includes(cleaned.gender) || !/^1\d{10}$/.test(cleaned.phone) || !cleaned.company || !cleaned.interests) { setMessage('请填写完整且正确的报名信息'); return }
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
  return <main className="wm-shell" tabIndex={0} onTouchStart={(event) => { gestureStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY } }} onTouchEnd={onTouchEnd} onWheel={onWheel} onKeyDown={onKeyDown}>
    <div className="wm-stage" style={{ '--wm-keyboard-shift': `${keyboardShift}px` }}>
      <Art name="shared-heart-background" className="wm-background" />
      <Art key={`brand-${page}`} name="shared-brand-logo-strip" className={`wm-brand wm-brand-enter-${direction}`} />
      {page === 0 && <section key="cover" className={`wm-scene wm-enter-${direction}`} aria-label="活动封面"><Art name="cover-event-title" className="wm-cover-title" alt="广遇知己 信赴冬约" /></section>}
      {page === 1 && <section key="schedule" className={`wm-scene wm-enter-${direction}`} aria-label="活动流程"><Art name="schedule-event-details" className="wm-event-details" alt="活动时间：12月5日14点至17点；活动地点：环球金融中心1110" /><Art name="schedule-panel" className="wm-schedule-panel" alt="活动流程" /></section>}
      {page === 2 && <section key="form" className={`wm-scene wm-enter-${direction}`} aria-label="基本信息"><form onSubmit={(event) => { event.preventDefault(); void submit() }} noValidate>
        <Art name="form-panel" className="wm-form-panel" />
        <div className="wm-form-fields">
          <label className="wm-form-field"><span>姓名：</span><input name="name" aria-label="姓名" value={form.name} onChange={update} maxLength={100} autoComplete="name" /></label>
          <div className="wm-form-field wm-gender-field" role="group" aria-label="性别"><span>性别：</span><div className="wm-gender-options">{['男', '女'].map((gender) => <button key={gender} type="button" aria-pressed={form.gender === gender} onClick={() => setForm((current) => ({ ...current, gender }))}>{gender}</button>)}</div></div>
          {fields.map(({ name, label, maxLength, type }) => <label className="wm-form-field" key={name}><span>{label}：</span><input name={name} aria-label={label} value={form[name]} onChange={update} maxLength={maxLength} type={type || 'text'} inputMode={type === 'tel' ? 'numeric' : undefined} autoComplete={name === 'phone' ? 'tel' : 'off'} /></label>)}
          <button className="wm-upload-field" type="button" onClick={() => fileInput.current?.click()} aria-label={upload ? '更换生活照' : '上传生活照'}><span>生活照：</span>{upload ? <><img src={upload.fileUrl} alt="已上传的生活照" /><em>点击更换</em></> : <em>点击上传</em>}<CameraIcon /></button>
        </div>
        <input ref={fileInput} type="file" accept="image/*,.heic,.heif" hidden onChange={choosePhoto} />
        <button className="wm-submit" type="submit" disabled={Boolean(busy)} aria-label={busy === 'submit' ? '提交中' : '提交信息'}><Art name="form-submit-success-button" alt="" /></button>
      </form></section>}
      {page === 3 && <section key="gallery" className={`wm-gallery-list wm-enter-${direction}`} aria-label="照片展示">{shownGallery.map((item) => <GalleryCard key={item.id} item={item} onPhotoClick={setSelectedPhoto} />)}</section>}
      {page === 4 && <section key="ending" className={`wm-scene wm-enter-${direction}`} aria-label="结束页"><Art name="ending-invitation-title" className="wm-ending-title" alt="期待您的光临" /></section>}
    </div>
    <div key={`next-${page}`} className="wm-next-anchor"><Art name="shared-up-arrow" className="wm-next" alt="上滑进入下一页" /></div>
    {cropSource && <CropDialog source={cropSource} busy={busy === 'upload'} onCancel={closeCrop} onConfirm={confirmCrop} />}
    {selectedPhoto && <button className="wm-photo-preview" type="button" onClick={() => setSelectedPhoto('')} aria-label="关闭照片预览"><img src={selectedPhoto} alt="放大的生活照" /></button>}
    {message && <div className="wm-toast-mask" role="alertdialog" aria-modal="true" aria-label={message}><p className="wm-toast">{message}</p></div>}
    <div hidden={Boolean(cropSource || selectedPhoto)}>
      <ActivityBgmPlayer bgm={config.bgmConfig || EMPTY_BGM} activityKey={activityKey} />
    </div>
  </main>
}
