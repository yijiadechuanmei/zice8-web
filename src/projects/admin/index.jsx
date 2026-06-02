import { useEffect, useMemo, useState } from 'react'
import { ConfigProvider, Spin } from 'antd'
import 'antd/dist/reset.css'
import { getActivities, getAdminMe, removeAdminToken } from './api'
import LoginPage from './pages/LoginPage'
import AdminLayout from './pages/AdminLayout'
import './style.css'

const adminTheme = {
  token: {
    colorPrimary: '#2563eb',
    borderRadius: 10,
    colorBgLayout: '#f5f7fb',
    colorTextBase: '#0f172a',
    colorBorder: '#e5e7eb',
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#111827',
      bodyBg: '#f5f7fb',
    },
  },
}

export default function AdminProject() {
  const [adminUser, setAdminUser] = useState(null)
  const [activities, setActivities] = useState([])
  const [selectedActivityKey, setSelectedActivityKey] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadSession() {
    setLoading(true)
    setError('')
    try {
      const user = await getAdminMe()
      const list = await getActivities()
      setAdminUser(user)
      setActivities(list)
      setSelectedActivityKey((current) => current || list[0]?.activityKey || '')
    } catch (err) {
      removeAdminToken()
      setAdminUser(null)
      setActivities([])
      setSelectedActivityKey('')
      if (err.message && err.message !== '后台登录已失效') setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSession()
  }, [])

  const selectedActivity = useMemo(
    () => activities.find((activity) => activity.activityKey === selectedActivityKey) || null,
    [activities, selectedActivityKey],
  )

  function handleLogout() {
    removeAdminToken()
    setAdminUser(null)
    setActivities([])
    setSelectedActivityKey('')
  }

  return (
    <ConfigProvider theme={adminTheme}>
      {loading ? (
        <div className="admin-loading"><Spin tip="后台加载中..." /></div>
      ) : !adminUser ? (
        <LoginPage error={error} onLoginSuccess={loadSession} />
      ) : (
        <AdminLayout
          adminUser={adminUser}
          activities={activities}
          selectedActivity={selectedActivity}
          activeTab={activeTab}
          onSelectActivity={(activityKey) => {
            setSelectedActivityKey(activityKey)
            setActiveTab('overview')
          }}
          onChangeTab={setActiveTab}
          onLogout={handleLogout}
        />
      )}
    </ConfigProvider>
  )
}
