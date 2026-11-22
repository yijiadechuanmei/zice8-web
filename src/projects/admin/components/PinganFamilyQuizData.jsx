import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Descriptions, Drawer, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { getPinganFamilyChallengeDetail, getPinganFamilyChallenges } from '../api'

const statusText = { active: '进行中', stage_failed: '关卡未通过', completed: '闯关成功' }
const time = (value) => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '—'

export default function PinganFamilyQuizData({ activityKey }) {
  const [records, setRecords] = useState({ rows: [], pagination: { total: 0 } })
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const detailRequest = useRef(0)
  const queryKey = JSON.stringify([activityKey, page, keyword, status, date])

  useEffect(() => {
    let alive = true
    getPinganFamilyChallenges(activityKey, { page, pageSize: 20, keyword, status, date })
      .then((result) => { if (alive) { setRecords({ ...result, queryKey }); setError('') } })
      .catch((failure) => { if (alive) { setRecords((current) => ({ ...current, queryKey })); setError(failure.message || '闯关记录加载失败') } })
    return () => { alive = false }
  }, [activityKey, page, keyword, status, date, queryKey])

  async function showDetail(id) {
    const requestId = ++detailRequest.current
    setDetail({ id, answers: [] })
    setDetailLoading(true)
    setDetailError('')
    try {
      const result = await getPinganFamilyChallengeDetail(activityKey, id)
      if (requestId === detailRequest.current) setDetail(result)
    } catch (failure) {
      if (requestId === detailRequest.current) setDetailError(failure.message || '逐题记录加载失败')
    } finally {
      if (requestId === detailRequest.current) setDetailLoading(false)
    }
  }

  const columns = [
    { title: '闯关 ID', dataIndex: 'id', width: 105 },
    { title: '微信用户 ID', dataIndex: 'userId', width: 125 },
    { title: '姓名', dataIndex: 'name', width: 100, render: (value) => value || '—' },
    { title: '手机号', dataIndex: 'phone', width: 140, render: (value) => value || '—' },
    { title: '答题日期', dataIndex: 'challengeDate', width: 115, render: (value) => value?.slice(0, 10) },
    { title: '当前关卡', dataIndex: 'stage', width: 90, render: (value) => `第 ${value} 关` },
    { title: '状态', dataIndex: 'status', width: 115, render: (value) => <Tag color={value === 'completed' ? 'green' : value === 'stage_failed' ? 'orange' : 'blue'}>{statusText[value] || value}</Tag> },
    { title: '已答 / 错误 / 超时', width: 160, render: (_, row) => `${row.answers} / ${row.wrong} / ${row.timedOut}` },
    { title: '开始时间', dataIndex: 'createdAt', width: 180, render: time },
    { title: '完成时间', dataIndex: 'completedAt', width: 180, render: time },
    { title: '逐题详情', width: 100, render: (_, row) => <Button type="link" onClick={() => showDetail(row.id)}>查看</Button> },
  ]

  return <>
    <Space wrap style={{ marginBottom: 16 }}>
      <Input.Search allowClear placeholder="用户 ID、姓名、手机号" style={{ width: 240 }} value={searchText} onChange={(event) => { setSearchText(event.target.value); if (!event.target.value) { setKeyword(''); setPage(1) } }} onSearch={(value) => { setKeyword(value.trim()); setPage(1) }} />
      <Select style={{ width: 130 }} value={status} options={[{ value: '', label: '全部状态' }, ...Object.entries(statusText).map(([value, label]) => ({ value, label }))]} onChange={(value) => { setStatus(value); setPage(1) }} />
      <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1) }} aria-label="答题日期" style={{ height: 32, border: '1px solid #d9d9d9', borderRadius: 6, padding: '0 8px' }} />
    </Space>
    {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
    <Table rowKey="id" size="small" loading={records.queryKey !== queryKey} dataSource={records.rows} columns={columns} scroll={{ x: 'max-content' }} pagination={{ current: page, pageSize: 20, total: records.pagination.total, showSizeChanger: false, showTotal: (total) => `共 ${total} 条`, onChange: setPage }} />
    <Typography.Text type="secondary">逐题明细从日志表上线后开始保存；此前记录无法还原全部答案。</Typography.Text>
    <Drawer title={`闯关详情 · ${detail?.userId || ''}`} width={720} open={Boolean(detail)} onClose={() => { detailRequest.current += 1; setDetail(null) }} loading={detailLoading}>
      {detailError && <Alert type="error" showIcon message={detailError} />}
      {detail && !detailLoading && <>
        <Descriptions size="small" column={2} items={[
          { key: 'id', label: '闯关 ID', children: detail.id },
          { key: 'user', label: '微信用户 ID', children: detail.userId },
          { key: 'status', label: '闯关状态', children: statusText[detail.status] || detail.status },
          { key: 'start', label: '开始时间', children: time(detail.createdAt) },
          { key: 'end', label: '完成时间', children: time(detail.completedAt) },
        ]} />
        {!detail.historyAvailable && <Alert type="info" showIcon message={detail.status === 'active' ? '本轮暂无已提交的逐题答案。' : '这轮没有逐题日志；上线前的历史答案无法还原。'} />}
        {detail.answers.map((answer) => <Card key={answer.id} size="small" style={{ marginTop: 12 }} title={`第 ${answer.stage} 关 · 第 ${answer.attemptNo} 次 · 第 ${answer.questionIndex} 题`} extra={<Tag color={answer.correct ? 'green' : answer.timedOut ? 'orange' : 'red'}>{answer.timedOut ? '超时' : answer.correct ? '正确' : '错误'}</Tag>}>
          <p style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>{answer.questionTitle}</p>
          <div>{Array.isArray(answer.options) && answer.options.map((option, index) => <div key={index}>{'ABCD'[index]}. {option}</div>)}</div>
          <Space wrap style={{ marginTop: 12 }}><Typography.Text>用户选择：{answer.selectedOption || '未作答'}</Typography.Text><Typography.Text>正确答案：{answer.correctOption}</Typography.Text><Typography.Text>用时：{(answer.responseMs / 1000).toFixed(1)} 秒</Typography.Text><Typography.Text>作答时间：{time(answer.answeredAt)}</Typography.Text></Space>
        </Card>)}
      </>}
    </Drawer>
  </>
}
