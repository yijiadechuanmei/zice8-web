import { useEffect, useRef, useState } from 'react'
import { request } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { castPhoto, getScreen, uploadPhoto } from './api'
import './styles.css'

function Mobile({ activityKey, config }) {
  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, config, { blockSnapshotUser: true })
  const input = useRef(null)
  const busyRef = useRef(false)
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('上传照片后，点击投屏')

  function fail(error) {
    if (error.status === 401 && reauth('photo-screen-expired')) return
    setMessage(error.message || '操作失败，请重试')
  }

  async function selectFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busyRef.current) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024) {
      setMessage('请选择不超过 10MB 的 JPG、PNG 或 WebP 图片')
      return
    }
    busyRef.current = true
    setBusy('upload')
    setProgress(0)
    setMessage('正在上传照片…')
    try {
      // Decode locally before upload so unsupported/corrupt files never become a preview.
      const localUrl = URL.createObjectURL(file)
      try { await loadImage(localUrl) } finally { URL.revokeObjectURL(localUrl) }
      const uploaded = await uploadPhoto(activityKey, file, setProgress)
      setPhoto(uploaded)
      setMessage('上传成功，点击投屏即可在大屏显示')
    } catch (error) { fail(error) } finally { setBusy(''); busyRef.current = false }
  }

  async function cast() {
    if (!photo || busyRef.current) return
    busyRef.current = true
    setBusy('cast')
    try {
      await castPhoto(activityKey, photo.uploadToken)
      setMessage('投屏成功，大屏正在同步照片')
    } catch (error) { fail(error) } finally { setBusy(''); busyRef.current = false }
  }

  return <main className="ps-mobile">
    <header><span className="ps-eyebrow">PHOTO SCREEN</span><h1>照片投屏demo</h1><p>把这一刻，分享至大屏</p></header>
    <div className="ps-preview">
      {photo ? <img src={photo.imageUrl} alt="已上传的照片" onError={() => setMessage('照片预览加载失败，请重新上传')} /> : <div className="ps-placeholder"><span aria-hidden="true">＋</span><p>你的照片将在这里显示</p></div>}
      {busy === 'upload' && <div className="ps-uploading">上传中 {progress}%</div>}
    </div>
    <p className="ps-message" role="status">{blockedMessage || (!authReady ? '正在准备微信登录…' : message)}</p>
    <div className="ps-actions">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={selectFile} />
      <button type="button" disabled={!authReady || Boolean(busy)} onClick={() => input.current?.click()}>上传</button>
      <button type="button" className="ps-primary" disabled={!authReady || !photo || Boolean(busy)} onClick={cast}>{busy === 'cast' ? '投屏中…' : '投屏'}</button>
    </div>
    <p className="ps-note">支持 JPG、PNG、WebP，单张不超过 10MB<br />再次投屏会替换大屏上的照片</p>
  </main>
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const timeout = setTimeout(() => { image.src = ''; reject(new Error('照片加载超时，请重试')) }, 15000)
    image.onload = () => { clearTimeout(timeout); resolve() }
    image.onerror = () => { clearTimeout(timeout); reject(new Error('无法读取照片，请重新上传')) }
    image.src = url
  })
}

function Screen({ activityKey }) {
  const [current, setCurrent] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let stopped = false
    let timer
    let revision = ''
    let controller
    async function poll() {
      controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
      try {
        const data = await getScreen(activityKey, controller.signal)
        clearTimeout(timeout)
        if (stopped) return
        if (data.current && data.current.revision !== revision) {
          await loadImage(data.current.imageUrl)
          if (stopped) return
          revision = data.current.revision
          setCurrent(data.current)
        }
        setError('')
      } catch {
        if (!stopped) setError('连接或照片加载异常，正在重试…')
      } finally {
        clearTimeout(timeout)
        if (!stopped) timer = setTimeout(poll, 1000)
      }
    }
    poll()
    return () => { stopped = true; clearTimeout(timer); controller?.abort() }
  }, [activityKey])
  return <main className="ps-screen">
    {current ? <img key={current.revision} className="ps-screen-photo" src={current.imageUrl} alt="当前投屏照片" /> : <div className="ps-waiting"><span className="ps-eyebrow">PHOTO SCREEN</span><h1>等待照片投屏</h1><p>在手机端上传照片，然后点击「投屏」</p></div>}
    {error && <p className="ps-connection" role="status">{error}</p>}
  </main>
}

export default function PhotoScreen({ routeParams }) {
  const activityKey = routeParams?.activityKey || ''
  const [config, setConfig] = useState(null)
  const [error, setError] = useState('')
  const screen = window.location.pathname.endsWith('/screen')
  useEffect(() => {
    if (screen) return
    let active = true
    request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })
      .then((data) => { if (active) setConfig(data) })
      .catch((e) => { if (active) setError(e.message) })
    return () => { active = false }
  }, [activityKey, screen])
  if (screen) return <Screen activityKey={activityKey} />
  if (!config) return <main className="ps-mobile"><p role="status">{error || '加载中…'}</p></main>
  return <Mobile activityKey={activityKey} config={config} />
}
