import { useEffect, useMemo, useState } from 'react'
import {
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Layout,
  message,
  Modal,
  QRCode,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  BarChartOutlined,
  CopyOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  LinkOutlined,
  LogoutOutlined,
  QrcodeOutlined,
  SearchOutlined,
  SettingOutlined,
  TableOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import AccountPage from './AccountPage'
import ActivityConfigPage from './ActivityConfigPage'
import ActivityDashboard from './ActivityDashboard'
import DataViewPage from './DataViewPage'
import OperationLogPage from './OperationLogPage'
import PaymentTestPage from './PaymentTestPage'
import PermissionPage from './PermissionPage'
import QuizQuestionImportPage from './QuizQuestionImportPage'
import { getDataSchema } from '../api'

const { Header, Sider, Content } = Layout
const { Text, Title } = Typography
const WEB_ORIGIN = 'https://web.zice8.com'

const tabs = [
  { key: 'overview', label: '概览', icon: <DashboardOutlined /> },
  { key: 'activityConfig', label: '活动配置', icon: <SettingOutlined /> },
  { key: 'dashboard', label: '数据看板', icon: <BarChartOutlined /> },
  { key: 'data', label: '数据表', icon: <TableOutlined /> },
  { key: 'quizImport', label: '题库导入', icon: <UploadOutlined />, activityTypes: ['quiz'] },
  { key: 'permissions', label: '权限配置', icon: <TeamOutlined /> },
  { key: 'accounts', label: '账号管理', icon: <TeamOutlined /> },
  { key: 'logs', label: '操作日志', icon: <DatabaseOutlined /> },
  { key: 'paymentTest', label: '支付链路测试', icon: <ToolOutlined /> },
]

const phaseQuizLotteryScopeOptions = [
  { value: 'all', label: '总览' },
  ...Array.from({ length: 6 }, (_, index) => ({
    value: String(index + 1),
    label: `第${index + 1}期`,
  })),
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
  const [quizViewKeysByActivity, setQuizViewKeysByActivity] = useState({})
  const [phaseScopeByActivity, setPhaseScopeByActivity] = useState({})
  const [qrActivity, setQrActivity] = useState(null)

  useEffect(() => {
    if (!selectedActivity || selectedActivity.type !== 'quiz') return
    const activityKey = selectedActivity.activityKey
    if (quizViewKeysByActivity[activityKey]) return
    let alive = true
    getDataSchema(activityKey)
      .then((schema) => {
        if (!alive) return
        const viewKeys = new Set((schema?.views || []).map((view) => view.viewKey))
        setQuizViewKeysByActivity((current) => ({ ...current, [activityKey]: viewKeys }))
      })
      .catch(() => {
        if (!alive) return
        setQuizViewKeysByActivity((current) => ({ ...current, [activityKey]: new Set() }))
      })
    return () => {
      alive = false
    }
  }, [quizViewKeysByActivity, selectedActivity])

  const currentQuizViewKeys = selectedActivity?.type === 'quiz'
    ? quizViewKeysByActivity[selectedActivity.activityKey] || null
    : null
  const canManageActivityConfig = adminUser.role === 'super_admin'
  const canAccessQuizImport = selectedActivity?.type === 'quiz'
    ? (currentQuizViewKeys ? currentQuizViewKeys.has('quiz_import') : true)
    : false
  const canAccessQuizOverview = selectedActivity?.type === 'quiz'
    ? (currentQuizViewKeys ? currentQuizViewKeys.has('quiz_overview') : true)
    : true
  const selectedPhaseScope = selectedActivity?.type === 'phase_quiz_lottery'
    ? phaseScopeByActivity[selectedActivity.activityKey] || 'all'
    : 'all'
  const selectedActivityUrl = selectedActivity ? buildActivityUrl(selectedActivity) : ''

  const visibleTabs = tabs.filter((tab) => {
    if (adminUser.role !== 'super_admin' && ['accounts', 'permissions', 'logs', 'paymentTest'].includes(tab.key)) return false
    if (tab.key === 'activityConfig' && !canManageActivityConfig) return false
    if (tab.activityTypes?.length && selectedActivity && !tab.activityTypes.includes(selectedActivity.type)) return false
    if (tab.key === 'quizImport' && selectedActivity?.type === 'quiz' && !canAccessQuizImport) return false
    if (selectedActivity?.type === 'quiz' && ['overview', 'dashboard'].includes(tab.key) && !canAccessQuizOverview) return false
    return true
  })
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

  useEffect(() => {
    if (activeTab === 'paymentTest' && adminUser.role !== 'super_admin') {
      onChangeTab('overview')
      return
    }
    if (!selectedActivity) return
    if (activeTab === 'activityConfig' && !canManageActivityConfig) {
      onChangeTab('overview')
    }
    if (activeTab === 'quizImport' && selectedActivity.type === 'quiz' && !canAccessQuizImport) {
      onChangeTab('data')
    }
    if (selectedActivity.type === 'quiz' && ['overview', 'dashboard'].includes(activeTab) && !canAccessQuizOverview) {
      onChangeTab('data')
    }
  }, [activeTab, adminUser.role, canAccessQuizImport, canAccessQuizOverview, canManageActivityConfig, onChangeTab, selectedActivity])

  return (
    <Layout className="admin-shell">
      <Header className="admin-topbar">
        <div className="admin-brand">
          <strong>Zice8 Admin</strong>
          <span>活动数据控制台</span>
        </div>
        <Space size={12} className="admin-topbar-user">
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

      <Layout className="admin-body">
        <Sider width={280} className="admin-sider">
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

        <Content className="admin-content">
          {selectedActivity && activeTab !== 'paymentTest' ? (
            <Card className="admin-activity-card" size="small">
              <div className={`admin-activity-summary ${selectedActivity.type === 'phase_quiz_lottery' ? 'is-phase-scoped' : ''}`}>
                <div>
                  <Text type="secondary">当前活动</Text>
                  <div className="admin-activity-title-line">
                    <Title level={4} style={{ margin: 0 }}>
                      <a href={selectedActivityUrl} target="_blank" rel="noreferrer">
                        {selectedActivity.title}
                      </a>
                    </Title>
                    <Tooltip title="打开活动链接">
                      <Button
                        type="text"
                        size="small"
                        icon={<LinkOutlined />}
                        href={selectedActivityUrl}
                        target="_blank"
                      />
                    </Tooltip>
                    <Tooltip title="复制活动链接">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => copyActivityUrl(selectedActivityUrl)}
                      />
                    </Tooltip>
                    <Tooltip title="活动二维码">
                      <Button
                        type="text"
                        size="small"
                        icon={<QrcodeOutlined />}
                        onClick={() => setQrActivity(selectedActivity)}
                      />
                    </Tooltip>
                  </div>
                </div>
                <div><Text type="secondary">Activity Key</Text><strong>{selectedActivity.activityKey}</strong></div>
                <div><Text type="secondary">类型</Text><strong>{selectedActivity.type}</strong></div>
                <div><Text type="secondary">开始时间</Text><strong>{formatDate(selectedActivity.startTime)}</strong></div>
                <div><Text type="secondary">结束时间</Text><strong>{formatDate(selectedActivity.endTime)}</strong></div>
                {selectedActivity.type === 'phase_quiz_lottery' ? (
                  <div className="admin-phase-scope">
                    <Text type="secondary">数据范围</Text>
                    <Select
                      value={selectedPhaseScope}
                      onChange={(value) => {
                        setPhaseScopeByActivity((current) => ({
                          ...current,
                          [selectedActivity.activityKey]: value,
                        }))
                      }}
                      options={phaseQuizLotteryScopeOptions}
                      style={{ width: 140 }}
                    />
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          <Tabs
            className="admin-tabs"
            activeKey={activeTab}
            onChange={onChangeTab}
            items={visibleTabs.map((tab) => ({ key: tab.key, label: <Space size={6}>{tab.icon}{tab.label}</Space> }))}
          />

          {!selectedActivity && activeTab !== 'paymentTest' ? <Card><Empty description="请选择左侧活动" /></Card> : null}
          {selectedActivity && activeTab === 'overview' ? <ActivityDashboard activity={selectedActivity} compact phaseScope={selectedPhaseScope} /> : null}
          {selectedActivity && activeTab === 'activityConfig' && canManageActivityConfig ? <ActivityConfigPage activity={selectedActivity} /> : null}
          {selectedActivity && activeTab === 'activityConfig' && !canManageActivityConfig ? <Card><Empty description="无权修改活动配置" /></Card> : null}
          {selectedActivity && activeTab === 'dashboard' ? <ActivityDashboard activity={selectedActivity} phaseScope={selectedPhaseScope} /> : null}
          {selectedActivity && activeTab === 'data' ? <DataViewPage activity={selectedActivity} phaseScope={selectedPhaseScope} /> : null}
          {selectedActivity && activeTab === 'quizImport' && selectedActivity.type === 'quiz' && canAccessQuizImport ? <QuizQuestionImportPage activity={selectedActivity} /> : null}
          {selectedActivity && activeTab === 'quizImport' && selectedActivity.type === 'quiz' && !canAccessQuizImport ? <Card><Empty description="无权访问题库导入，请联系管理员授权。" /></Card> : null}
          {selectedActivity && activeTab === 'accounts' && adminUser.role === 'super_admin' ? <AccountPage /> : null}
          {selectedActivity && activeTab === 'permissions' && adminUser.role === 'super_admin' ? <PermissionPage activity={selectedActivity} activities={activities} /> : null}
          {selectedActivity && activeTab === 'logs' ? <OperationLogPage activity={selectedActivity} /> : null}
          {activeTab === 'paymentTest' && adminUser.role === 'super_admin' ? <PaymentTestPage /> : null}
        </Content>
      </Layout>
      <Modal
        title="活动二维码"
        open={Boolean(qrActivity)}
        footer={null}
        onCancel={() => setQrActivity(null)}
        centered
      >
        {qrActivity ? (
          <div className="admin-activity-qr">
            <QRCode value={buildActivityUrl(qrActivity)} size={220} />
            <Text copyable={{ text: buildActivityUrl(qrActivity) }}>{buildActivityUrl(qrActivity)}</Text>
          </div>
        ) : null}
      </Modal>
    </Layout>
  )
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}

function buildActivityUrl(activity) {
  const key = encodeURIComponent(activity.activityKey)
  const pathPrefixByType = {
    appointment_visit: '/appointment',
    brochure_quiz_lottery: '/brochure-quiz-lottery',
    phase_quiz_lottery: '/phase-quiz-lottery',
    material_review_registration: '/material-registration',
    tjrcb_pension_manual: '/tjrcb-pension-manual',
    tufe_campus_open_day: '/tufe-campus-open-day',
    xiwuqi_99_road_night: '/xiwuqi-99-road-night',
    latex_allergy_risk_test: '/latex-allergy-risk-test',
    long_march_study: '/long-march-study',
    quiz: '/quiz',
  }
  const prefix = pathPrefixByType[activity.type] || `/${encodeURIComponent(activity.type || '')}`
  return `${WEB_ORIGIN}${prefix}/${key}`
}

async function copyActivityUrl(url) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }
    message.success('活动链接已复制')
  } catch {
    message.error('复制失败，请手动复制链接')
  }
}
