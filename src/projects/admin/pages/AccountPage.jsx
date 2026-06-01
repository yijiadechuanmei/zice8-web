import { useEffect, useState } from 'react'
import { createAccount, getAccounts } from '../api'

export default function AccountPage() {
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState({ username: '', password: '', nickname: '', role: 'project_admin' })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function loadAccounts() {
    setLoading(true)
    try {
      setAccounts(await getAccounts())
    } catch (err) {
      setMessage(err.message || '账号加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  async function handleCreate(event) {
    event.preventDefault()
    setMessage('')
    try {
      await createAccount(form)
      setForm({ username: '', password: '', nickname: '', role: 'project_admin' })
      await loadAccounts()
    } catch (err) {
      setMessage(err.message || '创建失败')
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-section-head">
        <div>
          <h2>账号管理</h2>
          <p>创建超级管理员或项目子账号</p>
        </div>
      </div>

      <form className="admin-form-grid" onSubmit={handleCreate}>
        <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="账号" />
        <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="初始密码" type="password" />
        <input value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} placeholder="昵称" />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="project_admin">项目子账号</option>
          <option value="super_admin">超级管理员</option>
        </select>
        <button type="submit">创建账号</button>
      </form>

      {message ? <div className="admin-error">{message}</div> : null}
      {loading ? <div className="admin-empty">加载中...</div> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>账号</th>
              <th>昵称</th>
              <th>角色</th>
              <th>状态</th>
              <th>最近登录</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>{account.username}</td>
                <td>{account.nickname || '-'}</td>
                <td>{account.role}</td>
                <td>{account.status}</td>
                <td>{account.lastLoginAt ? account.lastLoginAt.replace('T', ' ').slice(0, 19) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
