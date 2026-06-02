import AccountPage from './AccountPage'
import ActivityDashboard from './ActivityDashboard'
import DataViewPage from './DataViewPage'
import OperationLogPage from './OperationLogPage'
import PermissionPage from './PermissionPage'
import { useMemo, useState } from 'react'

const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'dashboard', label: '数据看板' },
  { key: 'data', label: '数据表' },
  { key: 'permissions', label: '权限配置' },
  { key: 'accounts', label: '账号管理' },
  { key: 'logs', label: '操作日志' },
]

export default function AdminLayout({
  adminUser,
  activities,
  selectedActivity,
  activeTab,
  onSelectActivity,
  onChangeTab,
  onLogout,
}) {
  const [keyword, setKeyword] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const visibleTabs = tabs.filter((tab) => adminUser.role === 'super_admin' || !['accounts', 'permissions', 'logs'].includes(tab.key))
  const activityTypes = useMemo(() => Array.from(new Set(activities.map((activity) => activity.type))).filter(Boolean), [activities])
  const filteredActivities = useMemo(
    () =>
      activities.filter((activity) => {
        const text = `${activity.title} ${activity.activityKey} ${activity.type}`.toLowerCase()
        const matchesKeyword = !keyword.trim() || text.includes(keyword.trim().toLowerCase())
        const matchesType = !typeFilter || activity.type === typeFilter
        const matchesStatus = !statusFilter || String(activity.status) === statusFilter
        return matchesKeyword && matchesType && matchesStatus
      }),
    [activities, keyword, statusFilter, typeFilter],
  )

  return (
    <main className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>Zice8</strong>
          <span>Admin Console</span>
        </div>
        <div className="admin-sidebar-title">活动导航</div>
        <div className="admin-sidebar-filters">
          <label>
            <span>搜索活动</span>
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="名称 / key / 类型" />
          </label>
          <div className="admin-filter-row">
            <label>
              <span>类型</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="">全部</option>
                {activityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>状态</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">全部</option>
                <option value="1">启用</option>
                <option value="0">禁用</option>
              </select>
            </label>
          </div>
        </div>
        <div className="admin-project-list">
          {filteredActivities.length ? (
            filteredActivities.map((activity) => (
              <button
                key={activity.activityKey}
                className={activity.activityKey === selectedActivity?.activityKey ? 'active' : ''}
                onClick={() => onSelectActivity(activity.activityKey)}
              >
                <span>{activity.title}</span>
                <small>{activity.activityKey}</small>
                <div className="admin-project-meta">
                  <b>{activity.type}</b>
                  <em className={activity.status === 1 ? 'is-on' : 'is-off'}>{activity.status === 1 ? '启用' : '禁用'}</em>
                </div>
              </button>
            ))
          ) : (
            <div className="admin-empty">暂无可访问活动</div>
          )}
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-kicker">Activity Workspace</p>
            <h1>{selectedActivity?.title || '管理后台'}</h1>
            <p>{selectedActivity ? `${selectedActivity.activityKey} / ${selectedActivity.type}` : '请选择活动'}</p>
          </div>
          <div className="admin-userbox">
            <div>
              <span>{adminUser.nickname || adminUser.username}</span>
              <small>{adminUser.role}</small>
            </div>
            <button className="admin-btn-secondary" onClick={onLogout}>退出登录</button>
          </div>
        </header>

        {selectedActivity ? (
          <section className="admin-activity-card">
            <div>
              <span className="admin-status-pill">{selectedActivity.status === 1 ? '启用' : '禁用'}</span>
              <h2>{selectedActivity.title}</h2>
              <p>{selectedActivity.activityKey}</p>
            </div>
            <dl>
              <div><dt>类型</dt><dd>{selectedActivity.type}</dd></div>
              <div><dt>开始时间</dt><dd>{formatDate(selectedActivity.startTime)}</dd></div>
              <div><dt>结束时间</dt><dd>{formatDate(selectedActivity.endTime)}</dd></div>
              <div><dt>创建时间</dt><dd>{formatDate(selectedActivity.createdAt)}</dd></div>
            </dl>
          </section>
        ) : null}

        <nav className="admin-tabs">
          {visibleTabs.map((tab) => (
            <button key={tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => onChangeTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="admin-content">
          {!selectedActivity ? <div className="admin-empty panel">请选择左侧项目</div> : null}
          {selectedActivity && activeTab === 'overview' ? <ActivityDashboard activity={selectedActivity} compact /> : null}
          {selectedActivity && activeTab === 'dashboard' ? <ActivityDashboard activity={selectedActivity} /> : null}
          {selectedActivity && activeTab === 'data' ? <DataViewPage activity={selectedActivity} /> : null}
          {selectedActivity && activeTab === 'accounts' && adminUser.role === 'super_admin' ? <AccountPage /> : null}
          {selectedActivity && activeTab === 'permissions' && adminUser.role === 'super_admin' ? <PermissionPage activity={selectedActivity} activities={activities} /> : null}
          {selectedActivity && activeTab === 'logs' ? <OperationLogPage activity={selectedActivity} /> : null}
        </div>
      </section>
    </main>
  )
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}
