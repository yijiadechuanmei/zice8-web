import { useMemo, useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Layout,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  BarChartOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  SearchOutlined,
  SettingOutlined,
  TableOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import AccountPage from './AccountPage'
import ActivityDashboard from './ActivityDashboard'
import DataViewPage from './DataViewPage'
import OperationLogPage from './OperationLogPage'
import PermissionPage from './PermissionPage'

const { Header, Sider, Content } = Layout
const { Text, Title } = Typography

const tabs = [
  { key: 'overview', label: '概览', icon: <DashboardOutlined /> },
  { key: 'dashboard', label: '数据看板', icon: <BarChartOutlined /> },
  { key: 'data', label: '数据表', icon: <TableOutlined /> },
  { key: 'permissions', label: '权限配置', icon: <SettingOutlined /> },
  { key: 'accounts', label: '账号管理', icon: <TeamOutlined /> },
  { key: 'logs', label: '操作日志', icon: <DatabaseOutlined /> },
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
    <Layout className="admin-shell">
      <Sider width={304} className="admin-sider">
        <div className="admin-logo">
          <strong>Zice8 Admin</strong>
          <span>活动数据控制台</span>
        </div>
        <Space direction="vertical" size={10} className="admin-sider-filters">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索活动名称 / key / 类型"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Space.Compact block>
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: '50%' }}
              options={[{ value: '', label: '全部类型' }, ...activityTypes.map((type) => ({ value: type, label: type }))]}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '50%' }}
              options={[
                { value: '', label: '全部状态' },
                { value: '1', label: '启用' },
                { value: '0', label: '禁用' },
              ]}
            />
          </Space.Compact>
        </Space>
        <div className="admin-activity-list">
          {filteredActivities.length ? (
            filteredActivities.map((activity) => (
              <button
                type="button"
                key={activity.activityKey}
                className={`admin-activity-item ${activity.activityKey === selectedActivity?.activityKey ? 'is-active' : ''}`}
                onClick={() => onSelectActivity(activity.activityKey)}
              >
                <span>{activity.title}</span>
                <small>{activity.activityKey}</small>
                <Space size={6}>
                  <Tag color="blue">{activity.type}</Tag>
                  <Tag color={activity.status === 1 ? 'green' : 'red'}>{activity.status === 1 ? '启用' : '禁用'}</Tag>
                </Space>
              </button>
            ))
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可访问活动" />
          )}
        </div>
      </Sider>

      <Layout>
        <Header className="admin-header">
          <div>
            <Space align="center" size={10}>
              <Title level={3} style={{ margin: 0 }}>{selectedActivity?.title || '管理后台'}</Title>
              {selectedActivity ? <Tag color={selectedActivity.status === 1 ? 'green' : 'red'}>{selectedActivity.status === 1 ? '启用' : '禁用'}</Tag> : null}
            </Space>
            <div className="admin-header-subtitle">
              {selectedActivity ? `${selectedActivity.activityKey} / ${selectedActivity.type}` : '请选择左侧活动'}
            </div>
          </div>
          <Space size={12}>
            <Avatar icon={<UserOutlined />} />
            <div className="admin-user-meta">
              <Text strong>{adminUser.nickname || adminUser.username}</Text>
              <Tag color={adminUser.role === 'super_admin' ? 'blue' : 'default'}>{adminUser.role}</Tag>
            </div>
            <Tooltip title="退出登录">
              <Button icon={<LogoutOutlined />} onClick={onLogout}>退出</Button>
            </Tooltip>
          </Space>
        </Header>

        <Content className="admin-content">
          {selectedActivity ? (
            <Card className="admin-activity-card" size="small">
              <div className="admin-activity-summary">
                <div>
                  <Text type="secondary">当前活动</Text>
                  <Title level={4} style={{ margin: '4px 0 0' }}>{selectedActivity.title}</Title>
                </div>
                <div><Text type="secondary">Activity Key</Text><strong>{selectedActivity.activityKey}</strong></div>
                <div><Text type="secondary">类型</Text><strong>{selectedActivity.type}</strong></div>
                <div><Text type="secondary">开始时间</Text><strong>{formatDate(selectedActivity.startTime)}</strong></div>
                <div><Text type="secondary">结束时间</Text><strong>{formatDate(selectedActivity.endTime)}</strong></div>
              </div>
            </Card>
          ) : null}

          <Tabs
            className="admin-tabs"
            activeKey={activeTab}
            onChange={onChangeTab}
            items={visibleTabs.map((tab) => ({ key: tab.key, label: <Space size={6}>{tab.icon}{tab.label}</Space> }))}
          />

          {!selectedActivity ? <Card><Empty description="请选择左侧活动" /></Card> : null}
          {selectedActivity && activeTab === 'overview' ? <ActivityDashboard activity={selectedActivity} compact /> : null}
          {selectedActivity && activeTab === 'dashboard' ? <ActivityDashboard activity={selectedActivity} /> : null}
          {selectedActivity && activeTab === 'data' ? <DataViewPage activity={selectedActivity} /> : null}
          {selectedActivity && activeTab === 'accounts' && adminUser.role === 'super_admin' ? <AccountPage /> : null}
          {selectedActivity && activeTab === 'permissions' && adminUser.role === 'super_admin' ? <PermissionPage activity={selectedActivity} activities={activities} /> : null}
          {selectedActivity && activeTab === 'logs' ? <OperationLogPage activity={selectedActivity} /> : null}
        </Content>
      </Layout>
    </Layout>
  )
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}
