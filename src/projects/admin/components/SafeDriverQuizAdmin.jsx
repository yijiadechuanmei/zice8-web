/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Alert, Card, Col, Input, Row, Statistic, Table, Tabs, Tag } from 'antd'
import { getSafeDriverQuizAttempts, getSafeDriverQuizOverview } from '../api'

const statusLabel = { in_progress: '答题中', failed: '答题失败', eligible: '待抽奖', won: '已中奖', miss: '未中奖', abandoned: '已放弃' }
const time = (value) => value ? new Date(value).toLocaleString('zh-CN') : '-'
const status = (value) => <Tag color={value === 'won' ? 'green' : value === 'eligible' ? 'blue' : 'default'}>{statusLabel[value] || value}</Tag>
const text = (value) => value || '-'

const columns = {
  participants: [
    { title: '用户ID', dataIndex: 'userId', width: 140 },
    { title: '微信昵称', dataIndex: 'nickname', width: 160, render: text },
    { title: '参与次数', dataIndex: 'attemptCount', width: 110 },
    { title: '中奖', dataIndex: 'won', width: 90, render: (value) => value ? '是' : '否' },
    { title: '信息登记', dataIndex: 'claimSubmitted', width: 100, render: (value) => value ? '已登记' : '-' },
    { title: '最近参与时间', dataIndex: 'lastAttemptAt', width: 210, render: time },
  ],
  attempts: [
    { title: '用户ID', dataIndex: 'userId', width: 120 },
    { title: '答题日期', dataIndex: 'attemptDate', width: 130, render: (value) => value ? new Date(value).toLocaleDateString('zh-CN') : '-' },
    { title: '答对', dataIndex: 'answerCount', width: 80 },
    { title: '答错', dataIndex: 'wrongCount', width: 80 },
    { title: '状态', dataIndex: 'status', width: 120, render: status },
    { title: '参与时间', dataIndex: 'createdAt', width: 210, render: time },
  ],
  stock: [
    { title: '奖品', dataIndex: 'name', width: 250 },
    { title: '奖品代码', dataIndex: 'code', width: 150 },
    { title: '总库存', dataIndex: 'totalStock', width: 100 },
    { title: '已中奖', dataIndex: 'issuedCount', width: 100 },
    { title: '剩余', dataIndex: 'remainingCount', width: 100 },
    { title: '中奖概率', dataIndex: 'probabilityBps', width: 110, render: (value) => `${(value / 100).toFixed(2)}%` },
  ],
  winners: [
    { title: '用户ID', dataIndex: 'userId', width: 120 },
    { title: '奖品', dataIndex: 'prizeName', width: 230, render: text },
    { title: '登记状态', dataIndex: 'claimName', width: 110, render: (value) => <Tag color={value ? 'green' : 'orange'}>{value ? '已登记' : '待登记'}</Tag> },
    { title: '姓名', dataIndex: 'claimName', width: 110, render: text },
    { title: '电话', dataIndex: 'claimPhone', width: 140, render: text },
    { title: '号牌种类', dataIndex: 'plateType', width: 230, render: text },
    { title: '车辆号码', dataIndex: 'plateNumber', width: 150, render: text },
    { title: '中奖时间', dataIndex: 'createdAt', width: 210, render: time },
  ],
}

export default function SafeDriverQuizAdmin({ activity, overviewOnly = false }) {
  const [summary, setSummary] = useState(null)
  const [data, setData] = useState({ rows: [], pagination: { total: 0 } })
  const [view, setView] = useState('participants')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { getSafeDriverQuizOverview(activity.activityKey).then(setSummary).catch((err) => setError(err.message || '统计加载失败')) }, [activity.activityKey])
  useEffect(() => {
    if (overviewOnly) return
    let active = true
    setLoading(true)
    getSafeDriverQuizAttempts(activity.activityKey, { page, pageSize: 20, view, ...(view === 'stock' ? {} : { keyword }) })
      .then((result) => { if (active) setData(result) })
      .catch((err) => { if (active) setError(err.message || '数据表加载失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activity.activityKey, keyword, overviewOnly, page, view])

  return <>
    {error && <Alert type="error" showIcon message={error} closable onClose={() => setError('')} />}
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      {[
        ['参与用户', summary?.participantCount], ['答题次数', summary?.attemptCount], ['全对次数', summary?.fullScoreCount],
        ['抽奖次数', summary?.drawCount], ['中奖数量', summary?.winCount], ['已登记资料', summary?.claimCount], ['奖品剩余', summary?.stockRemaining],
      ].map(([title, value]) => <Col xs={12} sm={8} lg={4} key={title}><Card size="small"><Statistic title={title} value={value ?? 0} /></Card></Col>)}
    </Row>
    {!overviewOnly && <Card title="活动数据" extra={view !== 'stock' && <Input.Search allowClear placeholder="输入用户ID筛选" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} onSearch={() => setPage(1)} style={{ width: 220 }} />}>
      <Tabs activeKey={view} onChange={(key) => { setView(key); setPage(1) }} items={[
        { key: 'participants', label: '参与用户' }, { key: 'attempts', label: '答题详情' },
        { key: 'stock', label: '奖品库存' }, { key: 'winners', label: '中奖用户' },
      ]} />
      <Table rowKey={view === 'participants' ? 'userId' : view === 'stock' ? 'code' : 'id'} loading={loading} columns={columns[view]} dataSource={data.rows} scroll={{ x: view === 'winners' ? 1300 : 720 }} pagination={view === 'stock' ? false : { current: page, pageSize: 20, total: data.pagination.total, showSizeChanger: false, onChange: setPage }} expandable={view === 'attempts' ? { expandedRowRender: (row) => row.answerDetails?.length ? <Table size="small" pagination={false} rowKey="questionNo" dataSource={row.answerDetails} columns={[
        { title: '题号', dataIndex: 'questionNo', width: 70 },
        { title: '题目', dataIndex: 'question', width: 420 },
        { title: '用户答案', dataIndex: 'selected', width: 100 },
        { title: '正确答案', dataIndex: 'correctAnswer', width: 100 },
        { title: '结果', dataIndex: 'correct', width: 90, render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? '正确' : '错误'}</Tag> },
      ]} /> : '暂无逐题记录（旧数据未保存）', rowExpandable: () => true } : undefined} />
    </Card>}
  </>
}
