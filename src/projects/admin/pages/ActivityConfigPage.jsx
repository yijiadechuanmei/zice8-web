import { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Space, Switch, Typography, message } from 'antd'
import { getActivityConfig, updateActivityBgmConfig } from '../api'

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
  const [error, setError] = useState('')
  const [bgm, setBgm] = useState(defaultBgm)

  useEffect(() => {
    if (!activity?.activityKey) return
    let alive = true
    setLoading(true)
    setError('')
    getActivityConfig(activity.activityKey)
      .then((data) => {
        if (!alive) return
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
        if (alive) setError(err.message || '活动配置加载失败')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

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
      const text = err.message || '活动配置保存失败'
      setError(text)
      message.error(text)
    } finally {
      setSaving(false)
    }
  }

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
      </Space>
    </Card>
  )
}
