import { useEffect, useState } from 'react'
import { getOperationLogs } from '../api'

export default function OperationLogPage({ activity }) {
  const [data, setData] = useState({ rows: [], pagination: { page: 1, totalPages: 1, total: 0 } })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    getOperationLogs({ activityId: activity.id, page: String(page), pageSize: '20' })
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err.message || '操作日志加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activity.id, page])

  return (
    <section className="admin-panel">
      <div className="admin-section-head">
        <div>
          <h2>操作日志</h2>
          <p>查看账号、权限、导出和数据访问操作记录</p>
        </div>
      </div>
      {error ? <div className="admin-error panel">{error}</div> : null}
      {loading ? <div className="admin-empty">加载中...</div> : null}
      {!loading && !error ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>账号</th>
                <th>操作</th>
                <th>目标</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length ? (
                data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>{row.adminUser?.nickname || row.adminUser?.username || '-'}</td>
                    <td><span className="admin-chip">{row.action}</span></td>
                    <td>{[row.targetType, row.targetId].filter(Boolean).join(' / ') || '-'}</td>
                    <td>{row.ip || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5">暂无日志</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="admin-pagination">
        <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>上一页</button>
        <span>第 {data.pagination.page || page} / {data.pagination.totalPages || 1} 页，共 {data.pagination.total || 0} 条</span>
        <button disabled={page >= (data.pagination.totalPages || 1)} onClick={() => setPage((current) => current + 1)}>下一页</button>
      </div>
    </section>
  )
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}
