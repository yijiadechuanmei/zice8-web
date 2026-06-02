import { useEffect, useMemo, useState } from 'react'
import { getCharts, getOverview } from '../api'

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
      { label: '正式参与人数', value: overview?.participantCount || 0 },
      { label: '今日新增参与人数', value: overview?.todayParticipantCount || 0 },
      { label: '提交数/互动数', value: overview?.submitCount || 0 },
      { label: '完成数', value: completed },
      { label: '完成率', value: watch ? `${Math.round((completed / watch) * 100)}%` : '0%' },
      { label: '留言数', value: videoRank.commentCount || 0 },
    ]
  }, [overview])

  if (loading) return <div className="admin-panel">概览加载中...</div>
  if (error) return <div className="admin-error panel">{error}</div>

  return (
    <div className="admin-stack">
      <section className="admin-card-grid">
        {metrics.map((card) => (
          <div className="admin-metric" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            {card.hint ? <small>{card.hint}</small> : null}
          </div>
        ))}
      </section>

      {compact ? null : (
        <>
          <section className="admin-chart-grid">
            <ChartPanel title="近 7 天 PV/UV 趋势" description={charts?.access?.message}>
              {charts?.access?.dataAvailable ? <LineChart data={charts.access.pvUvTrend || []} series={['pv', 'uv']} /> : <EmptyChart message={charts?.access?.message || '暂无访问埋点数据'} />}
            </ChartPanel>
            <ChartPanel title="近 7 天参与人数趋势" description="按参与时间统计">
              <LineChart data={charts?.participants?.trend || []} series={['value']} />
            </ChartPanel>
            <ChartPanel title="近 7 天提交/完成趋势" description="视频观看记录更新与完成时间">
              <LineChart data={mergeTrend(charts?.submissions?.trend, charts?.submissions?.completionTrend)} series={['submissions', 'completed']} />
            </ChartPanel>
          </section>

          {activity.type === 'video-rank' ? (
            <section className="admin-chart-grid wide">
              <ChartPanel title="视频完成率" description="各视频观看人数与完成人数">
                <BarChart data={charts?.videoRank?.videoCompletion || []} labelKey="title" valueKey="completionRate" formatValue={(value) => `${Math.round(value * 100)}%`} />
              </ChartPanel>
              <ChartPanel title="留言数量趋势" description="近 7 天留言提交量">
                <LineChart data={charts?.videoRank?.commentTrend || []} series={['value']} />
              </ChartPanel>
              <ChartPanel title="排行榜 Top 10" description="完成数优先，越早完成越靠前">
                <RankList rows={charts?.videoRank?.rankTop10 || []} />
              </ChartPanel>
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

function EmptyChart({ message }) {
  return <div className="admin-chart-empty">{message}</div>
}

function LineChart({ data, series }) {
  const width = 520
  const height = 190
  const padding = 24
  const values = data.flatMap((item) => series.map((key) => Number(item[key]) || 0))
  const max = Math.max(...values, 1)
  const colors = ['#1e40af', '#f59e0b']
  const pointsFor = (key) =>
    data.map((item, index) => {
      const x = padding + (data.length <= 1 ? 0 : (index * (width - padding * 2)) / (data.length - 1))
      const y = height - padding - ((Number(item[key]) || 0) / max) * (height - padding * 2)
      return `${x},${y}`
    })

  if (!data.length) return <EmptyChart message="暂无图表数据" />

  return (
    <svg className="admin-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="趋势图">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" />
      {[0, 1, 2].map((item) => (
        <line key={item} x1={padding} y1={padding + item * 55} x2={width - padding} y2={padding + item * 55} stroke="#f1f5f9" />
      ))}
      {series.map((key, index) => (
        <polyline key={key} points={pointsFor(key).join(' ')} fill="none" stroke={colors[index % colors.length]} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {data.map((item, index) => (
        <text key={item.date || index} x={padding + (data.length <= 1 ? 0 : (index * (width - padding * 2)) / (data.length - 1))} y={height - 6} textAnchor="middle" fontSize="10" fill="#64748b">
          {String(item.date || '').slice(5)}
        </text>
      ))}
    </svg>
  )
}

function BarChart({ data, labelKey, valueKey, formatValue }) {
  if (!data.length) return <EmptyChart message="暂无图表数据" />
  const max = Math.max(...data.map((item) => Number(item[valueKey]) || 0), 1)
  return (
    <div className="admin-bars">
      {data.map((item) => {
        const value = Number(item[valueKey]) || 0
        return (
          <div className="admin-bar-row" key={item.videoId || item[labelKey]}>
            <span title={item[labelKey]}>{item[labelKey]}</span>
            <div><i style={{ width: `${Math.max((value / max) * 100, value ? 4 : 0)}%` }} /></div>
            <b>{formatValue ? formatValue(value) : value}</b>
          </div>
        )
      })}
    </div>
  )
}

function RankList({ rows }) {
  if (!rows.length) return <EmptyChart message="暂无排行数据" />
  return (
    <div className="admin-rank-list">
      {rows.map((row) => (
        <div key={row.userId}>
          <strong>{row.rank}</strong>
          <span>{row.name || '未填写姓名'}</span>
          <small>{row.department || '-'}</small>
          <b>{row.finishCount} 完成</b>
        </div>
      ))}
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
