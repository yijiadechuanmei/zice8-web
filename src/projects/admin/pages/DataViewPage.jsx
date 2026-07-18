/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Image, Input, Popconfirm, Select, Space, Tag, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { adjustLongMarchProfile, exportDataRows, getDataRows, getDataSchema, getLongMarchRecordingPlayUrl, reviewLongMarchRecording, reviewLongMarchShareScreenshot } from '../api'
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
  const [adjustingProfileId, setAdjustingProfileId] = useState('')
  const [recordingPlayUrls, setRecordingPlayUrls] = useState({})
  const [loadingRecordingPlayId, setLoadingRecordingPlayId] = useState('')
  const [reviewingRecordingId, setReviewingRecordingId] = useState('')
  const [reviewingShareScreenshotId, setReviewingShareScreenshotId] = useState('')
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
          audioUrl: recording.audioUrl ?? item.audioUrl,
          mediaId: recording.mediaId ?? item.mediaId,
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

  const handleLoadRecordingPlayUrl = useCallback(async (row) => {
    if (!row?.id) return
    setLoadingRecordingPlayId(row.id)
    try {
      const result = await getLongMarchRecordingPlayUrl(activity.activityKey, row.id)
      const audioUrl = result?.audioUrl || row.audioUrl
      setRecordingPlayUrls((current) => ({ ...current, [row.id]: audioUrl }))
      setData((current) => ({
        ...current,
        rows: current.rows.map((item) => item.id === row.id ? { ...item, audioUrl } : item),
      }))
    } catch (err) {
      message.error(err.message || '音频加载失败')
    } finally {
      setLoadingRecordingPlayId('')
    }
  }, [activity.activityKey])

  const handleReviewShareScreenshot = useCallback(async (row, payload, action) => {
    if (!row?.id) return
    setReviewingShareScreenshotId(`${row.id}:${action}`)
    try {
      const result = await reviewLongMarchShareScreenshot(activity.activityKey, row.id, payload)
      const screenshot = result?.screenshot || {}
      setData((current) => ({
        ...current,
        rows: current.rows.map((item) => item.id === row.id ? {
          ...item,
          status: screenshot.status || payload.status || item.status,
          pointsEarned: screenshot.pointsEarned ?? item.pointsEarned,
          rejectReason: screenshot.rejectReason ?? payload.rejectReason ?? item.rejectReason,
          reviewedAt: screenshot.reviewedAt || new Date().toISOString(),
        } : item),
      }))
      message.success(action === 'rejected' ? '已驳回截图' : '已通过截图审核')
    } catch (err) {
      message.error(err.message || '审核失败')
    } finally {
      setReviewingShareScreenshotId('')
    }
  }, [activity.activityKey])

  const handleAdjustProfile = useCallback(async (row, action, options = {}) => {
    if (!row?.id) return
    const actionLabels = {
      add_points: '补分',
      deduct_points: '扣分',
      clear_points: '清零',
      disqualify: '取消资格',
      restore: '恢复资格',
    }
    let payload = { action, ...options }
    if (action === 'add_points' || action === 'deduct_points') {
      const input = window.prompt(action === 'add_points' ? '请输入补充积分' : '请输入扣减积分')
      if (input === null) return
      const points = Number.parseInt(input, 10)
      if (!Number.isInteger(points) || points <= 0) {
        message.warning('请输入大于 0 的调整积分')
        return
      }
      const reason = (window.prompt('请输入操作原因（必填，会展示在用户积分流水）') || '').trim()
      if (!reason) {
        message.warning('请输入操作原因')
        return
      }
      payload = { action, points, reason }
    } else if (action === 'clear_points') {
      const reason = (window.prompt('请输入清零原因（必填，会展示在用户积分流水）') || '').trim()
      if (!reason) {
        message.warning('请输入清零原因')
        return
      }
      payload = { action, reason }
    }
    setAdjustingProfileId(`${row.id}:${action}`)
    try {
      const result = await adjustLongMarchProfile(activity.activityKey, row.id, payload)
      const profile = result?.profile || {}
      setData((current) => ({
        ...current,
        rows: current.rows.map((item) => item.id === row.id ? {
          ...item,
          totalPoints: profile.totalPoints ?? item.totalPoints,
          remainingPoints: profile.remainingPoints ?? item.remainingPoints,
          status: profile.status ?? item.status,
          lastPointAt: profile.lastPointAt || item.lastPointAt,
          updatedAt: profile.updatedAt || new Date().toISOString(),
        } : item),
      }))
      message.success(`已${actionLabels[action] || '操作'}`)
    } catch (err) {
      message.error(err.message || '操作失败')
    } finally {
      setAdjustingProfileId('')
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
    if (activity.type === 'long_march_study' && activeViewKey === 'long_march_profiles') {
      const statusColumn = columns.find((column) => column.key === 'status' || column.dataIndex === 'status')
      if (statusColumn) {
        statusColumn.render = (value) => Number(value) === 0 ? <Tag color="red">已取消</Tag> : <Tag color="green">有效</Tag>
      }
      columns.push({
        title: '人工操作',
        key: 'profileActions',
        fixed: 'right',
        width: 280,
        render: (_, row) => (
          <Space size={6} wrap>
            <Button
              size="small"
              loading={adjustingProfileId === `${row.id}:add_points`}
              disabled={Boolean(adjustingProfileId)}
              onClick={() => handleAdjustProfile(row, 'add_points')}
            >
              补分
            </Button>
            <Button
              size="small"
              danger
              loading={adjustingProfileId === `${row.id}:deduct_points`}
              disabled={Boolean(adjustingProfileId)}
              onClick={() => handleAdjustProfile(row, 'deduct_points')}
            >
              扣分
            </Button>
            <Popconfirm
              title="确认清零该用户积分？"
              okText="清零"
              cancelText="取消"
              onConfirm={() => handleAdjustProfile(row, 'clear_points')}
            >
              <Button
                size="small"
                danger
                loading={adjustingProfileId === `${row.id}:clear_points`}
                disabled={Boolean(adjustingProfileId)}
              >
                清零
              </Button>
            </Popconfirm>
            {Number(row.status) === 0 ? (
              <Popconfirm
                title="确认恢复该用户排名资格？"
                okText="恢复"
                cancelText="取消"
                onConfirm={() => handleAdjustProfile(row, 'restore', { reason: '后台恢复排名资格' })}
              >
                <Button
                  size="small"
                  loading={adjustingProfileId === `${row.id}:restore`}
                  disabled={Boolean(adjustingProfileId)}
                >
                  恢复
                </Button>
              </Popconfirm>
            ) : (
              <Popconfirm
                title="确认取消该用户排名资格？"
                okText="取消资格"
                cancelText="返回"
                onConfirm={() => handleAdjustProfile(row, 'disqualify', { reason: '后台取消排名资格' })}
              >
                <Button
                  size="small"
                  loading={adjustingProfileId === `${row.id}:disqualify`}
                  disabled={Boolean(adjustingProfileId)}
                >
                  取消资格
                </Button>
              </Popconfirm>
            )}
          </Space>
        ),
      })
    }
    if (activity.type === 'long_march_study' && activeViewKey === 'long_march_recordings') {
      const audioColumn = columns.find((column) => column.key === 'audioUrl' || column.dataIndex === 'audioUrl')
      if (audioColumn) {
        audioColumn.width = 240
        audioColumn.render = (value, row) => {
          const playableUrl = recordingPlayUrls[row.id] || (/\.(mp3|m4a|mp4|wav|ogg|aac)(?:[?#]|$)/i.test(value || '') ? value : '')
          if (playableUrl) {
            return <audio src={playableUrl} controls preload="none" style={{ width: 210, maxWidth: '100%' }} />
          }
          if (!value && !row.mediaId) return '-'
          return (
            <Button
              size="small"
              loading={loadingRecordingPlayId === row.id}
              disabled={Boolean(loadingRecordingPlayId)}
              onClick={() => handleLoadRecordingPlayUrl(row)}
            >
              加载播放
            </Button>
          )
        }
      }
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
                disabled={Boolean(reviewingRecordingId) || row.status === 'rejected' || row.status === 'approved'}
              >
                驳回
              </Button>
            </Popconfirm>
          </Space>
        ),
      })
    }
    if (activity.type === 'long_march_study' && activeViewKey === 'long_march_share_screenshots') {
      const imageColumn = columns.find((column) => column.key === 'imageUrl' || column.dataIndex === 'imageUrl')
      if (imageColumn) {
        imageColumn.width = 96
        imageColumn.render = (value) => value ? (
          <Image
            src={value}
            alt="分享截图"
            width={56}
            height={56}
            style={{ objectFit: 'cover', borderRadius: 6 }}
          />
        ) : '-'
      }
      columns.push({
        title: '审核操作',
        key: 'shareReviewActions',
        fixed: 'right',
        width: 160,
        render: (_, row) => (
          <Space size={6} wrap>
            <Button
              size="small"
              type={row.status === 'approved' ? 'default' : 'primary'}
              loading={reviewingShareScreenshotId === `${row.id}:approved`}
              disabled={Boolean(reviewingShareScreenshotId) || row.status === 'approved'}
              onClick={() => handleReviewShareScreenshot(row, { status: 'approved' }, 'approved')}
            >
              通过
            </Button>
            <Popconfirm
              title="确认驳回该分享截图？"
              okText="驳回"
              cancelText="取消"
              onConfirm={() => handleReviewShareScreenshot(row, { status: 'rejected', rejectReason: '后台审核驳回' }, 'rejected')}
            >
              <Button
                size="small"
                danger
                loading={reviewingShareScreenshotId === `${row.id}:rejected`}
                disabled={Boolean(reviewingShareScreenshotId) || row.status === 'rejected'}
              >
                驳回
              </Button>
            </Popconfirm>
          </Space>
        ),
      })
    }
    return columns
  }, [activity.type, activeViewKey, adjustingProfileId, handleAdjustProfile, handleLoadRecordingPlayUrl, handleReviewRecording, handleReviewShareScreenshot, loadingRecordingPlayId, recordingPlayUrls, reviewingRecordingId, reviewingShareScreenshotId, sortField, sortOrder, visibleColumns])

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
                {activity.type === 'appointment' ? (
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
  if (activity.type === 'appointment') {
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
