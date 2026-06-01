import { useEffect, useState } from 'react'
import { getOverview } from '../api'

export default function ActivityDashboard({ activity, statsOnly = false }) {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    getOverview(activity.activityKey)
      .then((data) => {
        if (alive) setOverview(data)
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

  if (loading) return <div className="admin-panel">概览加载中...</div>
  if (error) return <div className="admin-error panel">{error}</div>

  const cards = [
    { label: '总参与人数', value: overview?.participantCount || 0 },
    { label: '今日新增', value: overview?.todayParticipantCount || 0 },
  ]
  if (overview?.videoRank) {
    cards.push(
      { label: '视频数量', value: overview.videoRank.videoCount },
      { label: '观看用户', value: overview.videoRank.watchUserCount },
      { label: '完成记录', value: overview.videoRank.completedCount },
      { label: '留言数', value: overview.videoRank.commentCount },
    )
  }

  return (
    <div className="admin-stack">
      {!statsOnly ? (
        <section className="admin-panel">
          <h2>活动信息</h2>
          <div className="admin-detail-grid">
            <span>活动名称</span>
            <strong>{overview?.activity?.title}</strong>
            <span>活动 Key</span>
            <strong>{overview?.activity?.activityKey}</strong>
            <span>业务类型</span>
            <strong>{overview?.activity?.type}</strong>
            <span>状态</span>
            <strong>{overview?.activity?.status}</strong>
          </div>
        </section>
      ) : null}
      <section className="admin-card-grid">
        {cards.map((card) => (
          <div className="admin-metric" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </section>
    </div>
  )
}
