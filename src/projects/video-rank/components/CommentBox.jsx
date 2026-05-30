import { useState } from 'react'

export default function CommentBox({ comments, onSubmit }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (!content.trim()) return setError('请输入留言内容')
    setLoading(true)
    try {
      await onSubmit(content.trim())
      setContent('')
    } catch (err) {
      setError(err.message || '留言失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mt-5 rounded-3xl bg-white p-4 shadow-sm">
      <h3 className="font-bold text-slate-950">留言</h3>
      <textarea className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 p-3 outline-none focus:border-slate-900" maxLength={500} value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下你的留言" />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button onClick={submit} disabled={loading} className="mt-3 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? '提交中...' : '提交留言'}</button>
      <div className="mt-5 space-y-4">
        {comments.map((item) => (
          <div key={item.id} className="flex gap-3 border-t border-slate-100 pt-4">
            <img src={item.user.avatar || '/vite.svg'} className="h-10 w-10 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">{item.user.nickname || item.participant.name || '匿名用户'}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">{item.content}</p>
            </div>
          </div>
        ))}
        {!comments.length && <p className="text-sm text-slate-400">暂无留言</p>}
      </div>
    </section>
  )
}
