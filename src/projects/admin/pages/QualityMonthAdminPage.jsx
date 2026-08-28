/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { DeleteOutlined, ReloadOutlined, SwapOutlined } from '@ant-design/icons'
import {
  clearQualityMonthData,
  getQualityMonthSettings,
  updateQualityMonthCurrentWeek,
} from '../api'

const { Paragraph, Text, Title } = Typography

export default function QualityMonthAdminPage({ activity }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [userId, setUserId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getQualityMonthSettings(activity.activityKey))
    } catch (error) {
      message.error(error.message || '质量月配置加载失败')
    } finally {
      setLoading(false)
    }
  }, [activity.activityKey])

  useEffect(() => { load() }, [load])

  const currentStats = useMemo(
    () => data?.weeks?.find((week) => week.weekNo === data.currentWeek) || null,
    [data],
  )

  async function switchWeek(weekNo) {
    if (!weekNo || weekNo === data?.currentWeek) return
    setActing(true)
    try {
      await updateQualityMonthCurrentWeek(activity.activityKey, weekNo)
      message.success(`当前答题已切换到第 ${weekNo} 周`)
      await load()
    } catch (error) {
      message.error(error.message || '切换周次失败')
    } finally {
      setActing(false)
    }
  }

  async function clearUser() {
    const normalized = userId.trim()
    if (!/^\d+$/.test(normalized)) {
      message.warning('请输入正确的数字用户ID')
      return
    }
    setActing(true)
    try {
      const result = await clearQualityMonthData(activity.activityKey, { scope: 'user', userId: normalized })
      message.success(`已清除用户 ${normalized} 的 ${result.cleared.attempts} 条答题记录`)
      setUserId('')
      await load()
    } catch (error) {
      message.error(error.message || '清除用户数据失败')
    } finally {
      setActing(false)
    }
  }

  async function clearAll() {
    setActing(true)
    try {
      const result = await clearQualityMonthData(activity.activityKey, { scope: 'all' })
      message.success(`已清除本活动全部 ${result.cleared.attempts} 条答题记录`)
      await load()
    } catch (error) {
      message.error(error.message || '清除全部数据失败')
    } finally {
      setActing(false)
    }
  }

  const weekColumns = [
    { title: '周次', dataIndex: 'weekNo', width: 80, render: (value) => <Tag color={value === data?.currentWeek ? 'blue' : 'default'}>第 {value} 周</Tag> },
    { title: '题库', dataIndex: 'title' },
    { title: '题数', dataIndex: 'questionCount', width: 76 },
    { title: '开始人数', dataIndex: 'startedCount', width: 96 },
    { title: '提交人数', dataIndex: 'finishedCount', width: 96 },
    { title: '平均正确题数', dataIndex: 'averageCorrectCount', width: 120, render: (value) => Number(value || 0).toFixed(2) },
    { title: '平均正确率', dataIndex: 'averageAccuracy', width: 110, render: (value) => `${Number(value || 0).toFixed(2)}%` },
    { title: '平均用时', dataIndex: 'averageDurationSeconds', width: 96, render: formatDuration },
  ]

  const resultColumns = [
    { title: '用户ID', dataIndex: 'userId', width: 90 },
    { title: '昵称', dataIndex: 'nickname', render: (value) => value || '-' },
    { title: '周次', dataIndex: 'weekNo', width: 72, render: (value) => `第${value}周` },
    { title: '正确题数', width: 100, render: (_, row) => `${row.correctCount}/${row.totalQuestions}` },
    { title: '正确率', dataIndex: 'accuracy', width: 90, render: (value) => `${Number(value || 0).toFixed(2)}%` },
    { title: '用时', dataIndex: 'durationSeconds', width: 86, render: formatDuration },
    { title: '提交时间', dataIndex: 'submittedAt', width: 170, render: formatDateTime },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card loading={loading}>
        <Space direction="vertical" size={18} style={{ width: '100%' }}>
          <div>
            <Text type="secondary">答题周期控制</Text>
            <Title level={4} style={{ margin: '4px 0 0' }}>当前第 {data?.currentWeek || '-'} 周</Title>
            <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
              切换后，用户会进入新周首页；已提交的旧周成绩继续保留。
            </Paragraph>
          </div>
          <Space wrap>
            <Select
              value={data?.currentWeek}
              style={{ width: 280 }}
              disabled={acting || loading}
              onChange={switchWeek}
              options={(data?.weeks || []).map((week) => ({ value: week.weekNo, label: `第 ${week.weekNo} 周｜${week.title.replace(/^第.+?｜/, '')}` }))}
            />
            <Button icon={<SwapOutlined />} loading={acting} disabled>选择后立即切换</Button>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>刷新</Button>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="当前周已提交" value={currentStats?.finishedCount || 0} suffix="人" /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="当前周平均正确率" value={currentStats?.averageAccuracy || 0} precision={2} suffix="%" /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="当前周平均正确题数" value={currentStats?.averageCorrectCount || 0} precision={2} suffix="题" /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="当前周平均用时" value={formatDuration(currentStats?.averageDurationSeconds || 0)} /></Card></Col>
      </Row>

      <Card title="各周统计">
        <Table rowKey="weekNo" loading={loading} dataSource={data?.weeks || []} columns={weekColumns} pagination={false} scroll={{ x: 900 }} />
      </Card>

      <Card title="答题数据清除">
        <Alert
          type="warning"
          showIcon
          message="仅清除本活动的答题记录与答案明细"
          description="不会删除用户、活动配置、题库、其他活动数据或访问统计。清除后用户可重新参加对应周次。"
          style={{ marginBottom: 18 }}
        />
        <Space wrap align="center">
          <Input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="输入用户ID" style={{ width: 220 }} />
          <Popconfirm title={`确认清除用户 ${userId || '-'} 的本活动全部周次答题数据？`} onConfirm={clearUser} okText="确认清除" cancelText="取消">
            <Button danger icon={<DeleteOutlined />} loading={acting}>清除指定用户</Button>
          </Popconfirm>
          <Popconfirm
            title="确认清除本活动的全部答题数据？"
            description="该操作不可撤销，但不会影响题库、活动配置和其他项目。"
            onConfirm={clearAll}
            okButtonProps={{ danger: true }}
            okText="清除全部"
            cancelText="取消"
          >
            <Button danger type="primary" icon={<DeleteOutlined />} loading={acting}>清除所有答题数据</Button>
          </Popconfirm>
        </Space>
      </Card>

      <Card title="最近提交结果（最多50条）">
        <Table rowKey="id" loading={loading} dataSource={data?.recentResults || []} columns={resultColumns} pagination={{ pageSize: 10 }} scroll={{ x: 820 }} />
      </Card>
    </Space>
  )
}

function formatDuration(value) {
  const seconds = Math.max(0, Number(value) || 0)
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}分${String(rest).padStart(2, '0')}秒`
}

function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}
