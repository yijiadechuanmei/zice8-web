import AccountPage from './AccountPage'
import ActivityDashboard from './ActivityDashboard'
import DataViewPage from './DataViewPage'
import PermissionPage from './PermissionPage'

const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'data', label: '数据表' },
  { key: 'stats', label: '统计' },
  { key: 'accounts', label: '账号' },
  { key: 'permissions', label: '权限配置' },
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
  const visibleTabs = tabs.filter((tab) => adminUser.role === 'super_admin' || !['accounts', 'permissions'].includes(tab.key))

  return (
    <main className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <strong>Zice8</strong>
          <span>Admin Console</span>
        </div>
        <div className="admin-sidebar-title">项目列表</div>
        <div className="admin-project-list">
          {activities.length ? (
            activities.map((activity) => (
              <button
                key={activity.activityKey}
                className={activity.activityKey === selectedActivity?.activityKey ? 'active' : ''}
                onClick={() => onSelectActivity(activity.activityKey)}
              >
                <span>{activity.title}</span>
                <small>{activity.type}</small>
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
            <h1>{selectedActivity?.title || '管理后台'}</h1>
            <p>{selectedActivity ? `${selectedActivity.activityKey} · ${selectedActivity.type}` : '请选择活动'}</p>
          </div>
          <div className="admin-userbox">
            <span>{adminUser.nickname || adminUser.username}</span>
            <small>{adminUser.role}</small>
            <button onClick={onLogout}>退出</button>
          </div>
        </header>

        <nav className="admin-tabs">
          {visibleTabs.map((tab) => (
            <button key={tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => onChangeTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="admin-content">
          {!selectedActivity ? <div className="admin-empty panel">请选择左侧项目</div> : null}
          {selectedActivity && activeTab === 'overview' ? <ActivityDashboard activity={selectedActivity} /> : null}
          {selectedActivity && activeTab === 'data' ? <DataViewPage activity={selectedActivity} /> : null}
          {selectedActivity && activeTab === 'stats' ? <ActivityDashboard activity={selectedActivity} statsOnly /> : null}
          {selectedActivity && activeTab === 'accounts' && adminUser.role === 'super_admin' ? <AccountPage /> : null}
          {selectedActivity && activeTab === 'permissions' && adminUser.role === 'super_admin' ? <PermissionPage activity={selectedActivity} activities={activities} /> : null}
        </div>
      </section>
    </main>
  )
}
