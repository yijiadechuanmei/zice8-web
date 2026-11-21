/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Alert, Card, Col, Input, Row, Statistic, Table, Tag } from 'antd'
import { getPinganFamilyWinners } from '../api'

const statusText = { confirmed: '已登记', pending_profile: '待填写领奖信息', duplicate_phone: '手机号重复，未发奖' }

export default function PinganFamilyAdmin({ activity, overviewOnly = false }) {
  const [data, setData] = useState({ summary: { confirmed: 0, pending: 0 }, rows: [], pagination: { page: 1, pageSize: 20, total: 0 } })
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    setLoading(true)
    getPinganFamilyWinners(activity.activityKey, { page: overviewOnly ? 1 : page, pageSize: overviewOnly ? 1 : 20, keyword: overviewOnly ? '' : keyword })
      .then((result) => { if (alive) setData(result) })
      .catch((failure) => { if (alive) setError(failure.message || '中奖记录加载失败') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [activity.activityKey, keyword, overviewOnly, page])

  const columns = [
    { title: '记录编号', dataIndex: 'recordNo', width: 150 },
    { title: '微信用户 ID', dataIndex: 'userId', width: 120 },
    { title: '姓名', dataIndex: 'name', width: 130, render: (value) => value || '待填写' },
    { title: '手机号', dataIndex: 'phone', width: 160, render: (value) => value || '待填写' },
    { title: '奖品', dataIndex: 'prizeName', width: 130, render: (value) => value || '未发奖' },
    { title: '状态', dataIndex: 'status', width: 170, render: (value) => <Tag color={value === 'confirmed' ? 'green' : value === 'duplicate_phone' ? 'default' : 'orange'}>{statusText[value] || value}</Tag> },
    { title: '抽奖时间', dataIndex: 'drawnAt', width: 190, render: (value) => new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) },
    { title: '兑奖状态', dataIndex: 'redeemedAt', width: 100, render: (value, row) => row.status !== 'confirmed' ? '—' : value ? '已兑奖' : '待兑奖' },
  ]

  return <>
    {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      <Col xs={12} sm={8}><Card size="small"><Statistic title="已登记中奖" value={data.summary.confirmed} /></Card></Col>
      <Col xs={12} sm={8}><Card size="small"><Statistic title="待填写信息" value={data.summary.pending} /></Card></Col>
    </Row>
    {!overviewOnly && <Card title="平安家庭中奖记录" extra={<Input.Search allowClear placeholder="姓名、手机号或用户 ID" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} style={{ width: 240 }} />}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data.rows} scroll={{ x: 1150 }} pagination={{ current: page, pageSize: 20, total: data.pagination.total, showSizeChanger: false, onChange: setPage }} />
    </Card>}
  </>
}
