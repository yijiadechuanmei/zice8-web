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
  updateQualityMonthWeekSchedule,
} from '../api'

const { Paragraph, Text, Title } = Typography

export default function QualityMonthAdminPage({ activity }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [userId, setUserId] = useState('')
  const [scheduleDrafts, setScheduleDrafts] = useState({})
  const [savingScheduleWeek, setSavingScheduleWeek] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const nextData = await getQualityMonthSettings(activity.activityKey)
      setData(nextData)
      setScheduleDrafts(Object.fromEntries(
        (nextData?.weeks || []).map((week) => [week.weekNo, {
          startTime: toBeijingDateTimeInput(week.startTime),
          endTime: toBeijingDateTimeInput(week.endTime),
        }]),
      ))
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

  function updateScheduleDraft(weekNo, field, value) {
    setScheduleDrafts((current) => ({
      ...current,
      [weekNo]: { ...current[weekNo], [field]: value },
    }))
  }

  async function saveWeekSchedule(weekNo) {
    const draft = scheduleDrafts[weekNo] || {}
    setSavingScheduleWeek(weekNo)
    try {
      await updateQualityMonthWeekSchedule(activity.activityKey, weekNo, {
        startTime: draft.startTime || null,
        endTime: draft.endTime || null,
      })
      message.success(`第 ${weekNo} 周答题时间已保存（北京时间）`)
      await load()
    } catch (error) {
      message.error(error.message || '答题时间保存失败')
    } finally {
      setSavingScheduleWeek(null)
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
      message.success(`已清除用户 ${normalized} 的 ${result.cleared.attempts} 条答题记录及 ${result.cleared.profiles || 0} 条报名信息`)
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
      message.success(`已清除本活动全部 ${result.cleared.attempts} 条答题记录及 ${result.cleared.profiles || 0} 条报名信息`)
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
    { title: '平均用时', dataIndex: 'averageDurationSeconds', width: 112, render: formatDuration },
  ]

  const resultColumns = [
    { title: '用户ID', dataIndex: 'userId', width: 90 },
    { title: '姓名', dataIndex: 'name', width: 100, render: (value) => value || '-' },
    { title: '工号', dataIndex: 'employeeNo', width: 110, render: (value) => value || '-' },
    { title: '昵称', dataIndex: 'nickname', render: (value) => value || '-' },
    { title: '周次', dataIndex: 'weekNo', width: 72, render: (value) => `第${value}周` },
    { title: '正确题数', width: 100, render: (_, row) => `${row.correctCount}/${row.totalQuestions}` },
    { title: '正确率', dataIndex: 'accuracy', width: 90, render: (value) => `${Number(value || 0).toFixed(2)}%` },
    { title: '用时', dataIndex: 'durationSeconds', width: 106, render: formatDuration },
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
              切换后，用户会进入新周首页；已提交的旧周成绩继续保留。每周时间按北京时间执行，未设置时不额外限制该周答题。
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

      <Card title="每周答题时间设置（北京时间）">
        <Alert
          type="info"
          showIcon
          message="用户只能在当前周设置的时间区间内开始或提交答题"
          description="每周必须同时填写开始和结束时间；清空两个时间后，该周不再额外限制。保存后首页会直接提示“本周答题未开始”或“本周答题已结束”。"
          style={{ marginBottom: 18 }}
        />
        <Row gutter={[16, 16]}>
          {(data?.weeks || []).map((week) => (
            <Col key={week.weekNo} xs={24} md={12} xl={8}>
              <Card
                size="small"
                title={`第 ${week.weekNo} 周｜${week.title.replace(/^第.+?｜/, '')}`}
                extra={week.weekNo === data?.currentWeek ? <Tag color="blue">当前周</Tag> : null}
              >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <label className="admin-field-block">
                    <Text strong>开始时间</Text>
                    <Input
                      style={{ marginTop: 6 }}
                      type="datetime-local"
                      value={scheduleDrafts[week.weekNo]?.startTime || ''}
                      disabled={loading || savingScheduleWeek === week.weekNo}
                      onChange={(event) => updateScheduleDraft(week.weekNo, 'startTime', event.target.value)}
                    />
                  </label>
                  <label className="admin-field-block">
                    <Text strong>结束时间</Text>
                    <Input
                      style={{ marginTop: 6 }}
                      type="datetime-local"
                      value={scheduleDrafts[week.weekNo]?.endTime || ''}
                      disabled={loading || savingScheduleWeek === week.weekNo}
                      onChange={(event) => updateScheduleDraft(week.weekNo, 'endTime', event.target.value)}
                    />
                  </label>
                  <Button
                    type="primary"
                    block
                    loading={savingScheduleWeek === week.weekNo}
                    disabled={loading || Boolean(savingScheduleWeek)}
                    onClick={() => saveWeekSchedule(week.weekNo)}
                  >
                    保存第 {week.weekNo} 周时间
                  </Button>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="各周统计">
        <Table rowKey="weekNo" loading={loading} dataSource={data?.weeks || []} columns={weekColumns} pagination={false} scroll={{ x: 900 }} />
      </Card>

      <Card title="答题数据清除">
        <Alert
          type="warning"
          showIcon
          message="仅清除本活动的答题记录、答案明细与姓名工号信息"
          description="不会删除微信用户、活动配置、题库、其他活动数据或访问统计。清除后用户需重新填写信息后参加对应周次。"
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
        <Table rowKey="id" loading={loading} dataSource={data?.recentResults || []} columns={resultColumns} pagination={{ pageSize: 10 }} scroll={{ x: 980 }} />
      </Card>
    </Space>
  )
}

function formatDuration(value) {
  const seconds = Math.max(0, Number(value) || 0)
  const roundedSeconds = Math.round(seconds * 100) / 100
  const minutes = Math.floor(roundedSeconds / 60)
  const rest = (roundedSeconds - minutes * 60).toFixed(2).padStart(5, '0')
  return `${minutes}分${rest}秒`
}

function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 19)
}

function toBeijingDateTimeInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}
