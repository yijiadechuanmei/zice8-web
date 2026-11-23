import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Input, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography, message } from 'antd'
import { DownloadOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { getTrafficQuizAdminData, getTrafficQuizAdminOverview } from '../api'

const { Text } = Typography
const pageSize = 20
const dateTime = (value) => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '—'
const seconds = (value) => `${(Number(value || 0) / 1000).toFixed(1)} 秒`
const longText = (value) => <Text ellipsis={{ tooltip: value }} style={{ maxWidth: 280 }}>{value || '—'}</Text>
const imageLink = (value) => value ? <a href={value} target="_blank" rel="noreferrer">查看图片</a> : '—'
const statusText = (value) => value === 'completed' ? '已完成' : value === 'in_progress' ? '进行中' : value
const statusTag = (value) => <Tag color={value === 'completed' || value === '启用' ? 'green' : 'default'}>{statusText(value)}</Tag>
const col = (title, dataIndex, width = 120, render) => ({ title, dataIndex, key: dataIndex, width, render })
const dateCol = (title, key) => col(title, key, 170, dateTime)
const durationCol = (title, key) => col(title, key, 105, seconds)

const views = [
  { key: 'participants', label: '参与用户', columns: [col('提交姓名', 'name', 120, (value) => value || '未提交'), col('提交手机号', 'phone', 150, (value) => value || '未提交'), col('号牌种类', 'vehiclePlateType', 110, (value) => value || '未提交'), col('车辆号码', 'vehicleNumber', 150, (value) => value || '未提交'), col('用户ID', 'userId', 100), col('微信昵称', 'nickname', 170), dateCol('参与时间', 'joinedAt'), col('挑战次数', 'attemptCount'), col('累计积分', 'totalScore'), durationCol('累计用时', 'totalTimeMs'), dateCol('最近开始', 'lastStartedAt')] },
  { key: 'attempts', label: '每次挑战', statusOptions: [{ value: 'in_progress', label: '进行中' }, { value: 'completed', label: '已完成' }], columns: [col('挑战ID', 'id', 100), col('用户ID', 'userId', 100), col('微信昵称', 'nickname', 170), col('日期', 'attemptDate', 130, (value) => value ? String(value).slice(0, 10) : '—'), col('状态', 'status', 100, statusTag), col('已答题', 'answered'), col('当前题序', 'currentQuestionSort'), dateCol('当前题开始', 'currentQuestionStartedAt'), col('得分', 'score'), col('答对', 'correct'), col('答错', 'wrong'), col('超时', 'timeout'), durationCol('累计用时', 'totalTimeMs'), dateCol('开始时间', 'startedAt'), dateCol('结束时间', 'finishedAt')] },
  { key: 'answers', label: '逐题答案', columns: [col('答案ID', 'id', 100), col('挑战ID', 'attemptId', 100), col('用户ID', 'userId', 100), col('微信昵称', 'nickname', 160), col('题序', 'questionNo'), col('题目ID', 'questionId', 100), col('题目', 'question', 300, longText), col('所选', 'selected', 75), col('所选内容', 'selectedText', 240, longText), col('正确答案', 'correctAnswer', 90), col('正确内容', 'correctText', 240, longText), col('结果', 'correct', 90, (value, row) => <Tag color={value ? 'green' : 'red'}>{value ? '正确' : row.timeout ? '超时' : '错误'}</Tag>), durationCol('答题用时', 'usedTimeMs'), dateCol('作答时间', 'answeredAt'), col('解析', 'analysis', 280, longText)] },
  { key: 'rankings', label: '累计排名', columns: [col('排名', 'rank', 80, (value) => value ?? '—'), col('用户ID', 'userId', 100), col('微信昵称', 'nickname', 170), col('累计积分', 'totalScore'), durationCol('累计用时', 'totalTimeMs'), col('完成挑战', 'finishedAttemptCount'), dateCol('积分达成时间', 'scoreReachedAt')] },
  { key: 'questions', label: '题库', columns: [col('题目ID', 'id', 100), col('题目', 'title', 300, longText), col('图片', 'imageUrl', 100, imageLink), col('A', 'optionA', 230, longText), col('B', 'optionB', 230, longText), col('C', 'optionC', 230, longText), col('D', 'optionD', 230, longText), col('正确答案', 'answer', 95), col('解析', 'analysis', 280, longText), col('状态', 'status', 90, statusTag), dateCol('录入时间', 'createdAt')] },
  { key: 'resets', label: '本人重置记录', columns: [col('记录ID', 'id', 100), col('用户ID', 'userId', 100), col('微信昵称', 'nickname', 170), col('清除答案', 'answers'), col('清除挑战', 'attempts'), col('清除积分', 'scores'), col('清除参与', 'participants'), dateCol('重置时间', 'createdAt')] },
]

export function TrafficQuizOverview({ activity }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    let alive = true
    getTrafficQuizAdminOverview(activity.activityKey)
      .then((result) => { if (alive) { setData(result); setError('') } })
      .catch((err) => { if (alive) { setData(null); setError(err.message || '统计加载失败') } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [activity.activityKey, refreshKey])

  const metrics = [
    ['PV', data?.pv, '活动入口访问次数，同一访客 30 秒内重复访问只统计一次'],
    ['UV', data?.uv, '按浏览器匿名访客 ID 去重'],
    ['今日 PV', data?.todayPv],
    ['今日 UV', data?.todayUv],
    ['参与人数', data?.participants, '按本活动参与用户去重'],
    ['挑战总次数', data?.attempts, '包括进行中与已完成'],
    ['已完成挑战', data?.completed],
    ['今日开始', data?.todayAttempts],
    ['今日完成', data?.todayCompleted],
    ['答对题数', data?.correct],
    ['答错题数', data?.wrong, '包含超时'],
    ['超时题数', data?.timeout],
    ['答题正确率', data?.correctRate, '按全部逐题答案计算', '%'],
    ['平均每次用时', data?.averageAttemptSeconds, '仅统计已完成挑战', '秒'],
  ]
  return <Space direction="vertical" size="middle" className="admin-traffic-quiz" style={{ width: '100%' }}>
    <Card className="admin-card" title="文明交通知识问答 · 统计" extra={<Button icon={<ReloadOutlined />} onClick={() => { setLoading(true); setRefreshKey((value) => value + 1) }}>刷新</Button>} loading={loading}>
      {error ? <Alert type="error" showIcon message={error} /> : <Row gutter={[12, 12]}>{metrics.map(([label, value, hint, suffix]) => <Col xs={12} md={8} xl={6} key={label}><Card size="small"><Statistic title={<span title={hint || ''}>{label}</span>} value={value ?? 0} suffix={suffix || undefined} /></Card></Col>)}</Row>}
    </Card>
  </Space>
}

function csvValue(value) {
  const string = value == null ? '' : String(value)
  const safe = /^[\s\uFEFF]*[=+\-@]/.test(string) ? `'${string}` : string
  return `"${safe.replaceAll('"', '""')}"`
}

export function TrafficQuizData({ activity }) {
  const [view, setView] = useState('participants')
  const [searchText, setSearchText] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ rows: [], pagination: { total: 0 } })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const active = useMemo(() => views.find((item) => item.key === view), [view])
  useEffect(() => {
    let alive = true
    getTrafficQuizAdminData(activity.activityKey, { view, page, pageSize, keyword, status })
      .then((result) => { if (alive) { setData(result); setError('') } })
      .catch((err) => { if (alive) { setData({ rows: [], pagination: { total: 0 } }); setError(err.message || '数据表加载失败') } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [activity.activityKey, view, page, keyword, status, refreshKey])

  const changeView = (next) => { setView(next); setPage(1); setKeyword(''); setSearchText(''); setStatus(''); setLoading(true) }
  const exportCsv = async () => {
    setExporting(true)
    try {
      const rows = []
      let exportPage = 1
      let total = 0
      do {
        const result = await getTrafficQuizAdminData(activity.activityKey, { view, page: exportPage, pageSize: 100, keyword, status })
        if (!result.rows.length && rows.length < total) throw new Error('导出期间数据发生变化，请重试')
        rows.push(...result.rows)
        total = result.pagination.total
        exportPage += 1
      } while (rows.length < total)
      const keys = active.columns.map((column) => column.dataIndex)
      const csv = '\ufeff' + [active.columns.map((column) => csvValue(column.title)).join(','), ...rows.map((row) => keys.map((key) => csvValue(row[key])).join(','))].join('\r\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `文明交通-${view}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      message.success(`已导出 ${rows.length} 条`)
    } catch (err) { message.error(err.message || '导出失败') }
    finally { setExporting(false) }
  }

  return <Card className="admin-card" title="文明交通知识问答 · 数据表" extra={<Button icon={<ReloadOutlined />} onClick={() => { setLoading(true); setRefreshKey((value) => value + 1) }}>刷新</Button>}>
    <Tabs activeKey={view} onChange={changeView} items={views.map((item) => ({ key: item.key, label: item.label }))} />
    <Space wrap style={{ marginBottom: 16 }}>
      <Input.Search value={searchText} onChange={(event) => { setSearchText(event.target.value); if (!event.target.value) { setKeyword(''); setPage(1) } }} onSearch={(value) => { setKeyword(value.trim()); setPage(1); setLoading(true) }} allowClear prefix={<SearchOutlined />} placeholder={view === 'questions' ? '搜索题目' : '搜索微信昵称或用户ID'} style={{ width: 270 }} />
      {active.statusOptions ? <Select allowClear placeholder="筛选状态" value={status || undefined} options={active.statusOptions} onChange={(value) => { setStatus(value || ''); setPage(1); setLoading(true) }} style={{ width: 150 }} /> : null}
      <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportCsv}>导出 CSV</Button>
    </Space>
    {error ? <Alert type="error" showIcon message={error} /> : null}
    <Table rowKey="id" size="small" columns={active.columns} dataSource={data.rows} loading={loading} scroll={{ x: 'max-content' }} pagination={{ current: page, pageSize, total: data.pagination.total, showSizeChanger: false, showTotal: (count) => `共 ${count} 条` }} onChange={(pagination) => { setPage(pagination.current || 1); setLoading(true) }} />
  </Card>
}
