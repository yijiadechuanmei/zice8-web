import { useState } from 'react'

export default function ProfileModal({ initialParticipant, onSubmit }) {
  const [form, setForm] = useState({
    name: initialParticipant?.name || '',
    department: initialParticipant?.department || '',
    phone: initialParticipant?.phone || '',
    groupName: initialParticipant?.groupName || '',
    className: initialParticipant?.className || '',
    extraJson: initialParticipant?.extraJson || {},
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const name = form.name.trim()
    const department = form.department.trim()
    if (!name || !department) {
      setError('请填写姓名和部门')
      return
    }
    setLoading(true)
    try {
      await onSubmit({
        name,
        department,
        phone: form.phone.trim(),
        groupName: form.groupName.trim(),
        className: form.className.trim(),
        extraJson: form.extraJson,
      })
    } catch (err) {
      setError(err.message || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-5">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-950">完善参与信息</h2>
        <p className="mt-2 text-sm text-slate-500">填写后才能观看视频、留言和查看排行榜。</p>
        <label className="mt-5 block text-sm font-semibold text-slate-700">姓名</label>
        <input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900" maxLength={50} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label className="mt-4 block text-sm font-semibold text-slate-700">部门</label>
        <input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900" maxLength={100} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        <label className="mt-4 block text-sm font-semibold text-slate-700">手机（可选）</label>
        <input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-slate-950 py-3 font-semibold text-white disabled:opacity-60">{loading ? '提交中...' : '提交并进入'}</button>
      </form>
    </div>
  )
}
