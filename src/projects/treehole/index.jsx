import { useEffect, useRef, useState } from 'react'
import { request } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import html from './template.html?raw'

export default function TreeholeProject({ routeParams }) {
  const key = routeParams?.activityKey || 'yibao'
  const frame = useRef(null)
  const [config, setConfig] = useState(null)
  const { authReady, blockedMessage } = useWechatAuth(key, config)
  useEffect(() => { request(`/activities/${encodeURIComponent(key)}/public-config`, { skipAuth: true }).then(setConfig).catch(() => {}) }, [key])
  useEffect(() => {
    if (!authReady) return
    const send = (data) => frame.current?.contentWindow?.postMessage({ source: 'yibao-parent', ...data }, location.origin)
    const onMessage = async (event) => {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow || event.data?.source !== 'yibao-treehole') return
      try {
        if (event.data.action === 'list') send({ action: 'notes', notes: await request(`/treehole/activities/${encodeURIComponent(key)}/my-notes`) })
        if (event.data.action === 'submit') send({ action: 'saved', note: await request(`/treehole/activities/${encodeURIComponent(key)}/notes`, { method: 'POST', body: JSON.stringify(event.data.payload) }) })
      } catch (error) { send({ action: 'error', message: error.message }) }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [authReady, key])
  if (blockedMessage) return <p>{blockedMessage}</p>
  if (!authReady) return <p>正在验证微信身份…</p>
  return <iframe ref={frame} title="怡宝小树洞" srcDoc={html} onLoad={async () => {
    try {
      const notes = await request(`/treehole/activities/${encodeURIComponent(key)}/my-notes`)
      frame.current?.contentWindow?.postMessage({ source: 'yibao-parent', action: 'notes', notes }, location.origin)
    } catch { /* The list can be retried from the notes button. */ }
  }} style={{ border: 0, width: '100%', height: '100dvh', display: 'block' }} />
}
