import { useState } from 'react'
import { API_BASE_URL, getToken, removeToken } from '../../../shared/api/request'
import { isWechatBrowser, sanitizeUrlForWechat } from '../../../shared/utils/url'

function formatValue(value) {
  if (value === true) return '是'
  if (value === false) return '否'
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

async function clearBrowserCache() {
  if (!window.caches) return false
  const keys = await window.caches.keys()
  await Promise.all(keys.map((key) => window.caches.delete(key)))
  return true
}

function clearZice8LocalState() {
  removeToken()
  sessionStorage.clear()
  Object.keys(localStorage)
    .filter((key) => key.startsWith('zice8_'))
    .forEach((key) => localStorage.removeItem(key))
}

export default function DebugPanel({ activityKey, status, bootstrap, onClose }) {
  const token = getToken()
  const [actionMessage, setActionMessage] = useState('')
  const rows = [
    ['activity_key', activityKey],
    ['微信浏览器', isWechatBrowser()],
    ['token', token ? `${token.slice(0, 8)}...` : '无'],
    ['public-config', status.publicConfigStatus],
    ['auth/me', status.authMeStatus],
    ['bootstrap', status.bootstrapStatus],
    ['hasToken', status.hasToken],
    ['authRequiredAction', status.authRequiredAction],
    ['profileCompleted', status.profileCompleted],
    ['pendingAction', status.pendingAction],
    ['participant 完善', bootstrap ? Boolean(bootstrap.profileCompleted) : '-'],
    ['JS-SDK signature', status.signatureStatus],
    ['wxScriptLoadStatus', status.wxScriptLoadStatus],
    ['wx 存在', status.wxExists],
    ['wx.config 状态', status.wxConfigStatus],
    ['wx.config 错误', status.wxConfigError],
    ['分享已设置', status.shareConfigured],
    ['API Base URL', API_BASE_URL],
    ['签名 URL', status.signingUrl || sanitizeUrlForWechat(window.location.href)],
  ]

  const debugText = rows.map(([label, value]) => `${label}: ${formatValue(value)}`).join('\n')

  async function handleClearCache() {
    const cleared = await clearBrowserCache()
    setActionMessage(cleared ? '缓存已清除' : '当前浏览器不支持 CacheStorage')
  }

  async function handleCopyDebug() {
    try {
      await navigator.clipboard.writeText(debugText)
      setActionMessage('debug 内容已复制')
    } catch {
      setActionMessage('复制失败，请手动选择内容')
    }
  }

  function handleReset() {
    clearZice8LocalState()
    window.location.href = sanitizeUrlForWechat(window.location.href)
  }

  return (
    <section className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-h-[45vh] max-w-[720px] overflow-auto rounded-2xl border border-amber-300 bg-amber-50/95 p-3 text-xs text-slate-800 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-black text-slate-950">微信联调 Debug</h2>
        <button onClick={onClose} className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">关闭debug</button>
      </div>
      <div className="mb-2 grid grid-cols-3 gap-2">
        <button onClick={handleClearCache} className="rounded-lg bg-white px-2 py-1 font-semibold text-slate-700">清除缓存</button>
        <button onClick={handleCopyDebug} className="rounded-lg bg-white px-2 py-1 font-semibold text-slate-700">复制debug</button>
        <button onClick={handleReset} className="rounded-lg bg-red-100 px-2 py-1 font-semibold text-red-700">重置</button>
      </div>
      {actionMessage && <p className="mb-2 rounded-lg bg-white/80 px-2 py-1 text-amber-700">{actionMessage}</p>}
      <div className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[120px_1fr] gap-2 rounded-lg bg-white/70 px-2 py-1">
            <span className="font-semibold text-slate-500">{label}</span>
            <span className="break-all">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
