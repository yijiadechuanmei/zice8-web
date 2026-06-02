import { useState } from 'react'
import AdminPasswordInput from '../components/AdminPasswordInput'
import { loginAdmin, setAdminToken } from '../api'

export default function LoginPage({ error, onLoginSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(error || '')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!username.trim() || !password) {
      setMessage('请输入账号和密码')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      const data = await loginAdmin({ username: username.trim(), password })
      setAdminToken(data.token)
      await onLoginSuccess()
    } catch (err) {
      setMessage(err.message || '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login">
      <form className="admin-login-panel" onSubmit={handleSubmit}>
        <div>
          <p className="admin-kicker">Zice8 Admin</p>
          <h1>高级管理后台</h1>
          <p>多项目、子账号、数据视图与字段权限管理</p>
        </div>
        <label>
          <span>账号</span>
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" autoComplete="username" />
        </label>
        <label>
          <span>密码</span>
          <AdminPasswordInput value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" autoComplete="current-password" />
        </label>
        {message ? <div className="admin-error">{message}</div> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? '登录中...' : '登录'}
        </button>
      </form>
    </main>
  )
}
