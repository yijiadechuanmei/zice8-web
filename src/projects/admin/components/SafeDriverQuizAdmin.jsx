/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Alert, Card, Col, Input, Row, Statistic, Table, Tag } from 'antd'
import { getSafeDriverQuizAttempts, getSafeDriverQuizOverview } from '../api'

const statusLabel = { in_progress: '答题中', failed: '答错', eligible: '待抽奖', won: '已中奖', miss: '未中奖', abandoned: '已放弃' }

export default function SafeDriverQuizAdmin({ activity, overviewOnly = false }) {
  const [summary, setSummary] = useState(null)
  const [data, setData] = useState({ rows: [], pagination: { page: 1, pageSize: 20, total: 0 } })
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { getSafeDriverQuizOverview(activity.activityKey).then(setSummary).catch((e) => setError(e.message || '统计加载失败')) }, [activity.activityKey])
  useEffect(() => {
    if (overviewOnly) return
    setLoading(true)
    getSafeDriverQuizAttempts(activity.activityKey, { page, pageSize: 20, keyword })
      .then(setData).catch((e) => setError(e.message || '数据表加载失败')).finally(() => setLoading(false))
  }, [activity.activityKey, keyword, overviewOnly, page])

  const columns = [
    { title: '用户ID', dataIndex: 'userId', width: 100 },
    { title: '答题日期', dataIndex: 'attemptDate', width: 120, render: (v) => v ? new Date(v).toLocaleDateString('zh-CN') : '-' },
    { title: '答对题数', dataIndex: 'answerCount', width: 90 },
    { title: '状态', dataIndex: 'status', width: 100, render: (v) => <Tag color={v === 'won' ? 'green' : v === 'miss' || v === 'failed' ? 'default' : 'blue'}>{statusLabel[v] || v}</Tag> },
    { title: '姓名', dataIndex: 'claimName', width: 100, render: (v) => v || '-' },
    { title: '电话', dataIndex: 'claimPhone', width: 130, render: (v) => v || '-' },
    { title: '奖品', dataIndex: 'prizeCode', width: 180, render: (v) => ({ traffic_bear: '交警小熊', traffic_rabbit: '交警小兔', pingan_helmet: '平安产险&吉安交管联名头盔' })[v] || v || '-' },
    { title: '号牌种类', dataIndex: 'plateType', width: 220, render: (v) => v || '-' },
    { title: '车辆号码', dataIndex: 'plateNumber', width: 140, render: (v) => v || '-' },
    { title: '参与时间', dataIndex: 'createdAt', width: 180, render: (v) => v ? new Date(v).toLocaleString('zh-CN') : '-' },
  ]
  return <>
    {error && <Alert type="error" showIcon message={error} closable onClose={() => setError('')} />}
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      {[
        ['参与用户', summary?.participantCount], ['答题次数', summary?.attemptCount], ['全对次数', summary?.fullScoreCount],
        ['抽奖次数', summary?.drawCount], ['中奖数量', summary?.winCount], ['已登记资料', summary?.claimCount], ['奖品剩余', summary?.stockRemaining],
      ].map(([title, value]) => <Col xs={12} sm={8} lg={4} key={title}><Card size="small"><Statistic title={title} value={value ?? 0} /></Card></Col>)}
    </Row>
    {!overviewOnly && <Card title="答题与中奖记录" extra={<Input.Search allowClear placeholder="输入用户ID筛选" value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1) }} onSearch={() => setPage(1)} style={{ width: 220 }} />}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data.rows} scroll={{ x: 1200 }} pagination={{ current: page, pageSize: 20, total: data.pagination.total, showSizeChanger: false, onChange: setPage }} />
    </Card>}
  </>
}
