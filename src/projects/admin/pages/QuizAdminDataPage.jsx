import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Descriptions, Drawer, Empty, Input, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from 'antd'
import { EyeOutlined, SearchOutlined } from '@ant-design/icons'
import {
  getDataRows,
  getQuizAdminAttemptAnswers,
  getQuizAdminAttempts,
  getQuizAdminCategories,
  getQuizAdminOverview,
  getQuizAdminQuestions,
  getQuizAdminRank,
} from '../api'
import QuizQuestionImportPage from './QuizQuestionImportPage'

const { Text, Title } = Typography
const pageSize = 20

export default function QuizAdminDataPage({ activity }) {
  const [activeKey, setActiveKey] = useState('participants')

  return (
    <Card className="admin-card">
      <div className="admin-page-head">
        <div>
          <Title level={4}>Quiz 数据表</Title>
          <Text type="secondary">当前活动的参与用户、题库、答题记录和成绩数据。</Text>
        </div>
      </div>
      <Tabs
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          { key: 'participants', label: '参与用户', children: <QuizParticipantsTable activity={activity} active={activeKey === 'participants'} /> },
          { key: 'import', label: '题库导入', children: <QuizQuestionImportPage activity={activity} lockActivityKey /> },
          { key: 'overview', label: '基础统计', children: <QuizOverviewPanel activity={activity} active={activeKey === 'overview'} /> },
          { key: 'questions', label: '题目列表', children: <QuizQuestionTable activity={activity} active={activeKey === 'questions'} /> },
          { key: 'categories', label: '分类板块', children: <QuizCategoryTable activity={activity} active={activeKey === 'categories'} /> },
          { key: 'attempts', label: '答题记录', children: <QuizAttemptTable activity={activity} active={activeKey === 'attempts'} /> },
          { key: 'rank', label: '排行榜', children: <QuizRankTable activity={activity} active={activeKey === 'rank'} /> },
        ]}
      />
    </Card>
  )
}

function QuizOverviewPanel({ activity, active }) {
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

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div className="admin-quiz-kpis">
        {[
          ['题目数', data?.questionCount],
          ['分类数', data?.categoryCount],
          ['参与人数', data?.participantCount],
          ['完成次数', data?.finishedAttemptCount],
          ['最高分', data?.maxScore],
          ['平均分', data?.averageScore],
        ].map(([label, value]) => (
          <Card key={label} size="small" loading={loading}>
            <Statistic title={label} value={value ?? 0} />
          </Card>
        ))}
      </div>
      <Descriptions bordered size="small" column={3}>
        <Descriptions.Item label="选项数">{data?.optionCount ?? 0}</Descriptions.Item>
        <Descriptions.Item label="单选题">{data?.singleQuestionCount ?? 0}</Descriptions.Item>
        <Descriptions.Item label="多选题">{data?.multipleQuestionCount ?? 0}</Descriptions.Item>
        <Descriptions.Item label="答题次数">{data?.attemptCount ?? 0}</Descriptions.Item>
        <Descriptions.Item label="未完成次数">{data?.abandonedAttemptCount ?? 0}</Descriptions.Item>
        <Descriptions.Item label="排行榜人数">{data?.rankCount ?? 0}</Descriptions.Item>
        <Descriptions.Item label="平均用时">{formatDuration(data?.averageTimeMs)}</Descriptions.Item>
      </Descriptions>
    </Space>
  )
}

function QuizParticipantsTable({ activity, active }) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ rows: [], pagination: { page: 1, pageSize, total: 0 } })
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

  const columns = [
    { title: '参与ID', dataIndex: 'participantId', key: 'participantId', width: 100 },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 120, render: emptyText },
    { title: '部门', dataIndex: 'department', key: 'department', width: 160, render: emptyText },
    { title: '微信昵称', dataIndex: 'nickname', key: 'nickname', width: 160, render: emptyText },
    { title: '资料状态', dataIndex: 'profileCompleted', key: 'profileCompleted', width: 110, render: (value) => (value ? <Tag color="green">已完善</Tag> : <Tag color="orange">未完善</Tag>) },
    { title: '参与时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: formatDate },
  ]

  return (
    <TableBlock
      error={error}
      toolbar={<Input.Search allowClear prefix={<SearchOutlined />} placeholder="搜索姓名 / 部门" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} style={{ width: 260 }} />}
      tableProps={{
        rowKey: (row, index) => row.participantId || `participant-${index}`,
        columns,
        dataSource: data.rows,
        loading,
        pagination: pagination(data.pagination, page, setPage),
      }}
    />
  )
}

function QuizCategoryTable({ activity, active }) {
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
        columns: [
          { title: '分类ID', dataIndex: 'id', key: 'id', width: 110 },
          { title: '分类名称', dataIndex: 'name', key: 'name' },
          { title: '排序', dataIndex: 'sort', key: 'sort', width: 90 },
          { title: '题目数', dataIndex: 'questionCount', key: 'questionCount', width: 110 },
          { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: statusTag },
          { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170, render: formatDate },
        ],
        dataSource: data,
        loading,
        pagination: false,
      }}
    />
  )
}

function QuizQuestionTable({ activity, active }) {
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
        columns: [
          { title: '题目ID', dataIndex: 'id', key: 'id', width: 100 },
          { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 150 },
          { title: '题型', dataIndex: 'type', key: 'type', width: 90, render: questionTypeTag },
          { title: '题目', dataIndex: 'title', key: 'title', width: 360, ellipsis: true },
          { title: '分数', dataIndex: 'score', key: 'score', width: 80 },
          { title: '正确答案', dataIndex: 'correctLabels', key: 'correctLabels', width: 120, render: labelsText },
          { title: '选项数', dataIndex: 'optionsCount', key: 'optionsCount', width: 90 },
          { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: statusTag },
          { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170, render: formatDate },
        ],
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

function QuizAttemptTable({ activity, active }) {
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
          columns: [
            { title: 'Attempt ID', dataIndex: 'attemptId', key: 'attemptId', width: 110 },
            { title: '姓名', dataIndex: 'name', key: 'name', width: 110 },
            { title: '部门', dataIndex: 'department', key: 'department', width: 150, render: emptyText },
            { title: '状态', dataIndex: 'status', key: 'status', width: 100, render: attemptStatusTag },
            { title: '总分', dataIndex: 'totalScore', key: 'totalScore', width: 80 },
            { title: '正确数', dataIndex: 'correctCount', key: 'correctCount', width: 80 },
            { title: '错误数', dataIndex: 'wrongCount', key: 'wrongCount', width: 80 },
            { title: '超时数', dataIndex: 'timeoutCount', key: 'timeoutCount', width: 80 },
            { title: '总用时', dataIndex: 'totalTimeMs', key: 'totalTimeMs', width: 100, render: formatDuration },
            { title: '开始时间', dataIndex: 'startedAt', key: 'startedAt', width: 170, render: formatDate },
            { title: '完成时间', dataIndex: 'finishedAt', key: 'finishedAt', width: 170, render: formatDate },
            { title: '操作', key: 'action', fixed: 'right', width: 110, render: (_, record) => <Button size="small" icon={<EyeOutlined />} onClick={() => openAnswers(record.attemptId)}>明细</Button> },
          ],
          dataSource: data.list || [],
          loading,
          pagination: pagination({ page: data.page, pageSize: data.pageSize, total: data.total }, page, setPage),
        }}
      />
      <Drawer title={`答案明细 #${drawer.attemptId}`} open={drawer.open} width={860} onClose={() => setDrawer({ open: false, attemptId: '', loading: false, list: [] })}>
        <Table
          rowKey={(row) => row.questionSort}
          size="small"
          loading={drawer.loading}
          columns={[
            { title: '题号', dataIndex: 'questionSort', key: 'questionSort', width: 70 },
            { title: '题目', dataIndex: 'questionTitle', key: 'questionTitle', ellipsis: true },
            { title: '题型', dataIndex: 'questionType', key: 'questionType', width: 90, render: questionTypeTag },
            { title: '用户选择', dataIndex: 'selectedLabels', key: 'selectedLabels', width: 110, render: labelsText },
            { title: '正确答案', dataIndex: 'correctLabels', key: 'correctLabels', width: 110, render: labelsText },
            { title: '结果', dataIndex: 'isCorrect', key: 'isCorrect', width: 90, render: (value) => (value ? <Tag color="green">正确</Tag> : <Tag color="red">错误</Tag>) },
            { title: '超时', dataIndex: 'isTimeout', key: 'isTimeout', width: 80, render: (value) => (value ? <Tag color="orange">是</Tag> : <Tag>否</Tag>) },
            { title: '得分', dataIndex: 'score', key: 'score', width: 70 },
            { title: '用时', dataIndex: 'timeMs', key: 'timeMs', width: 100, render: formatDuration },
          ]}
          dataSource={drawer.list}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无答案明细" /> }}
        />
      </Drawer>
    </>
  )
}

function QuizRankTable({ activity, active }) {
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
        columns: [
          { title: '排名', dataIndex: 'rank', key: 'rank', width: 80 },
          { title: '姓名', dataIndex: 'name', key: 'name', width: 120 },
          { title: '部门', dataIndex: 'department', key: 'department', render: emptyText },
          { title: '积分', dataIndex: 'totalScore', key: 'totalScore', width: 100 },
          { title: '用时', dataIndex: 'totalTimeMs', key: 'totalTimeMs', width: 120, render: formatDuration },
          { title: '完成次数', dataIndex: 'finishedAttemptCount', key: 'finishedAttemptCount', width: 110 },
          { title: '最后完成时间', dataIndex: 'lastFinishedAt', key: 'lastFinishedAt', width: 170, render: formatDate },
          { title: 'Participant ID', dataIndex: 'participantId', key: 'participantId', width: 130, render: emptyText },
          { title: 'User ID', dataIndex: 'userId', key: 'userId', width: 110 },
        ],
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
