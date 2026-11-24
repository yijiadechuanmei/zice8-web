import { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, Space, Typography, message } from 'antd'
import { adminRequest } from '../api'

export default function TrafficQuizTestUsers({ activityKey }) {
  const [ids, setIds] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    adminRequest(`/admin/traffic-quiz/activities/${encodeURIComponent(activityKey)}/test-users`)
      .then((data) => { if (active) setIds((data.testUserIds || []).join('\n')) })
      .catch((err) => { if (active) setError(err.message || '测试人员配置加载失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activityKey])

  async function save() {
    const testUserIds = [...new Set(ids.split(/[\s,，]+/).filter(Boolean))]
    if (testUserIds.length > 100 || testUserIds.some((id) => !/^[1-9]\d{0,18}$/.test(id))) {
      setError('请输入有效的微信用户 ID，最多 100 个')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await adminRequest(`/admin/traffic-quiz/activities/${encodeURIComponent(activityKey)}/test-users`, {
        method: 'POST', body: JSON.stringify({ testUserIds }),
      })
      setIds(data.testUserIds.join('\n'))
      message.success('测试人员配置已保存')
    } catch (err) {
      setError(err.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return <Card size="small" title="测试人员 ID" loading={loading}>
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Typography.Text type="secondary">每行一个微信用户 ID，也可用逗号分隔。名单内用户可在活动开始前答题、每天反复挑战；可在下方按用户 ID 清除其本活动数据。普通用户仍每天仅有一次机会。</Typography.Text>
      {error && <Alert type="error" showIcon message={error} />}
      <Input.TextArea rows={4} value={ids} onChange={(event) => setIds(event.target.value)} placeholder="输入微信用户 ID" />
      <Button type="primary" loading={saving} onClick={save}>保存测试人员 ID</Button>
    </Space>
  </Card>
}
