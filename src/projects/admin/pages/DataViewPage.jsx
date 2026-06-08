import { useEffect, useMemo, useState } from 'react'
import { Avatar, Button, Card, Checkbox, Dropdown, Empty, Input, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { DownOutlined, ExportOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons'
import { exportDataRows, getDataRows, getDataSchema } from '../api'
import QuizAdminDataPage from './QuizAdminDataPage'

const { Text, Title } = Typography
const pageSize = 20

export default function DataViewPage({ activity }) {
  return activity.type === 'quiz' ? <QuizAdminDataPage activity={activity} /> : <GenericDataViewPage activity={activity} />
}

function GenericDataViewPage({ activity }) {
  const [views, setViews] = useState([])
  const [activeViewKey, setActiveViewKey] = useState('')
  const [hiddenColumns, setHiddenColumns] = useState({})
  const [data, setData] = useState({ columns: [], rows: [], pagination: { page: 1, pageSize, total: 0 } })
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [schemaLoading, setSchemaLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setSchemaLoading(true)
    setError('')
    setViews([])
    setActiveViewKey('')
    getDataSchema(activity.activityKey)
      .then((schema) => {
        if (!alive) return
        setViews(schema.views || [])
        setActiveViewKey(schema.views?.[0]?.viewKey || '')
        setHiddenColumns({})
        setPage(1)
      })
      .catch((err) => {
        if (alive) setError(err.message || '数据视图加载失败')
      })
      .finally(() => {
        if (alive) setSchemaLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activity.activityKey])

  useEffect(() => {
    if (!activeViewKey) {
      setData({ columns: [], rows: [], pagination: { page: 1, pageSize, total: 0 } })
      return
    }
    let alive = true
    setLoading(true)
    setError('')
    getDataRows(activity.activityKey, activeViewKey, {
      page: String(page),
      pageSize: String(pageSize),
      keyword,
      sortField,
      sortOrder,
    })
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err.message || '数据加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activity.activityKey, activeViewKey, page, keyword, sortField, sortOrder])

  const activeView = useMemo(() => views.find((view) => view.viewKey === activeViewKey), [views, activeViewKey])
  const visibleColumns = useMemo(() => data.columns.filter((column) => !hiddenColumns[column.key]), [data.columns, hiddenColumns])
  const tableColumns = useMemo(
    () =>
      visibleColumns.map((column) => ({
        title: (
          <Space size={6}>
            <span>{column.title}</span>
            {column.sensitive ? <Tag color="orange">敏感</Tag> : null}
          </Space>
        ),
        dataIndex: column.key,
        key: column.key,
        sorter: Boolean(column.sortable),
        sortOrder: sortField === column.key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
        render: (value, row) => formatCell(value, column, row),
      })),
    [sortField, sortOrder, visibleColumns],
  )

  async function handleExport() {
    if (!activeViewKey || !activeView?.canExport) return
    setExporting(true)
    setError('')
    try {
      const result = await exportDataRows(activity.activityKey, activeViewKey, { keyword, sortField, sortOrder })
      downloadCsv(result.filename || `${activity.activityKey}-${activeViewKey}.csv`, result.csv || '')
      message.success('CSV 已导出')
    } catch (err) {
      const text = err.message || '导出失败'
      setError(text)
      message.error(text)
    } finally {
      setExporting(false)
    }
  }

  function handleTableChange(pagination, filters, sorter) {
    if (pagination?.current !== page) setPage(pagination.current || 1)
    if (sorter?.field) {
      setSortField(sorter.order ? sorter.field : '')
      setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc')
      setPage(1)
    }
  }

  const columnMenu = {
    items: [
      {
        key: 'columns',
        label: (
          <Checkbox.Group
            className="admin-column-menu"
            value={data.columns.filter((column) => !hiddenColumns[column.key]).map((column) => column.key)}
            onChange={(keys) => {
              const selected = new Set(keys)
              setHiddenColumns(Object.fromEntries(data.columns.map((column) => [column.key, !selected.has(column.key)])))
            }}
            options={data.columns.map((column) => ({ label: column.title, value: column.key }))}
          />
        ),
      },
    ],
  }

  return (
    <Card className="admin-card">
      <div className="admin-page-head">
        <div>
          <Title level={4}>数据表</Title>
          <Text type="secondary">{activeView?.description || '选择一个授权数据视图'}</Text>
        </div>
        <Space wrap>
          <Input.Search
            allowClear
            prefix={<SearchOutlined />}
            placeholder="输入关键词"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
            onSearch={(value) => {
              setKeyword(value)
              setPage(1)
            }}
            style={{ width: 260 }}
          />
          <Dropdown menu={columnMenu} trigger={['click']} disabled={!data.columns.length}>
            <Button icon={<EyeOutlined />}>列显示 <DownOutlined /></Button>
          </Dropdown>
          <Tooltip title={!activeView?.canExport ? '当前账号无导出权限' : ''}>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              disabled={!activeViewKey || !activeView?.canExport}
              loading={exporting}
              onClick={handleExport}
            >
              导出 CSV
            </Button>
          </Tooltip>
        </Space>
      </div>

      <div className="admin-view-tabs">
        {views.map((view) => (
          <Button
            key={view.viewKey}
            type={view.viewKey === activeViewKey ? 'primary' : 'default'}
            onClick={() => {
              setActiveViewKey(view.viewKey)
              setPage(1)
              setSortField('')
              setHiddenColumns({})
            }}
          >
            {view.label || view.title}
          </Button>
        ))}
      </div>

      {error ? <div className="admin-inline-error">{error}</div> : null}

      <Table
        rowKey={(row, index) => row.id ?? row.participantId ?? `${activeViewKey}-${index}`}
        columns={tableColumns}
        dataSource={data.rows}
        loading={loading || schemaLoading}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" /> }}
        scroll={{ x: 'max-content' }}
        pagination={{
          current: data.pagination?.page || page,
          pageSize,
          total: data.pagination?.total || 0,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={handleTableChange}
      />
    </Card>
  )
}

function formatCell(value, column) {
  if (value === null || value === undefined || value === '') return <Text type="secondary">-</Text>
  if (column?.key === 'displayAvatar' || column?.key === 'avatar' || column?.type === 'image') {
    return <Avatar src={String(value)} size={32}>{String(value).slice(0, 1)}</Avatar>
  }
  if (column?.key === 'profileCompleted') {
    return value ? <Tag color="green">已完善</Tag> : <Tag color="orange">未完善</Tag>
  }
  if (column?.type === 'boolean') return value ? <Tag color="green">是</Tag> : <Tag color="default">否</Tag>
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.replace('T', ' ').slice(0, 19)
  return String(value)
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
