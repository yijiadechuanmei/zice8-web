import { useEffect, useMemo, useState } from 'react'
import { Input, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { exportDataRows, getDataRows, getDataSchema } from '../api'
import { AdminDataToolbar, AdminDataViewShell, AdminTableBlock, buildAdminColumnsFromSchema } from '../components/AdminDataTable'
import QuizAdminDataPage from './QuizAdminDataPage'

const pageSize = 20

export default function DataViewPage({ activity }) {
  return activity.type === 'quiz' ? <QuizAdminDataPage activity={activity} /> : <GenericDataViewPage activity={activity} />
}

function GenericDataViewPage({ activity }) {
  const [views, setViews] = useState([])
  const [activeViewKey, setActiveViewKey] = useState('')
  const [hiddenColumnsByView, setHiddenColumnsByView] = useState({})
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
        setHiddenColumnsByView({})
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
  const hiddenColumns = hiddenColumnsByView[activeViewKey] || {}
  const visibleColumns = useMemo(() => data.columns.filter((column) => !hiddenColumns[column.key]), [data.columns, hiddenColumns])
  const tableColumns = useMemo(() => buildAdminColumnsFromSchema(null, visibleColumns, Object.fromEntries(
    visibleColumns.map((column) => [
      column.key,
      {
        sortOrder: sortField === column.key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
      },
    ]),
  )), [sortField, sortOrder, visibleColumns])

  async function handleExport() {
    if (!activeViewKey || !activeView?.canExport) return
    setExporting(true)
    setError('')
    try {
      const result = await exportDataRows(activity.activityKey, activeViewKey, { keyword, sortField, sortOrder })
      downloadCsv(result.filename || `${activity.activityKey}-${activeViewKey}.csv`, result.csv || '')
      message.success('CSV 已导出')
    } catch (err) {
      const text = getExportErrorMessage(err)
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

  return (
    <AdminDataViewShell
      title="数据表"
      description={activeView?.description || '选择一个授权数据视图'}
      views={views}
      activeViewKey={activeViewKey}
      onChangeView={(viewKey) => {
        setActiveViewKey(viewKey)
        setPage(1)
        setSortField('')
      }}
      error={error}
      loading={schemaLoading}
    >
      <AdminTableBlock
        toolbar={(
          <AdminDataToolbar
            search={(
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
            )}
            showColumns={Boolean(data.columns.length)}
            columnOptions={data.columns.map((column) => ({ label: column.title, value: column.key }))}
            selectedColumnKeys={data.columns.filter((column) => !hiddenColumns[column.key]).map((column) => column.key)}
            onChangeColumns={(keys) => {
              const selected = new Set(keys)
              setHiddenColumnsByView((current) => ({
                ...current,
                [activeViewKey]: Object.fromEntries(data.columns.map((column) => [column.key, !selected.has(column.key)])),
              }))
            }}
            exportDisabled={!activeViewKey || !activeView?.canExport}
            exporting={exporting}
            onExport={handleExport}
            exportTooltip={!activeView?.canExport ? '当前账号无导出权限' : ''}
          />
        )}
        tableProps={{
          rowKey: (row, index) => row.id ?? row.participantId ?? `${activeViewKey}-${index}`,
          columns: tableColumns,
          dataSource: data.rows,
          loading: loading || schemaLoading,
          pagination: {
            current: data.pagination?.page || page,
            pageSize,
            total: data.pagination?.total || 0,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条`,
          },
          onChange: handleTableChange,
        }}
      />
    </AdminDataViewShell>
  )
}

function getExportErrorMessage(err) {
  if (err?.errorCode === 'no_export_fields' || err?.message === '没有可导出的字段，请先配置字段权限') {
    return '没有可导出的字段，请先配置字段权限'
  }
  if (err?.status === 403 || err?.response?.code === 403) return '无导出权限'
  return err?.message || '导出失败'
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
