import { useEffect, useMemo, useState } from 'react'
import { exportDataRows, getDataRows, getDataSchema } from '../api'

export default function DataViewPage({ activity }) {
  const [views, setViews] = useState([])
  const [activeViewKey, setActiveViewKey] = useState('')
  const [hiddenColumns, setHiddenColumns] = useState({})
  const [data, setData] = useState({ columns: [], rows: [], pagination: { page: 1, pageSize: 20, total: 0 } })
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState('desc')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setViews([])
    setActiveViewKey('')
    getDataSchema(activity.activityKey)
      .then((schema) => {
        if (!alive) return
        setViews(schema.views || [])
        setActiveViewKey(schema.views?.[0]?.viewKey || '')
        setHiddenColumns({})
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
  const visibleColumns = data.columns.filter((column) => !hiddenColumns[column.key])

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

  async function handleExport() {
    if (!activeViewKey) return
    setExporting(true)
    setError('')
    try {
      const result = await exportDataRows(activity.activityKey, activeViewKey, { keyword, sortField, sortOrder })
      downloadCsv(result.filename || `${activity.activityKey}-${activeViewKey}.csv`, result.csv || '')
    } catch (err) {
      setError(err.message || '导出失败')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-section-head">
        <div>
          <h2>数据表</h2>
          <p>{activeView?.description || '选择一个授权数据视图'}</p>
        </div>
        <div className="admin-toolbar">
          <label className="admin-search">
            <span>搜索</span>
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              placeholder="输入关键词"
            />
          </label>
          <button className="admin-btn-primary" disabled={!activeViewKey || exporting} onClick={handleExport}>
            {exporting ? '导出中...' : '导出 CSV'}
          </button>
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
              setHiddenColumns({})
            }}
          >
            {view.label || view.title}
          </button>
        ))}
      </div>

      {data.columns.length ? (
        <div className="admin-column-picker">
          <span>显示列</span>
          {data.columns.map((column) => (
            <label className="admin-check" key={column.key}>
              <input
                type="checkbox"
                checked={!hiddenColumns[column.key]}
                onChange={(event) => setHiddenColumns((current) => ({ ...current, [column.key]: !event.target.checked }))}
              />
              <span>{column.title}</span>
            </label>
          ))}
        </div>
      ) : null}

      {error ? <div className="admin-error panel">{error}</div> : null}
      {loading ? <div className="admin-empty">加载中...</div> : null}
      {!loading && !error ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {visibleColumns.map((column) => (
                  <th key={column.key}>
                    <button className={column.sortable ? 'sortable' : ''} onClick={() => toggleSort(column)}>
                      {column.title}
                      {column.sensitive ? <span className="admin-sensitive-dot">敏感</span> : null}
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
                    {visibleColumns.map((column) => (
                      <td key={column.key}>{formatCell(row[column.key])}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={Math.max(visibleColumns.length, 1)}>暂无数据</td>
                </tr>
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

function formatCell(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.replace('T', ' ').slice(0, 19)
  return String(value)
}

function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
