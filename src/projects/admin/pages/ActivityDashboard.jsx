/* eslint-disable react-hooks/set-state-in-effect */
import { Component, Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Row, Spin, Statistic, Tag, Tooltip, Typography } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { getAnalyticsFunnel, getAnalyticsLottery, getAnalyticsTrend, getCharts, getOverview } from '../api'
import AppointmentBookingMatrix from '../components/AppointmentBookingMatrix'

const AdminChart = lazy(() => import('../components/charts/AdminChart'))
const { Paragraph, Text, Title } = Typography

const pvHint = '页面访问次数，同一访客同一页面 30 秒内重复访问只统计一次。'
const uvHint = '按浏览器匿名访客 ID 去重统计。'

export default function ActivityDashboard({ activity, compact = false }) {
  const [overview, setOverview] = useState(null)
  const [charts, setCharts] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    Promise.all([getOverview(activity.activityKey), getCharts(activity.activityKey)])
      .then(([overviewData, chartData]) => {
        if (!alive) return
        setOverview(overviewData)
        setCharts(chartData)
      })
      .catch((err) => {
        if (alive) setError(err.message || '加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activity.activityKey])

  useEffect(() => {
    let alive = true
    if (compact || activity.type !== 'phase_quiz_lottery') {
      setAnalytics(null)
      return () => {
        alive = false
      }
    }

    Promise.allSettled([
      getAnalyticsFunnel(activity.activityKey),
      getAnalyticsLottery(activity.activityKey),
      getAnalyticsTrend(activity.activityKey),
    ])
      .then(([funnelResult, lotteryResult, trendResult]) => {
        if (!alive) return
        setAnalytics({
          funnel: funnelResult.status === 'fulfilled' ? funnelResult.value : null,
          lottery: lotteryResult.status === 'fulfilled' ? lotteryResult.value : null,
          trend: trendResult.status === 'fulfilled' ? trendResult.value : null,
          error:
            funnelResult.status === 'rejected' ||
            lotteryResult.status === 'rejected' ||
            trendResult.status === 'rejected'
              ? '部分分析数据加载失败'
              : '',
        })
      })

    return () => {
      alive = false
    }
  }, [activity.activityKey, activity.type, compact])

  const metrics = useMemo(() => {
    if (activity.type === 'appointment_visit') {
      return [
        { label: '白名单总数', value: overview?.whitelistTotal ?? 0 },
        { label: '已预约数', value: overview?.bookingTotal ?? 0 },
        { label: '未预约数', value: overview?.unbookedTotal ?? 0 },
        { label: '预约率', value: Math.round(Number(overview?.bookingRate ?? 0)), suffix: '%' },
        { label: `${overview?.currentDate || '当日'}预约数`, value: overview?.currentDateBookingTotal ?? 0 },
        { label: 'PV', value: overview?.pv ?? 0, tooltip: pvHint, hint: overview?.accessStats?.dataAvailable === false ? '暂无访问埋点数据' : '' },
        { label: 'UV', value: overview?.uv ?? 0, tooltip: uvHint, hint: overview?.accessStats?.dataAvailable === false ? '暂无访问埋点数据' : '' },
        { label: '核验成功', value: overview?.verifySuccessCount ?? 0 },
        { label: '核验失败', value: overview?.verifyFailedCount ?? 0 },
        { label: '预约成功', value: overview?.bookingSuccessCount ?? 0 },
        { label: '预约失败', value: overview?.bookingFailedCount ?? 0 },
      ]
    }

    const videoRank = overview?.videoRank || {}
    return [
      { label: 'PV', value: overview?.pv ?? 0, tooltip: pvHint, hint: overview?.accessStats?.dataAvailable === false ? '暂无访问埋点数据' : '' },
      { label: 'UV', value: overview?.uv ?? 0, tooltip: uvHint, hint: overview?.accessStats?.dataAvailable === false ? '暂无访问埋点数据' : '' },
      { label: '今日 PV', value: overview?.todayPv ?? 0, tooltip: pvHint },
      { label: '今日 UV', value: overview?.todayUv ?? 0, tooltip: uvHint },
      { label: '正式参与人数', value: overview?.participantCount || 0 },
      { label: '今日新增参与', value: overview?.todayParticipantCount || 0 },
      { label: '互动次数', value: overview?.interactionCount ?? overview?.submitCount ?? 0 },
      { label: '完成数', value: overview?.completionCount ?? videoRank.completedCount ?? 0 },
      { label: '完成率', value: Math.round(Number(overview?.completionRate ?? 0)), suffix: '%' },
    ]
  }, [activity.type, overview])

  const participantTrend = (charts?.participants?.trend || []).map((item) => ({ ...item, participants: item.value || 0 }))
  const commentTrend = (charts?.videoRank?.commentTrend || []).map((item) => ({ ...item, comments: item.value || 0 }))
  const rankTop10 = (charts?.videoRank?.rankTop10 || []).map((item) => ({
    ...item,
    name: item.name || '未填写姓名',
  }))
  const appointmentDateTrend = (charts?.appointment?.bookingByDate || []).map((item) => ({ ...item, bookings: item.value || 0 }))
  const appointmentSlotTrend = (charts?.appointment?.bookingBySlot || []).map((item) => ({ date: item.slot, bookings: item.value || 0 }))
  const funnelStages = useMemo(() => buildFunnelStages(analytics?.funnel), [analytics?.funnel])
  const lotteryStats = useMemo(() => buildLotteryStats(analytics?.lottery), [analytics?.lottery])
  const lotteryTrend = useMemo(() => buildLotteryTrend(analytics?.trend), [analytics?.trend])
  const maxFunnelDropKey = useMemo(() => {
    let maxDrop = 0
    let maxKey = ''
    funnelStages.forEach((item) => {
      if (item.dropFromPrev > maxDrop) {
        maxDrop = item.dropFromPrev
        maxKey = item.key
      }
    })
    return maxKey
  }, [funnelStages])

  if (loading) {
    return (
      <Card className="admin-card">
        <div className="admin-centered-state"><Spin tip="数据加载中..." /></div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="admin-card">
        <Empty description={error} />
      </Card>
    )
  }

  return (
    <div className="admin-stack">
      <Row gutter={[16, 16]}>
        {metrics.map((card) => (
          <Col xs={24} sm={12} lg={compact ? 6 : 6} xl={compact ? 6 : 4} key={card.label}>
            <Card className="admin-kpi-card" size="small">
              <Statistic
                title={(
                  <span>
                    {card.label}
                    {card.tooltip ? (
                      <Tooltip title={card.tooltip}>
                        <InfoCircleOutlined className="admin-stat-help" />
                      </Tooltip>
                    ) : null}
                  </span>
                )}
                value={card.value}
                suffix={card.suffix}
                formatter={formatMetric}
              />
              {card.hint ? <Text type="secondary" className="admin-kpi-hint">{card.hint}</Text> : null}
            </Card>
          </Col>
        ))}
      </Row>

      <Paragraph className="admin-muted">
        PV：{pvHint} UV：{uvHint}
      </Paragraph>

      {compact ? null : (
        <>
          {activity.type === 'phase_quiz_lottery' ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} xl={15}>
                <ChartPanel title="活动漏斗分析" description="PV → Enter → Quiz → FullScore → Draw → Win → Claim">
                  {analytics === null ? (
                    <div className="admin-centered-state"><Spin tip="分析加载中..." /></div>
                  ) : analytics?.funnel ? (
                    <div className="grid gap-4">
                      <LazyChart
                        type="horizontalBar"
                        data={funnelStages}
                        series={[{ key: 'value', name: '人数' }]}
                        height={320}
                      />
                      <div className="grid gap-2">
                        {funnelStages.map((stage) => (
                          <div
                            key={stage.key}
                            className={[
                              'grid grid-cols-[92px_1fr_92px_92px] items-center gap-3 rounded-2xl border px-4 py-3 text-sm',
                              stage.key === maxFunnelDropKey
                                ? 'border-red-300 bg-red-50'
                                : 'border-slate-200 bg-white',
                            ].join(' ')}
                          >
                            <div className="font-bold text-slate-900">{stage.label}</div>
                            <div className="text-slate-600">
                              数量 <span className="font-bold text-slate-900">{stage.value}</span>
                            </div>
                            <div className="text-slate-600">
                              转化率 <span className="font-bold text-slate-900">{formatRate(stage.conversionRate)}</span>
                            </div>
                            <div className="text-right">
                              {stage.key === maxFunnelDropKey ? <Tag color="red">最大掉点</Tag> : <Text type="secondary">-</Text>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={analytics?.error || '暂无漏斗数据'} />
                  )}
                </ChartPanel>
              </Col>
              <Col xs={24} xl={9}>
                <ChartPanel title="抽奖行为分析" description="总抽奖次数、中奖率、库存消耗和异常指标">
                  {analytics === null ? (
                    <div className="admin-centered-state"><Spin tip="分析加载中..." /></div>
                  ) : analytics?.lottery ? (
                    <div className="grid gap-4">
                      <Row gutter={[12, 12]}>
                        {lotteryStats.map((item) => (
                          <Col xs={12} key={item.label}>
                            <Card size="small" className={item.highlight ? 'border-red-200 bg-red-50' : 'bg-slate-50'}>
                              <Statistic
                                title={item.label}
                                value={item.value}
                                suffix={item.suffix}
                                valueStyle={item.highlight ? { color: '#dc2626' } : undefined}
                                formatter={formatMetric}
                              />
                              {item.hint ? <Text type={item.highlight ? 'danger' : 'secondary'}>{item.hint}</Text> : null}
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={analytics?.error || '暂无抽奖分析数据'} />
                  )}
                </ChartPanel>
              </Col>
            </Row>
          ) : null}

          {activity.type === 'phase_quiz_lottery' ? (
            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24}>
                <ChartPanel title="用户行为趋势" description="PV、抽奖和中奖趋势">
                  {analytics === null ? (
                    <div className="admin-centered-state"><Spin tip="分析加载中..." /></div>
                  ) : analytics?.trend ? (
                    <LazyChart
                      type="line"
                      data={lotteryTrend}
                      series={[
                        { key: 'pv', name: 'PV' },
                        { key: 'draw', name: '抽奖' },
                        { key: 'win', name: '中奖' },
                      ]}
                    />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={analytics?.error || '暂无趋势数据'} />
                  )}
                </ChartPanel>
              </Col>
            </Row>
          ) : null}

          {activity.type === 'appointment_visit' || activity.type === 'phase_quiz_lottery' ? null : (
            <Row gutter={[16, 16]}>
              <Col xs={24} xl={8}>
                <ChartPanel title="近 7 天 PV/UV 趋势" description={charts?.access?.message}>
                  {charts?.access?.dataAvailable ? (
                    <LazyChart type="line" data={charts.access.pvUvTrend || []} series={[{ key: 'pv', name: 'PV' }, { key: 'uv', name: 'UV' }]} />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={charts?.access?.message || '暂无访问埋点数据'} />
                  )}
                </ChartPanel>
              </Col>
              <Col xs={24} xl={8}>
                <ChartPanel title="近 7 天参与趋势" description="按参与时间统计">
                  <LazyChart type="bar" data={participantTrend} series={[{ key: 'participants', name: '参与人数' }]} />
                </ChartPanel>
              </Col>
              <Col xs={24} xl={8}>
                <ChartPanel title="近 7 天互动/完成趋势" description={activity.type === 'quiz' ? '按 start_attempt 与 finished attempt 统计' : '观看记录更新与完成时间'}>
                  <LazyChart
                    type="line"
                    data={mergeTrend(charts?.submissions?.trend, charts?.submissions?.completionTrend)}
                    series={[{ key: 'submissions', name: '互动次数' }, { key: 'completed', name: '完成数' }]}
                  />
                </ChartPanel>
              </Col>
            </Row>
          )}

          {activity.type === 'video-rank' ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} xl={12}>
                <ChartPanel title="留言数量趋势" description="近 7 天留言提交量">
                  <LazyChart type="line" data={commentTrend} series={[{ key: 'comments', name: '留言数' }]} />
                </ChartPanel>
              </Col>
              <Col xs={24} xl={12}>
                <ChartPanel title="排行榜 Top 10" description="仅展示完成过视频的用户，完成数越高越靠前">
                  <LazyChart type="horizontalBar" data={rankTop10} series={[{ key: 'finishCount', name: '完成数' }]} height={300} emptyText="暂无完成视频的用户" />
                </ChartPanel>
              </Col>
            </Row>
          ) : activity.type === 'lottery' ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} xl={8}><ChartPanel title="抽奖次数趋势" description="预留图表，等待抽奖数据源接入"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="抽奖次数趋势暂未接入数据源" /></ChartPanel></Col>
              <Col xs={24} xl={8}><ChartPanel title="奖品中奖分布" description="预留环图"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="奖品中奖分布暂未接入数据源" /></ChartPanel></Col>
              <Col xs={24} xl={8}><ChartPanel title="奖品库存" description="预留柱状图"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="奖品库存暂未接入数据源" /></ChartPanel></Col>
            </Row>
          ) : activity.type === 'appointment_visit' ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} xl={8}>
                <ChartPanel title="近 7 天 PV/UV 趋势" description={charts?.access?.message}>
                  {charts?.access?.dataAvailable ? (
                    <LazyChart type="line" data={charts.access.pvUvTrend || []} series={[{ key: 'pv', name: 'PV' }, { key: 'uv', name: 'UV' }]} />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={charts?.access?.message || '暂无访问埋点数据'} />
                  )}
                </ChartPanel>
              </Col>
              <Col xs={24} xl={8}>
                <ChartPanel title="按日期预约分布" description="基于预约记录统计">
                  <LazyChart type="bar" data={appointmentDateTrend} series={[{ key: 'bookings', name: '预约数' }]} />
                </ChartPanel>
              </Col>
              <Col xs={24} xl={8}>
                <ChartPanel title="按时间段预约分布" description="基于预约记录统计">
                  <LazyChart type="bar" data={appointmentSlotTrend} series={[{ key: 'bookings', name: '预约数' }]} />
                </ChartPanel>
              </Col>
              <Col xs={24}>
                <ChartPanel title="日期 + 时段预约矩阵" description="按预约日期和预约时段统计">
                  {charts?.appointment?.bookingMatrix?.rows?.length ? (
                    <AppointmentBookingMatrix matrix={charts.appointment.bookingMatrix} />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无预约矩阵数据" />
                  )}
                </ChartPanel>
              </Col>
            </Row>
          ) : (
            <Card className="admin-card">
              <Title level={5}>专项统计</Title>
              <Text type="secondary">当前活动类型暂未接入专项图表，已展示通用统计。</Text>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function LazyChart(props) {
  return (
    <ChartErrorBoundary>
      <Suspense fallback={<div className="admin-centered-state"><Spin size="small" tip="图表加载中..." /></div>}>
        <AdminChart {...props} />
      </Suspense>
    </ChartErrorBoundary>
  )
}

function ChartPanel({ title, description, children }) {
  return (
    <Card className="admin-chart-card" title={title} extra={description ? <Text type="secondary">{description}</Text> : null}>
      {children}
    </Card>
  )
}

function mergeTrend(submissions = [], completed = []) {
  const map = new Map()
  submissions.forEach((item) => map.set(item.date, { date: item.date, submissions: item.value || 0, completed: 0 }))
  completed.forEach((item) => {
    const current = map.get(item.date) || { date: item.date, submissions: 0, completed: 0 }
    current.completed = item.value || 0
    map.set(item.date, current)
  })
  return Array.from(map.values())
}

function buildFunnelStages(funnel) {
  const stages = [
    { key: 'pv', label: 'PV', value: Number(funnel?.pv || 0) },
    { key: 'enter', label: 'Enter', value: Number(funnel?.enter || 0) },
    { key: 'quiz_start', label: 'Quiz', value: Number(funnel?.quiz_start || 0) },
    { key: 'full_score', label: 'FullScore', value: Number(funnel?.full_score || 0) },
    { key: 'draw_click', label: 'Draw', value: Number(funnel?.draw_click || 0) },
    { key: 'win', label: 'Win', value: Number(funnel?.win || 0) },
    { key: 'claim', label: 'Claim', value: Number(funnel?.claim || 0) },
  ]
  return stages.map((stage, index) => {
    const prevValue = index === 0 ? stage.value : stages[index - 1].value
    const conversionRate = prevValue > 0 ? Number(((stage.value / prevValue) * 100).toFixed(1)) : 0
    const dropFromPrev = Math.max(prevValue - stage.value, 0)
    return {
      ...stage,
      conversionRate,
      dropFromPrev,
    }
  })
}

function buildLotteryStats(lottery) {
  const totalDraws = Number(lottery?.total_draws || 0)
  const winRate = Number((Number(lottery?.win_rate || 0) * 100).toFixed(1))
  const loseRate = Number((Number(lottery?.lose_rate || 0) * 100).toFixed(1))
  const wheelSkipRate = Number((Number(lottery?.wheel_skip_rate || 0) * 100).toFixed(1))
  return [
    { label: '抽奖次数', value: totalDraws },
    { label: '中奖率', value: winRate, suffix: '%', hint: `失败率 ${loseRate}%` },
    {
      label: '库存消耗',
      value: `${Number(lottery?.stock_used || 0)}/${Number(lottery?.stock_total || 0)}`,
      hint: `空库存事件 ${Number(lottery?.stock_empty_count || 0)} 次`,
    },
    {
      label: 'wheel_skip_rate',
      value: wheelSkipRate,
      suffix: '%',
      highlight: wheelSkipRate > 0,
      hint: 'result 已存在但 wheel 未完成的比例',
    },
    {
      label: 'draw latency',
      value: Number(lottery?.draw_latency_avg || 0),
      suffix: 'ms',
      hint: '抽奖点击到转盘完成的平均耗时',
    },
  ]
}

function buildLotteryTrend(trend) {
  const map = new Map()
  ;(trend?.pv_timeline || []).forEach((item) => {
    map.set(item.date, { date: item.date, pv: item.value || 0, draw: 0, win: 0 })
  })
  ;(trend?.draw_timeline || []).forEach((item) => {
    const current = map.get(item.date) || { date: item.date, pv: 0, draw: 0, win: 0 }
    current.draw = item.value || 0
    map.set(item.date, current)
  })
  ;(trend?.win_timeline || []).forEach((item) => {
    const current = map.get(item.date) || { date: item.date, pv: 0, draw: 0, win: 0 }
    current.win = item.value || 0
    map.set(item.date, current)
  })
  return Array.from(map.values()).sort((left, right) => String(left.date).localeCompare(String(right.date)))
}

function formatMetric(value) {
  if (typeof value === 'number') return value.toLocaleString('zh-CN')
  return value
}

function formatRate(value) {
  if (!Number.isFinite(Number(value))) return '0%'
  return `${Number(value).toFixed(1)}%`
}

class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <Empty
        description={(
          <span>
            图表资源加载失败，页面主体仍可使用。
            <Button type="link" size="small" onClick={() => window.location.reload()}>
              刷新页面
            </Button>
          </span>
        )}
      />
    )
  }
}
