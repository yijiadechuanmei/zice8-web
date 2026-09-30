import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Drawer, Input, Popconfirm, Select, Space, Statistic, Table, Tag, Typography, message } from 'antd'
import { EyeOutlined, SearchOutlined } from '@ant-design/icons'
import {
  exportDataRows,
  clearFengchengQuizPhaseData,
  getDataSchema,
  getDataRows,
  getFengchengQuizPhaseSettings,
  getQuizAdminAttemptAnswers,
  getQuizAdminAttempts,
  getQuizAdminCategories,
  getQuizAdminOverview,
  getQuizAdminQuestions,
  getQuizAdminRank,
  updateFengchengQuizActivePhase,
  updateFengchengQuizPhaseSchedule,
} from '../api'
import { AdminDataToolbar, AdminDataViewShell, AdminTableBlock, buildAdminColumnsFromSchema } from '../components/AdminDataTable'

const { Text } = Typography
const pageSize = 20
const QUIZ_RANK_VIEW_KEY = 'quiz_rank'
const FENGCHENG_QUIZ_ACTIVITY_KEY = 'fengcheng_wx_coin_partner_quiz_20260701'

export default function QuizAdminDataPage({ activity }) {
  const [activeKey, setActiveKey] = useState('')
  const [views, setViews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [phaseNo, setPhaseNo] = useState(2)
  const isFengchengQuiz = activity.activityKey === FENGCHENG_QUIZ_ACTIVITY_KEY

  useEffect(() => {
    setPhaseNo(2)
  }, [activity.activityKey])

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setViews([])
    getDataSchema(activity.activityKey)
      .then((schema) => {
        if (!alive) return
        setViews(normalizeSchemaViews(schema?.views || []))
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
      items.push({ key: 'participants', label: viewMap.get('participants')?.label || '参与用户', children: <QuizParticipantsTable activity={activity} view={viewMap.get('participants')} active={activeKey === 'participants'} phaseNo={isFengchengQuiz ? phaseNo : undefined} /> })
    }
    if (viewMap.has('quiz_overview')) {
      items.push({ key: 'quiz_overview', label: viewMap.get('quiz_overview')?.label || '基础统计', children: <QuizOverviewPanel activity={activity} view={viewMap.get('quiz_overview')} active={activeKey === 'quiz_overview'} phaseNo={isFengchengQuiz ? phaseNo : undefined} /> })
    }
    if (viewMap.has('quiz_questions')) {
      items.push({ key: 'quiz_questions', label: viewMap.get('quiz_questions')?.label || '题目列表', children: <QuizQuestionTable activity={activity} view={viewMap.get('quiz_questions')} active={activeKey === 'quiz_questions'} phaseNo={isFengchengQuiz ? phaseNo : undefined} /> })
    }
    if (viewMap.has('quiz_categories')) {
      items.push({ key: 'quiz_categories', label: viewMap.get('quiz_categories')?.label || '分类板块', children: <QuizCategoryTable activity={activity} view={viewMap.get('quiz_categories')} active={activeKey === 'quiz_categories'} phaseNo={isFengchengQuiz ? phaseNo : undefined} /> })
    }
    if (viewMap.has('quiz_attempts')) {
      items.push({ key: 'quiz_attempts', label: viewMap.get('quiz_attempts')?.label || '答题记录', children: <QuizAttemptTable activity={activity} view={viewMap.get('quiz_attempts')} answerView={viewMap.get('quiz_attempt_answers') || null} active={activeKey === 'quiz_attempts'} canViewAnswers={canViewAnswers} phaseNo={isFengchengQuiz ? phaseNo : undefined} /> })
    }
    if (viewMap.has(QUIZ_RANK_VIEW_KEY)) {
      items.push({ key: QUIZ_RANK_VIEW_KEY, label: viewMap.get(QUIZ_RANK_VIEW_KEY)?.label || '排行榜', children: <QuizRankTable activity={activity} view={viewMap.get(QUIZ_RANK_VIEW_KEY)} active={activeKey === QUIZ_RANK_VIEW_KEY} phaseNo={isFengchengQuiz ? phaseNo : undefined} /> })
    }
    return items
  }, [activity, activeKey, canViewAnswers, isFengchengQuiz, phaseNo, viewMap])

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
      description={isFengchengQuiz ? `当前查看第 ${phaseNo} 期的参与用户、题库、答题记录和成绩数据。题库导入请使用上方独立「题库导入」页签。` : '当前活动的参与用户、题库、答题记录和成绩数据。题库导入请使用上方独立「题库导入」页签。'}
      views={tabs.map((item) => ({ viewKey: item.key, label: item.label }))}
      activeViewKey={activeKey}
      onChangeView={setActiveKey}
      error={error}
      loading={loading}
    >
      {isFengchengQuiz ? <FengchengPhasePanel activity={activity} phaseNo={phaseNo} onChangePhase={setPhaseNo} /> : null}
      {tabs.find((item) => item.key === activeKey)?.children || null}
    </AdminDataViewShell>
  )
}

function FengchengPhasePanel({ activity, phaseNo, onChangePhase }) {
  const [settings, setSettings] = useState(null)
  const [activePhaseNo, setActivePhaseNo] = useState(2)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [scheduleDraft, setScheduleDraft] = useState({ startTime: '', endTime: '' })

  async function loadSettings() {
    setLoading(true)
    try {
      const result = await getFengchengQuizPhaseSettings(activity.activityKey)
      setSettings(result)
      setActivePhaseNo(result.activePhaseNo)
      onChangePhase(result.activePhaseNo)
    } catch (err) {
      message.error(err.message || '期次配置加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [activity.activityKey])

  useEffect(() => {
    const current = settings?.phases?.find((item) => item.phaseNo === phaseNo)
    setScheduleDraft({
      startTime: toDateTimeLocalValue(current?.startTime),
      endTime: toDateTimeLocalValue(current?.endTime),
    })
  }, [phaseNo, settings])

  async function saveActivePhase() {
    setSaving(true)
    try {
      const result = await updateFengchengQuizActivePhase(activity.activityKey, activePhaseNo)
      setSettings((current) => current ? { ...current, activePhaseNo: result.activePhaseNo } : current)
      onChangePhase(result.activePhaseNo)
      message.success(`已切换为第 ${result.activePhaseNo} 期，用户端刷新后生效`)
    } catch (err) {
      message.error(err.message || '活动期次切换失败')
    } finally {
      setSaving(false)
    }
  }

  async function saveSchedule() {
    setScheduleSaving(true)
    try {
      const result = await updateFengchengQuizPhaseSchedule(activity.activityKey, phaseNo, {
        startTime: toScheduleIso(scheduleDraft.startTime),
        endTime: toScheduleIso(scheduleDraft.endTime),
      })
      setSettings((current) => current ? {
        ...current,
        phases: current.phases.map((item) => item.phaseNo === phaseNo ? { ...item, startTime: result.startTime, endTime: result.endTime } : item),
      } : current)
      message.success(`第 ${phaseNo} 期时间已保存`)
    } catch (err) {
      message.error(err.message || '期次时间保存失败')
    } finally {
      setScheduleSaving(false)
    }
  }

  async function clearPhaseData() {
    setClearing(true)
    try {
      const result = await clearFengchengQuizPhaseData(activity.activityKey, phaseNo)
      await loadSettings()
      message.success(`已清空第 ${phaseNo} 期 ${result.attempts || 0} 条答题记录`)
    } catch (err) {
      message.error(err.message || '清空本期数据失败')
    } finally {
      setClearing(false)
    }
  }

  const phaseCount = settings?.phaseCount || 6
  const options = Array.from({ length: phaseCount }, (_, index) => ({ value: index + 1, label: `第 ${index + 1} 期` }))
  const currentPhase = settings?.phases?.find((item) => item.phaseNo === phaseNo)
  const pendingActivePhase = settings?.phases?.find((item) => item.phaseNo === activePhaseNo)

  return (
    <Card size="small" loading={loading} style={{ marginBottom: 16 }}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space wrap align="center">
          <Text strong>凤城亲子时政挑战 · 期次管理</Text>
          <Tag color="blue">当前活动：第 {settings?.activePhaseNo || 2} 期</Tag>
          <Text type="secondary">活动期次决定用户端题库与每人本期答题资格。</Text>
        </Space>
        <Space wrap align="center">
          <Text>当前活动期次</Text>
          <Select value={activePhaseNo} options={options} onChange={setActivePhaseNo} style={{ width: 128 }} />
          <Button type="primary" disabled={Boolean(settings && !pendingActivePhase?.questionCount)} loading={saving} onClick={saveActivePhase}>保存并切换</Button>
          <Text type="secondary">{settings && !pendingActivePhase?.questionCount ? `第 ${activePhaseNo} 期尚未配置题库，不能开启。` : '第 3–6 期需先配置对应题库后再开启。'}</Text>
        </Space>
        <Space wrap align="center">
          <Text>数据查看期次</Text>
          <Select value={phaseNo} options={options} onChange={onChangePhase} style={{ width: 128 }} />
          <Text type="secondary">
            当前第 {phaseNo} 期：{currentPhase?.questionCount || 0} 题，{currentPhase?.attemptCount || 0} 次答题，{currentPhase?.finishedAttemptCount || 0} 次完成。
          </Text>
        </Space>
        <Space wrap align="center">
          <Text>本期开始时间</Text>
          <Input type="datetime-local" value={scheduleDraft.startTime} onChange={(event) => setScheduleDraft((current) => ({ ...current, startTime: event.target.value }))} style={{ width: 210 }} />
          <Text>结束时间</Text>
          <Input type="datetime-local" value={scheduleDraft.endTime} onChange={(event) => setScheduleDraft((current) => ({ ...current, endTime: event.target.value }))} style={{ width: 210 }} />
          <Button loading={scheduleSaving} onClick={saveSchedule}>保存本期时间</Button>
          <Text type="secondary">留空表示不限制该期时间；时间到后不可开始新答题。</Text>
        </Space>
        <Space wrap align="center">
          <Popconfirm
            title={`确认清空第 ${phaseNo} 期答题数据？`}
            description="将删除本期答题记录、答题明细和排行榜数据；题库、期次时间和学生资料会保留。"
            okText="确认清空"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={clearPhaseData}
          >
            <Button danger loading={clearing}>清空本期答题数据</Button>
          </Popconfirm>
          <Text type="secondary">此操作不可恢复。</Text>
        </Space>
      </Space>
    </Card>
  )
}

function toDateTimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toScheduleIso(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}

function QuizOverviewPanel({ activity, view, active, phaseNo }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    setError('')
    getQuizAdminOverview(activity.activityKey, phaseNo ? { phaseNo: String(phaseNo) } : {})
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
  }, [active, activity.activityKey, phaseNo])

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

function QuizParticipantsTable({ activity, view, active, phaseNo }) {
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
    getDataRows(activity.activityKey, 'participants', { page: String(page), pageSize: String(pageSize), keyword, phaseNo: phaseNo ? String(phaseNo) : undefined })
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
  }, [active, activity.activityKey, keyword, page, phaseNo])

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

function QuizCategoryTable({ activity, view, active, phaseNo }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hiddenColumns, setHiddenColumns] = useState({})

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    setError('')
    getQuizAdminCategories(activity.activityKey, phaseNo ? { phaseNo: String(phaseNo) } : {})
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
  }, [active, activity.activityKey, phaseNo])

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

function QuizQuestionTable({ activity, view, active, phaseNo }) {
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
    getQuizAdminCategories(activity.activityKey, phaseNo ? { phaseNo: String(phaseNo) } : {}).then((result) => setCategories(result.list || [])).catch(() => setCategories([]))
  }, [active, activity.activityKey, phaseNo])

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    setError('')
    getQuizAdminQuestions(activity.activityKey, { page: String(page), pageSize: String(pageSize), keyword, type, categoryId, phaseNo: phaseNo ? String(phaseNo) : undefined })
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
  }, [active, activity.activityKey, categoryId, keyword, page, phaseNo, type])

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

function QuizAttemptTable({ activity, view, answerView, active, canViewAnswers, phaseNo }) {
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
    getQuizAdminAttempts(activity.activityKey, { page: String(page), pageSize: String(pageSize), keyword, status, phaseNo: phaseNo ? String(phaseNo) : undefined })
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
  }, [active, activity.activityKey, keyword, page, phaseNo, status])

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

function QuizRankTable({ activity, view, active, phaseNo }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ list: [], total: 0, page, pageSize })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hiddenColumns, setHiddenColumns] = useState({})
  const [viewMeta, setViewMeta] = useState(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const currentView = viewMeta || view
  const rankFields = currentView?.fields || []
  const visibleFields = rankFields.filter((field) => !hiddenColumns[(field.fieldKey || field.key)])
  const exportableFieldKeys = visibleFields
    .filter((field) => field.canExport)
    .map((field) => field.fieldKey || field.key)
  const exportDisabled = !(viewMeta?.exportable === true)

  useEffect(() => {
    if (!active) return
    let alive = true
    setViewMeta(null)
    setSchemaLoading(true)
    getDataSchema(activity.activityKey)
      .then((schema) => {
        if (!alive) return
        const nextView = normalizeSchemaViews(schema?.views || []).find((item) => item.viewKey === QUIZ_RANK_VIEW_KEY) || null
        console.log('viewMeta', nextView)
        setViewMeta(nextView)
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
  }, [active, activity.activityKey])

  useEffect(() => {
    if (!active) return
    let alive = true
    setLoading(true)
    setError('')
    getQuizAdminRank(activity.activityKey, { page: String(page), pageSize: String(pageSize), phaseNo: phaseNo ? String(phaseNo) : undefined })
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
  }, [active, activity.activityKey, page, phaseNo])

  async function handleExport() {
    if (exportDisabled) return
    setExporting(true)
    setError('')
    try {
      const payload = {
        fields: exportableFieldKeys.length ? exportableFieldKeys : undefined,
        phaseNo: phaseNo ? String(phaseNo) : undefined,
      }
      const result = await exportDataRows(activity.activityKey, QUIZ_RANK_VIEW_KEY, payload)
      downloadCsv(result.filename || `${activity.activityKey}-${QUIZ_RANK_VIEW_KEY}.csv`, result.csv || '')
      message.success('CSV 已导出')
    } catch (err) {
      const text = getExportErrorMessage(err)
      setError(text)
      message.error(text)
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminTableBlock
      error={error}
      toolbar={(
        <AdminDataToolbar
          showColumns={Boolean(rankFields.length)}
          columnOptions={rankFields.map((field) => ({ label: field.label, value: field.fieldKey || field.key }))}
          selectedColumnKeys={rankFields.filter((field) => !hiddenColumns[(field.fieldKey || field.key)]).map((field) => field.fieldKey || field.key)}
          onChangeColumns={(keys) => {
            const selected = new Set(keys)
            setHiddenColumns(Object.fromEntries(rankFields.map((field) => [field.fieldKey || field.key, !selected.has(field.fieldKey || field.key)])))
          }}
          exportDisabled={exportDisabled}
          exporting={exporting}
          onExport={handleExport}
          exportTooltip={exportDisabled ? '当前账号无导出权限' : ''}
        />
      )}
      tableProps={{
        rowKey: (row) => `${row.rank}-${row.userId}`,
        columns: buildAdminColumnsFromSchema({ ...currentView, fields: visibleFields }),
        dataSource: data.list || [],
        loading: loading || schemaLoading,
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

function normalizeSchemaViews(views) {
  return (views || []).map((view) => ({
    ...view,
    viewKey: normalizeAdminViewKey(view?.viewKey),
  }))
}

function normalizeAdminViewKey(viewKey) {
  if (viewKey === 'quiz' || viewKey === 'quizRank' || viewKey === 'quiz-rank' || viewKey === 'quiz_rank_v2') {
    return QUIZ_RANK_VIEW_KEY
  }
  return viewKey
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
