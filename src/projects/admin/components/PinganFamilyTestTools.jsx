import { useState } from 'react'
import { Button, Card, Input, InputNumber, Popconfirm, Space, message } from 'antd'
import { managePinganFamilyTestData } from '../api'

export default function PinganFamilyTestTools({ activityKey }) {
  const [userId, setUserId] = useState('')
  const [remaining, setRemaining] = useState(1)
  const [busy, setBusy] = useState(false)

  async function manage(payload, success) {
    if (!/^[1-9]\d*$/.test(userId)) { message.error('请输入有效的微信用户 ID'); return }
    setBusy(true)
    try {
      await managePinganFamilyTestData(activityKey, userId, payload)
      message.success(success)
    } catch (failure) { message.error(failure.message || '测试数据操作失败') }
    finally { setBusy(false) }
  }

  return <Card size="small" title="平安家庭抽奖测试工具">
    <Space wrap>
      <Input aria-label="微信用户 ID" placeholder="微信用户 ID" value={userId} onChange={(event) => setUserId(event.target.value.replace(/\D/g, ''))} style={{ width: 180 }} />
      <InputNumber aria-label="剩余抽奖次数" min={0} max={100} precision={0} value={remaining} onChange={(value) => setRemaining(value ?? 0)} />
      <Button loading={busy} onClick={() => manage({ remaining }, '已设置该用户的剩余测试抽奖次数')}>设置剩余次数</Button>
      <Popconfirm title="重置该用户本活动测试数据？" description="将删除该用户本活动答题、资格、抽奖和登记信息，并回补未核销奖品库存；已核销记录无法重置。" okText="确认重置" cancelText="取消" onConfirm={() => manage({ reset: true }, '该用户本活动测试数据已重置')}>
        <Button danger loading={busy}>重置测试数据</Button>
      </Popconfirm>
    </Space>
    <div style={{ marginTop: 8, color: '#888' }}>仅超级管理员可操作。请使用专用测试用户 ID。</div>
  </Card>
}
