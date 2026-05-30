import { API_BASE_URL, getToken } from '../../../shared/api/request'
import { isWechatBrowser, removeUrlHashAndToken } from '../../../shared/utils/url'

function formatValue(value) {
  if (value === true) return '是'
  if (value === false) return '否'
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export default function DebugPanel({ activityKey, status, bootstrap }) {
  const token = getToken()
  const rows = [
    ['activity_key', activityKey],
    ['微信浏览器', isWechatBrowser()],
    ['token', token ? `${token.slice(0, 8)}...` : '无'],
    ['public-config', status.publicConfigStatus],
    ['auth/me', status.authMeStatus],
    ['bootstrap', status.bootstrapStatus],
    ['participant 完善', bootstrap ? Boolean(bootstrap.profileCompleted) : '-'],
    ['JS-SDK signature', status.signatureStatus],
    ['wxScriptLoadStatus', status.wxScriptLoadStatus],
    ['wx 存在', status.wxExists],
    ['wx.config 状态', status.wxConfigStatus],
    ['wx.config 错误', status.wxConfigError],
    ['分享已设置', status.shareConfigured],
    ['API Base URL', API_BASE_URL],
    ['签名 URL', status.signingUrl || removeUrlHashAndToken(window.location.href)],
  ]

  return (
    <section className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-h-[45vh] max-w-[720px] overflow-auto rounded-2xl border border-amber-300 bg-amber-50/95 p-3 text-xs text-slate-800 shadow-2xl">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-black text-slate-950">微信联调 Debug</h2>
        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold">debug=1</span>
      </div>
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
