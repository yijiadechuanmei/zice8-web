import { useEffect, useState } from 'react'
import { Alert, Button, Card, InputNumber, Space, Switch, Table, Typography, message } from 'antd'
import { getPinganFamilyDrawSettings, savePinganFamilyDrawSettings } from '../api'
import PinganFamilyAnalytics from './PinganFamilyAnalytics'

const { Text } = Typography
const names = { backpack: '背包', pillow_blanket: '抱枕被', sun_hat: '防晒帽' }
const codes = Object.keys(names)

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

  function updateQuota(day, code, value) {
    setSettings((current) => ({
      ...current,
      dailyQuotas: {
        ...current.dailyQuotas,
        [day]: { ...current.dailyQuotas[day], [code]: value ?? 0 },
      },
    }))
  }

  async function save() {
    setSaving(true)
    setError('')
    try {
      const result = await savePinganFamilyDrawSettings(activityKey, {
        enabled: settings.enabled,
        winRate: settings.winRate,
        dailyQuotas: settings.dailyQuotas,
      })
      setSettings(result)
      setStatsRefreshKey((value) => value + 1)
      message.success('抽奖配置已保存')
    } catch (failure) { setError(failure.message || '保存失败') }
    finally { setSaving(false) }
  }

  const rows = settings ? Object.entries(settings.dailyQuotas).map(([day, quota]) => ({ day, ...quota })) : []
  const columns = [
    { title: '日期（北京时间）', dataIndex: 'day', width: 160 },
    ...codes.map((code) => ({
      title: names[code], dataIndex: code, width: 150,
      render: (value, row) => <Space direction="vertical" size={0}>
        <InputNumber min={settings?.issued?.[row.day]?.[code] || 0} max={settings?.prizes?.find((item) => item.code === code)?.totalStock || 50} precision={0} value={value} onChange={(next) => updateQuota(row.day, code, next)} />
        <Text type="secondary">已中 {settings?.issued?.[row.day]?.[code] || 0}</Text>
      </Space>,
    })),
    { title: '当日合计', width: 110, render: (_, row) => codes.reduce((sum, code) => sum + Number(row[code] || 0), 0) },
  ]

  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Card size="small" title="平安家庭抽奖设置" loading={loading}>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
      {settings && <>
        <Space wrap style={{ marginBottom: 16 }}>
          <span>启用抽奖 <Switch checked={settings.enabled} onChange={(enabled) => setSettings((current) => ({ ...current, enabled }))} /></span>
          <span>中奖率 <InputNumber min={0} max={100} precision={2} step={0.1} addonAfter="%" value={settings.winRate} onChange={(winRate) => setSettings((current) => ({ ...current, winRate: winRate ?? 0 }))} /></span>
          <Button type="primary" loading={saving} onClick={save}>保存抽奖设置</Button>
        </Space>
        <Table rowKey="day" size="small" dataSource={rows} columns={columns} pagination={false} scroll={{ x: 850 }} />
        <Text type="secondary">每日配额是单项奖品的发放上限，未中数量不会自动结转。五天总配额不得超过各奖品总库存；修改时不能低于当天已中数量。奖品售罄时实际中奖率会降低。</Text>
      </>}
    </Card>
    <PinganFamilyAnalytics activityKey={activityKey} refreshKey={statsRefreshKey} />
  </Space>
}
