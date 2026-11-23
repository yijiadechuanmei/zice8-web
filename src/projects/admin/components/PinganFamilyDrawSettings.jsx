import { useEffect, useState } from 'react'
import { Alert, Button, Card, InputNumber, Space, Switch, Table, Typography, message } from 'antd'
import { getPinganFamilyDrawSettings, savePinganFamilyDrawSettings } from '../api'
import PinganFamilyAnalytics from './PinganFamilyAnalytics'

const { Text } = Typography
const names = { backpack: '背包', pillow_blanket: '抱枕被', sun_hat: '防晒帽' }
const codes = Object.keys(names)
const periodLabels = {
  '2026-11-25': '11月25日',
  '2026-11-26': '11月26日',
  '2026-11-27': '11月27日',
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

  function updateStock(code, value) {
    setSettings((current) => ({
      ...current,
      prizes: current.prizes.map((prize) => prize.code === code ? { ...prize, totalStock: value ?? 0 } : prize),
    }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const result = await savePinganFamilyDrawSettings(activityKey, {
        enabled: settings.enabled,
        drawPeriods: settings.drawPeriods,
        prizeStocks: Object.fromEntries(settings.prizes.map(({ code, totalStock }) => [code, totalStock])),
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
    { title: '抽奖日期（北京时间）', dataIndex: 'periodKey', width: 180, render: (value) => periodLabels[value] || value },
    { title: '中奖概率', dataIndex: 'winRate', width: 140, render: (value, row) => <InputNumber min={0} max={100} precision={2} step={0.1} addonAfter="%" value={value} onChange={(next) => updatePeriod(row.periodKey, { winRate: next ?? 0 })} /> },
    ...codes.map((code) => ({
      title: names[code], dataIndex: code, width: 150,
      render: (value, row) => <Space direction="vertical" size={0}>
        <InputNumber min={settings?.issued?.[row.periodKey]?.[code] || 0} precision={0} value={value} onChange={(next) => updateQuota(row.periodKey, code, next)} />
        <Text type="secondary">当日已中 {settings?.issued?.[row.periodKey]?.[code] || 0}</Text>
      </Space>,
    })),
    { title: '当日合计', width: 110, render: (_, row) => codes.reduce((sum, code) => sum + Number(row[code] || 0), 0) },
  ]

  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Card size="small" title="平安家庭抽奖设置" loading={loading}>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      {settings && !settings.drawPeriods && <Alert type="warning" showIcon message="每日抽奖配置尚不可用，请先更新 API" style={{ marginBottom: 12 }} />}
      {settings && <>
        <Space wrap style={{ marginBottom: 16 }}>
          <span>启用抽奖 <Switch checked={settings.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, enabled }))} /></span>
          <Button type="primary" loading={saving} disabled={!settings.drawPeriods} onClick={save}>保存抽奖设置</Button>
        </Space>
        <Table rowKey="periodKey" size="small" dataSource={rows} columns={columns} pagination={false} scroll={{ x: 1000 }} />
        <Table rowKey="code" size="small" pagination={false} dataSource={settings.prizes || []} columns={[
          { title: '奖品', dataIndex: 'code', render: (code) => names[code] || code },
          { title: '三日配额合计', render: (_, prize) => Object.values(settings.drawPeriods || {}).reduce((sum, period) => sum + (period.quotas[prize.code] || 0), 0) },
          { title: '总库存', dataIndex: 'totalStock', render: (value, prize) => <InputNumber min={prize.issuedCount} precision={0} value={value} onChange={(next) => updateStock(prize.code, next)} /> },
          { title: '已发 / 剩余', render: (_, prize) => `${prize.issuedCount} / ${Math.max(0, prize.totalStock - prize.issuedCount)}` },
        ]} />
        <Text type="secondary">每日概率、配额及总库存可调整；未发出的配额不会自动结转。三日配额加其他日期已发数量不能超过总库存，配额和库存都不能低于已中奖数量。当日奖品发完后暂停抽奖，未用资格不扣除。</Text>
        {otherIssued.length > 0 && <div><Text type="warning">正式抽奖日期外已发：{otherIssued.map((prize) => `${prize.name}${prize.count}件`).join('、')}，计入总库存，不占本次每日配额。</Text></div>}
      </>}
    </Card>
    <PinganFamilyAnalytics activityKey={activityKey} refreshKey={statsRefreshKey} />
  </Space>
}
