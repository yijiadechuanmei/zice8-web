import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Row, Statistic, Table, Typography } from 'antd'
import { getPinganFamilyAnalytics } from '../api'

const prizeNames = { backpack: '背包', pillow_blanket: '抱枕被', sun_hat: '防晒帽' }
const periodNames = {
  '2026-11-25': '11月25日',
  '2026-11-26': '11月26日',
  '2026-11-27': '11月27日',
}

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

  const periodRows = data?.drawPeriods ? Object.entries(data.drawPeriods).map(([periodKey, period]) => ({
    periodKey,
    winRate: period.winRate,
    ...Object.fromEntries(Object.keys(prizeNames).map((code) => [code, {
      quota: period.quotas[code] || 0,
      issued: data.issued?.[periodKey]?.[code] || 0,
    }])),
  })) : []
  const plannedPrizes = data?.drawPeriods ? Object.values(data.drawPeriods).reduce((sum, period) => sum + Object.values(period.quotas).reduce((count, quota) => count + quota, 0), 0) : 0

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
        <Col xs={12} md={6}><Statistic title="计划奖品总数" value={plannedPrizes} /></Col>
        <Col xs={12} md={6}><Statistic title="实际中奖比例" value={data.actualWinRate} precision={2} suffix="%" /></Col>
        <Col xs={12} md={6}><Statistic title="抽奖次数" value={data.lottery.draws} /></Col>
        <Col xs={12} md={6}><Statistic title="有效中奖" value={data.lottery.wins} /></Col>
      </Row>
      <Typography.Text type="secondary">每日设定概率见下表。实际中奖比例为有效中奖数除以抽奖次数；当日奖品发完后暂停抽奖，不消耗未用资格。</Typography.Text>
      <Row gutter={[12, 12]} style={{ marginTop: 18, marginBottom: 18 }}>
        {metrics.map(([title, value]) => <Col xs={12} md={8} xl={6} key={title}><Card size="small"><Statistic title={title} value={value} /></Card></Col>)}
      </Row>
      <Table rowKey="code" size="small" pagination={false} dataSource={data.prizes} columns={[
        { title: '奖品', dataIndex: 'name' },
        { title: '总库存', dataIndex: 'totalStock' },
        { title: '已发放', dataIndex: 'issuedCount' },
        { title: '剩余库存', render: (_, row) => row.totalStock - row.issuedCount },
      ]} />
      <Table style={{ marginTop: 12 }} rowKey="periodKey" size="small" pagination={false} scroll={{ x: 780 }} dataSource={periodRows} columns={[
        { title: '抽奖日期', dataIndex: 'periodKey', width: 145, render: (value) => periodNames[value] || value },
        { title: '设定概率', dataIndex: 'winRate', width: 100, render: (value) => `${value}%` },
        ...Object.entries(prizeNames).map(([code, name]) => ({ title: name, dataIndex: code, render: (value) => `${value.issued} / ${value.quota}（余 ${Math.max(0, value.quota - value.issued)}）` })),
      ]} />
    </>}
  </Card>
}
