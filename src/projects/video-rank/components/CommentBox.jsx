import { useState } from 'react'

function formatCommentTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CommentBox({ comments, loading, onSubmit }) {
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (!content.trim()) return setError('请输入留言内容')
    setSubmitting(true)
    try {
      await onSubmit(content.trim())
      setContent('')
    } catch (err) {
      setError(err.message || '留言失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-5 rounded-3xl bg-white p-4 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">留言</h3>
      <label htmlFor="video-rank-comment" className="sr-only">留言内容</label>
      <textarea id="video-rank-comment" className="mt-3 min-h-28 w-full rounded-2xl border border-slate-200 p-3 text-base outline-none transition-colors duration-200 focus:border-rose-500" maxLength={500} value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下你的留言" />
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
                <time className="shrink-0 text-xs text-slate-400">{formatCommentTime(item.createdAt)}</time>
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
