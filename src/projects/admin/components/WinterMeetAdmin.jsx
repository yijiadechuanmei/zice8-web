/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Image, Input, Popconfirm, Space, Typography, message } from 'antd'
import { AdminTableBlock } from './AdminDataTable'
import { deleteWinterMeetEntry, getWinterMeetEntries } from '../api'

const pageSize = 20
const { Text, Title } = Typography

export default function WinterMeetAdmin({ activity }) {
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [data, setData] = useState({ list: [], total: 0, canDelete: false })
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    getWinterMeetEntries(activity.activityKey, { page, pageSize, keyword })
      .then((result) => { if (alive) setData(result) })
      .catch((cause) => { if (alive) setError(cause.message || '作品加载失败') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [activity.activityKey, page, keyword, refresh])

  const remove = useCallback(async (row) => {
    setDeletingId(row.id)
    try {
      await deleteWinterMeetEntry(activity.activityKey, row.id)
      message.success('作品已删除')
      if (page > 1 && data.list.length === 1) setPage(page - 1)
      else setRefresh((value) => value + 1)
    } catch (cause) {
      message.error(cause.message || '删除失败')
    } finally {
      setDeletingId('')
    }
  }, [activity.activityKey, data.list.length, page])

  const columns = [
    { title: '作品', dataIndex: 'photoUrl', width: 110, render: (url, row) => <Image src={url} alt={`${row.name}的生活照`} width={88} height={68} style={{ objectFit: 'cover', borderRadius: 8 }} /> },
    { title: '姓名', dataIndex: 'name', width: 110 },
    { title: '性别', dataIndex: 'gender', width: 75, render: (value) => value || '—' },
    { title: '单位', dataIndex: 'company', width: 180, ellipsis: true },
    { title: '兴趣爱好', dataIndex: 'interests', width: 210, ellipsis: true },
    { title: '最近提交', dataIndex: 'submittedAt', width: 180, render: (value) => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—' },
    ...(data.canDelete ? [{ title: '操作', key: 'actions', width: 100, fixed: 'right', render: (_, row) => <Popconfirm title="删除这条作品？" description="删除后将从展示列表和统计中移除，无法恢复。" okText="确认删除" cancelText="取消" okButtonProps={{ danger: true, loading: deletingId === row.id }} onConfirm={() => remove(row)}><Button danger size="small" loading={deletingId === row.id}>删除</Button></Popconfirm> }] : []),
  ]

  return <Card className="admin-card">
    <div className="admin-page-head"><div><Title level={4}>上传作品</Title><Text type="secondary">查看用户提交的生活照和展示信息；照片可点击放大。</Text></div></div>
    <AdminTableBlock error={error} toolbar={<div className="admin-data-toolbar">
      <Input.Search allowClear placeholder="搜索姓名、单位或兴趣爱好" value={keywordInput} onChange={(event) => { setKeywordInput(event.target.value); if (!event.target.value) { setKeyword(''); setPage(1) } }} onSearch={(value) => { setKeyword(value.trim()); setPage(1) }} style={{ width: 300, maxWidth: '100%' }} />
      <Space><Text type="secondary">共 {data.total} 条作品</Text><Button onClick={() => setRefresh((value) => value + 1)}>刷新</Button></Space>
    </div>} tableProps={{
      rowKey: 'id', columns, dataSource: data.list, loading,
      pagination: { current: page, pageSize, total: data.total, showSizeChanger: false, showTotal: (total) => `共 ${total} 条`, onChange: setPage },
    }} />
  </Card>
}
