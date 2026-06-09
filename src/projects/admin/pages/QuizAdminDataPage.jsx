import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Drawer, Input, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd'
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
import { AdminDataToolbar, AdminDataViewShell, AdminTableBlock, buildAdminColumnsFromSchema } from '../components/AdminDataTable'

const { Text } = Typography
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
    <AdminDataViewShell
      title="Quiz 数据表"
      description="当前活动的参与用户、题库、答题记录和成绩数据。题库导入请使用上方独立「题库导入」页签。"
      views={tabs.map((item) => ({ viewKey: item.key, label: item.label }))}
      activeViewKey={activeKey}
      onChangeView={setActiveKey}
      error={error}
      loading={loading}
    >
      {tabs.find((item) => item.key === activeKey)?.children || null}
    </AdminDataViewShell>
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
  const [hiddenColumns, setHiddenColumns] = useState({})

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
    <AdminTableBlock
      error={error}
      toolbar={(
        <AdminDataToolbar
          search={<Input.Search allowClear prefix={<SearchOutlined />} placeholder="搜索姓名 / 部门" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} style={{ width: 260 }} />}
          showColumns={Boolean(data.columns.length)}
          columnOptions={data.columns.map((column) => ({ label: column.title, value: column.key }))}
          selectedColumnKeys={data.columns.filter((column) => !hiddenColumns[column.key]).map((column) => column.key)}
          onChangeColumns={(keys) => {
            const selected = new Set(keys)
            setHiddenColumns(Object.fromEntries(data.columns.map((column) => [column.key, !selected.has(column.key)])))
          }}
          exportDisabled
          exportTooltip="当前视图暂不支持导出"
        />
      )}
      tableProps={{
        rowKey: (row, index) => row.participantId || `participant-${index}`,
        columns: buildAdminColumnsFromSchema(null, data.columns.filter((column) => !hiddenColumns[column.key])),
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
  const [hiddenColumns, setHiddenColumns] = useState({})

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
    <AdminTableBlock
      error={error}
      toolbar={(
        <AdminDataToolbar
          showColumns={Boolean((view?.fields || []).length)}
          columnOptions={(view?.fields || []).map((field) => ({ label: field.label, value: field.fieldKey || field.key }))}
          selectedColumnKeys={(view?.fields || []).filter((field) => !hiddenColumns[(field.fieldKey || field.key)]).map((field) => field.fieldKey || field.key)}
          onChangeColumns={(keys) => {
            const selected = new Set(keys)
            setHiddenColumns(Object.fromEntries((view?.fields || []).map((field) => [field.fieldKey || field.key, !selected.has(field.fieldKey || field.key)])))
          }}
          exportDisabled
          exportTooltip="当前视图暂不支持导出"
        />
      )}
      tableProps={{
        rowKey: 'id',
        columns: buildAdminColumnsFromSchema({ ...view, fields: (view?.fields || []).filter((field) => !hiddenColumns[(field.fieldKey || field.key)]) }),
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
  const [hiddenColumns, setHiddenColumns] = useState({})

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
    <AdminTableBlock
      error={error}
      toolbar={(
        <AdminDataToolbar
          search={(
            <Space wrap>
              <Input.Search allowClear prefix={<SearchOutlined />} placeholder="搜索题目" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} style={{ width: 260 }} />
              <Select value={type} onChange={(value) => { setType(value); setPage(1) }} style={{ width: 140 }} options={[{ value: '', label: '全部题型' }, { value: 'single', label: '单选' }, { value: 'multiple', label: '多选' }]} />
              <Select value={categoryId} onChange={(value) => { setCategoryId(value); setPage(1) }} style={{ width: 180 }} options={[{ value: '', label: '全部分类' }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
            </Space>
          )}
          showColumns={Boolean((view?.fields || []).length)}
          columnOptions={(view?.fields || []).map((field) => ({ label: field.label, value: field.fieldKey || field.key }))}
          selectedColumnKeys={(view?.fields || []).filter((field) => !hiddenColumns[(field.fieldKey || field.key)]).map((field) => field.fieldKey || field.key)}
          onChangeColumns={(keys) => {
            const selected = new Set(keys)
            setHiddenColumns(Object.fromEntries((view?.fields || []).map((field) => [field.fieldKey || field.key, !selected.has(field.fieldKey || field.key)])))
          }}
          exportDisabled
          exportTooltip="当前视图暂不支持导出"
        />
      )}
      tableProps={{
        rowKey: 'id',
        columns: buildAdminColumnsFromSchema({ ...view, fields: (view?.fields || []).filter((field) => !hiddenColumns[(field.fieldKey || field.key)]) }),
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
  const [hiddenColumns, setHiddenColumns] = useState({})
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
    ...buildAdminColumnsFromSchema({ ...view, fields: (view?.fields || []).filter((field) => !hiddenColumns[(field.fieldKey || field.key)]) }),
    canViewAnswers
      ? { title: '操作', key: 'action', fixed: 'right', width: 110, render: (_, record) => <Button size="small" icon={<EyeOutlined />} onClick={() => openAnswers(record.attemptId)}>明细</Button> }
      : null,
  ].filter(Boolean)

  return (
    <>
      <AdminTableBlock
        error={error}
        toolbar={(
          <AdminDataToolbar
            search={(
              <Space wrap>
                <Input.Search allowClear prefix={<SearchOutlined />} placeholder="搜索姓名 / 部门" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} style={{ width: 260 }} />
                <Select value={status} onChange={(value) => { setStatus(value); setPage(1) }} style={{ width: 150 }} options={[{ value: '', label: '全部状态' }, { value: 'in_progress', label: '进行中' }, { value: 'finished', label: '已完成' }]} />
              </Space>
            )}
            showColumns={Boolean((view?.fields || []).length)}
            columnOptions={(view?.fields || []).map((field) => ({ label: field.label, value: field.fieldKey || field.key }))}
            selectedColumnKeys={(view?.fields || []).filter((field) => !hiddenColumns[(field.fieldKey || field.key)]).map((field) => field.fieldKey || field.key)}
            onChangeColumns={(keys) => {
              const selected = new Set(keys)
              setHiddenColumns(Object.fromEntries((view?.fields || []).map((field) => [field.fieldKey || field.key, !selected.has(field.fieldKey || field.key)])))
            }}
            exportDisabled
            exportTooltip="当前视图暂不支持导出"
          />
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
          columns={buildAdminColumnsFromSchema(answerView)}
          dataSource={drawer.list}
          pagination={false}
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
  const [hiddenColumns, setHiddenColumns] = useState({})

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
    <AdminTableBlock
      error={error}
      toolbar={(
        <AdminDataToolbar
          showColumns={Boolean((view?.fields || []).length)}
          columnOptions={(view?.fields || []).map((field) => ({ label: field.label, value: field.fieldKey || field.key }))}
          selectedColumnKeys={(view?.fields || []).filter((field) => !hiddenColumns[(field.fieldKey || field.key)]).map((field) => field.fieldKey || field.key)}
          onChangeColumns={(keys) => {
            const selected = new Set(keys)
            setHiddenColumns(Object.fromEntries((view?.fields || []).map((field) => [field.fieldKey || field.key, !selected.has(field.fieldKey || field.key)])))
          }}
          exportDisabled
          exportTooltip="当前视图暂不支持导出"
        />
      )}
      tableProps={{
        rowKey: (row) => `${row.rank}-${row.userId}`,
        columns: buildAdminColumnsFromSchema({ ...view, fields: (view?.fields || []).filter((field) => !hiddenColumns[(field.fieldKey || field.key)]) }),
        dataSource: data.list || [],
        loading,
        pagination: pagination({ page: data.page, pageSize: data.pageSize, total: data.total }, page, setPage),
      }}
    />
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
