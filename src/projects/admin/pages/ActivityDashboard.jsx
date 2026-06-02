import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { getCharts, getOverview } from '../api'

const AdminChart = lazy(() => import('../components/charts/AdminChart'))

export default function ActivityDashboard({ activity, compact = false }) {
  const [overview, setOverview] = useState(null)
  const [charts, setCharts] = useState(null)
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

  const metrics = useMemo(() => {
    const videoRank = overview?.videoRank || {}
    const completed = videoRank.completedCount || 0
    const watch = videoRank.watchUserCount || 0
    return [
      { label: 'PV', value: overview?.pv ?? '-', hint: overview?.accessStats?.dataAvailable === false ? '暂无埋点' : '' },
      { label: 'UV', value: overview?.uv ?? '-', hint: overview?.accessStats?.dataAvailable === false ? '暂无埋点' : '' },
      { label: '今日 PV', value: overview?.todayPv ?? 0 },
      { label: '今日 UV', value: overview?.todayUv ?? 0 },
      { label: '正式参与人数', value: overview?.participantCount || 0 },
      { label: '今日新增参与', value: overview?.todayParticipantCount || 0 },
      { label: '互动次数', value: overview?.submitCount || 0 },
      { label: '完成数', value: completed },
      { label: '完成率', value: watch ? `${Math.round((completed / watch) * 100)}%` : '0%' },
      { label: '留言数', value: videoRank.commentCount || 0 },
    ]
  }, [overview])

  const participantTrend = (charts?.participants?.trend || []).map((item) => ({ ...item, participants: item.value || 0 }))
  const commentTrend = (charts?.videoRank?.commentTrend || []).map((item) => ({ ...item, comments: item.value || 0 }))
  const rankTop10 = (charts?.videoRank?.rankTop10 || []).map((item) => ({
    ...item,
    name: item.name || '未填写姓名',
  }))

  if (loading) return <div className="admin-panel">概览加载中...</div>
  if (error) return <div className="admin-error panel">{error}</div>

  return (
    <div className="admin-stack">
      <section className="admin-card-grid">
        {metrics.map((card) => (
          <div className="admin-metric" key={card.label}>
            <span>{card.label}</span>
            <strong>{formatMetric(card.value)}</strong>
            {card.hint ? <small>{card.hint}</small> : null}
          </div>
        ))}
      </section>

      {compact ? null : (
        <>
          <section className="admin-chart-grid">
            <ChartPanel title="近 7 天 PV/UV 趋势" description={charts?.access?.message}>
              {charts?.access?.dataAvailable ? (
                <LazyChart type="line" data={charts.access.pvUvTrend || []} series={[{ key: 'pv', name: 'PV' }, { key: 'uv', name: 'UV' }]} />
              ) : (
                <div className="admin-chart-empty">{charts?.access?.message || '暂无访问埋点数据'}</div>
              )}
            </ChartPanel>
            <ChartPanel title="近 7 天参与趋势" description="按参与时间统计">
              <LazyChart type="bar" data={participantTrend} series={[{ key: 'participants', name: '参与人数' }]} />
            </ChartPanel>
            <ChartPanel title="近 7 天互动/完成趋势" description="观看记录更新与完成时间">
              <LazyChart
                type="line"
                data={mergeTrend(charts?.submissions?.trend, charts?.submissions?.completionTrend)}
                series={[{ key: 'submissions', name: '互动次数' }, { key: 'completed', name: '完成数' }]}
              />
            </ChartPanel>
          </section>

          {activity.type === 'video-rank' ? (
            <section className="admin-chart-grid">
              <ChartPanel title="留言数量趋势" description="近 7 天留言提交量">
                <LazyChart type="line" data={commentTrend} series={[{ key: 'comments', name: '留言数' }]} />
              </ChartPanel>
              <ChartPanel title="排行榜 Top 10" description="完成数优先，越早完成越靠前">
                <LazyChart type="horizontalBar" data={rankTop10} series={[{ key: 'finishCount', name: '完成数' }]} height={300} emptyText="暂无完成视频的用户" />
              </ChartPanel>
            </section>
          ) : activity.type === 'lottery' ? (
            <section className="admin-chart-grid">
              <ChartPanel title="抽奖次数趋势" description="预留图表，等待抽奖数据源接入"><div className="admin-chart-empty">抽奖次数趋势暂未接入数据源</div></ChartPanel>
              <ChartPanel title="奖品中奖分布" description="预留环图"><div className="admin-chart-empty">奖品中奖分布暂未接入数据源</div></ChartPanel>
              <ChartPanel title="奖品库存" description="预留柱状图"><div className="admin-chart-empty">奖品库存暂未接入数据源</div></ChartPanel>
            </section>
          ) : (
            <section className="admin-panel">
              <h2>专项统计</h2>
              <p className="admin-muted">当前活动类型暂未接入专项图表，已展示通用统计。</p>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function LazyChart(props) {
  return (
    <Suspense fallback={<div className="admin-chart-empty">图表加载中...</div>}>
      <AdminChart {...props} />
    </Suspense>
  )
}

function ChartPanel({ title, description, children }) {
  return (
    <div className="admin-panel admin-chart-panel">
      <div className="admin-section-head compact">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </div>
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

function formatMetric(value) {
  if (typeof value === 'number') return value.toLocaleString('zh-CN')
  return value
}
