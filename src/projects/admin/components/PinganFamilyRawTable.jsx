import { useEffect, useState } from 'react'
import { Alert, Input, Space, Table, Tag, Typography } from 'antd'
import { getPinganFamilyData } from '../api'

const time = (value) => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '—'
const column = (title, dataIndex, width, render) => ({ title, dataIndex, width, render })
const dateColumn = (title, key) => column(title, key, 180, time)
const answerText = (keys, options) => keys ? [...keys].map((key) => `${key}. ${options?.['ABCD'.indexOf(key)] || ''}`).join('；') : '未作答'

const columnsByView = {
  participants: [
    column('微信用户 ID', 'userId', 125), column('微信昵称', 'nickname', 160, (value) => value || '—'),
    column('登记姓名', 'name', 120, (value) => value || '—'), column('登记手机号', 'phone', 145, (value) => value || '—'),
    column('闯关次数', 'challengeCount', 100), column('成功通关次数', 'completedCount', 120),
    dateColumn('首次参与', 'firstJoinedAt'), dateColumn('最近参与', 'lastActiveAt'),
  ],
  answers: [
    column('答案 ID', 'id', 105), column('闯关 ID', 'challengeId', 105), column('微信用户 ID', 'userId', 125),
    column('关卡 / 重试 / 题序', 'stage', 150, (_, row) => `${row.stage} / ${row.attemptNo} / ${row.questionIndex}`),
    column('题目 ID', 'questionId', 115),
    column('题目', 'questionTitle', 300, (value) => <Typography.Text ellipsis={{ tooltip: value }} style={{ maxWidth: 280 }}>{value}</Typography.Text>),
    column('所选', 'selectedOption', 85, (value) => value || '—'),
    column('所选内容', 'selectedOption', 250, (value, row) => <Typography.Text ellipsis={{ tooltip: answerText(value, row.options) }} style={{ maxWidth: 230 }}>{answerText(value, row.options)}</Typography.Text>),
    column('正确答案', 'correctOption', 95),
    column('结果', 'correct', 85, (value, row) => <Tag color={value ? 'green' : row.timedOut ? 'orange' : 'red'}>{row.timedOut ? '超时' : value ? '正确' : '错误'}</Tag>),
    column('用时', 'responseMs', 100, (value) => `${(value / 1000).toFixed(1)} 秒`),
    dateColumn('作答时间', 'answeredAt'),
  ],
  chances: [
    column('资格 ID', 'id', 105), column('微信用户 ID', 'userId', 125), column('闯关 ID', 'challengeId', 105),
    column('资格状态', 'usedAt', 130, (_, row) => row.usedAt ? <Tag color="blue">已抽奖</Tag> : row.invalidatedAt ? <Tag>已失效</Tag> : <Tag color="green">未使用</Tag>),
    dateColumn('获得时间', 'createdAt'), dateColumn('使用时间', 'usedAt'), dateColumn('失效时间', 'invalidatedAt'),
  ],
  draws: [
    column('抽奖 ID', 'id', 105), column('微信用户 ID', 'userId', 125), column('资格 ID', 'chanceId', 105),
    column('奖品 ID', 'prizeId', 105, (value) => value || '—'),
    column('抽奖结果', 'prizeName', 135, (value, row) => row.disqualifiedAt ? '已取消中奖' : value || '未中奖'),
    column('专属中奖码', 'claimCode', 190, (value) => value || '—'),
    column('登记手机号', 'winnerPhone', 145, (value) => value || '—'),
    column('转盘格位', 'wheelIndex', 90), dateColumn('抽奖时间', 'drawnAt'),
    dateColumn('取消时间', 'disqualifiedAt'), dateColumn('兑奖时间', 'redeemedAt'),
  ],
  prizes: [
    column('奖品 ID', 'id', 105), column('奖品代码', 'code', 165), column('奖品名称', 'name', 150),
    column('总库存', 'totalStock', 100), column('已发放', 'issuedCount', 100),
    column('剩余库存', 'totalStock', 105, (_, row) => row.totalStock - row.issuedCount),
    dateColumn('创建时间', 'createdAt'), dateColumn('更新时间', 'updatedAt'),
  ],
}

export default function PinganFamilyRawTable({ activityKey, view }) {
  const [searchText, setSearchText] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ rows: [], pagination: { total: 0 } })
  const [error, setError] = useState('')
  const queryKey = JSON.stringify([activityKey, view, page, keyword])

  useEffect(() => {
    let alive = true
    getPinganFamilyData(activityKey, { view, page, pageSize: 20, keyword })
      .then((result) => { if (alive) { setData({ ...result, queryKey }); setError('') } })
      .catch((failure) => { if (alive) { setData((current) => ({ ...current, queryKey })); setError(failure.message || '数据表加载失败') } })
    return () => { alive = false }
  }, [activityKey, view, page, keyword, queryKey])

  const placeholder = view === 'prizes' ? '奖品 ID、代码或名称' : view === 'answers' ? '用户、闯关、答案 ID 或题目' : '用户 ID、姓名、手机号或记录 ID'
  return <>
    <Space wrap style={{ marginBottom: 16 }}>
      <Input.Search allowClear placeholder={placeholder} style={{ width: 290 }} value={searchText} onChange={(event) => { setSearchText(event.target.value); if (!event.target.value) { setKeyword(''); setPage(1) } }} onSearch={(value) => { setKeyword(value.trim()); setPage(1) }} />
    </Space>
    {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
    <Table
      rowKey="id"
      size="small"
      loading={data.queryKey !== queryKey}
      dataSource={data.rows}
      columns={columnsByView[view]}
      scroll={{ x: 'max-content' }}
      expandable={view === 'answers' ? { expandedRowRender: (row) => <div>
        <strong>题目与选项</strong>
        <p>{row.questionTitle}</p>
        {Array.isArray(row.options) && row.options.map((option, index) => <div key={index}>{'ABCD'[index]}. {option}</div>)}
        <p style={{ marginBottom: 0 }}>所选：{answerText(row.selectedOption, row.options)}；正确：{answerText(row.correctOption, row.options)}</p>
      </div> } : undefined}
      pagination={{ current: page, pageSize: 20, total: data.pagination.total, showSizeChanger: false, showTotal: (total) => `共 ${total} 条`, onChange: setPage }}
    />
    {view === 'answers' && <Typography.Text type="secondary">逐题答案表从日志功能上线后开始记录。历史闯关状态保留，但旧答案无法补录。</Typography.Text>}
  </>
}
