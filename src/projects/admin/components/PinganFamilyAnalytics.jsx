import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Row, Statistic, Table, Typography } from 'antd'
import { getPinganFamilyAnalytics } from '../api'

const prizeNames = { backpack: '背包', pillow_blanket: '抱枕被', sun_hat: '防晒帽' }

export default function PinganFamilyAnalytics({ activityKey, refreshKey = 0 }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [manualRefresh, setManualRefresh] = useState(0)

  useEffect(() => {
    let alive = true
    getPinganFamilyAnalytics(activityKey)
      .then((result) => { if (alive) { setData(result); setError('') } })
      .catch((failure) => { if (alive) setError(failure.message || '活动统计加载失败') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [activityKey, refreshKey, manualRefresh])

  const dailyRows = data ? Object.entries(data.dailyQuotas).map(([day, quota]) => ({
    day,
    ...Object.fromEntries(Object.keys(prizeNames).map((code) => [code, {
      quota: quota[code] || 0,
      issued: data.issued?.[day]?.[code] || 0,
    }])),
  })) : []

  const metrics = data ? [
    ['答题用户', data.quiz.users], ['发起闯关', data.quiz.challenges],
    ['成功通关', data.quiz.completed], ['累计作答', data.quiz.answers],
    ['答对', data.quiz.correct], ['答错（含超时）', data.quiz.wrong],
    ['其中超时', data.quiz.timedOut], ['发放抽奖机会', data.lottery.chances],
    ['当前可用机会', data.lottery.unusedChances], ['中奖后失效机会', data.lottery.invalidatedChances],
    ['已登记中奖', data.lottery.registeredWinners], ['待填写信息', data.lottery.pendingProfile],
    ['已兑奖', data.lottery.redeemed],
  ] : []

  return <Card size="small" title="平安家庭活动统计" extra={<Button onClick={() => { setLoading(true); setManualRefresh((value) => value + 1) }}>刷新统计</Button>} loading={loading}>
    {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
    {data && <>
      <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
        <Col xs={12} md={6}><Statistic title="已保存中奖概率" value={data.configuredWinRate} precision={2} suffix="%" /></Col>
        <Col xs={12} md={6}><Statistic title="实际中奖比例" value={data.actualWinRate} precision={2} suffix="%" /></Col>
        <Col xs={12} md={6}><Statistic title="抽奖次数" value={data.lottery.draws} /></Col>
        <Col xs={12} md={6}><Statistic title="有效中奖" value={data.lottery.wins} /></Col>
      </Row>
      <Typography.Text type="secondary">实际中奖比例为有效中奖数除以抽奖次数；奖品或当日配额耗尽后，实际比例可能低于设定概率。</Typography.Text>
      <Row gutter={[12, 12]} style={{ marginTop: 18, marginBottom: 18 }}>
        {metrics.map(([title, value]) => <Col xs={12} md={8} xl={6} key={title}><Card size="small"><Statistic title={title} value={value} /></Card></Col>)}
      </Row>
      <Table rowKey="code" size="small" pagination={false} dataSource={data.prizes} columns={[
        { title: '奖品', dataIndex: 'name' },
        { title: '总库存', dataIndex: 'totalStock' },
        { title: '已发放', dataIndex: 'issuedCount' },
        { title: '剩余库存', render: (_, row) => row.totalStock - row.issuedCount },
      ]} />
      <Table style={{ marginTop: 12 }} rowKey="day" size="small" pagination={false} scroll={{ x: 680 }} dataSource={dailyRows} columns={[
        { title: '日期', dataIndex: 'day', width: 145 },
        ...Object.entries(prizeNames).map(([code, name]) => ({ title: name, dataIndex: code, render: (value) => `${value.issued} / ${value.quota}（余 ${Math.max(0, value.quota - value.issued)}）` })),
      ]} />
    </>}
  </Card>
}
