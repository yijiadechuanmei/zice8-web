import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Drawer, Empty, Input, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from 'antd'
import { EyeOutlined, SearchOutlined } from '@ant-design/icons'
import {
  getDataSchema,
  getDataRows,
  getQuizAdminAttemptAnswers,
  getQuizAdminAttempts,
  getQuizAdminCategories,
  getQuizAdminOverview,
  getQuizAdminQuestions,
  getQuizAdminRank,
} from '../api'

const { Text, Title } = Typography
const pageSize = 20

export default function QuizAdminDataPage({ activity }) {
  const [activeKey, setActiveKey] = useState('')
  const [views, setViews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setViews([])
    getDataSchema(activity.activityKey)
      .then((schema) => {
        if (!alive) return
        setViews(schema?.views || [])
      })
      .catch((err) => {
        if (!alive) return
        setError(err.message || '数据视图加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activity.activityKey])

  const viewMap = useMemo(() => new Map(views.map((view) => [view.viewKey, view])), [views])
  const canViewAnswers = viewMap.has('quiz_attempt_answers')
  const tabs = useMemo(() => {
    const items = []
    if (viewMap.has('participants')) {
      items.push({ key: 'participants', label: viewMap.get('participants')?.label || '参与用户', children: <QuizParticipantsTable activity={activity} view={viewMap.get('participants')} active={activeKey === 'participants'} /> })
    }
    if (viewMap.has('quiz_overview')) {
      items.push({ key: 'quiz_overview', label: viewMap.get('quiz_overview')?.label || '基础统计', children: <QuizOverviewPanel activity={activity} view={viewMap.get('quiz_overview')} active={activeKey === 'quiz_overview'} /> })
    }
    if (viewMap.has('quiz_questions')) {
      items.push({ key: 'quiz_questions', label: viewMap.get('quiz_questions')?.label || '题目列表', children: <QuizQuestionTable activity={activity} view={viewMap.get('quiz_questions')} active={activeKey === 'quiz_questions'} /> })
    }
    if (viewMap.has('quiz_categories')) {
      items.push({ key: 'quiz_categories', label: viewMap.get('quiz_categories')?.label || '分类板块', children: <QuizCategoryTable activity={activity} view={viewMap.get('quiz_categories')} active={activeKey === 'quiz_categories'} /> })
    }
    if (viewMap.has('quiz_attempts')) {
      items.push({ key: 'quiz_attempts', label: viewMap.get('quiz_attempts')?.label || '答题记录', children: <QuizAttemptTable activity={activity} view={viewMap.get('quiz_attempts')} answerView={viewMap.get('quiz_attempt_answers') || null} active={activeKey === 'quiz_attempts'} canViewAnswers={canViewAnswers} /> })
    }
    if (viewMap.has('quiz_rank')) {
      items.push({ key: 'quiz_rank', label: viewMap.get('quiz_rank')?.label || '排行榜', children: <QuizRankTable activity={activity} view={viewMap.get('quiz_rank')} active={activeKey === 'quiz_rank'} /> })
    }
    return items
  }, [activity, activeKey, canViewAnswers, viewMap])

  useEffect(() => {
    if (!tabs.length) {
      setActiveKey('')
      return
    }
    if (!tabs.some((item) => item.key === activeKey)) {
      setActiveKey(tabs[0].key)
    }
  }, [activeKey, tabs])

  return (
    <Card className="admin-card">
      <div className="admin-page-head">
        <div>
          <Title level={4}>Quiz 数据表</Title>
          <Text type="secondary">当前活动的参与用户、题库、答题记录和成绩数据。题库导入请使用上方独立「题库导入」页签。</Text>
        </div>
      </div>
      {error ? <div className="admin-inline-error">{error}</div> : null}
      {!loading && !tabs.length ? (
        <Empty description="当前账号没有可查看的数据视图，请联系管理员授权。" />
      ) : (
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={tabs}
        />
      )}
    </Card>
  )
}

function QuizOverviewPanel({ activity, view, active }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    setError('')
    getQuizAdminOverview(activity.activityKey)
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err.message || '统计加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [active, activity.activityKey])

  if (error) return <div className="admin-inline-error">{error}</div>

  const stats = (view?.fields || []).map((field) => ({
    key: field.fieldKey || field.key,
    label: field.label,
    value: data?.[field.fieldKey || field.key] ?? 0,
  }))

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="admin-quiz-kpis">
        {stats.map((item) => (
          <Card key={item.key} size="small" loading={loading}>
            <Statistic title={item.label} value={item.value ?? 0} />
          </Card>
        ))}
      </div>
    </Space>
  )
}

function QuizParticipantsTable({ activity, view, active }) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ columns: [], rows: [], pagination: { page: 1, pageSize, total: 0 } })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    setError('')
    getDataRows(activity.activityKey, 'participants', { page: String(page), pageSize: String(pageSize), keyword })
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err.message || '参与用户加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [active, activity.activityKey, keyword, page])

  return (
    <TableBlock
      error={error}
      toolbar={<Input.Search allowClear prefix={<SearchOutlined />} placeholder="搜索姓名 / 部门" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} style={{ width: 260 }} />}
      tableProps={{
        rowKey: (row, index) => row.participantId || `participant-${index}`,
        columns: buildColumnsFromSchema(view, data.columns),
        dataSource: data.rows,
        loading,
        pagination: pagination(data.pagination, page, setPage),
      }}
    />
  )
}

function QuizCategoryTable({ activity, view, active }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    setError('')
    getQuizAdminCategories(activity.activityKey)
      .then((result) => {
        if (alive) setData(result.list || [])
      })
      .catch((err) => {
        if (alive) setError(err.message || '分类加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [active, activity.activityKey])

  return (
    <TableBlock
      error={error}
      tableProps={{
        rowKey: 'id',
        columns: buildColumnsFromSchema(view),
        dataSource: data,
        loading,
        pagination: false,
      }}
    />
  )
}

function QuizQuestionTable({ activity, view, active }) {
  const [categories, setCategories] = useState([])
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ list: [], total: 0, page, pageSize })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active) return
    getQuizAdminCategories(activity.activityKey).then((result) => setCategories(result.list || [])).catch(() => setCategories([]))
  }, [active, activity.activityKey])

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    setError('')
    getQuizAdminQuestions(activity.activityKey, { page: String(page), pageSize: String(pageSize), keyword, type, categoryId })
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err.message || '题目加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [active, activity.activityKey, categoryId, keyword, page, type])

  return (
    <TableBlock
      error={error}
      toolbar={(
        <Space wrap>
          <Input.Search allowClear prefix={<SearchOutlined />} placeholder="搜索题目" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} style={{ width: 260 }} />
          <Select value={type} onChange={(value) => { setType(value); setPage(1) }} style={{ width: 140 }} options={[{ value: '', label: '全部题型' }, { value: 'single', label: '单选' }, { value: 'multiple', label: '多选' }]} />
          <Select value={categoryId} onChange={(value) => { setCategoryId(value); setPage(1) }} style={{ width: 180 }} options={[{ value: '', label: '全部分类' }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
        </Space>
      )}
      tableProps={{
        rowKey: 'id',
        columns: buildColumnsFromSchema(view),
        dataSource: data.list || [],
        loading,
        expandable: {
          expandedRowRender: (record) => (
            <Space direction="vertical" size={6}>
              {(record.options || []).map((option) => (
                <Text key={option.id}>
                  <Tag color={option.isCorrect ? 'green' : 'default'}>{option.label}</Tag>
                  {option.content}
                </Text>
              ))}
            </Space>
          ),
        },
        pagination: pagination({ page: data.page, pageSize: data.pageSize, total: data.total }, page, setPage),
      }}
    />
  )
}

function QuizAttemptTable({ activity, view, answerView, active, canViewAnswers }) {
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ list: [], total: 0, page, pageSize })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [drawer, setDrawer] = useState({ open: false, attemptId: '', loading: false, list: [] })

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    setError('')
    getQuizAdminAttempts(activity.activityKey, { page: String(page), pageSize: String(pageSize), keyword, status })
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err.message || '答题记录加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [active, activity.activityKey, keyword, page, status])

  async function openAnswers(attemptId) {
    setDrawer({ open: true, attemptId, loading: true, list: [] })
    try {
      const result = await getQuizAdminAttemptAnswers(activity.activityKey, attemptId)
      setDrawer({ open: true, attemptId, loading: false, list: result.list || [] })
    } catch (err) {
      message.error(err.message || '答案明细加载失败')
      setDrawer({ open: true, attemptId, loading: false, list: [] })
    }
  }

  const columns = [
    ...buildColumnsFromSchema(view),
    canViewAnswers
      ? { title: '操作', key: 'action', fixed: 'right', width: 110, render: (_, record) => <Button size="small" icon={<EyeOutlined />} onClick={() => openAnswers(record.attemptId)}>明细</Button> }
      : null,
  ].filter(Boolean)

  return (
    <>
      <TableBlock
        error={error}
        toolbar={(
          <Space wrap>
            <Input.Search allowClear prefix={<SearchOutlined />} placeholder="搜索姓名 / 部门" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} style={{ width: 260 }} />
            <Select value={status} onChange={(value) => { setStatus(value); setPage(1) }} style={{ width: 150 }} options={[{ value: '', label: '全部状态' }, { value: 'in_progress', label: '进行中' }, { value: 'finished', label: '已完成' }]} />
          </Space>
        )}
        tableProps={{
          rowKey: 'attemptId',
          columns,
          dataSource: data.list || [],
          loading,
          pagination: pagination({ page: data.page, pageSize: data.pageSize, total: data.total }, page, setPage),
        }}
      />
      <Drawer title={`答案明细 #${drawer.attemptId}`} open={drawer.open && canViewAnswers} width={860} onClose={() => setDrawer({ open: false, attemptId: '', loading: false, list: [] })}>
        <Table
          rowKey={(row) => row.questionSort}
          size="small"
          loading={drawer.loading}
          columns={buildColumnsFromSchema(answerView)}
          dataSource={drawer.list}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无答案明细" /> }}
        />
      </Drawer>
    </>
  )
}

function QuizRankTable({ activity, view, active }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ list: [], total: 0, page, pageSize })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    setError('')
    getQuizAdminRank(activity.activityKey, { page: String(page), pageSize: String(pageSize) })
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err.message || '排行榜加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [active, activity.activityKey, page])

  return (
    <TableBlock
      error={error}
      tableProps={{
        rowKey: (row) => `${row.rank}-${row.userId}`,
        columns: buildColumnsFromSchema(view),
        dataSource: data.list || [],
        loading,
        pagination: pagination({ page: data.page, pageSize: data.pageSize, total: data.total }, page, setPage),
      }}
    />
  )
}

function TableBlock({ toolbar, error, tableProps }) {
  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      {toolbar ? <div className="admin-table-toolbar">{toolbar}</div> : null}
      {error ? <div className="admin-inline-error">{error}</div> : null}
      <Table
        size="small"
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" /> }}
        {...tableProps}
      />
    </Space>
  )
}

function pagination(data, page, setPage) {
  return {
    current: data?.page || page,
    pageSize: data?.pageSize || pageSize,
    total: data?.total || 0,
    showSizeChanger: false,
    showTotal: (total) => `共 ${total} 条`,
    onChange: (nextPage) => setPage(nextPage),
  }
}

function emptyText(value) {
  return value || <Text type="secondary">-</Text>
}

function labelsText(value) {
  return Array.isArray(value) && value.length ? value.join(' / ') : <Text type="secondary">-</Text>
}

function statusTag(value) {
  return value === 1 ? <Tag color="green">启用</Tag> : <Tag color="default">禁用</Tag>
}

function attemptStatusTag(value) {
  if (value === 'finished') return <Tag color="green">已完成</Tag>
  if (value === 'in_progress') return <Tag color="blue">进行中</Tag>
  return <Tag>{value || '-'}</Tag>
}

function questionTypeTag(value) {
  if (value === 'single') return <Tag color="blue">单选</Tag>
  if (value === 'multiple') return <Tag color="purple">多选</Tag>
  return <Tag>{value || '-'}</Tag>
}

function formatDate(value) {
  if (!value) return <Text type="secondary">-</Text>
  return String(value).replace('T', ' ').slice(0, 19)
}

function formatDuration(value) {
  const ms = Number(value || 0)
  if (!ms) return '0.0s'
  return `${(ms / 1000).toFixed(1)}s`
}

function buildColumnsFromSchema(view, fallbackColumns = []) {
  if (fallbackColumns?.length) {
    return fallbackColumns.map((column) => ({
      title: column.title || column.label,
      dataIndex: column.key,
      key: column.key,
      width: column.width || resolveColumnWidth(column),
      render: (value) => formatFieldValue(column, value),
    }))
  }

  return (view?.fields || []).map((field) => ({
    title: field.label,
    dataIndex: field.fieldKey || field.key,
    key: field.fieldKey || field.key,
    width: resolveColumnWidth(field),
    ellipsis: field.type === 'image' ? false : undefined,
    render: (value) => formatFieldValue(field, value),
  }))
}

function resolveColumnWidth(field) {
  const key = String(field?.fieldKey || field?.key || '')
  const type = String(field?.type || '')
  if (/^(id|userId|participantId|attemptId|rank|sort|status)$/i.test(key)) return 100
  if (/time|date|at$/i.test(key) || type === 'datetime') return 180
  if (/phone/i.test(key)) return 140
  if (/avatar|image|url/i.test(key) || type === 'image') return 200
  if (/name|title|department|category|label/i.test(key)) return 140
  return 140
}

function formatFieldValue(field, value) {
  const key = String(field?.fieldKey || field?.key || '')
  const type = String(field?.type || '')
  if (value === null || value === undefined || value === '') return <Text type="secondary">-</Text>
  if (key === 'profileCompleted') return value ? <Tag color="green">已完善</Tag> : <Tag color="orange">未完善</Tag>
  if (key === 'status') return attemptOrStatusTag(value)
  if (key === 'type' || key === 'questionType') return questionTypeTag(value)
  if (key === 'isCorrect') return value ? <Tag color="green">正确</Tag> : <Tag color="red">错误</Tag>
  if (key === 'isTimeout') return value ? <Tag color="orange">是</Tag> : <Tag>否</Tag>
  if (type === 'boolean') return value ? <Tag color="green">是</Tag> : <Tag>否</Tag>
  if (type === 'datetime' || /time|date|at$/i.test(key)) return formatDate(value)
  if (key === 'totalTimeMs' || key === 'timeMs' || key === 'averageTimeMs') return formatDuration(value)
  if (Array.isArray(value)) return value.length ? value.join(' / ') : <Text type="secondary">-</Text>
  return emptyText(value)
}

function attemptOrStatusTag(value) {
  if (value === 'finished') return <Tag color="green">已完成</Tag>
  if (value === 'in_progress') return <Tag color="blue">进行中</Tag>
  if (value === 1) return <Tag color="green">启用</Tag>
  if (value === 0) return <Tag color="default">禁用</Tag>
  return <Tag>{String(value || '-')}</Tag>
}
