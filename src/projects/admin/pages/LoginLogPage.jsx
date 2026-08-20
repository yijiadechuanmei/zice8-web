import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Empty, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { getAccounts, getLoginLogs } from '../api'

const { Text, Title } = Typography
const pageSize = 20

export default function LoginLogPage() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [data, setData] = useState({ rows: [], pagination: { page: 1, totalPages: 1, total: 0 } })
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getAccounts()
      .then((result) => {
        if (alive) setAccounts(result.filter((account) => account.role === 'project_admin'))
      })
      .catch((err) => {
        if (alive) setError(err.message || '子账号列表加载失败')
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    getLoginLogs({
      page: String(page),
      pageSize: String(pageSize),
      ...(accountId ? { accountId } : {}),
    })
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err.message || '登录日志加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [accountId, page, reloadKey])

  const accountOptions = useMemo(
    () => [
      { value: '', label: '全部项目子账号' },
      ...accounts.map((account) => ({
        value: account.id,
        label: account.nickname ? `${account.nickname}（${account.username}）` : account.username,
      })),
    ],
    [accounts],
  )

  const columns = [
    { title: '登录时间', dataIndex: 'loginAt', key: 'loginAt', width: 180, fixed: 'left', render: formatDate },
    { title: '账号', key: 'username', width: 150, render: (_, row) => row.adminUser?.username || <Text type="secondary">-</Text> },
    { title: '昵称', key: 'nickname', width: 140, render: (_, row) => row.adminUser?.nickname || <Text type="secondary">-</Text> },
    {
      title: '账号状态',
      key: 'accountStatus',
      width: 100,
      render: (_, row) => (
        <Tag color={row.adminUser?.status === 1 ? 'green' : 'red'}>
          {row.adminUser?.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 160,
      render: (value) => value ? <Text copyable={{ text: value }}>{value}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: '设备 / 浏览器',
      dataIndex: 'userAgent',
      key: 'userAgent',
      width: 360,
      render: (value) => value ? (
        <Tooltip title={value} placement="topLeft">
          <Text ellipsis style={{ display: 'block', maxWidth: 330 }}>{value}</Text>
        </Tooltip>
      ) : <Text type="secondary">-</Text>,
    },
    { title: '结果', key: 'result', width: 90, render: () => <Tag color="success">成功</Tag> },
  ]

  return (
    <Card className="admin-card">
      <div className="admin-page-head">
        <div>
          <Title level={4}>子账号登录日志</Title>
          <Text type="secondary">查看项目子账号的登录时间、IP 和设备浏览器信息</Text>
        </div>
        <Space>
          <Select
            value={accountId}
            options={accountOptions}
            showSearch
            optionFilterProp="label"
            style={{ minWidth: 240 }}
            onChange={(value) => {
              setLoading(true)
              setError('')
              setAccountId(value)
              setPage(1)
            }}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              setLoading(true)
              setError('')
              setReloadKey((value) => value + 1)
            }}
          >
            刷新
          </Button>
        </Space>
      </div>
      {error ? <div className="admin-inline-error">{error}</div> : null}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data.rows}
        loading={loading}
        scroll={{ x: 1180 }}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无子账号登录日志" /> }}
        pagination={{
          current: data.pagination?.page || page,
          pageSize,
          total: data.pagination?.total || 0,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={(pagination) => {
          setLoading(true)
          setError('')
          setPage(pagination.current || 1)
        }}
      />
    </Card>
  )
}

function formatDate(value) {
  if (!value) return <Text type="secondary">-</Text>
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })
}
