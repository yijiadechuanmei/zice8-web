import { useEffect, useMemo, useState } from 'react'
import { getActivities, getAdminMe, removeAdminToken } from './api'
import LoginPage from './pages/LoginPage'
import AdminLayout from './pages/AdminLayout'
import './style.css'

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

  if (loading) {
    return <div className="admin-loading">后台加载中...</div>
  }

  if (!adminUser) {
    return <LoginPage error={error} onLoginSuccess={loadSession} />
  }

  return (
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
  )
}
