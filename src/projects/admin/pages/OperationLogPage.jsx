import { useEffect, useState } from 'react'
import { Card, Empty, Table, Tag, Typography } from 'antd'
import { getOperationLogs } from '../api'

const { Text, Title } = Typography
const pageSize = 20

export default function OperationLogPage({ activity }) {
  const [data, setData] = useState({ rows: [], pagination: { page: 1, totalPages: 1, total: 0 } })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    getOperationLogs({ activityId: activity.id, page: String(page), pageSize: String(pageSize) })
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(err.message || '操作日志加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [activity.id, page])

  const columns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: formatDate },
    { title: '账号', key: 'adminUser', render: (_, row) => row.adminUser?.nickname || row.adminUser?.username || <Text type="secondary">-</Text> },
    { title: '操作', dataIndex: 'action', key: 'action', render: (value) => <Tag color="blue">{value}</Tag> },
    { title: '目标', key: 'target', render: (_, row) => [row.targetType, row.targetId].filter(Boolean).join(' / ') || <Text type="secondary">-</Text> },
    { title: 'IP', dataIndex: 'ip', key: 'ip', render: (value) => value || <Text type="secondary">-</Text> },
  ]

  return (
    <Card className="admin-card">
      <div className="admin-page-head">
        <div>
          <Title level={4}>操作日志</Title>
          <Text type="secondary">查看账号、权限、导出和数据访问操作记录</Text>
        </div>
      </div>
      {error ? <div className="admin-inline-error">{error}</div> : null}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data.rows}
        loading={loading}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无日志" /> }}
        pagination={{
          current: data.pagination?.page || page,
          pageSize,
          total: data.pagination?.total || 0,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 条`,
        }}
        onChange={(pagination) => setPage(pagination.current || 1)}
      />
    </Card>
  )
}

function formatDate(value) {
  if (!value) return <Text type="secondary">-</Text>
  return String(value).replace('T', ' ').slice(0, 19)
}
