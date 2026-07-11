/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Typography, message } from 'antd'
import { getActivityConfig, getArtistCallLotteryPrizes, saveArtistCallLotteryPrizes, updateActivityBgmConfig, updateActivityStatus } from '../api'

const { Text, Title } = Typography

const defaultBgm = {
  enabled: false,
  url: '',
  loop: true,
  autoplay: true,
  showControl: true,
  volume: 0.6,
}

export default function ActivityConfigPage({ activity }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [error, setError] = useState('')
  const [activityStatus, setActivityStatus] = useState(Number(activity?.status) === 1 ? 1 : 0)
  const [bgm, setBgm] = useState(defaultBgm)
  const [prizes, setPrizes] = useState([])
  const [prizeSaving, setPrizeSaving] = useState(false)

  useEffect(() => {
    if (!activity?.activityKey) return
    let alive = true
    setLoading(true)
    setError('')
    getActivityConfig(activity.activityKey)
      .then((data) => {
        if (!alive) return
        setActivityStatus(Number(data?.activity?.status) === 1 ? 1 : 0)
        setBgm({
          enabled: Boolean(data?.bgm?.enabled),
          url: String(data?.bgm?.url || ''),
          loop: data?.bgm?.loop !== false,
          autoplay: data?.bgm?.autoplay !== false,
          showControl: data?.bgm?.showControl !== false,
          volume: Number.isFinite(Number(data?.bgm?.volume)) ? Number(data.bgm.volume) : 0.6,
        })
      })
      .catch((err) => {
        if (!alive) return
        const text = err?.response?.data?.errorCode === 'activity_config_permission_denied'
          ? '无权修改活动配置'
          : (err.message || '活动配置加载失败')
        setError(text)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    if (activity.type === 'artist_call_lottery') {
      getArtistCallLotteryPrizes(activity.activityKey)
        .then((data) => { if (alive) setPrizes(data?.prizes || []) })
        .catch((err) => { if (alive) setError(err.message || '奖品配置加载失败') })
    } else {
      setPrizes([])
    }

    return () => {
      alive = false
    }
  }, [activity?.activityKey])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const data = await updateActivityBgmConfig(activity.activityKey, bgm)
      setBgm({
        enabled: Boolean(data?.bgm?.enabled),
        url: String(data?.bgm?.url || ''),
        loop: data?.bgm?.loop !== false,
        autoplay: data?.bgm?.autoplay !== false,
        showControl: data?.bgm?.showControl !== false,
        volume: Number.isFinite(Number(data?.bgm?.volume)) ? Number(data.bgm.volume) : 0.6,
      })
      message.success('活动背景音乐配置已保存')
    } catch (err) {
      const text = err?.response?.data?.errorCode === 'activity_config_permission_denied'
        ? '无权修改活动配置'
        : (err.message || '活动配置保存失败')
      setError(text)
      message.error(text)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(enabled) {
    setStatusSaving(true)
    setError('')
    try {
      const data = await updateActivityStatus(activity.activityKey, enabled ? 1 : 0)
      setActivityStatus(Number(data?.status) === 1 ? 1 : 0)
      message.success(enabled ? '活动已启用' : '活动已停用')
    } catch (err) {
      const text = err.message || '活动状态更新失败'
      setError(text)
      message.error(text)
    } finally {
      setStatusSaving(false)
    }
  }

  function updatePrize(index, patch) {
    setPrizes((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  function addPrize() {
    setPrizes((items) => [...items, {
      id: '', prizeName: '', prizeLevel: '', prizeImage: '', prizeType: 'win', probability: 0, quantity: 0, issuedCount: 0, remainingCount: 0, enabled: true,
    }])
  }

  async function handleSavePrizes() {
    setPrizeSaving(true)
    setError('')
    try {
      const data = await saveArtistCallLotteryPrizes(activity.activityKey, prizes)
      setPrizes(data?.prizes || [])
      message.success('奖品配置已保存')
    } catch (err) {
      const text = err.message || '奖品配置保存失败'
      setError(text)
      message.error(text)
    } finally {
      setPrizeSaving(false)
    }
  }

  const prizeProbability = prizes.filter((item) => item.enabled).reduce((sum, item) => sum + Number(item.probability || 0), 0)
  const prizeColumns = [
    { title: '奖品名称', dataIndex: 'prizeName', width: 150, render: (value, _, index) => <Input value={value} onChange={(event) => updatePrize(index, { prizeName: event.target.value })} /> },
    { title: '等级', dataIndex: 'prizeLevel', width: 110, render: (value, _, index) => <Input value={value} onChange={(event) => updatePrize(index, { prizeLevel: event.target.value })} /> },
    { title: '图片 URL', dataIndex: 'prizeImage', width: 220, render: (value, _, index) => <Input value={value} onChange={(event) => updatePrize(index, { prizeImage: event.target.value })} /> },
    { title: '类型', dataIndex: 'prizeType', width: 110, render: (value, _, index) => <Select value={value} options={[{ value: 'win', label: '中奖' }, { value: 'thanks', label: '谢谢参与' }]} onChange={(prizeType) => updatePrize(index, { prizeType })} /> },
    { title: '概率 %', dataIndex: 'probability', width: 100, render: (value, _, index) => <InputNumber min={0} max={100} precision={2} value={value} onChange={(probability) => updatePrize(index, { probability: Number(probability || 0) })} /> },
    { title: '数量', dataIndex: 'quantity', width: 90, render: (value, _, index) => <InputNumber min={0} precision={0} value={value} disabled={prizes[index]?.prizeType === 'thanks'} onChange={(quantity) => updatePrize(index, { quantity: Number(quantity || 0) })} /> },
    { title: '已发/剩余', width: 92, render: (_, item) => `${item.issuedCount || 0}/${item.remainingCount || 0}` },
    { title: '启用', dataIndex: 'enabled', width: 70, render: (value, _, index) => <Switch size="small" checked={value} onChange={(enabled) => updatePrize(index, { enabled })} /> },
    { title: '', width: 62, render: (_, __, index) => <Popconfirm title="确认删除该奖项？" onConfirm={() => setPrizes((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Button danger type="link">删除</Button></Popconfirm> },
  ]

  return (
    <Card className="admin-card" loading={loading}>
      <div className="admin-page-head">
        <div>
          <Title level={4}>活动配置</Title>
          <Text type="secondary">通用移动端配置，当前先提供背景音乐能力，后续可复用到 quiz、video-rank、抽奖和其他活动。</Text>
        </div>
        <Button type="primary" onClick={handleSave} loading={saving}>
          保存配置
        </Button>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {error ? <Alert type="error" showIcon message={error} /> : null}

        <Card size="small" title="活动状态">
          <Space direction="vertical" size={12}>
            <Switch
              checked={activityStatus === 1}
              checkedChildren="启用"
              unCheckedChildren="停用"
              loading={statusSaving}
              onChange={handleStatusChange}
            />
            <Text type="secondary">
              停用后，活动公开页面将显示“活动暂未开放”，公共业务接口也会拒绝访问。
            </Text>
          </Space>
        </Card>

        <Card size="small" title="移动端音效配置">
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="活动级通用配置"
              description="保存到 activity.mobile_config_json.bgm。quiz、video-rank、抽奖、大屏、小游戏等活动都可以复用同一套背景音乐能力。"
            />

            <Space wrap size={18}>
              <label><Text strong>开启背景音乐</Text><div style={{ marginTop: 8 }}><Switch checked={bgm.enabled} onChange={(checked) => setBgm((value) => ({ ...value, enabled: checked }))} /></div></label>
              <label><Text strong>循环播放</Text><div style={{ marginTop: 8 }}><Switch checked={bgm.loop} onChange={(checked) => setBgm((value) => ({ ...value, loop: checked }))} /></div></label>
              <label><Text strong>自动播放</Text><div style={{ marginTop: 8 }}><Switch checked={bgm.autoplay} onChange={(checked) => setBgm((value) => ({ ...value, autoplay: checked }))} /></div></label>
              <label><Text strong>显示音乐按钮</Text><div style={{ marginTop: 8 }}><Switch checked={bgm.showControl} onChange={(checked) => setBgm((value) => ({ ...value, showControl: checked }))} /></div></label>
            </Space>

            <div>
              <Text strong>音乐 URL</Text>
              <Input
                value={bgm.url}
                onChange={(event) => setBgm((value) => ({ ...value, url: event.target.value }))}
                placeholder="https://assets.zice8.com/common/audio/bgm.mp3"
                style={{ marginTop: 8, maxWidth: 760 }}
              />
            </div>

            <div>
              <Text strong>音量</Text>
              <div style={{ marginTop: 8 }}>
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  value={bgm.volume}
                  onChange={(value) => setBgm((current) => ({ ...current, volume: Number(value ?? 0.6) }))}
                />
              </div>
            </div>
          </Space>
        </Card>

        {activity.type === 'artist_call_lottery' ? (
          <Card size="small" title="抽奖奖品配置" extra={<Space><Text type={Math.abs(prizeProbability - 100) < 0.001 ? 'success' : 'danger'}>启用概率：{prizeProbability.toFixed(2)}%</Text><Button type="primary" loading={prizeSaving} onClick={handleSavePrizes}>保存奖品</Button></Space>}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Alert type="info" showIcon message="概率与库存独立管理" description="概率决定抽中哪个奖项；数量为可发放上限。谢谢参与也需要配置概率，启用奖项总概率必须为 100%。" />
              <Table rowKey={(item, index) => item.id || `new-${index}`} columns={prizeColumns} dataSource={prizes} pagination={false} size="small" scroll={{ x: 1120 }} />
              <Button onClick={addPrize}>新增奖项</Button>
            </Space>
          </Card>
        ) : null}
      </Space>
    </Card>
  )
}
