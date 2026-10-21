import { lazy, Suspense } from 'react'
import { Alert, Card, Col, Row, Spin, Table, Tag, Typography } from 'antd'
import './tianfu-reading-overview.css'

const AdminChart = lazy(() => import('./charts/AdminChart'))
const REGIONS = [
  { key: 'map', title: '天府公园', stage: 1 },
  { key: 'xinglong-lake', title: '兴隆湖', stage: 2 },
  { key: 'haichuang-park', title: '海创园', stage: 3 },
]
const EVENTS = [
  ['tianfu_catalog_view', '阅读地图'], ['tianfu_map_view', '片区地图'],
  ['tianfu_point_view', '点位介绍'], ['tianfu_book_view', '书籍推荐理由'],
  ['tianfu_video_play', '视频开始播放'], ['tianfu_video_end', '视频播放至结尾'],
  ['tianfu_image_view', '轮播图片'], ['tianfu_rules_view', '活动规则'],
  ['tianfu_review_view', '精彩点评页面'],
]
const countColumns = [
  { title: '累计次数', dataIndex: 'views', width: 110, sorter: (a, b) => a.views - b.views },
  { title: '累计访客', dataIndex: 'visitors', width: 110, sorter: (a, b) => a.visitors - b.visitors },
  { title: '今日次数', dataIndex: 'todayViews', width: 110, sorter: (a, b) => a.todayViews - b.todayViews },
  { title: '今日访客', dataIndex: 'todayVisitors', width: 110, sorter: (a, b) => a.todayVisitors - b.todayVisitors },
]
const regionTitle = (key) => REGIONS.find((region) => region.key === key)?.title || '未知片区'
const regionColumn = { title: '片区', dataIndex: 'region', width: 110, render: regionTitle,
  filters: REGIONS.map(({ key, title }) => ({ text: title, value: key })), onFilter: (value, row) => row.region === value }
const pointColumn = { title: '点位', dataIndex: 'pointTitle', width: 220 }
const tableProps = { size: 'small', scroll: { x: 760 }, locale: { emptyText: '暂无阅读记录，上线后随访问自动累计' }, pagination: { pageSize: 10, showSizeChanger: true } }

export default function TianfuReadingOverview({ overview, charts }) {
  const reading = overview?.tianfuReading
  if (!reading) return <Alert type="warning" showIcon title="阅读统计接口尚未就绪，请先部署配套 API 后刷新。" />
  const currentStage = reading.currentStage || 1
  const rows = reading.breakdown || []
  const ofType = (type) => rows.filter((row) => row.eventType === type)
  const regionRows = REGIONS.map((region) => ({
    region: region.key, views: 0, visitors: 0, todayViews: 0, todayVisitors: 0,
    ...ofType('tianfu_map_view').find((row) => row.region === region.key),
    unlocked: currentStage >= region.stage,
  }))
  const eventRows = EVENTS.map(([key, title]) => ({ key, title, ...reading.events?.[key] }))
  const mediaRows = rows.filter((row) => ['tianfu_video_play', 'tianfu_video_end', 'tianfu_image_view'].includes(row.eventType))
  const rowKey = (row) => JSON.stringify([row.eventType, row.region, row.pointId, row.bookTitle, row.media])
  return <div className="admin-stack admin-tianfu-reading">
    <Card className="admin-card" title={`当前开放：第 ${currentStage} 阶段`}>
      {REGIONS.map((region) => <Tag key={region.key} color={currentStage >= region.stage ? 'green' : 'default'}>{region.title} · {currentStage >= region.stage ? '已开放' : '未开放'}</Tag>)}
      <Typography.Paragraph type="secondary">
        阅读访客按匿名浏览器 ID 去重，指查看过点位介绍或书籍推荐理由的访客，并非报名人数或读完人数。今日阅读访客：{reading.todayReaders || 0}。
        新增阅读埋点仅统计上线后的行为，不回填历史数据。
        {reading.firstTrackedAt ? ` 首条阅读记录：${new Date(reading.firstTrackedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}。` : ' 暂未收到阅读记录。'}
      </Typography.Paragraph>
    </Card>
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}><Card className="admin-card" title="近 7 天访问趋势">
        <Suspense fallback={<Spin />}><AdminChart type="line" data={charts?.access?.pvUvTrend || []} series={[{ key: 'pv', name: 'PV' }, { key: 'uv', name: 'UV' }]} /></Suspense>
      </Card></Col>
      <Col xs={24} xl={12}><Card className="admin-card" title="近 7 天阅读趋势">
        <Suspense fallback={<Spin />}><AdminChart type="line" data={charts?.tianfuReading?.trend || []} series={[{ key: 'points', name: '点位浏览' }, { key: 'books', name: '书籍浏览' }, { key: 'plays', name: '视频播放' }, { key: 'readers', name: '阅读访客' }]} /></Suspense>
      </Card></Col>
    </Row>
    <Card className="admin-card" title="阅读行为汇总">
      <Typography.Paragraph type="secondary">页面每次进入计一次；视频在每次进入点位后首次成功播放计一次，暂停后继续播放不重复计数；播放至结尾不代表完整观看。图片加载成功后计数。精彩点评仅统计占位页访问，不代表实际评论。</Typography.Paragraph>
      <Table {...tableProps} rowKey="key" pagination={false} columns={[{ title: '行为', dataIndex: 'title', width: 180 }, ...countColumns]} dataSource={eventRows} />
    </Card>
    <Card className="admin-card" title="各片区地图浏览">
      <Table {...tableProps} rowKey="region" pagination={false} columns={[regionColumn, { title: '当前状态', dataIndex: 'unlocked', render: (value) => value ? '已开放' : '未开放', width: 100 }, ...countColumns]} dataSource={regionRows} />
    </Card>
    <Card className="admin-card" title="点位浏览排行">
      <Table {...tableProps} rowKey={rowKey} columns={[regionColumn, pointColumn, ...countColumns]} dataSource={ofType('tianfu_point_view')} />
    </Card>
    <Card className="admin-card" title="推荐书籍浏览排行（按所属点位）">
      <Table {...tableProps} scroll={{ x: 1050 }} rowKey={rowKey} columns={[regionColumn, pointColumn, { title: '书籍', dataIndex: 'bookTitle', width: 280 }, ...countColumns]} dataSource={ofType('tianfu_book_view')} />
    </Card>
    <Card className="admin-card" title="视频与轮播图片统计">
      <Table {...tableProps} scroll={{ x: 1100 }} rowKey={rowKey} columns={[regionColumn, pointColumn, { title: '资源', dataIndex: 'media', width: 240 }, { title: '行为', dataIndex: 'eventType', width: 150, render: (type) => EVENTS.find(([key]) => key === type)?.[1] }, ...countColumns]} dataSource={mediaRows} />
    </Card>
  </div>
}
