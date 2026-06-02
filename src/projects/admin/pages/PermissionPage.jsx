import { useEffect, useMemo, useState } from 'react'
import { getAccount, getAccounts, getDataSchema, updateAccountActivities, updateAccountPermissions } from '../api'

const emptyViewPermission = { canView: false, canExport: false, canSort: false, canSearch: false, fields: {} }
const maskOptions = [
  { value: 'none', label: '不脱敏' },
  { value: 'phone', label: '手机号' },
  { value: 'name', label: '姓名' },
  { value: 'hidden', label: '隐藏' },
]

export default function PermissionPage({ activity, activities }) {
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [schemaActivityKey, setSchemaActivityKey] = useState(activity.activityKey)
  const [schema, setSchema] = useState({ views: [] })
  const [selectedActivityIds, setSelectedActivityIds] = useState([])
  const [permissions, setPermissions] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const projectAccounts = useMemo(() => accounts.filter((account) => account.role === 'project_admin'), [accounts])
  const schemaActivity = useMemo(() => activities.find((item) => item.activityKey === schemaActivityKey) || activity, [activities, activity, schemaActivityKey])
  const summary = useMemo(() => {
    const selectedViews = schema.views.filter((view) => permissions[view.viewKey]?.canView).length
    const selectedFields = schema.views.reduce((count, view) => {
      const fields = permissions[view.viewKey]?.fields || {}
      return count + Object.values(fields).filter((field) => field.canView).length
    }, 0)
    const sensitiveFields = schema.views.reduce((count, view) => count + view.fields.filter((field) => field.sensitive).length, 0)
    return { selectedViews, selectedFields, sensitiveFields }
  }, [permissions, schema.views])

  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([getAccounts(), getDataSchema(schemaActivityKey)])
      .then(([accountList, schemaData]) => {
        if (!alive) return
        setAccounts(accountList)
        setSchema(schemaData)
        setSelectedAccountId((current) => current || accountList.find((account) => account.role === 'project_admin')?.id || '')
      })
      .catch((err) => setMessage(err.message || '权限数据加载失败'))
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [schemaActivityKey])

  useEffect(() => {
    if (!selectedAccountId) return
    getAccount(selectedAccountId)
      .then((account) => {
        setSelectedActivityIds(account.activities.map((item) => item.id))
        const next = {}
        account.tablePermissions.forEach((table) => {
          next[table.viewKey] = { ...emptyViewPermission, canView: table.canView, canExport: table.canExport, canSort: table.canSort, canSearch: table.canSearch, fields: {} }
        })
        account.fieldPermissions.forEach((field) => {
          if (!next[field.viewKey]) next[field.viewKey] = { ...emptyViewPermission, fields: {} }
          next[field.viewKey].fields[field.fieldKey] = {
            canView: field.canView,
            canExport: field.canExport,
            maskType: field.maskType || 'none',
          }
        })
        setPermissions(next)
      })
      .catch((err) => setMessage(err.message || '账号权限加载失败'))
  }, [selectedAccountId])

  function updateViewPermission(viewKey, patch) {
    setPermissions((current) => ({ ...current, [viewKey]: { ...emptyViewPermission, ...(current[viewKey] || {}), ...patch } }))
  }

  function updateFieldPermission(viewKey, fieldKey, patch) {
    setPermissions((current) => {
      const view = current[viewKey] || emptyViewPermission
      return {
        ...current,
        [viewKey]: {
          ...view,
          fields: {
            ...view.fields,
            [fieldKey]: { canView: false, canExport: false, maskType: 'none', ...(view.fields?.[fieldKey] || {}), ...patch },
          },
        },
      }
    })
  }

  function bulkFields(view, mode) {
    const current = permissions[view.viewKey]?.fields || {}
    const nextFields = {}
    view.fields.forEach((field) => {
      const previous = current[field.fieldKey] || {}
      const nextCanView = mode === 'all' ? true : mode === 'clear' ? false : !previous.canView
      nextFields[field.fieldKey] = {
        canView: nextCanView,
        canExport: nextCanView,
        maskType: previous.maskType || field.defaultMaskType || 'none',
      }
    })
    updateViewPermission(view.viewKey, { canView: mode !== 'clear', fields: nextFields })
  }

  async function handleSave() {
    if (!selectedAccountId) return
    setMessage('')
    const payload = schema.views.map((view) => {
      const viewPermission = permissions[view.viewKey] || emptyViewPermission
      return {
        activityId: schemaActivity.id,
        viewKey: view.viewKey,
        canView: Boolean(viewPermission.canView),
        canExport: Boolean(viewPermission.canExport),
        canSort: Boolean(viewPermission.canSort),
        canSearch: Boolean(viewPermission.canSearch),
        fields: view.fields.map((field) => ({
          fieldKey: field.fieldKey,
          canView: Boolean(viewPermission.fields?.[field.fieldKey]?.canView),
          canExport: Boolean(viewPermission.fields?.[field.fieldKey]?.canExport),
          maskType: viewPermission.fields?.[field.fieldKey]?.maskType || null,
        })),
      }
    })
    try {
      await updateAccountActivities(selectedAccountId, selectedActivityIds)
      await updateAccountPermissions(selectedAccountId, payload)
      const account = await getAccount(selectedAccountId)
      setSelectedActivityIds(account.activities.map((item) => item.id))
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
          <p>按活动数据视图配置子账号可见字段、导出、搜索和排序能力</p>
        </div>
        <button className="admin-btn-primary" onClick={handleSave}>保存权限</button>
      </div>

      {message ? <div className={message.includes('失败') || message.includes('错误') ? 'admin-error' : 'admin-success'}>{message}</div> : null}

      <div className="admin-permission-grid">
        <label>
          <span>子账号</span>
          <select value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
            {projectAccounts.map((account) => (
              <option key={account.id} value={account.id}>{account.nickname || account.username}</option>
            ))}
          </select>
        </label>
        <label>
          <span>配置活动</span>
          <select value={schemaActivityKey} onChange={(event) => setSchemaActivityKey(event.target.value)}>
            {activities.map((item) => (
              <option key={item.id} value={item.activityKey}>{item.title} / {item.type}</option>
            ))}
          </select>
        </label>
        <div className="admin-permission-summary">
          <span>已选择 {summary.selectedViews} 个数据视图</span>
          <span>已开放 {summary.selectedFields} 个字段</span>
          <span>{summary.sensitiveFields} 个敏感字段</span>
        </div>
      </div>

      <div className="admin-permission-box">
        <strong>活动授权</strong>
        <div className="admin-activity-checks">
          {activities.map((item) => (
            <label className="admin-check" key={item.id}>
              <input
                type="checkbox"
                checked={selectedActivityIds.includes(item.id)}
                onChange={(event) => {
                  setSelectedActivityIds((current) => event.target.checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id))
                }}
              />
              <span>{item.title}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="admin-permission-list">
        {schema.views.map((view) => {
          const viewPermission = permissions[view.viewKey] || emptyViewPermission
          return (
            <div className="admin-permission-view" key={view.viewKey}>
              <div className="admin-permission-view-head">
                <div>
                  <strong>{view.label}</strong>
                  <p>{view.description}</p>
                </div>
                <label className="admin-check"><input type="checkbox" checked={Boolean(viewPermission.canView)} onChange={(event) => updateViewPermission(view.viewKey, { canView: event.target.checked })} /><span>可查看</span></label>
                <label className="admin-check"><input type="checkbox" checked={Boolean(viewPermission.canExport)} onChange={(event) => updateViewPermission(view.viewKey, { canExport: event.target.checked })} /><span>可导出</span></label>
                <label className="admin-check"><input type="checkbox" checked={Boolean(viewPermission.canSearch)} onChange={(event) => updateViewPermission(view.viewKey, { canSearch: event.target.checked })} /><span>可搜索</span></label>
                <label className="admin-check"><input type="checkbox" checked={Boolean(viewPermission.canSort)} onChange={(event) => updateViewPermission(view.viewKey, { canSort: event.target.checked })} /><span>可排序</span></label>
              </div>
              <div className="admin-field-actions">
                <button onClick={() => bulkFields(view, 'all')}>全选字段</button>
                <button onClick={() => bulkFields(view, 'invert')}>反选字段</button>
                <button onClick={() => bulkFields(view, 'clear')}>清空字段</button>
              </div>
              <div className="admin-field-grid">
                {view.fields.map((field) => {
                  const fieldPermission = viewPermission.fields?.[field.fieldKey] || {}
                  return (
                    <div className="admin-field-row" key={field.fieldKey}>
                      <label className="admin-check">
                        <input type="checkbox" checked={Boolean(fieldPermission.canView)} onChange={(event) => updateFieldPermission(view.viewKey, field.fieldKey, { canView: event.target.checked, canExport: event.target.checked })} />
                        <span>{field.label}</span>
                        {field.sensitive ? <em>敏感</em> : null}
                      </label>
                      <select value={fieldPermission.maskType || field.defaultMaskType || 'none'} onChange={(event) => updateFieldPermission(view.viewKey, field.fieldKey, { maskType: event.target.value })}>
                        {maskOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
