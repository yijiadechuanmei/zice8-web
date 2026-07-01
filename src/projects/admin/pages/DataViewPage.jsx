/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, Popconfirm, Select, Space, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { exportDataRows, getDataRows, getDataSchema, reviewLongMarchRecording } from '../api'
import { AdminDataToolbar, AdminDataViewShell, AdminTableBlock, buildAdminColumnsFromSchema } from '../components/AdminDataTable'
import QuizAdminDataPage from './QuizAdminDataPage'

const pageSize = 20

export default function DataViewPage({ activity, phaseScope = 'all' }) {
  return activity.type === 'quiz' ? <QuizAdminDataPage activity={activity} /> : <GenericDataViewPage activity={activity} phaseScope={phaseScope} />
}

function GenericDataViewPage({ activity, phaseScope = 'all' }) {
  const [views, setViews] = useState([])
  const [activeViewKey, setActiveViewKey] = useState('')
  const [hiddenColumnsByView, setHiddenColumnsByView] = useState({})
  const [data, setData] = useState({ columns: [], rows: [], pagination: { page: 1, pageSize, total: 0 } })
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentSlot, setAppointmentSlot] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [schemaLoading, setSchemaLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [reviewingRecordingId, setReviewingRecordingId] = useState('')
  const [error, setError] = useState('')
  const phaseNo = activity.type === 'phase_quiz_lottery' && phaseScope !== 'all' ? phaseScope : ''

  useEffect(() => {
    let alive = true
    setSchemaLoading(true)
    setError('')
    setViews([])
    setActiveViewKey('')
    setAppointmentDate('')
    setAppointmentSlot('')
    setStatus('')
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
        date: appointmentDate,
        slot: appointmentSlot,
        status,
        phaseNo,
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
  }, [activity.activityKey, activeViewKey, appointmentDate, appointmentSlot, page, keyword, sortField, sortOrder, status, phaseNo])

  useEffect(() => {
    setPage(1)
    setData({ columns: [], rows: [], pagination: { page: 1, pageSize, total: 0 } })
  }, [phaseNo])

  const activeView = useMemo(() => views.find((view) => view.viewKey === activeViewKey), [views, activeViewKey])
  const hiddenColumns = useMemo(() => hiddenColumnsByView[activeViewKey] || {}, [activeViewKey, hiddenColumnsByView])
  const visibleColumns = useMemo(() => data.columns.filter((column) => !hiddenColumns[column.key]), [data.columns, hiddenColumns])
  const visibleFieldKeys = useMemo(
    () => visibleColumns
      .map((column) => String(column.key || '').trim())
      .filter(Boolean),
    [visibleColumns],
  )
  const exportableFieldKeys = useMemo(() => {
    const exportable = new Set((activeView?.fields || []).filter((field) => field.canExport).map((field) => field.fieldKey || field.key))
    return visibleFieldKeys.filter((key) => exportable.has(key))
  }, [activeView?.fields, visibleFieldKeys])

  const handleReviewRecording = useCallback(async (row, payload, action) => {
    if (!row?.id) return
    setReviewingRecordingId(`${row.id}:${action}`)
    try {
      const result = await reviewLongMarchRecording(activity.activityKey, row.id, payload)
      const recording = result?.recording || {}
      setData((current) => ({
        ...current,
        rows: current.rows.map((item) => item.id === row.id ? {
          ...item,
          status: recording.status || payload.status || item.status,
          featured: recording.featured ?? payload.featured ?? item.featured,
          reviewedAt: recording.reviewedAt || new Date().toISOString(),
        } : item),
      }))
      message.success(action === 'rejected' ? '已驳回录音' : action === 'featured' ? '已设为精选' : '已通过审核')
    } catch (err) {
      message.error(err.message || '审核失败')
    } finally {
      setReviewingRecordingId('')
    }
  }, [activity.activityKey])

  const tableColumns = useMemo(() => {
    const columns = buildAdminColumnsFromSchema(null, visibleColumns, Object.fromEntries(
      visibleColumns.map((column) => [
        column.key,
        {
          sortOrder: sortField === column.key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
        },
      ]),
    ))
    if (activity.type === 'long_march_study' && activeViewKey === 'long_march_recordings') {
      columns.push({
        title: '审核操作',
        key: 'reviewActions',
        fixed: 'right',
        width: 220,
        render: (_, row) => (
          <Space size={6} wrap>
            <Button
              size="small"
              type={row.status === 'approved' ? 'default' : 'primary'}
              loading={reviewingRecordingId === `${row.id}:approved`}
              disabled={Boolean(reviewingRecordingId) || row.status === 'approved'}
              onClick={() => handleReviewRecording(row, { status: 'approved' }, 'approved')}
            >
              通过
            </Button>
            <Button
              size="small"
              loading={reviewingRecordingId === `${row.id}:featured`}
              disabled={Boolean(reviewingRecordingId) || row.featured}
              onClick={() => handleReviewRecording(row, { status: 'approved', featured: true }, 'featured')}
            >
              精选
            </Button>
            <Popconfirm
              title="确认驳回该录音？"
              okText="驳回"
              cancelText="取消"
              onConfirm={() => handleReviewRecording(row, { status: 'rejected', featured: false, rejectReason: '后台审核驳回' }, 'rejected')}
            >
              <Button
                size="small"
                danger
                loading={reviewingRecordingId === `${row.id}:rejected`}
                disabled={Boolean(reviewingRecordingId) || row.status === 'rejected'}
              >
                驳回
              </Button>
            </Popconfirm>
          </Space>
        ),
      })
    }
    return columns
  }, [activity.type, activeViewKey, handleReviewRecording, reviewingRecordingId, sortField, sortOrder, visibleColumns])

  async function handleExport() {
    if (!activeViewKey || !activeView?.canExport) return
    setExporting(true)
    setError('')
    try {
      const result = await exportDataRows(activity.activityKey, activeViewKey, {
        keyword,
        sortField,
        sortOrder,
        date: appointmentDate,
        slot: appointmentSlot,
        status,
        phaseNo,
        fields: exportableFieldKeys,
      })
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
        setAppointmentDate('')
        setAppointmentSlot('')
        setStatus('')
      }}
      error={error}
      loading={schemaLoading}
    >
      <AdminTableBlock
        toolbar={(
          <AdminDataToolbar
            search={(
              <Space wrap>
                <Input.Search
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder={getKeywordPlaceholder(activity, activeViewKey)}
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
                {activity.type === 'appointment_visit' ? (
                  <>
                    <Input
                      allowClear
                      placeholder={activeViewKey === 'appointment_whitelist' ? '允许日期 YYYY-MM-DD' : '预约日期 YYYY-MM-DD'}
                      value={appointmentDate}
                      onChange={(event) => {
                        setAppointmentDate(event.target.value.trim())
                        setPage(1)
                      }}
                      style={{ width: 180 }}
                    />
                    <Input
                      allowClear
                      placeholder="时间段"
                      value={appointmentSlot}
                      onChange={(event) => {
                        setAppointmentSlot(event.target.value.trim())
                        setPage(1)
                      }}
                      style={{ width: 180 }}
                    />
                    <Select
                      value={status}
                      onChange={(value) => {
                        setStatus(value)
                        setPage(1)
                      }}
                      style={{ width: 140 }}
                      options={getAppointmentStatusOptions(activeViewKey)}
                    />
                  </>
                ) : null}
              </Space>
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
            exportDisabled={!activeViewKey || !activeView?.canExport || !exportableFieldKeys.length}
            exporting={exporting}
            onExport={handleExport}
            exportTooltip={!activeView?.canExport ? '当前账号无导出权限' : (!exportableFieldKeys.length ? '当前没有可导出的字段' : '')}
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

function getKeywordPlaceholder(activity, viewKey) {
  if (activity.type === 'appointment_visit') {
    return viewKey === 'appointment_bookings'
      ? '搜索房号 / 姓名 / 手机号'
      : '搜索房号 / 姓名'
  }
  if (activity.type === 'material_review_registration') {
    return '搜索单位 / 姓名 / 联系方式'
  }
  return '输入关键词'
}

function getAppointmentStatusOptions(viewKey) {
  if (viewKey === 'appointment_bookings') {
    return [
      { value: '', label: '全部状态' },
      { value: 'booked', label: '已预约' },
    ]
  }
  return [
    { value: '', label: '全部状态' },
    { value: '1', label: '启用' },
    { value: '0', label: '禁用' },
  ]
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
