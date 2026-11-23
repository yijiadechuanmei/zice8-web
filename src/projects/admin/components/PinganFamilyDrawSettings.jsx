import { useEffect, useState } from 'react'
import { Alert, Button, Card, InputNumber, Space, Switch, Table, Typography, message } from 'antd'
import { getPinganFamilyDrawSettings, savePinganFamilyDrawSettings } from '../api'
import PinganFamilyAnalytics from './PinganFamilyAnalytics'

const { Text } = Typography
const names = { backpack: '背包', pillow_blanket: '抱枕被', sun_hat: '防晒帽' }
const codes = Object.keys(names)
const periodLabels = {
  '2026-11-25-am': '11月25日 上午（00:00–11:59）',
  '2026-11-25-pm': '11月25日 下午（12:00–23:59）',
  '2026-11-26': '11月26日 全天',
  '2026-11-27': '11月27日 全天',
}

export default function PinganFamilyDrawSettings({ activityKey }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statsRefreshKey, setStatsRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    getPinganFamilyDrawSettings(activityKey)
      .then((value) => { if (active) setSettings(value) })
      .catch((failure) => { if (active) setError(failure.message || '抽奖配置加载失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activityKey])

  function updatePeriod(periodKey, patch) {
    setSettings((current) => ({
      ...current,
      drawPeriods: {
        ...current.drawPeriods,
        [periodKey]: { ...current.drawPeriods[periodKey], ...patch },
      },
    }))
  }

  function updateQuota(periodKey, code, value) {
    setSettings((current) => ({
      ...current,
      drawPeriods: {
        ...current.drawPeriods,
        [periodKey]: {
          ...current.drawPeriods[periodKey],
          quotas: { ...current.drawPeriods[periodKey].quotas, [code]: value ?? 0 },
        },
      },
    }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const result = await savePinganFamilyDrawSettings(activityKey, {
        enabled: settings.enabled,
        drawPeriods: settings.drawPeriods,
      })
      setSettings(result)
      setStatsRefreshKey((value) => value + 1)
      message.success('抽奖配置已保存')
    } catch (failure) { setError(failure.message || '保存失败') }
    finally { setSaving(false) }
  }

  const rows = settings?.drawPeriods ? Object.entries(settings.drawPeriods).map(([periodKey, period]) => ({ periodKey, ...period.quotas, winRate: period.winRate })) : []
  const otherIssued = settings?.drawPeriods ? (settings.prizes || []).map((prize) => ({
    name: names[prize.code] || prize.code,
    count: prize.issuedCount - Object.keys(settings.drawPeriods).reduce((sum, periodKey) => sum + (settings.issued?.[periodKey]?.[prize.code] || 0), 0),
  })).filter((prize) => prize.count > 0) : []
  const columns = [
    { title: '抽奖时段（北京时间）', dataIndex: 'periodKey', width: 230, render: (value) => periodLabels[value] || value },
    { title: '中奖概率', dataIndex: 'winRate', width: 140, render: (value, row) => <InputNumber min={0} max={100} precision={2} step={0.1} addonAfter="%" value={value} onChange={(next) => updatePeriod(row.periodKey, { winRate: next ?? 0 })} /> },
    ...codes.map((code) => ({
      title: names[code], dataIndex: code, width: 150,
      render: (value, row) => <Space direction="vertical" size={0}>
        <InputNumber min={settings?.issued?.[row.periodKey]?.[code] || 0} max={settings?.prizes?.find((item) => item.code === code)?.totalStock || 50} precision={0} value={value} onChange={(next) => updateQuota(row.periodKey, code, next)} />
        <Text type="secondary">已中 {settings?.issued?.[row.periodKey]?.[code] || 0}</Text>
      </Space>,
    })),
    { title: '时段合计', width: 110, render: (_, row) => codes.reduce((sum, code) => sum + Number(row[code] || 0), 0) },
  ]

  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Card size="small" title="平安家庭抽奖设置" loading={loading}>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      {settings && !settings.drawPeriods && <Alert type="warning" showIcon message="抽奖时段配置尚不可用，请先更新 API" style={{ marginBottom: 12 }} />}
      {settings && <>
        <Space wrap style={{ marginBottom: 16 }}>
          <span>启用抽奖 <Switch checked={settings.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, enabled }))} /></span>
          <Button type="primary" loading={saving} disabled={!settings.drawPeriods} onClick={save}>保存抽奖设置</Button>
        </Space>
        <Table rowKey="periodKey" size="small" dataSource={rows} columns={columns} pagination={false} scroll={{ x: 1000 }} />
        <Text type="secondary">每个时段的概率和奖品配额可单独调整；未发出的配额不会自动结转。四个时段的总配额加上其他时段已发数量不能超过库存，修改配额不能低于本时段已中数量。时段奖品发完后暂停抽奖，未用资格保留。</Text>
        {otherIssued.length > 0 && <div><Text type="warning">正式时段外已发：{otherIssued.map((prize) => `${prize.name}${prize.count}件`).join('、')}，计入总库存，不占本次时段配额。</Text></div>}
      </>}
    </Card>
    <PinganFamilyAnalytics activityKey={activityKey} refreshKey={statsRefreshKey} />
  </Space>
}
