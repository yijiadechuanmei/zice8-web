import { Avatar, Button, Card, Checkbox, Dropdown, Empty, Space, Spin, Table, Tag, Tooltip, Typography } from 'antd'
import { DownOutlined, ExportOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

export function AdminDataViewShell({
  title,
  description,
  views = [],
  activeViewKey = '',
  onChangeView,
  error = '',
  loading = false,
  children,
  emptyDescription = '当前账号没有可查看的数据视图，请联系管理员授权。',
}) {
  return (
    <Card className="admin-card">
      <div className="admin-page-head">
        <div>
          <Title level={4}>{title}</Title>
          <Text type="secondary">{description}</Text>
        </div>
      </div>
      {views.length ? (
        <div className="admin-view-tabs admin-view-tabs--pill">
          {views.map((view) => (
            <Button
              key={view.viewKey}
              type={view.viewKey === activeViewKey ? 'primary' : 'default'}
              onClick={() => onChangeView?.(view.viewKey)}
            >
              {view.label || view.title}
            </Button>
          ))}
        </div>
      ) : null}
      {error ? <div className="admin-inline-error">{error}</div> : null}
      {loading ? <div className="admin-centered-state"><Spin tip="数据加载中..." /></div> : (!views.length ? <Empty description={emptyDescription} /> : children)}
    </Card>
  )
}

export function AdminDataToolbar({ search, showColumns = false, columnOptions = [], selectedColumnKeys = [], onChangeColumns, exportDisabled = true, exporting = false, onExport, exportTooltip = '' }) {
  const columnMenu = {
    items: [
      {
        key: 'columns',
        label: (
          <Checkbox.Group
            className="admin-column-menu"
            value={selectedColumnKeys}
            onChange={onChangeColumns}
            options={columnOptions}
          />
        ),
      },
    ],
  }

  return (
    <div className="admin-data-toolbar">
      <div className="admin-data-toolbar__search">{search || <span />}</div>
      <Space wrap className="admin-data-toolbar__actions">
        <Dropdown menu={columnMenu} trigger={['click']} disabled={!showColumns || !columnOptions.length}>
          <Button icon={<EyeOutlined />}>列显示 <DownOutlined /></Button>
        </Dropdown>
        <Tooltip title={exportTooltip}>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            disabled={exportDisabled}
            loading={exporting}
            onClick={onExport}
          >
            导出 CSV
          </Button>
        </Tooltip>
      </Space>
    </div>
  )
}

export function AdminTableBlock({ toolbar, error, tableProps }) {
  return (
    <div className="admin-data-table-block">
      {toolbar ? toolbar : null}
      {error ? <div className="admin-inline-error">{error}</div> : null}
      <Table
        size="small"
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" /> }}
        {...tableProps}
      />
    </div>
  )
}

export function buildAdminColumnsFromSchema(view, fallbackColumns = [], overrides = {}) {
  const source = fallbackColumns?.length
    ? fallbackColumns.map((column) => ({
        key: column.key,
        fieldKey: column.key,
        label: column.title || column.label,
        title: column.title || column.label,
        width: column.width,
        type: column.type,
        sensitive: column.sensitive,
        sortable: column.sortable,
      }))
    : (view?.fields || [])

  return source.map((field) => {
    const key = field.fieldKey || field.key
    const override = overrides[key] || {}
    return {
      title: (
        <Space size={6}>
          <span>{field.label || field.title}</span>
          {field.sensitive ? <Tag color="orange">敏感</Tag> : null}
        </Space>
      ),
      dataIndex: key,
      key,
      width: override.width || field.width || resolveAdminColumnWidth(field),
      ellipsis: shouldUseEllipsis(field),
      sorter: Boolean(field.sortable && override.sorter !== false),
      sortOrder: override.sortOrder ?? null,
      fixed: override.fixed,
      render: override.render || ((value, row) => renderAdminFieldValue(field, value, row)),
    }
  })
}

export function renderAdminFieldValue(field, value) {
  const key = String(field?.fieldKey || field?.key || '')
  const type = String(field?.type || '')

  if (value === null || value === undefined || value === '') {
    return <Text type="secondary">-</Text>
  }

  if (isImageField(key, type)) {
    const src = String(value)
    return (
      <div className="admin-data-image-cell" title={src}>
        <Avatar
          src={src}
          size={key.toLowerCase().includes('avatar') ? 32 : 40}
          shape={key.toLowerCase().includes('avatar') ? 'circle' : 'square'}
          icon={<UserOutlined />}
          className="admin-table-avatar"
        />
      </div>
    )
  }

  if (key === 'profileCompleted') return value ? <Tag color="green">已完善</Tag> : <Tag color="orange">未完善</Tag>
  if (key === 'status') return renderStatusTag(value)
  if (key === 'type' || key === 'questionType') return renderQuestionTypeTag(value)
  if (key === 'isCorrect') return value ? <Tag color="green">正确</Tag> : <Tag color="red">错误</Tag>
  if (key === 'isTimeout') return value ? <Tag color="orange">是</Tag> : <Tag>否</Tag>
  if (type === 'boolean') return value ? <Tag color="green">是</Tag> : <Tag>否</Tag>
  if (type === 'datetime' || /time|date|at$/i.test(key)) return formatAdminDate(value)
  if (key === 'totalTimeMs' || key === 'timeMs' || key === 'averageTimeMs') return formatAdminDuration(value)
  if (Array.isArray(value)) return value.length ? renderLongText(value.join(' / ')) : <Text type="secondary">-</Text>
  if (typeof value === 'string') return renderLongText(value)
  return String(value)
}

export function formatAdminDate(value) {
  if (!value) return <Text type="secondary">-</Text>
  return String(value).replace('T', ' ').slice(0, 19)
}

function renderLongText(value) {
  return (
    <span className="admin-data-ellipsis" title={value}>
      {value}
    </span>
  )
}

function formatAdminDuration(value) {
  const ms = Number(value || 0)
  if (!ms) return '0.0s'
  return `${(ms / 1000).toFixed(1)}s`
}

function renderStatusTag(value) {
  if (value === 'finished') return <Tag color="green">已完成</Tag>
  if (value === 'in_progress') return <Tag color="blue">进行中</Tag>
  if (value === 1) return <Tag color="green">启用</Tag>
  if (value === 0) return <Tag color="default">禁用</Tag>
  return <Tag>{String(value || '-')}</Tag>
}

function renderQuestionTypeTag(value) {
  if (value === 'single') return <Tag color="blue">单选</Tag>
  if (value === 'multiple') return <Tag color="purple">多选</Tag>
  return <Tag>{value || '-'}</Tag>
}

function isImageField(key, type) {
  return type === 'image' || /avatar|image|headimgurl|displayAvatar|wechatAvatar/i.test(key)
}

function shouldUseEllipsis(field) {
  const key = String(field?.fieldKey || field?.key || '')
  const type = String(field?.type || '')
  return !isImageField(key, type)
}

function resolveAdminColumnWidth(field) {
  const key = String(field?.fieldKey || field?.key || '')
  const type = String(field?.type || '')
  if (/^(id|userId|participantId|attemptId|rank|sort|status)$/i.test(key)) return 108
  if (/time|date|at$/i.test(key) || type === 'datetime') return 180
  if (/phone/i.test(key)) return 140
  if (isImageField(key, type)) return 88
  if (/title|question|content|labels/i.test(key)) return 220
  if (/name|department|category/i.test(key)) return 140
  return 140
}
