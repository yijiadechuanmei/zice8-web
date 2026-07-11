/* eslint-disable react-hooks/set-state-in-effect */
import { Component, Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Row, Spin, Statistic, Tooltip, Typography } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { getCharts, getOverview, getSourceAccess } from '../api'
import AppointmentBookingMatrix from '../components/AppointmentBookingMatrix'

const AdminChart = lazy(() => import('../components/charts/AdminChart'))
const { Paragraph, Text, Title } = Typography

const pvHint = '页面访问次数，同一访客同一页面 30 秒内重复访问只统计一次。'
const uvHint = '按浏览器匿名访客 ID 去重统计。'
const XIWUQI_99_ROAD_NIGHT_ACTIVITY_KEY = 'xiwuqi_99_road_night_20260624'
const XIWUQI_AMAP_SOURCE_FILTER = {
  source: 'amap',
  campaign: 'xiwuqi_20260624',
  page: '/xiwuqi-99-road-night',
  days: '7',
}

export default function ActivityDashboard({ activity, compact = false, phaseScope = 'all' }) {
  const [overview, setOverview] = useState(null)
  const [charts, setCharts] = useState(null)
  const [sourceAccess, setSourceAccess] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isXiwuqiRoadNight = activity.activityKey === XIWUQI_99_ROAD_NIGHT_ACTIVITY_KEY
  const phaseParams = activity.type === 'phase_quiz_lottery' && phaseScope !== 'all'
    ? { phaseNo: phaseScope }
    : {}
  const phaseScopeLabel = phaseScope === 'all' ? '总览' : `第${phaseScope}期`

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setSourceAccess(null)
    const sourceAccessRequest = isXiwuqiRoadNight
      ? getSourceAccess(activity.activityKey, XIWUQI_AMAP_SOURCE_FILTER).catch(() => null)
      : Promise.resolve(null)
    Promise.all([getOverview(activity.activityKey, phaseParams), getCharts(activity.activityKey, phaseParams), sourceAccessRequest])
      .then(([overviewData, chartData, sourceAccessData]) => {
        if (!alive) return
        setOverview(overviewData)
        setCharts(chartData)
        setSourceAccess(sourceAccessData)
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
  }, [activity.activityKey, isXiwuqiRoadNight, phaseScope])

  const metrics = useMemo(() => {
    const sourceOverview = sourceAccess?.overview || {}
    const xiwuqiAmapMetrics = isXiwuqiRoadNight ? [
      { label: '高德 PV', value: sourceOverview.pv ?? 0, tooltip: '仅统计带 utm_source=amap 且 utm_campaign=xiwuqi_20260624 的投放链接访问。' },
      { label: '高德 UV', value: sourceOverview.uv ?? 0, tooltip: uvHint },
      { label: '抖音点击', value: sourceOverview.outboundClicks ?? 0, tooltip: '高德来源访客点击图片跳转抖音的次数。' },
    ] : []

    if (activity.type === 'appointment_visit') {
      return [
        ...xiwuqiAmapMetrics,
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

    if (activity.type === 'artist_call_lottery') {
      const lottery = overview?.artistCallLottery || {}
      return [
        { label: '可选艺人', value: lottery.artistCount ?? 0 },
        { label: '打CALL人数', value: lottery.callUserCount ?? 0 },
        { label: '邀请助力', value: lottery.teamCount ?? 0 },
        { label: '抽奖人数', value: lottery.drawUserCount ?? 0 },
        { label: '抽奖次数', value: lottery.drawCount ?? 0 },
        { label: '中奖人数', value: lottery.winUserCount ?? 0 },
        { label: '中奖率', value: Math.round(Number(lottery.winRate ?? 0)), suffix: '%' },
        { label: '领奖记录', value: lottery.claimCount ?? 0 },
      ]
    }

    if (activity.type === 'phase_quiz_lottery') {
      const pql = overview?.phaseQuizLottery || {}
      return [
        ...xiwuqiAmapMetrics,
        { label: 'PV', value: overview?.pv ?? 0, tooltip: pvHint, hint: overview?.accessStats?.dataAvailable === false ? '暂无访问埋点数据' : '' },
        { label: 'UV', value: overview?.uv ?? 0, tooltip: uvHint, hint: overview?.accessStats?.dataAvailable === false ? '暂无访问埋点数据' : '' },
        { label: '参与答题人数', value: pql.attemptUserCount ?? 0 },
        { label: '完成答题人数', value: pql.finishedAttemptUserCount ?? 0 },
        { label: '满分人数', value: pql.fullScoreUserCount ?? 0 },
        { label: '抽奖人数', value: pql.drawUserCount ?? 0 },
        { label: '中奖人数', value: pql.winUserCount ?? 0 },
        { label: '中奖率', value: Math.round(Number(pql.winRate ?? 0)), suffix: '%' },
        { label: '完成率', value: Math.round(Number(pql.completionRate ?? 0)), suffix: '%' },
        { label: '领奖记录', value: pql.claimCount ?? 0 },
        { label: '邮寄信息', value: pql.mailClaimCount ?? 0 },
        { label: '自提信息', value: pql.pickupClaimCount ?? 0 },
      ]
    }

    if (activity.type === 'material_review_registration') {
      const materialRegistration = overview?.materialRegistration || {}
      return [
        ...xiwuqiAmapMetrics,
        { label: 'PV', value: overview?.pv ?? 0, tooltip: pvHint, hint: overview?.accessStats?.dataAvailable === false ? '暂无访问埋点数据' : '' },
        { label: 'UV', value: overview?.uv ?? 0, tooltip: uvHint, hint: overview?.accessStats?.dataAvailable === false ? '暂无访问埋点数据' : '' },
        { label: '今日 PV', value: overview?.todayPv ?? 0, tooltip: pvHint },
        { label: '今日 UV', value: overview?.todayUv ?? 0, tooltip: uvHint },
        { label: '报名人数', value: materialRegistration.registrationTotal ?? overview?.registrationTotal ?? 0 },
        { label: '今日报名人数', value: materialRegistration.todayRegistrationTotal ?? overview?.todayRegistrationTotal ?? 0 },
      ]
    }

    const videoRank = overview?.videoRank || {}
    return [
      ...xiwuqiAmapMetrics,
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
  }, [activity.type, isXiwuqiRoadNight, overview, sourceAccess])

  const participantTrend = (charts?.participants?.trend || []).map((item) => ({ ...item, participants: item.value || 0 }))
  const materialRegistrationTrend = (charts?.submissions?.trend || []).map((item) => ({ ...item, registrations: item.value || 0 }))
  const commentTrend = (charts?.videoRank?.commentTrend || []).map((item) => ({ ...item, comments: item.value || 0 }))
  const rankTop10 = (charts?.videoRank?.rankTop10 || []).map((item) => ({
    ...item,
    name: item.name || '未填写姓名',
  }))
  const appointmentDateTrend = (charts?.appointment?.bookingByDate || []).map((item) => ({ ...item, bookings: item.value || 0 }))
  const appointmentSlotTrend = (charts?.appointment?.bookingBySlot || []).map((item) => ({ date: item.slot, bookings: item.value || 0 }))
  const phaseQuizLotteryTrend = mergePhaseQuizLotteryTrend(
    charts?.submissions?.trend,
    charts?.submissions?.completionTrend,
    charts?.phaseQuizLottery?.fullScoreTrend,
    charts?.phaseQuizLottery?.drawTrend,
    charts?.phaseQuizLottery?.winTrend,
  )
  const phaseStockRows = (charts?.phaseQuizLottery?.phaseStock || []).map((item) => ({
    ...item,
    label: `第${item.phaseNo}期`,
    stockRemaining: Math.max(Number(item.stockTotal || 0) - Number(item.stockUsed || 0), 0),
  }))

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
                <ChartPanel title="近 7 天答题/抽奖趋势" description={`${phaseScopeLabel}，按答题、满分、抽奖、中奖统计`}>
                  <LazyChart
                    type="line"
                    data={phaseQuizLotteryTrend}
                    series={[
                      { key: 'attempts', name: '参与答题' },
                      { key: 'completed', name: '完成答题' },
                      { key: 'fullScore', name: '满分' },
                      { key: 'draws', name: '抽奖' },
                      { key: 'wins', name: '中奖' },
                    ]}
                  />
                </ChartPanel>
              </Col>
              <Col xs={24} xl={8}>
                <ChartPanel title={phaseScope === 'all' ? '每期库存消耗' : `${phaseScopeLabel}库存消耗`} description="按 phase_quiz_lottery_prize 库存统计">
                  {phaseStockRows.length ? (
                    <LazyChart type="bar" data={phaseStockRows} series={[{ key: 'stockUsed', name: '已用库存' }, { key: 'stockRemaining', name: '剩余库存' }]} />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无库存数据" />
                  )}
                </ChartPanel>
              </Col>
            </Row>
          ) : null}

          {activity.type === 'artist_call_lottery' ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} xl={12}>
                <ChartPanel title="奖品库存" description="按奖品定义表统计已发与剩余数量">
                  <LazyChart type="bar" data={overview?.artistCallLottery?.prizeStock || []} series={[{ key: 'issuedCount', name: '已发' }, { key: 'remainingCount', name: '剩余' }]} emptyText="暂无奖品库存" />
                </ChartPanel>
              </Col>
              <Col xs={24} xl={12}>
                <Card className="admin-chart-card" title="业务口径">
                  <Text type="secondary">本活动仅展示艺人、打CALL、邀请助力、抽奖、中奖、领奖和奖品库存数据，不展示通用参与资料或视频相关数据。</Text>
                </Card>
              </Col>
            </Row>
          ) : null}

          {activity.type === 'material_review_registration' ? (
            <Row gutter={[16, 16]}>
              <Col xs={24} xl={12}>
                <ChartPanel title="近 7 天 PV/UV 趋势" description={charts?.access?.message}>
                  {charts?.access?.dataAvailable ? (
                    <LazyChart type="line" data={charts.access.pvUvTrend || []} series={[{ key: 'pv', name: 'PV' }, { key: 'uv', name: 'UV' }]} />
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={charts?.access?.message || '暂无访问埋点数据'} />
                  )}
                </ChartPanel>
              </Col>
              <Col xs={24} xl={12}>
                <ChartPanel title="近 7 天报名趋势" description="按报名提交时间统计">
                  <LazyChart type="bar" data={materialRegistrationTrend} series={[{ key: 'registrations', name: '报名人数' }]} />
                </ChartPanel>
              </Col>
            </Row>
          ) : null}

          {activity.type === 'appointment_visit' || activity.type === 'phase_quiz_lottery' || activity.type === 'material_review_registration' || activity.type === 'artist_call_lottery' ? null : (
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

function mergePhaseQuizLotteryTrend(attempts = [], completed = [], fullScore = [], draws = [], wins = []) {
  const map = new Map()
  const ensure = (date) => {
    const current = map.get(date) || { date, attempts: 0, completed: 0, fullScore: 0, draws: 0, wins: 0 }
    map.set(date, current)
    return current
  }
  attempts.forEach((item) => { ensure(item.date).attempts = item.value || 0 })
  completed.forEach((item) => { ensure(item.date).completed = item.value || 0 })
  fullScore.forEach((item) => { ensure(item.date).fullScore = item.value || 0 })
  draws.forEach((item) => { ensure(item.date).draws = item.value || 0 })
  wins.forEach((item) => { ensure(item.date).wins = item.value || 0 })
  return Array.from(map.values()).sort((left, right) => String(left.date).localeCompare(String(right.date)))
}

function formatMetric(value) {
  if (typeof value === 'number') return value.toLocaleString('zh-CN')
  return value
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
