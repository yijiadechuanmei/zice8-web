/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Descriptions, Input, Popconfirm, Row, Space, Statistic, Table, Tag, message } from 'antd'
import { getPinganFamilyClaim, getPinganFamilyWinners, redeemPinganFamilyClaim } from '../api'
import PinganFamilyQuizData from './PinganFamilyQuizData'

const statusText = { confirmed: '已登记', pending_profile: '待填写领奖信息', duplicate_phone: '手机号重复，未发奖' }

export default function PinganFamilyAdmin({ activity, overviewOnly = false }) {
  const [data, setData] = useState({ summary: { confirmed: 0, pending: 0 }, rows: [], pagination: { page: 1, pageSize: 20, total: 0 } })
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [claimName, setClaimName] = useState('')
  const [claimPhone, setClaimPhone] = useState('')
  const [claim, setClaim] = useState(null)
  const [claimBusy, setClaimBusy] = useState(false)
  const [claimError, setClaimError] = useState('')
  useEffect(() => {
    let alive = true
    setLoading(true)
    getPinganFamilyWinners(activity.activityKey, { page: overviewOnly ? 1 : page, pageSize: overviewOnly ? 1 : 20, keyword: overviewOnly ? '' : keyword })
      .then((result) => { if (alive) setData(result) })
      .catch((failure) => { if (alive) setError(failure.message || '中奖记录加载失败') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [activity.activityKey, keyword, overviewOnly, page, refreshKey])

  async function lookupClaim() {
    setClaimBusy(true)
    setClaim(null)
    setClaimError('')
    try {
      setClaim(await getPinganFamilyClaim(activity.activityKey, { name: claimName.trim(), phone: claimPhone.trim() }))
    } catch (failure) { setClaimError(failure.message || '中奖信息查询失败') }
    finally { setClaimBusy(false) }
  }

  async function redeem() {
    if (!claim) return
    setClaimBusy(true)
    setClaimError('')
    try {
      const result = await redeemPinganFamilyClaim(activity.activityKey, { name: claim.name, phone: claim.phone })
      setClaim((current) => ({ ...current, redeemedAt: result.redeemedAt }))
      setRefreshKey((value) => value + 1)
      message.success('兑奖核销成功，不能再次领取')
    } catch (failure) { setClaimError(failure.message || '兑奖核销失败') }
    finally { setClaimBusy(false) }
  }

  const columns = [
    { title: '微信用户 ID', dataIndex: 'userId', width: 120 },
    { title: '姓名', dataIndex: 'name', width: 130, render: (value) => value || '待填写' },
    { title: '手机号', dataIndex: 'phone', width: 160, render: (value) => value || '待填写' },
    { title: '奖品', dataIndex: 'prizeName', width: 130, render: (value) => value || '未发奖' },
    { title: '专属中奖码', dataIndex: 'claimCode', width: 190, render: (value) => value || '—' },
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
    {!overviewOnly && <Card title="现场兑奖核验" size="small" style={{ marginBottom: 16 }}>
      <Space wrap style={{ marginBottom: 12 }}>
        <Input value={claimName} onChange={(event) => { setClaimName(event.target.value); setClaim(null) }} placeholder="登记姓名" aria-label="登记姓名" style={{ width: 150 }} />
        <Input value={claimPhone} onChange={(event) => { setClaimPhone(event.target.value.replace(/\D/g, '').slice(0, 11)); setClaim(null) }} inputMode="numeric" placeholder="登记手机号" aria-label="登记手机号" style={{ width: 180 }} />
        <Button onClick={lookupClaim} loading={claimBusy} disabled={!claimName.trim() || !/^1[3-9]\d{9}$/.test(claimPhone)}>查询中奖记录</Button>
      </Space>
      {claimError && <Alert type="error" showIcon message={claimError} style={{ marginBottom: 12 }} />}
      {claim && <>
        <Descriptions size="small" column={{ xs: 1, sm: 2 }} items={[
          { key: 'prize', label: '奖品', children: claim.prizeName },
          { key: 'code', label: '专属中奖码', children: claim.claimCode },
          { key: 'name', label: '登记姓名', children: claim.name || '待登记' },
          { key: 'phone', label: '登记手机号', children: claim.phone || '待登记' },
          { key: 'status', label: '兑奖状态', children: claim.redeemedAt ? <Tag color="green">已兑奖</Tag> : <Tag color="orange">待兑奖</Tag> },
        ]} />
        {!claim.redeemedAt && <Popconfirm title="确认已核对中奖者姓名和手机号并交付奖品？" description="核销后该奖品无法再次领取。" okText="确认核销" cancelText="取消" onConfirm={redeem}>
          <Button type="primary" loading={claimBusy}>确认兑奖并核销</Button>
        </Popconfirm>}
      </>}
    </Card>}
    {!overviewOnly && <Card title="平安家庭中奖记录" extra={<Input.Search allowClear placeholder="姓名、手机号或用户 ID" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1) }} style={{ width: 240 }} />}>
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data.rows} scroll={{ x: 1200 }} pagination={{ current: page, pageSize: 20, total: data.pagination.total, showSizeChanger: false, onChange: setPage }} />
    </Card>}
    {!overviewOnly && <div style={{ marginTop: 16 }}><PinganFamilyQuizData activityKey={activity.activityKey} /></div>}
  </>
}
