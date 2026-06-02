import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { loginAdmin, setAdminToken } from '../api'

const { Paragraph, Title } = Typography

export default function LoginPage({ error, onLoginSuccess }) {
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(error || '')
  const [form] = Form.useForm()

  useEffect(() => {
    setMessage(error || '')
  }, [error])

  async function handleSubmit(values) {
    const username = values.username?.trim()
    if (!username || !values.password) {
      setMessage('请输入账号和密码')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      const data = await loginAdmin({ username, password: values.password })
      setAdminToken(data.token)
      form.setFieldValue('password', '')
      await onLoginSuccess()
    } catch (err) {
      setMessage(err.message || '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login">
      <Card className="admin-login-card" bordered={false}>
        <div className="admin-login-head">
          <Title level={2}>Zice8 Admin</Title>
          <Paragraph>活动数据控制台</Paragraph>
        </div>

        {message ? <Alert type="error" showIcon message={message} style={{ marginBottom: 18 }} /> : null}

        <Form form={form} layout="vertical" requiredMark={false} onFinish={handleSubmit}>
          <Form.Item
            label="账号"
            name="username"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="admin" autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" autoComplete="current-password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block size="large">
            登录
          </Button>
        </Form>
      </Card>
    </main>
  )
}
