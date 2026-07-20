/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'
import { Alert, Button, Card, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Typography, message } from 'antd'
import {
  clearSongWishLotteryDraws,
  getActivityConfig,
  getArtistCallLotteryPrizes,
  getSongWishLotteryResultConfig,
  manualDrawSongWishLottery,
  revokeSongWishLotteryDraw,
  saveArtistCallLotteryPrizes,
  saveSongWishLotteryResultConfig,
  updateActivityBgmConfig,
  updateActivityStatus,
} from '../api'

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
  const [songWishResult, setSongWishResult] = useState({ publishAt: '2026-07-29T00:00', prizes: [], winners: [], entryTotal: 0, winnerTotal: 0 })
  const [songWishSaving, setSongWishSaving] = useState(false)
  const [manualDrawing, setManualDrawing] = useState(false)
  const [manualPrizeId, setManualPrizeId] = useState('')
  const [manualTargets, setManualTargets] = useState('')
  const [revokeDrawId, setRevokeDrawId] = useState('')
  const [clearingDraws, setClearingDraws] = useState(false)

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

    if (activity.type === 'song_wish_lottery') {
      getSongWishLotteryResultConfig(activity.activityKey)
        .then((data) => {
          if (!alive) return
          setSongWishResult({
            publishAt: toDateTimeInput(data?.publishAt || '2026-07-29T00:00'),
            prizes: data?.prizes || [],
            winners: data?.winners || [],
            entryTotal: Number(data?.entryTotal || 0),
            winnerTotal: Number(data?.winnerTotal || 0),
          })
        })
        .catch((err) => { if (alive) setError(err.message || '歌曲许愿开奖配置加载失败') })
    }

    return () => {
      alive = false
    }
  }, [activity?.activityKey, activity?.type])

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

  function updateSongWishPrize(index, patch) {
    setSongWishResult((current) => ({
      ...current,
      prizes: current.prizes.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
    }))
  }

  function addSongWishPrize() {
    setSongWishResult((current) => ({
      ...current,
      prizes: [...current.prizes, {
        id: '', prizeLevel: '', prizeName: '', prizeImage: '', quantity: 0, issuedCount: 0, remainingCount: 0, enabled: true,
      }],
    }))
  }

  async function handleSaveSongWishResult() {
    setSongWishSaving(true)
    setError('')
    try {
      const data = await saveSongWishLotteryResultConfig(activity.activityKey, {
        publishAt: songWishResult.publishAt,
        prizes: songWishResult.prizes,
      })
      setSongWishResult((current) => ({
        ...current,
        publishAt: toDateTimeInput(data?.publishAt || current.publishAt),
        prizes: data?.prizes || [],
      }))
      message.success('歌曲许愿开奖配置已保存')
    } catch (err) {
      const text = err.message || '歌曲许愿开奖配置保存失败'
      setError(text)
      message.error(text)
    } finally {
      setSongWishSaving(false)
    }
  }

  async function handleManualDraw() {
    const targets = manualTargets.split(/[\s,，;；]+/).map((item) => item.trim()).filter(Boolean)
    if (!manualPrizeId) {
      message.warning('请选择要发放的奖项')
      return
    }
    if (!targets.length) {
      message.warning('请输入 OpenID 或用户ID')
      return
    }
    setManualDrawing(true)
    setError('')
    try {
      const data = await manualDrawSongWishLottery(activity.activityKey, { prizeId: manualPrizeId, targets })
      const skipped = Math.max(Number(data?.requested || 0) - Number(data?.awarded || 0), 0)
      message.success(`已指定 ${data?.awarded || 0} 名中奖用户${skipped ? `，${skipped} 名未处理` : ''}`)
      if (skipped) {
        const detail = (data?.results || []).filter((item) => item.status !== 'awarded').slice(0, 3).map((item) => `${item.target}：${item.message}`).join('；')
        if (detail) message.warning(detail)
      }
      setManualTargets('')
      const next = await getSongWishLotteryResultConfig(activity.activityKey)
      setSongWishResult({
        publishAt: toDateTimeInput(next?.publishAt || songWishResult.publishAt),
        prizes: next?.prizes || [],
        winners: next?.winners || [],
        entryTotal: Number(next?.entryTotal || 0),
        winnerTotal: Number(next?.winnerTotal || 0),
      })
    } catch (err) {
      const text = err.message || '手动开奖失败'
      setError(text)
      message.error(text)
    } finally {
      setManualDrawing(false)
    }
  }

  async function refreshSongWishResult() {
    const next = await getSongWishLotteryResultConfig(activity.activityKey)
    setSongWishResult((current) => ({
      ...current,
      publishAt: toDateTimeInput(next?.publishAt || current.publishAt),
      prizes: next?.prizes || [],
      winners: next?.winners || [],
      entryTotal: Number(next?.entryTotal || 0),
      winnerTotal: Number(next?.winnerTotal || 0),
    }))
  }

  async function handleRevokeSongWishWinner(drawId) {
    setRevokeDrawId(drawId)
    setError('')
    try {
      await revokeSongWishLotteryDraw(activity.activityKey, drawId)
      await refreshSongWishResult()
      message.success('已撤销中奖记录，奖项名额已回补')
    } catch (err) {
      const text = err.message || '撤销中奖记录失败'
      setError(text)
      message.error(text)
    } finally {
      setRevokeDrawId('')
    }
  }

  async function handleClearSongWishWinners() {
    setClearingDraws(true)
    setError('')
    try {
      const data = await clearSongWishLotteryDraws(activity.activityKey)
      await refreshSongWishResult()
      message.success(`已清空 ${data?.cleared || 0} 条中奖记录，奖项名额已全部回补`)
    } catch (err) {
      const text = err.message || '清空中奖名单失败'
      setError(text)
      message.error(text)
    } finally {
      setClearingDraws(false)
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

  const songWishPrizeColumns = [
    { title: '奖项等级', dataIndex: 'prizeLevel', width: 130, render: (value, _, index) => <Input value={value} placeholder="如：一等奖" onChange={(event) => updateSongWishPrize(index, { prizeLevel: event.target.value })} /> },
    { title: '奖品名称', dataIndex: 'prizeName', width: 160, render: (value, _, index) => <Input value={value} onChange={(event) => updateSongWishPrize(index, { prizeName: event.target.value })} /> },
    { title: '奖品图片 OSS URL', dataIndex: 'prizeImage', width: 260, render: (value, _, index) => <Input value={value} onChange={(event) => updateSongWishPrize(index, { prizeImage: event.target.value })} /> },
    { title: '中奖名额', dataIndex: 'quantity', width: 100, render: (value, _, index) => <InputNumber min={0} precision={0} value={value} onChange={(quantity) => updateSongWishPrize(index, { quantity: Number(quantity || 0) })} /> },
    { title: '已发/剩余', width: 100, render: (_, item) => `${item.issuedCount || 0}/${item.remainingCount || 0}` },
    { title: '启用', dataIndex: 'enabled', width: 70, render: (value, _, index) => <Switch size="small" checked={value} onChange={(enabled) => updateSongWishPrize(index, { enabled })} /> },
    { title: '', width: 62, render: (_, item, index) => <Popconfirm title="确认删除该奖项？" disabled={Number(item.issuedCount || 0) > 0} onConfirm={() => setSongWishResult((current) => ({ ...current, prizes: current.prizes.filter((_, itemIndex) => itemIndex !== index) }))}><Button danger type="link" disabled={Number(item.issuedCount || 0) > 0}>删除</Button></Popconfirm> },
  ]

  const songWishWinnerColumns = [
    { title: '用户ID', dataIndex: 'userId', width: 110 },
    { title: '昵称', dataIndex: 'nickname', width: 130 },
    { title: 'OpenID', dataIndex: 'openid', width: 220, ellipsis: true },
    { title: '奖项', dataIndex: 'prizeLevel', width: 110 },
    { title: '奖品', dataIndex: 'prizeName', width: 160 },
    { title: '指定时间', dataIndex: 'createdAt', width: 170 },
    { title: '操作', width: 92, fixed: 'right', render: (_, item) => <Popconfirm title="撤销后将回补该奖项名额，确认撤销？" onConfirm={() => handleRevokeSongWishWinner(item.id)}><Button danger type="link" loading={revokeDrawId === item.id}>撤销</Button></Popconfirm> },
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

        {activity.type === 'song_wish_lottery' ? (
          <Card
            size="small"
            title="歌曲许愿开奖配置"
            extra={<Space><Text type="secondary">入池 {songWishResult.entryTotal} 人 · 已中奖 {songWishResult.winnerTotal} 人</Text><Button type="primary" loading={songWishSaving} onClick={handleSaveSongWishResult}>保存配置</Button></Space>}
          >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Alert type="info" showIcon message="定时公布，手动指定中奖" description="默认公布时间为 7 月 29 日。公布前前台只显示“未开奖”，不会泄露已指定的中奖结果；公布后未被指定的入池用户自动显示“未中奖”。" />
              <label className="admin-field-block">
                <Text strong>开奖公布时间（北京时间）</Text>
                <Input type="datetime-local" value={songWishResult.publishAt} onChange={(event) => setSongWishResult((current) => ({ ...current, publishAt: event.target.value }))} style={{ maxWidth: 260, marginTop: 8 }} />
              </label>
              <Table rowKey={(item, index) => item.id || `song-wish-prize-${index}`} columns={songWishPrizeColumns} dataSource={songWishResult.prizes} pagination={false} size="small" scroll={{ x: 1080 }} />
              <Button onClick={addSongWishPrize}>新增奖项</Button>
              <Alert type="warning" showIcon message="批量手动开奖" description="请先保存奖项配置。把甲方随机抽取的 OpenID 或用户ID 粘贴到下方，支持换行、逗号或空格分隔；系统会自动跳过未入池、重复中奖和名额已满的用户。" />
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Select value={manualPrizeId || undefined} placeholder="选择要发放的奖项" onChange={setManualPrizeId} options={songWishResult.prizes.filter((item) => item.enabled && Number(item.remainingCount || item.quantity || 0) > 0).map((item) => ({ value: item.id, label: `${item.prizeLevel} · ${item.prizeName}（剩余 ${item.remainingCount ?? item.quantity}）` }))} style={{ maxWidth: 420 }} />
                <Input.TextArea value={manualTargets} onChange={(event) => setManualTargets(event.target.value)} rows={5} placeholder="粘贴 OpenID 或用户ID，一行一个；也支持逗号、空格分隔" />
                <Button type="primary" loading={manualDrawing} onClick={handleManualDraw}>批量指定中奖用户</Button>
              </Space>
              <div className="admin-page-head" style={{ marginTop: 8 }}>
                <div>
                  <Text strong>已指定中奖名单</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>撤销或清空会自动回补对应奖项名额</Text>
                </div>
                <Popconfirm
                  title={`确认清空全部 ${songWishResult.winnerTotal} 条中奖记录？`}
                  description="清空后所有用户恢复为未中奖，奖项名额会全部回补。"
                  disabled={!songWishResult.winnerTotal}
                  onConfirm={handleClearSongWishWinners}
                >
                  <Button danger disabled={!songWishResult.winnerTotal} loading={clearingDraws}>清空中奖名单</Button>
                </Popconfirm>
              </div>
              <Table rowKey="id" columns={songWishWinnerColumns} dataSource={songWishResult.winners} pagination={songWishResult.winnerTotal > 500 ? { pageSize: 50 } : false} size="small" scroll={{ x: 1000 }} />
            </Space>
          </Card>
        ) : null}
      </Space>
    </Card>
  )
}

function toDateTimeInput(value) {
  return String(value || '').replace(' ', 'T').slice(0, 16) || '2026-07-29T00:00'
}
