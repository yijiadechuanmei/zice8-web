import { useState } from 'react'

function formatDateTime(value) {
  if (!value) return ''

  if (typeof value === 'string') {
    const normalized = value.trim()
    // video-rank 评论 createdAt 当前按业务北京时间展示，后端可能返回带 Z 的 ISO 字符串，
    // 但这里不做时区转换，只做字符串格式化，避免显示晚 8 小时。
    const dateTime = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/)
    if (dateTime) {
      const [, , month, day, hour, minute] = dateTime
      return `${month}-${day} ${hour}:${minute}`
    }
    return normalized
  }

  return String(value)
}

export default function CommentBox({ comments, loading, onSubmit }) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    const trimmedContent = content.trim()
    if (!trimmedContent) return setError('请输入留言内容')
    if (trimmedContent.length < 30) return setError('观后感不少于30字')
    setSubmitting(true)
    try {
      await onSubmit(trimmedContent)
      setContent('')
    } catch (err) {
      setError(err.message || '留言失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">学习观后感</h3>
      <label htmlFor="video-rank-comment" className="sr-only">留言内容</label>
      <textarea id="video-rank-comment" className="mt-3 min-h-28 w-full rounded-2xl border border-slate-200 p-3 text-base outline-none transition-colors duration-200 focus:border-rose-500" maxLength={500} value={content} onChange={(e) => setContent(e.target.value)} placeholder="观后感不少于30字" />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button onClick={submit} disabled={submitting} className="mt-3 min-h-11 w-full rounded-2xl bg-rose-600 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-rose-500 disabled:opacity-60">{submitting ? '提交中...' : '提交留言'}</button>
      <div className="mt-5 space-y-4">
        {loading && <p className="text-sm text-slate-400">留言加载中...</p>}
        {!loading && comments.map((item) => (
          <div key={item.id} className="flex gap-3 border-t border-slate-100 pt-4">
            <img src={item.user?.avatar || '/vite.svg'} alt="" className="h-10 w-10 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-slate-800">{item.user?.nickname || item.participant?.name || '匿名用户'}</p>
                <time className="shrink-0 text-xs text-slate-400">{formatDateTime(item.createdAt)}</time>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{item.content}</p>
            </div>
          </div>
        ))}
        {!loading && !comments.length && <p className="text-sm text-slate-400">暂无留言</p>}
      </div>
    </section>
  )
}
