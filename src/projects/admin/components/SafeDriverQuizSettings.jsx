import { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Space, Table, Typography, message } from 'antd'
import { getSafeDriverQuizConfig, saveSafeDriverQuizConfig } from '../api'

export default function SafeDriverQuizSettings({ activityKey }) {
  const [config, setConfig] = useState(null)
  const [testIds, setTestIds] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getSafeDriverQuizConfig(activityKey).then((data) => {
      if (active) { setConfig(data); setTestIds(data.testUserIds.join('\n')) }
    }).catch((err) => { if (active) setError(err.message || '配置加载失败') })
    return () => { active = false }
  }, [activityKey])

  const changePrize = (code, field, value) => setConfig((current) => ({
    ...current, prizes: current.prizes.map((prize) => prize.code === code ? { ...prize, [field]: value } : prize),
  }))
  const probabilityTotal = (config?.prizes || []).reduce((sum, prize) => sum + Number(prize.probabilityBps || 0), 0) / 100

  async function save() {
    setBusy(true)
    setError('')
    try {
      const data = await saveSafeDriverQuizConfig(activityKey, {
        testUserIds: [...new Set(testIds.split(/[\s,，]+/).filter(Boolean))],
        prizes: config.prizes.map(({ code, name, totalStock, probabilityBps }) => ({ code, name, totalStock, probabilityBps })),
      })
      setConfig(data)
      setTestIds(data.testUserIds.join('\n'))
      message.success('活动配置已保存')
    } catch (err) { setError(err.message || '保存失败') }
    finally { setBusy(false) }
  }

  return <Card size="small" title="测试人员与奖品概率">
    <Space direction="vertical" size={14} style={{ width: '100%' }}>
      {error && <Alert type="error" message={error} showIcon />}
      <Typography.Text type="secondary">11月27日开放前，只有下列微信用户ID可以参与。每行一个，也支持逗号分隔。</Typography.Text>
      <Input.TextArea rows={3} value={testIds} onChange={(event) => setTestIds(event.target.value)} placeholder="例如：1" />
      {config && <>
        <Table rowKey="code" pagination={false} scroll={{ x: 660 }} dataSource={config.prizes} columns={[
          { title: '奖品', dataIndex: 'name', width: 230, render: (value, row) => <Input value={value} maxLength={60} onChange={(event) => changePrize(row.code, 'name', event.target.value)} /> },
          { title: '总库存', dataIndex: 'totalStock', width: 100, render: (value, row) => <InputNumber min={row.issuedCount} max={100000} precision={0} value={value} onChange={(number) => changePrize(row.code, 'totalStock', number ?? 0)} /> },
          { title: '已中奖', dataIndex: 'issuedCount', width: 80 },
          { title: '剩余', width: 80, render: (_, row) => Math.max(row.totalStock - row.issuedCount, 0) },
          { title: '中奖概率', dataIndex: 'probabilityBps', width: 130, render: (value, row) => <InputNumber min={0} max={100} precision={2} addonAfter="%" value={value / 100} onChange={(number) => changePrize(row.code, 'probabilityBps', Math.round(Number(number || 0) * 100))} /> },
        ]} />
        <Typography.Text type={probabilityTotal > 100 ? 'danger' : 'secondary'}>奖品概率合计 {probabilityTotal.toFixed(2)}%；未中奖概率 {Math.max(100 - probabilityTotal, 0).toFixed(2)}%。库存耗尽的奖品对应概率计入未中奖。</Typography.Text>
        <Button type="primary" loading={busy} disabled={probabilityTotal > 100} onClick={save}>保存测试人员与奖品配置</Button>
      </>}
    </Space>
  </Card>
}
