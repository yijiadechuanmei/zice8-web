import { useEffect, useMemo, useState } from 'react'
import { getDataRows, getDataViews } from '../api'

export default function DataViewPage({ activity }) {
  const [views, setViews] = useState([])
  const [activeViewKey, setActiveViewKey] = useState('')
  const [data, setData] = useState({ columns: [], rows: [], pagination: { page: 1, pageSize: 20, total: 0 } })
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setViews([])
    setActiveViewKey('')
    getDataViews(activity.activityKey)
      .then((list) => {
        if (!alive) return
        setViews(list)
        setActiveViewKey(list[0]?.viewKey || '')
      })
      .catch((err) => {
        if (alive) setError(err.message || '数据视图加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activity.activityKey])

  useEffect(() => {
    if (!activeViewKey) return
    let alive = true
    setLoading(true)
    setError('')
    getDataRows(activity.activityKey, activeViewKey, {
      page: String(page),
      pageSize: '20',
      keyword,
      sortField,
      sortOrder,
    })
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err.message || '数据加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activity.activityKey, activeViewKey, page, keyword, sortField, sortOrder])

  const activeView = useMemo(() => views.find((view) => view.viewKey === activeViewKey), [views, activeViewKey])

  function toggleSort(column) {
    if (!column.sortable) return
    if (sortField === column.key) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(column.key)
      setSortOrder('desc')
    }
    setPage(1)
  }

  return (
    <section className="admin-panel">
      <div className="admin-section-head">
        <div>
          <h2>数据表</h2>
          <p>{activeView?.title || '选择一个数据视图'}</p>
        </div>
        <div className="admin-search">
          <input
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
            placeholder="搜索"
          />
        </div>
      </div>

      <div className="admin-view-switch">
        {views.map((view) => (
          <button
            key={view.viewKey}
            className={view.viewKey === activeViewKey ? 'active' : ''}
            onClick={() => {
              setActiveViewKey(view.viewKey)
              setPage(1)
              setSortField('')
            }}
          >
            {view.title}
          </button>
        ))}
      </div>

      {error ? <div className="admin-error panel">{error}</div> : null}
      {loading ? <div className="admin-empty">加载中...</div> : null}
      {!loading && !error ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {data.columns.map((column) => (
                  <th key={column.key}>
                    <button className={column.sortable ? 'sortable' : ''} onClick={() => toggleSort(column)}>
                      {column.title}
                      {sortField === column.key ? <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span> : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.length ? (
                data.rows.map((row, index) => (
                  <tr key={`${activeViewKey}-${index}`}>
                    {data.columns.map((column) => (
                      <td key={column.key}>{formatCell(row[column.key])}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={Math.max(data.columns.length, 1)}>暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="admin-pagination">
        <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
          上一页
        </button>
        <span>
          第 {data.pagination.page || page} / {data.pagination.totalPages || 1} 页，共 {data.pagination.total || 0} 条
        </span>
        <button disabled={page >= (data.pagination.totalPages || 1)} onClick={() => setPage((current) => current + 1)}>
          下一页
        </button>
      </div>
    </section>
  )
}

function formatCell(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.replace('T', ' ').slice(0, 19)
  return String(value)
}
