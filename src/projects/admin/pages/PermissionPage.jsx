import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Checkbox, Col, Empty, Row, Select, Space, Spin, Switch, Tag, Typography, message } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { getAccount, getAccounts, getDataSchema, updateAccountActivities, updateAccountPermissions } from '../api'

const emptyViewPermission = { canView: false, canExport: false, canSort: false, canSearch: false, fields: {} }
const maskOptions = [
  { value: 'none', label: '不脱敏' },
  { value: 'phone', label: '手机号' },
  { value: 'name', label: '姓名' },
  { value: 'hidden', label: '隐藏' },
]

const { Text, Title } = Typography

export default function PermissionPage({ activity, activities }) {
  const [accounts, setAccounts] = useState([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [schemaActivityKey, setSchemaActivityKey] = useState(activity.activityKey)
  const [schema, setSchema] = useState({ views: [] })
  const [selectedActivityIds, setSelectedActivityIds] = useState([])
  const [permissions, setPermissions] = useState({})
  const [selectedViewKey, setSelectedViewKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const projectAccounts = useMemo(() => accounts.filter((account) => account.role === 'project_admin'), [accounts])
  const schemaActivity = useMemo(() => activities.find((item) => item.activityKey === schemaActivityKey) || activity, [activities, activity, schemaActivityKey])
  const selectedView = useMemo(() => schema.views.find((view) => view.viewKey === selectedViewKey) || schema.views[0], [schema.views, selectedViewKey])
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
        setSelectedViewKey(schemaData.views?.[0]?.viewKey || '')
        setSelectedAccountId((current) => current || accountList.find((account) => account.role === 'project_admin')?.id || '')
      })
      .catch((err) => message.error(err.message || '权限数据加载失败'))
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
      .catch((err) => message.error(err.message || '账号权限加载失败'))
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
    setSaving(true)
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
          canExport: Boolean(viewPermission.fields?.[field.fieldKey]?.canView),
          maskType: viewPermission.fields?.[field.fieldKey]?.maskType || null,
        })),
      }
    })
    try {
      await updateAccountActivities(selectedAccountId, selectedActivityIds)
      await updateAccountPermissions(selectedAccountId, payload)
      const account = await getAccount(selectedAccountId)
      setSelectedActivityIds(account.activities.map((item) => item.id))
      message.success('权限已保存')
    } catch (err) {
      message.error(err.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="admin-card">
        <div className="admin-centered-state"><Spin tip="权限加载中..." /></div>
      </Card>
    )
  }

  if (!projectAccounts.length) {
    return (
      <Card className="admin-card">
        <Empty description="暂无可配置的项目子账号" />
      </Card>
    )
  }

  const selectedViewPermission = permissions[selectedView?.viewKey] || emptyViewPermission

  return (
    <div className="admin-permission-page">
      <Card className="admin-card">
        <div className="admin-page-head">
          <div>
            <Title level={4}>权限配置</Title>
            <Text type="secondary">按活动数据视图配置子账号可见字段、导出、搜索和排序能力</Text>
          </div>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>保存权限</Button>
        </div>
        <Alert
          type="info"
          showIcon
          message={`已选择 ${summary.selectedViews} 个数据视图，已开放 ${summary.selectedFields} 个字段，当前 schema 包含 ${summary.sensitiveFields} 个敏感字段。`}
        />
      </Card>

      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} xl={6}>
          <Card className="admin-card admin-permission-column" title="账号与活动">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div>
                <Text strong>子账号</Text>
                <Select
                  value={selectedAccountId}
                  onChange={setSelectedAccountId}
                  style={{ width: '100%', marginTop: 8 }}
                  options={projectAccounts.map((account) => ({ value: account.id, label: account.nickname || account.username }))}
                />
              </div>
              <div>
                <Text strong>配置活动</Text>
                <Select
                  value={schemaActivityKey}
                  onChange={setSchemaActivityKey}
                  style={{ width: '100%', marginTop: 8 }}
                  options={activities.map((item) => ({ value: item.activityKey, label: `${item.title} / ${item.type}` }))}
                />
              </div>
              <div>
                <Text strong>活动授权</Text>
                <Checkbox.Group
                  className="admin-activity-checks"
                  value={selectedActivityIds}
                  onChange={(values) => setSelectedActivityIds(values)}
                >
                  {activities.map((item) => (
                    <Checkbox key={item.id} value={item.id}>{item.title}</Checkbox>
                  ))}
                </Checkbox.Group>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={6}>
          <Card className="admin-card admin-permission-column" title="数据视图">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {schema.views.map((view) => {
                const viewPermission = permissions[view.viewKey] || emptyViewPermission
                return (
                  <button
                    type="button"
                    key={view.viewKey}
                    className={`admin-view-card ${selectedView?.viewKey === view.viewKey ? 'is-active' : ''}`}
                    onClick={() => setSelectedViewKey(view.viewKey)}
                  >
                    <span>{view.label}</span>
                    <small>{view.description}</small>
                    <Space size={4} wrap>
                      {viewPermission.canView ? <Tag color="blue">可查看</Tag> : <Tag>未开放</Tag>}
                      {view.fields.some((field) => field.sensitive) ? <Tag color="orange">含敏感字段</Tag> : null}
                    </Space>
                  </button>
                )
              })}
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            className="admin-card admin-permission-column"
            title={selectedView?.label || '字段权限'}
            extra={selectedView ? <Text type="secondary">{selectedView.fields.length} 个字段</Text> : null}
          >
            {selectedView ? (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Space wrap>
                  <Switch checked={Boolean(selectedViewPermission.canView)} onChange={(checked) => updateViewPermission(selectedView.viewKey, { canView: checked })} />
                  <Text>可查看</Text>
                  <Checkbox checked={Boolean(selectedViewPermission.canExport)} onChange={(event) => updateViewPermission(selectedView.viewKey, { canExport: event.target.checked })}>可导出</Checkbox>
                  <Checkbox checked={Boolean(selectedViewPermission.canSearch)} onChange={(event) => updateViewPermission(selectedView.viewKey, { canSearch: event.target.checked })}>可搜索</Checkbox>
                  <Checkbox checked={Boolean(selectedViewPermission.canSort)} onChange={(event) => updateViewPermission(selectedView.viewKey, { canSort: event.target.checked })}>可排序</Checkbox>
                </Space>
                <Text type="secondary">开启导出后，默认导出当前可见字段；不可见字段不会被导出。</Text>
                <Space wrap>
                  <Button size="small" onClick={() => bulkFields(selectedView, 'all')}>全选字段</Button>
                  <Button size="small" onClick={() => bulkFields(selectedView, 'invert')}>反选字段</Button>
                  <Button size="small" danger onClick={() => bulkFields(selectedView, 'clear')}>清空字段</Button>
                </Space>
                <div className="admin-field-list">
                  {selectedView.fields.map((field) => {
                    const fieldPermission = selectedViewPermission.fields?.[field.fieldKey] || {}
                    return (
                      <div className="admin-field-card" key={field.fieldKey}>
                        <Checkbox
                          checked={Boolean(fieldPermission.canView)}
                          onChange={(event) => updateFieldPermission(selectedView.viewKey, field.fieldKey, { canView: event.target.checked, canExport: event.target.checked })}
                        >
                          <Space size={6}>
                            <span>{field.label}</span>
                            <Text type="secondary">{field.fieldKey}</Text>
                            {field.sensitive ? <Tag color="orange">敏感</Tag> : null}
                          </Space>
                        </Checkbox>
                        <Select
                          value={fieldPermission.maskType || field.defaultMaskType || 'none'}
                          onChange={(value) => updateFieldPermission(selectedView.viewKey, field.fieldKey, { maskType: value })}
                          options={maskOptions}
                          style={{ width: 132 }}
                        />
                      </div>
                    )
                  })}
                </div>
              </Space>
            ) : (
              <Empty description="暂无数据视图" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
