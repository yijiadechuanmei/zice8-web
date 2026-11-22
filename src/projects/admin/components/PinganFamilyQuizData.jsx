import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Descriptions, Drawer, Input, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd'
import { getPinganFamilyAnalytics, getPinganFamilyChallengeDetail, getPinganFamilyChallenges } from '../api'

const names = { backpack: '背包', pillow_blanket: '抱枕被', sun_hat: '防晒帽' }
const status = { active: '进行中', stage_failed: '关卡未通过', completed: '闯关成功' }
const time = (value) => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '—'

export default function PinganFamilyQuizData({ activityKey }) {
  const [analytics, setAnalytics] = useState(null)
  const [statsError, setStatsError] = useState('')
  const [records, setRecords] = useState({ rows: [], pagination: { total: 0 } })
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [draftKeyword, setDraftKeyword] = useState('')
  const [keyword, setKeyword] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [date, setDate] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const queryKey = JSON.stringify([activityKey, page, keyword, filterStatus, date])
  const loading = records.queryKey !== queryKey

  useEffect(() => {
    let alive = true
    getPinganFamilyAnalytics(activityKey)
      .then((result) => { if (alive) setAnalytics(result) })
      .catch((failure) => { if (alive) setStatsError(failure.message || '统计加载失败') })
    return () => { alive = false }
  }, [activityKey])

  useEffect(() => {
    let alive = true
    getPinganFamilyChallenges(activityKey, { page, pageSize: 20, keyword, status: filterStatus, date })
      .then((result) => { if (alive) { setRecords({ ...result, queryKey }); setError('') } })
      .catch((failure) => { if (alive) { setRecords((current) => ({ ...current, queryKey })); setError(failure.message || '答题记录加载失败') } })
    return () => { alive = false }
  }, [activityKey, page, keyword, filterStatus, date, queryKey])

  async function showDetail(id) {
    setDetail({ id, answers: [] })
    setDetailLoading(true)
    setDetailError('')
    try { setDetail(await getPinganFamilyChallengeDetail(activityKey, id)) }
    catch (failure) { setDetailError(failure.message || '逐题记录加载失败') }
    finally { setDetailLoading(false) }
  }

  const prizeRows = analytics?.prizes || []
  const dailyRows = analytics ? Object.entries(analytics.dailyQuotas).map(([day, quota]) => ({
    day,
    ...Object.fromEntries(Object.keys(names).map((code) => [code, { quota: quota[code] || 0, issued: analytics.issued?.[day]?.[code] || 0 }])),
  })) : []
  const quizColumns = [
    { title: '微信用户 ID', dataIndex: 'userId', width: 125 },
    { title: '姓名', dataIndex: 'name', width: 100, render: (value) => value || '—' },
    { title: '手机号', dataIndex: 'phone', width: 140, render: (value) => value || '—' },
    { title: '答题日期', dataIndex: 'challengeDate', width: 115, render: (value) => value?.slice(0, 10) },
    { title: '进度', width: 90, render: (_, row) => `第 ${row.stage} 关` },
    { title: '状态', dataIndex: 'status', width: 115, render: (value) => <Tag color={value === 'completed' ? 'green' : value === 'stage_failed' ? 'orange' : 'blue'}>{status[value] || value}</Tag> },
    { title: '已答/错误/超时', width: 155, render: (_, row) => `${row.answers} / ${row.wrong} / ${row.timedOut}` },
    { title: '开始时间', dataIndex: 'createdAt', width: 180, render: time },
    { title: '完成时间', dataIndex: 'completedAt', width: 180, render: time },
    { title: '逐题记录', width: 100, render: (_, row) => <Button type="link" onClick={() => showDetail(row.id)}>查看</Button> },
  ]

  return <>
    {statsError && <Alert type="error" showIcon message={statsError} style={{ marginBottom: 12 }} />}
    {analytics && <>
      <Card title="答题与抽奖统计" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}><Statistic title="答题用户" value={analytics.quiz.users} /></Col>
          <Col xs={12} md={6}><Statistic title="发起闯关" value={analytics.quiz.challenges} /></Col>
          <Col xs={12} md={6}><Statistic title="成功通关" value={analytics.quiz.completed} /></Col>
          <Col xs={12} md={6}><Statistic title="累计作答" value={analytics.quiz.answers} /></Col>
          <Col xs={12} md={6}><Statistic title="答对" value={analytics.quiz.correct} /></Col>
          <Col xs={12} md={6}><Statistic title="答错（含超时）" value={analytics.quiz.wrong} /></Col>
          <Col xs={12} md={6}><Statistic title="其中超时" value={analytics.quiz.timedOut} /></Col>
          <Col xs={12} md={6}><Statistic title="发放抽奖机会" value={analytics.lottery.chances} /></Col>
          <Col xs={12} md={6}><Statistic title="当前可用机会" value={analytics.lottery.unusedChances} /></Col>
          <Col xs={12} md={6}><Statistic title="中奖后失效机会" value={analytics.lottery.invalidatedChances} /></Col>
          <Col xs={12} md={6}><Statistic title="已抽奖" value={analytics.lottery.draws} /></Col>
          <Col xs={12} md={6}><Statistic title="已中奖 / 已兑奖" value={`${analytics.lottery.wins} / ${analytics.lottery.redeemed}`} /></Col>
        </Row>
      </Card>
      <Card title="中奖概率与奖品发放" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}><Statistic title="设定中奖概率" value={analytics.configuredWinRate} precision={2} suffix="%" /></Col>
          <Col xs={12} md={6}><Statistic title="实际中奖比例" value={analytics.actualWinRate} precision={2} suffix="%" /></Col>
          <Col xs={12} md={6}><Statistic title="抽奖次数" value={analytics.lottery.draws} /></Col>
          <Col xs={12} md={6}><Statistic title="有效中奖数" value={analytics.lottery.wins} /></Col>
        </Row>
        <Typography.Text type="secondary">实际中奖比例 = 有效中奖数 ÷ 抽奖次数。奖品或当日配额用尽后，实际比例可能低于设定概率。</Typography.Text>
        <Table style={{ marginTop: 12 }} rowKey="code" size="small" pagination={false} dataSource={prizeRows} columns={[
          { title: '奖品', dataIndex: 'name' },
          { title: '总库存', dataIndex: 'totalStock' },
          { title: '已发放', dataIndex: 'issuedCount' },
          { title: '剩余库存', render: (_, row) => row.totalStock - row.issuedCount },
        ]} />
        <Table style={{ marginTop: 12 }} rowKey="day" size="small" pagination={false} scroll={{ x: 680 }} dataSource={dailyRows} columns={[
          { title: '日期', dataIndex: 'day', width: 145 },
          ...Object.keys(names).map((code) => ({ title: names[code], dataIndex: code, render: (value) => `${value.issued} / ${value.quota}（余 ${Math.max(0, value.quota - value.issued)}）` })),
        ]} />
      </Card>
    </>}
    <Card title="用户答题记录" size="small" extra={<Space wrap>
      <Input.Search allowClear placeholder="微信用户 ID、姓名、手机号" style={{ width: 240 }} value={draftKeyword} onChange={(event) => setDraftKeyword(event.target.value)} onSearch={(value) => { setKeyword(value.trim()); setPage(1) }} />
      <Select style={{ width: 130 }} value={filterStatus} options={[{ value: '', label: '全部状态' }, ...Object.entries(status).map(([value, label]) => ({ value, label }))]} onChange={(value) => { setFilterStatus(value); setPage(1) }} />
      <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1) }} aria-label="答题日期" style={{ height: 32, border: '1px solid #d9d9d9', borderRadius: 6, padding: '0 8px' }} />
    </Space>}>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      <Table rowKey="id" loading={loading} dataSource={records.rows} columns={quizColumns} scroll={{ x: 1250 }} pagination={{ current: page, pageSize: 20, total: records.pagination.total, showSizeChanger: false, onChange: setPage }} />
      <Typography.Text type="secondary">逐题明细从本次升级后开始保存；升级前的答题记录可能只有闯关状态。</Typography.Text>
    </Card>
    <Drawer title={`答题详情 · ${detail?.userId || ''}`} width={720} open={Boolean(detail)} onClose={() => setDetail(null)} loading={detailLoading}>
      {detailError && <Alert type="error" showIcon message={detailError} />}
      {detail && !detailLoading && <>
        <Descriptions size="small" column={2} items={[
          { key: 'user', label: '微信用户 ID', children: detail.userId },
          { key: 'status', label: '闯关状态', children: status[detail.status] || detail.status },
          { key: 'start', label: '开始时间', children: time(detail.createdAt) },
          { key: 'end', label: '完成时间', children: time(detail.completedAt) },
        ]} />
        {!detail.historyAvailable && <Alert type="info" showIcon message="此轮没有逐题日志。升级前的历史答题无法还原具体答案。" />}
        {detail.answers.map((answer) => <Card key={answer.id} size="small" style={{ marginTop: 12 }} title={`第 ${answer.stage} 关 · 第 ${answer.attemptNo} 次 · 第 ${answer.questionIndex} 题`} extra={<Tag color={answer.correct ? 'green' : answer.timedOut ? 'orange' : 'red'}>{answer.timedOut ? '超时' : answer.correct ? '正确' : '错误'}</Tag>}>
          <p style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>{answer.questionTitle}</p>
          <div>{Array.isArray(answer.options) && answer.options.map((option, index) => <div key={index}>{'ABCD'[index]}. {option}</div>)}</div>
          <Space wrap style={{ marginTop: 12 }}><Typography.Text>用户选择：{answer.selectedOption || '未作答'}</Typography.Text><Typography.Text>正确答案：{answer.correctOption}</Typography.Text><Typography.Text>用时：{(answer.responseMs / 1000).toFixed(1)} 秒</Typography.Text><Typography.Text>作答时间：{time(answer.answeredAt)}</Typography.Text></Space>
        </Card>)}
      </>}
    </Drawer>
  </>
}
