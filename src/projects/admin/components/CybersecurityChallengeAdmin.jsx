/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Popconfirm, Space, Switch, Table, Tag, Typography } from 'antd'
import { adminRequest } from '../api'

export default function CybersecurityChallengeAdmin({ activityKey }) {
  const base = `/admin/cybersecurity-knowledge-challenge/activities/${activityKey}`
  const [config, setConfig] = useState(null)
  const [records, setRecords] = useState([])
  const [cursor, setCursor] = useState(null)
  const [code, setCode] = useState('')
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
      const value = await adminRequest(`${base}/lottery`, { method: 'POST', body: JSON.stringify({ enabled: config.enabled, revision: config.revision, prizes: config.prizes.map(({ id, name, image, stockTotal, probability }) => ({ id, name, image, stockTotal, probability })) }) })
      setConfig(value); setNotice('抽奖配置已保存')
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
  function change(id, field, value) { setConfig((old) => ({ ...old, prizes: old.prizes.map((p) => p.id === id ? { ...p, [field]: value } : p) })) }
  const rows = records.flatMap((r) => ['personal', 'team'].filter((mode) => r.modes[mode].used).map((mode) => ({ ...r.modes[mode], mode, id: `${r.participantId}-${mode}` })))
  return <Card size="small" title="网络安全知识大闯关 · 抽奖与核销" extra={<Button onClick={load} loading={busy}>刷新</Button>}>
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {error && <Alert type="error" message={error} showIcon />}
      {notice && <Alert type="success" message={notice} showIcon />}
      <Typography.Text>个人和团队各3次机会，每种身份仅可成功1次、抽奖1次。概率余量为“谢谢参与”；奖品库存耗尽后落入该奖项也视为“谢谢参与”，不重新分配概率。</Typography.Text>
      {config && <>
        <Space><span>开放抽奖</span><Switch checked={config.enabled} onChange={(enabled) => setConfig({ ...config, enabled })} /><span>谢谢参与概率：{Math.max(0, 100 - config.prizes.reduce((s, p) => s + p.probability * 100, 0)).toFixed(2)}%</span></Space>
        {!config.prizes.length && <Alert type="info" message="请先执行本活动的配置脚本，初始化四个奖项。" />}
        <Table rowKey="id" pagination={false} scroll={{ x: 660 }} dataSource={config.prizes} columns={[
          { title: '奖品名称', dataIndex: 'name', render: (value, row) => <Input value={value} maxLength={60} onChange={(e) => change(row.id, 'name', e.target.value)} /> },
          { title: '库存总量', dataIndex: 'stockTotal', render: (v, r) => <InputNumber min={r.stockUsed} max={1000000} precision={0} value={v} onChange={(n) => change(r.id, 'stockTotal', n ?? 0)} /> },
          { title: '已发放', dataIndex: 'stockUsed' },
          { title: '剩余库存', render: (_, r) => r.stockTotal - r.stockUsed },
          { title: '中奖概率（%）', dataIndex: 'probability', render: (v, r) => <InputNumber min={0} max={100} precision={4} value={v * 100} onChange={(n) => change(r.id, 'probability', (n ?? 0) / 100)} /> },
        ]} />
        <Button type="primary" onClick={save} loading={busy}>保存抽奖设置</Button>
      </>}
      <Space wrap><Input style={{ width: 230 }} placeholder="输入12位核销码" value={code} maxLength={12} onChange={(e) => setCode(e.target.value)} /><Popconfirm title="确认已向用户发放该奖品？" onConfirm={redeem} disabled={!/^\d{12}$/.test(code)}><Button disabled={!/^\d{12}$/.test(code)} loading={busy}>确认核销</Button></Popconfirm></Space>
      <Table rowKey="id" dataSource={rows} pagination={{ pageSize: 10 }} scroll={{ x: 1200 }} columns={[
        { title: '姓名', dataIndex: 'name' }, { title: '手机号', dataIndex: 'phone' },
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
