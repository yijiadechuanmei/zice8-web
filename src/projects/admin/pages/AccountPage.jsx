import { useEffect, useState } from 'react'
import AdminPasswordInput from '../components/AdminPasswordInput'
import { createAccount, deleteAccount, getAccounts, getAdminMe, updateAccount } from '../api'

const emptyForm = { username: '', password: '', nickname: '', role: 'project_admin' }

export default function AccountPage() {
  const [accounts, setAccounts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ nickname: '', role: 'project_admin', status: 1, password: '' })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function loadAccounts() {
    setLoading(true)
    try {
      const [me, list] = await Promise.all([getAdminMe(), getAccounts()])
      setCurrentUser(me)
      setAccounts(list)
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
      setForm(emptyForm)
      await loadAccounts()
      setMessage('账号已创建')
    } catch (err) {
      setMessage(err.message || '创建失败')
    }
  }

  function startEdit(account) {
    setEditing(account)
    setEditForm({ nickname: account.nickname || '', role: account.role, status: account.status, password: '' })
  }

  async function handleUpdate(event) {
    event.preventDefault()
    if (!editing) return
    setMessage('')
    try {
      if (editForm.password && !window.confirm(`确认重置账号 ${editing.username} 的密码？`)) return
      const payload = { nickname: editForm.nickname, role: editForm.role, status: Number(editForm.status) }
      if (editForm.password) payload.password = editForm.password
      await updateAccount(editing.id, payload)
      setEditing(null)
      await loadAccounts()
      setMessage('账号已更新')
    } catch (err) {
      setMessage(err.message || '更新失败')
    }
  }

  async function handleToggleStatus(account) {
    if (account.id === currentUser?.id) {
      setMessage('不能禁用当前登录账号')
      return
    }
    const nextStatus = account.status === 1 ? 0 : 1
    if (!window.confirm(`确认${nextStatus === 1 ? '启用' : '禁用'}账号 ${account.username}？`)) return
    setMessage('')
    try {
      if (nextStatus === 1) await updateAccount(account.id, { status: 1 })
      else await deleteAccount(account.id)
      await loadAccounts()
      setMessage(nextStatus === 1 ? '账号已启用' : '账号已禁用')
    } catch (err) {
      setMessage(err.message || '操作失败')
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-section-head">
        <div>
          <h2>账号管理</h2>
          <p>新增、修改和禁用后台账号，账号操作会写入操作日志</p>
        </div>
      </div>

      <form className="admin-form-grid account" onSubmit={handleCreate}>
        <label><span>账号</span><input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required /></label>
        <label><span>初始密码</span><AdminPasswordInput value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label>
        <label><span>昵称</span><input value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></label>
        <label>
          <span>角色</span>
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="project_admin">项目子账号</option>
            <option value="super_admin">超级管理员</option>
          </select>
        </label>
        <button className="admin-btn-primary" type="submit">新增账号</button>
      </form>

      {message ? <div className={message.includes('失败') || message.includes('不能') ? 'admin-error' : 'admin-success'}>{message}</div> : null}
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
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>{account.username}</td>
                <td>{account.nickname || '-'}</td>
                <td><span className={`admin-role ${account.role}`}>{account.role}</span></td>
                <td><span className={account.status === 1 ? 'admin-status on' : 'admin-status off'}>{account.status === 1 ? '启用' : '禁用'}</span></td>
                <td>{formatDate(account.lastLoginAt)}</td>
                <td>{formatDate(account.createdAt)}</td>
                <td>
                  <div className="admin-row-actions">
                    <button onClick={() => startEdit(account)}>修改</button>
                    <button className={account.status === 1 ? 'danger' : ''} disabled={account.id === currentUser?.id} onClick={() => handleToggleStatus(account)}>
                      {account.status === 1 ? '禁用' : '启用'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={handleUpdate}>
            <div className="admin-section-head compact">
              <div>
                <h2>修改账号</h2>
                <p>{editing.username}</p>
              </div>
              <button type="button" className="admin-btn-secondary" onClick={() => setEditing(null)}>关闭</button>
            </div>
            <label><span>昵称</span><input value={editForm.nickname} onChange={(event) => setEditForm({ ...editForm, nickname: event.target.value })} /></label>
            <label>
              <span>角色</span>
              <select value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value })}>
                <option value="project_admin">项目子账号</option>
                <option value="super_admin">超级管理员</option>
              </select>
            </label>
            <label>
              <span>状态</span>
              <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: Number(event.target.value) })}>
                <option value={1}>启用</option>
                <option value={0}>禁用</option>
              </select>
            </label>
            <label><span>重置密码</span><AdminPasswordInput value={editForm.password} onChange={(event) => setEditForm({ ...editForm, password: event.target.value })} placeholder="留空则不修改" /></label>
            <button className="admin-btn-primary" type="submit">{editForm.password ? '确认并重置密码' : '保存修改'}</button>
          </form>
        </div>
      ) : null}
    </section>
  )
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}
