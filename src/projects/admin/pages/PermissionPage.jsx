import { useEffect, useMemo, useState } from 'react'
import { getAccount, getAccounts, getDataViews, updateAccountActivities, updateAccountPermissions } from '../api'

export default function PermissionPage({ activity, activities }) {
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [views, setViews] = useState([])
  const [selectedActivityIds, setSelectedActivityIds] = useState([])
  const [permissions, setPermissions] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const projectAccounts = useMemo(() => accounts.filter((account) => account.role === 'project_admin'), [accounts])

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([getAccounts(), getDataViews(activity.activityKey)])
      .then(([accountList, viewList]) => {
        if (!alive) return
        setAccounts(accountList)
        setViews(viewList)
        setSelectedAccountId(accountList.find((account) => account.role === 'project_admin')?.id || '')
      })
      .catch((err) => setMessage(err.message || '权限数据加载失败'))
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activity.activityKey])

  useEffect(() => {
    if (!selectedAccountId) return
    getAccount(selectedAccountId)
      .then((account) => {
        setSelectedActivityIds(account.activities.map((item) => item.id))
        const next = {}
        account.tablePermissions.forEach((table) => {
          next[table.viewKey] = {
            canView: table.canView,
            canExport: table.canExport,
            canSort: table.canSort,
            canSearch: table.canSearch,
            fields: {},
          }
        })
        account.fieldPermissions.forEach((field) => {
          if (!next[field.viewKey]) next[field.viewKey] = { canView: false, canExport: false, canSort: false, canSearch: false, fields: {} }
          next[field.viewKey].fields[field.fieldKey] = {
            canView: field.canView,
            canExport: field.canExport,
            maskType: field.maskType || '',
          }
        })
        setPermissions(next)
      })
      .catch((err) => setMessage(err.message || '账号权限加载失败'))
  }, [selectedAccountId])

  function updateViewPermission(viewKey, patch) {
    setPermissions((current) => ({
      ...current,
      [viewKey]: {
        canView: false,
        canExport: false,
        canSort: false,
        canSearch: false,
        fields: {},
        ...(current[viewKey] || {}),
        ...patch,
      },
    }))
  }

  function updateFieldPermission(viewKey, fieldKey, patch) {
    setPermissions((current) => {
      const view = current[viewKey] || { canView: false, canExport: false, canSort: false, canSearch: false, fields: {} }
      return {
        ...current,
        [viewKey]: {
          ...view,
          fields: {
            ...view.fields,
            [fieldKey]: {
              canView: false,
              canExport: false,
              maskType: '',
              ...(view.fields?.[fieldKey] || {}),
              ...patch,
            },
          },
        },
      }
    })
  }

  async function handleSave() {
    if (!selectedAccountId) return
    setMessage('')
    const payload = views.map((view) => {
      const viewPermission = permissions[view.viewKey] || { fields: {} }
      return {
        activityId: activity.id,
        viewKey: view.viewKey,
        canView: Boolean(viewPermission.canView),
        canExport: Boolean(viewPermission.canExport),
        canSort: Boolean(viewPermission.canSort),
        canSearch: Boolean(viewPermission.canSearch),
        fields: view.fields.map((field) => ({
          fieldKey: field.key,
          canView: Boolean(viewPermission.fields?.[field.key]?.canView),
          canExport: Boolean(viewPermission.fields?.[field.key]?.canExport),
          maskType: viewPermission.fields?.[field.key]?.maskType || null,
        })),
      }
    })
    try {
      await updateAccountActivities(selectedAccountId, selectedActivityIds)
      await updateAccountPermissions(selectedAccountId, payload)
      setMessage('权限已保存')
    } catch (err) {
      setMessage(err.message || '保存失败')
    }
  }

  if (loading) return <div className="admin-panel">权限加载中...</div>

  return (
    <section className="admin-panel">
      <div className="admin-section-head">
        <div>
          <h2>权限配置</h2>
          <p>配置子账号可访问活动、数据视图和字段</p>
        </div>
        <button onClick={handleSave}>保存权限</button>
      </div>

      {message ? <div className={message.includes('失败') ? 'admin-error' : 'admin-success'}>{message}</div> : null}

      <div className="admin-permission-grid">
        <label>
          <span>子账号</span>
          <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
            {projectAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.nickname || account.username}
              </option>
            ))}
          </select>
        </label>

        <div className="admin-permission-box">
          <strong>活动授权</strong>
          {activities.map((item) => (
            <label className="admin-check" key={item.id}>
              <input
                type="checkbox"
                checked={selectedActivityIds.includes(item.id)}
                onChange={(event) => {
                  setSelectedActivityIds((current) =>
                    event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id),
                  )
                }}
              />
              <span>{item.title}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="admin-permission-list">
        {views.map((view) => {
          const viewPermission = permissions[view.viewKey] || { fields: {} }
          return (
            <div className="admin-permission-view" key={view.viewKey}>
              <div className="admin-permission-view-head">
                <strong>{view.title}</strong>
                <label className="admin-check">
                  <input type="checkbox" checked={Boolean(viewPermission.canView)} onChange={(event) => updateViewPermission(view.viewKey, { canView: event.target.checked })} />
                  <span>可查看</span>
                </label>
                <label className="admin-check">
                  <input type="checkbox" checked={Boolean(viewPermission.canExport)} onChange={(event) => updateViewPermission(view.viewKey, { canExport: event.target.checked })} />
                  <span>可导出</span>
                </label>
                <label className="admin-check">
                  <input type="checkbox" checked={Boolean(viewPermission.canSearch)} onChange={(event) => updateViewPermission(view.viewKey, { canSearch: event.target.checked })} />
                  <span>可搜索</span>
                </label>
                <label className="admin-check">
                  <input type="checkbox" checked={Boolean(viewPermission.canSort)} onChange={(event) => updateViewPermission(view.viewKey, { canSort: event.target.checked })} />
                  <span>可排序</span>
                </label>
              </div>
              <div className="admin-field-grid">
                {view.fields.map((field) => {
                  const fieldPermission = viewPermission.fields?.[field.key] || {}
                  return (
                    <div className="admin-field-row" key={field.key}>
                      <label className="admin-check">
                        <input type="checkbox" checked={Boolean(fieldPermission.canView)} onChange={(event) => updateFieldPermission(view.viewKey, field.key, { canView: event.target.checked })} />
                        <span>{field.label}</span>
                      </label>
                      <select value={fieldPermission.maskType || ''} onChange={(event) => updateFieldPermission(view.viewKey, field.key, { maskType: event.target.value })}>
                        <option value="">不脱敏</option>
                        <option value="phone">手机号脱敏</option>
                        <option value="name">姓名脱敏</option>
                        <option value="partial">部分脱敏</option>
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
