/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Popconfirm, Space, Switch, Table, Tag, Typography } from 'antd'
import { adminRequest } from '../api'

function inputDateTime(value) {
  if (!value || Number.isNaN(Date.parse(value))) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const data = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${data.year}-${data.month}-${data.day}T${data.hour}:${data.minute}`
}

function chinaDateTime(value) {
  return value ? new Date(`${value}:00+08:00`).toISOString() : ''
}

export default function CybersecurityChallengeAdmin({ activityKey }) {
  const base = `/admin/cybersecurity-knowledge-challenge/activities/${activityKey}`
  const [config, setConfig] = useState(null)
  const [records, setRecords] = useState([])
  const [cursor, setCursor] = useState(null)
  const [code, setCode] = useState('')
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  async function load() {
    setBusy(true); setError('')
    try {
      const [c, r] = await Promise.all([adminRequest(`${base}/lottery`), adminRequest(`${base}/records`)])
      setConfig(c); setRecords(r.list); setCursor(r.nextCursor)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  useEffect(() => { load() }, [activityKey]) // eslint-disable-line react-hooks/exhaustive-deps
  async function save() {
    setBusy(true); setError(''); setNotice('')
    try {
      const { lottery, teamWindow } = config
      if (!teamWindow.startAt || !teamWindow.endAt) throw new Error('请完整设置团队赛时间范围')
      const value = await adminRequest(`${base}/lottery`, { method: 'POST', body: JSON.stringify({ enabled: lottery.enabled, revision: lottery.revision, prizes: lottery.prizes.map(({ id, name, image, stockTotal, probability }) => ({ id, name, image, stockTotal, probability })), teamStartAt: teamWindow.startAt, teamEndAt: teamWindow.endAt }) })
      setConfig(value); setNotice('团队赛时间和抽奖配置已保存')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function redeem() {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await adminRequest(`${base}/redeem`, { method: 'POST', body: JSON.stringify({ code: code.trim() }) })
      setNotice(`${result.name} 核销完成，核销码：${result.code}`); setCode(''); await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function more() {
    setBusy(true); setError('')
    try { const r = await adminRequest(`${base}/records?before=${cursor}`); setRecords((old) => [...old, ...r.list]); setCursor(r.nextCursor) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function clearUserData() {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await adminRequest(`${base}/clear-user-data`, { method: 'POST', body: JSON.stringify({ userId, confirm: 'CLEAR_CYBERSECURITY_USER_DATA' }) })
      setNotice(`已清除用户ID ${result.userId} 的参与数据${result.deleted ? '' : '（未找到记录）'}`); setUserId(''); await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  async function clearAllData() {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await adminRequest(`${base}/clear-all-data`, { method: 'POST', body: JSON.stringify({ confirm: 'CLEAR_CYBERSECURITY_ALL_DATA' }) })
      setNotice(`已清除本活动全部 ${result.deleted} 条参与数据`); await load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  function change(id, field, value) { setConfig((old) => ({ ...old, lottery: { ...old.lottery, prizes: old.lottery.prizes.map((p) => p.id === id ? { ...p, [field]: value } : p) } })) }
  function changeTeamWindow(field, value) { setConfig((old) => ({ ...old, teamWindow: { ...old.teamWindow, [field]: chinaDateTime(value) } })) }
  const rows = records.flatMap((r) => ['personal', 'team'].filter((mode) => r.modes[mode].used).map((mode) => ({ ...r.modes[mode], mode, id: `${r.participantId}-${mode}` })))
  return <Card size="small" title="网络安全知识大闯关 · 团队赛、抽奖与核销" extra={<Button onClick={load} loading={busy}>刷新</Button>}>
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {error && <Alert type="error" message={error} showIcon />}
      {notice && <Alert type="success" message={notice} showIcon />}
      <Typography.Text>个人和团队各3次机会，每种身份仅可成功1次；仅个人赛可抽奖。概率余量为“谢谢参与”；奖品库存耗尽后落入该奖项也视为“谢谢参与”，不重新分配概率。</Typography.Text>
      {config && <>
        <Card size="small" title="团体预选赛时间（北京时间）">
          <Space wrap><span>开始</span><Input type="datetime-local" value={inputDateTime(config.teamWindow.startAt)} onChange={(e) => changeTeamWindow('startAt', e.target.value)} /><span>结束</span><Input type="datetime-local" value={inputDateTime(config.teamWindow.endAt)} onChange={(e) => changeTeamWindow('endAt', e.target.value)} /></Space>
        </Card>
        <Space><span>开放抽奖</span><Switch checked={config.lottery.enabled} onChange={(enabled) => setConfig({ ...config, lottery: { ...config.lottery, enabled } })} /><span>基础谢谢参与概率：{Math.max(0, 100 - config.lottery.prizes.reduce((s, p) => s + p.probability * 100, 0)).toFixed(2)}%</span></Space>
        {!config.lottery.prizes.length && <Alert type="info" message="请先执行本活动的配置脚本，初始化六个奖项。" />}
        <Table rowKey="id" pagination={false} scroll={{ x: 660 }} dataSource={config.lottery.prizes} columns={[
          { title: '奖品名称', dataIndex: 'name', render: (value, row) => <Input value={value} maxLength={60} onChange={(e) => change(row.id, 'name', e.target.value)} /> },
          { title: '库存总量', dataIndex: 'stockTotal', render: (v, r) => <InputNumber min={r.stockUsed} max={1000000} precision={0} value={v} onChange={(n) => change(r.id, 'stockTotal', n ?? 0)} /> },
          { title: '已发放', dataIndex: 'stockUsed' },
          { title: '剩余库存', render: (_, r) => r.stockTotal - r.stockUsed },
          { title: '基础概率（%）', dataIndex: 'probability', render: (v, r) => <InputNumber min={0} max={10} precision={4} value={v * 100} onChange={(n) => change(r.id, 'probability', (n ?? 0) / 100)} /> },
        ]} />
        <Button type="primary" onClick={save} loading={busy}>保存团队赛时间和抽奖设置</Button>
      </>}
      <Space wrap><Input style={{ width: 230 }} placeholder="输入6位核销码" value={code} maxLength={12} onChange={(e) => setCode(e.target.value.toUpperCase())} /><Popconfirm title="确认已向用户发放该奖品？" onConfirm={redeem} disabled={!/^(?:\d{12}|[A-HJ-NP-Z2-9]{6})$/.test(code)}><Button disabled={!/^(?:\d{12}|[A-HJ-NP-Z2-9]{6})$/.test(code)} loading={busy}>确认核销</Button></Popconfirm></Space>
      <Card size="small" title="清除参与数据">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Typography.Text type="secondary">仅清除当前“网络安全知识大闯关”活动数据，不会影响其他活动或微信用户资料。清除后会同步恢复相应奖品库存。</Typography.Text>
          <Space wrap><Input style={{ width: 230 }} placeholder="输入用户ID" value={userId} inputMode="numeric" onChange={(e) => setUserId(e.target.value.replace(/\D/g, ''))} /><Popconfirm title={`确认清除用户ID ${userId} 的全部参与数据？`} description="个人、团队答题和抽奖记录都会被删除。" okText="确认清除" cancelText="取消" onConfirm={clearUserData} disabled={!/^[1-9]\d*$/.test(userId)}><Button danger disabled={!/^[1-9]\d*$/.test(userId)} loading={busy}>清除用户ID数据</Button></Popconfirm></Space>
          <Popconfirm title="确认清除本活动全部用户数据？" description="所有个人、团队答题和抽奖记录都会被删除，奖品已发放数将归零。" okText="确认清除全部" cancelText="取消" onConfirm={clearAllData}><Button danger loading={busy}>清除全部数据</Button></Popconfirm>
        </Space>
      </Card>
      <Table rowKey="id" dataSource={rows} pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} columns={[
        { title: '用户ID', dataIndex: 'userId' }, { title: '姓名', dataIndex: 'name' }, { title: '手机号', dataIndex: 'phone' },
        { title: '身份', render: (_, r) => r.mode === 'team' ? `团队：${r.teamName}` : '个人' },
        { title: '已用次数', dataIndex: 'used' }, { title: '状态', render: (_, r) => <Tag color={r.succeeded ? 'green' : 'default'}>{r.succeeded ? '成功' : r.attempt?.status === 'active' ? '答题中' : '未通关'}</Tag> },
        { title: '得分', render: (_, r) => r.attempt?.score ?? '-' }, { title: '用时（秒）', render: (_, r) => r.attempt?.durationSeconds ?? '-' },
        { title: '奖品', render: (_, r) => r.draw?.name || '未抽奖' }, { title: '核销码', render: (_, r) => r.draw?.code || '-' },
        { title: '核销状态', render: (_, r) => r.draw?.redeemedAt ? `已核销 ${new Date(r.draw.redeemedAt).toLocaleString('zh-CN')}` : r.draw?.prizeId ? '待领取' : '-' },
      ]} />
      {cursor && <Button loading={busy} onClick={more}>加载更早的参与记录</Button>}
    </Space>
  </Card>
}
