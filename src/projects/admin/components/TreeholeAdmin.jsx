import { useCallback, useEffect, useState } from 'react'
import { Button, DatePicker, Modal, Select, Space, Table, Tag, message } from 'antd'
import { API_BASE_URL } from '../../../shared/api/request'
import { adminRequest, getAdminToken } from '../api'

const { RangePicker } = DatePicker
export default function TreeholeAdmin({ activity }) {
  const key = encodeURIComponent(activity.activityKey)
  const [featured, setFeatured] = useState('')
  const [share, setShare] = useState('')
  const [dates, setDates] = useState(null)
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ list: [], total: 0 })
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const filters = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (featured) params.set('featured', featured)
    if (share) params.set('share', share)
    if (dates?.[0]) params.set('start', dates[0].startOf('day').toISOString())
    if (dates?.[1]) params.set('end', dates[1].endOf('day').toISOString())
    return params
  }, [page, featured, share, dates])
  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await adminRequest(`/treehole/activities/${key}/admin/notes?${filters()}`)) }
    catch (error) { message.error(error.message) }
    finally { setLoading(false) }
  }, [key, filters])
  useEffect(() => { load() }, [load])
  async function toggle(row) {
    try {
      await adminRequest(`/treehole/activities/${key}/admin/notes/${row.id}/featured`, { method: 'PATCH', body: JSON.stringify({ featured: !row.featured }) })
      message.success(row.featured ? '已退回全部投稿' : '已设为精选')
      setSelected(null); load()
    } catch (error) { message.error(error.message) }
  }
  async function exportExcel() {
    try {
      const response = await fetch(`${API_BASE_URL}/treehole/activities/${key}/admin/export?${filters()}`, { headers: { Authorization: `Bearer ${getAdminToken()}` } })
      if (!response.ok) throw new Error('导出失败')
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a'); link.href = url; link.download = '怡宝小树洞投稿.xlsx'; link.click(); URL.revokeObjectURL(url)
    } catch (error) { message.error(error.message) }
  }
  const columns = [
    { title: '提交时间', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleString('zh-CN') },
    { title: '头像', dataIndex: 'avatar', render: (v) => v ? <img src={v} alt="" width="32" height="32" referrerPolicy="no-referrer" /> : '—' },
    { title: '昵称', dataIndex: 'nickname' },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '匿名分享', dataIndex: 'allowAnonymousShare', render: (v) => v ? '允许' : '不允许' },
    { title: '精选', dataIndex: 'featured', render: (v) => v ? <Tag color="green">精选</Tag> : '未精选' },
    { title: '操作', render: (_, row) => <Space><Button onClick={() => setSelected(row)}>详情</Button><Button onClick={() => toggle(row)}>{row.featured ? '退回' : '设为精选'}</Button></Space> },
  ]
  return <div style={{ padding: 20 }}>
    <Space wrap style={{ marginBottom: 16 }}>
      <Select value={featured} onChange={(v) => { setFeatured(v); setPage(1) }} options={[{ value: '', label: '全部精选状态' }, { value: 'true', label: '精选' }, { value: 'false', label: '未精选' }]} style={{ width: 150 }} />
      <Select value={share} onChange={(v) => { setShare(v); setPage(1) }} options={[{ value: '', label: '全部分享选择' }, { value: 'true', label: '允许匿名分享' }, { value: 'false', label: '不允许分享' }]} style={{ width: 160 }} />
      <RangePicker showTime value={dates} onChange={(v) => { setDates(v); setPage(1) }} />
      <Button onClick={exportExcel}>导出 Excel</Button>
    </Space>
    <Table rowKey="id" columns={columns} dataSource={data.list} loading={loading} pagination={{ current: page, pageSize: 20, total: data.total, onChange: setPage }} />
    <Modal title="投稿详情" open={!!selected} onCancel={() => setSelected(null)} footer={selected && <Button onClick={() => toggle(selected)}>{selected.featured ? '退回' : '设为精选'}</Button>}>
      {selected && <><p>用户标识：{selected.userId}</p><p>昵称：{selected.nickname}</p><p>提交时间：{new Date(selected.createdAt).toLocaleString('zh-CN')}</p><p>匿名分享：{selected.allowAnonymousShare ? '允许' : '不允许'}</p><p style={{ whiteSpace: 'pre-wrap' }}>{selected.content}</p></>}
    </Modal>
  </div>
}
