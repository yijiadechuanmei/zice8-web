/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react'
import { Avatar, Button, Card, Input, Popconfirm, Space, Table, Tag, Typography, message } from 'antd'
import { clearLvyuanAdminData, getLvyuanAdminParticipants } from '../lvyuanFruitfulApi'

const { Text } = Typography
const GAME_LABELS = { snake: '贪吃蛇', spot_difference: '找茬', fruit_merge: '合成水果' }

export function LvyuanDataClearPanel({ activityKey, onCleared }) {
  const [userId, setUserId] = useState('')
  const [clearing, setClearing] = useState(false)
  const clear = async (scope) => {
    const normalized = userId.trim()
    if (scope === 'user' && !/^\d+$/.test(normalized)) return message.warning('请输入有效的用户 ID')
    setClearing(true)
    try {
      const result = await clearLvyuanAdminData(activityKey, scope, normalized)
      message.success(`已清除 ${result.cleared || 0} 条当前活动用户记录`)
      if (scope === 'user') setUserId('')
      onCleared?.()
    } catch (error) {
      message.error(error.message || '清除失败')
    } finally {
      setClearing(false)
    }
  }
  return <Card size="small" title="当前活动用户信息清除" style={{ borderColor: '#ffccc7' }}>
    <Space direction="vertical" style={{ width: '100%' }}>
      <Text type="secondary">仅清除“绿园消保·硕果盈心”的参与记录、通关状态和积分，不影响微信账号及其他活动数据。</Text>
      <Space wrap>
        <Input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="输入用户 ID" style={{ width: 240 }} />
        <Popconfirm title={`确认清除用户 ${userId || '-'} 在当前活动的全部数据？`} onConfirm={() => clear('user')} okText="确认清除" cancelText="取消">
          <Button danger loading={clearing}>按用户 ID 清除</Button>
        </Popconfirm>
        <Popconfirm title="确认清除当前活动的全部用户数据？此操作不可恢复。" onConfirm={() => clear('all')} okText="确认全部清除" cancelText="取消">
          <Button danger type="primary" loading={clearing}>全部清除</Button>
        </Popconfirm>
      </Space>
    </Space>
  </Card>
}

export function LvyuanParticipantsPage({ activity }) {
  const [data, setData] = useState({ rows: [], pagination: { page: 1, pageSize: 20, total: 0 } })
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const load = useCallback((page = 1, pageSize = 20) => {
    setLoading(true)
    getLvyuanAdminParticipants(activity.activityKey, { page, pageSize, keyword })
      .then(setData)
      .catch((error) => message.error(error.message || '用户数据加载失败'))
      .finally(() => setLoading(false))
  }, [activity.activityKey, keyword])
  useEffect(() => { load() }, [load, refreshKey])
  const columns = [
    { title: '用户 ID', dataIndex: 'userId', width: 110 },
    { title: '用户', dataIndex: 'nickname', render: (value, row) => <Space><Avatar src={row.avatar}>{value?.slice(0, 1)}</Avatar>{value}</Space> },
    { title: '积分', dataIndex: 'totalScore', width: 90, sorter: (a, b) => a.totalScore - b.totalScore },
    { title: '已完成游戏', dataIndex: 'completedGames', render: (games) => games?.length ? games.map((game) => <Tag key={game} color="green">{GAME_LABELS[game] || game}</Tag>) : <Text type="secondary">未完成</Text> },
    { title: '首次进入', dataIndex: 'joinedAt', render: (value) => value ? new Date(value).toLocaleString() : '-' },
    { title: '最后更新', dataIndex: 'updatedAt', render: (value) => value ? new Date(value).toLocaleString() : '-' },
    { title: '操作', key: 'action', width: 90, render: (_, row) => <Popconfirm title={`确认清除用户 ${row.userId} 的当前活动数据？`} onConfirm={async () => { await clearLvyuanAdminData(activity.activityKey, 'user', row.userId); message.success('已清除'); setRefreshKey((value) => value + 1) }}><Button danger size="small">清除</Button></Popconfirm> },
  ]
  return <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <LvyuanDataClearPanel activityKey={activity.activityKey} onCleared={() => setRefreshKey((value) => value + 1)} />
    <Card title="活动用户数据" extra={<Space><Input.Search allowClear placeholder="搜索昵称或用户 ID" value={keyword} onChange={(event) => setKeyword(event.target.value)} onSearch={() => load()} /><Button onClick={() => load()}>刷新</Button></Space>}>
      <Table rowKey="userId" loading={loading} columns={columns} dataSource={data.rows} pagination={{ ...data.pagination, showSizeChanger: true, onChange: load }} scroll={{ x: 900 }} />
    </Card>
  </Space>
}
