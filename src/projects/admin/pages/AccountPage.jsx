import { useEffect, useState } from 'react'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { createAccount, deleteAccount, getAccounts, getAdminMe, updateAccount } from '../api'

const { Text, Title } = Typography
const roleOptions = [
  { value: 'project_admin', label: '项目子账号' },
  { value: 'super_admin', label: '超级管理员' },
]
const statusOptions = [
  { value: 1, label: '启用' },
  { value: 0, label: '禁用' },
]

export default function AccountPage() {
  const [accounts, setAccounts] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [editing, setEditing] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const editPassword = Form.useWatch('password', editForm)

  async function loadAccounts() {
    setLoading(true)
    try {
      const [me, list] = await Promise.all([getAdminMe(), getAccounts()])
      setCurrentUser(me)
      setAccounts(list)
    } catch (err) {
      message.error(err.message || '账号加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  async function handleCreate(values) {
    setSaving(true)
    try {
      await createAccount({ ...values, username: values.username.trim() })
      setCreateOpen(false)
      createForm.resetFields()
      await loadAccounts()
      message.success('账号已创建')
    } catch (err) {
      message.error(err.message || '创建失败')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(account) {
    setEditing(account)
    editForm.setFieldsValue({ nickname: account.nickname || '', role: account.role, status: account.status, password: '' })
  }

  async function handleUpdate(values) {
    if (!editing) return
    setSaving(true)
    try {
      const payload = { nickname: values.nickname || '', role: values.role, status: Number(values.status) }
      if (values.password) payload.password = values.password
      await updateAccount(editing.id, payload)
      setEditing(null)
      editForm.resetFields()
      await loadAccounts()
      message.success(values.password ? '账号已更新，密码已重置' : '账号已更新')
    } catch (err) {
      message.error(err.message || '更新失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus(account) {
    if (account.id === currentUser?.id) {
      message.warning('不能禁用当前登录账号')
      return
    }
    const nextStatus = account.status === 1 ? 0 : 1
    try {
      if (nextStatus === 1) await updateAccount(account.id, { status: 1 })
      else await deleteAccount(account.id)
      await loadAccounts()
      message.success(nextStatus === 1 ? '账号已启用' : '账号已禁用')
    } catch (err) {
      message.error(err.message || '操作失败')
    }
  }

  const columns = [
    { title: '账号', dataIndex: 'username', key: 'username', fixed: 'left' },
    { title: '昵称', dataIndex: 'nickname', key: 'nickname', render: (value) => value || <Text type="secondary">-</Text> },
    { title: '角色', dataIndex: 'role', key: 'role', render: (role) => <RoleTag role={role} /> },
    { title: '状态', dataIndex: 'status', key: 'status', render: (status) => <StatusTag status={status} /> },
    { title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', render: formatDate },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: formatDate },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      render: (_, account) => {
        const isSelf = account.id === currentUser?.id
        return (
          <Space size={6}>
            <Button size="small" icon={<EditOutlined />} onClick={() => startEdit(account)}>编辑</Button>
            <Popconfirm
              title={`${account.status === 1 ? '禁用' : '启用'}账号`}
              description={`确认${account.status === 1 ? '禁用' : '启用'} ${account.username}？`}
              okText="确认"
              cancelText="取消"
              onConfirm={() => handleToggleStatus(account)}
              disabled={isSelf}
            >
              <Tooltip title={isSelf ? '不能操作当前登录账号' : ''}>
                <Button size="small" disabled={isSelf} icon={account.status === 1 ? <DeleteOutlined /> : <ReloadOutlined />} danger={account.status === 1}>
                  {account.status === 1 ? '禁用' : '启用'}
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <Card className="admin-card">
      <div className="admin-page-head">
        <div>
          <Title level={4}>账号管理</Title>
          <Text type="secondary">新增、修改和禁用后台账号，账号操作会写入操作日志</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>新增账号</Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={accounts}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `共 ${total} 个账号` }}
      />

      <Modal
        title="新增账号"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={saving}
        okText="新增账号"
        cancelText="取消"
      >
        <Form form={createForm} layout="vertical" requiredMark={false} initialValues={{ role: 'project_admin' }} onFinish={handleCreate}>
          <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input autoComplete="off" />
          </Form.Item>
          <Form.Item label="初始密码" name="password" rules={[{ required: true, message: '请输入初始密码' }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="昵称" name="nickname">
            <Input />
          </Form.Item>
          <Form.Item label="角色" name="role">
            <Select options={roleOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`修改账号${editing ? `：${editing.username}` : ''}`}
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={() => editForm.submit()}
        confirmLoading={saving}
        okText={editPassword ? '确认并重置密码' : '保存修改'}
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical" requiredMark={false} onFinish={handleUpdate}>
          <Form.Item label="昵称" name="nickname">
            <Input />
          </Form.Item>
          <Form.Item label="角色" name="role">
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label="重置密码" name="password" extra="留空则不修改密码">
            <Input.Password autoComplete="new-password" placeholder="留空则不修改" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

function RoleTag({ role }) {
  return <Tag color={role === 'super_admin' ? 'blue' : 'default'}>{role}</Tag>
}

function StatusTag({ status }) {
  return <Tag color={status === 1 ? 'green' : 'red'}>{status === 1 ? '启用' : '禁用'}</Tag>
}

function formatDate(value) {
  if (!value) return <Text type="secondary">-</Text>
  return String(value).replace('T', ' ').slice(0, 19)
}
