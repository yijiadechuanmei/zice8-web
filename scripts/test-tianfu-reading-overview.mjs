// Run against local Vite only. All API writes and OSS media are intercepted.
// PLAYWRIGHT_MODULE can point to an existing Playwright installation; no new dependency is required.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173'
assert(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Only test a local dev server')
const key = 'tianfu_new_district_reading_20260927'
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) })
const output = await mkdtemp(join(tmpdir(), 'tianfu-overview-'))
const events = []
const errors = []
let lastPage
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route(/\/api\/(?:analytics|activities|admin)\//, async (route) => {
    const url = route.request().url()
    let data = {}
    if (url.endsWith('/analytics/track')) {
      events.push(route.request().postDataJSON())
      data = { success: true }
    } else if (url.includes('/public-config')) data = { title: '趣阅天府 慧读新区', mobileConfig: { districtReadingStage: 3 } }
    await route.fulfill({ json: { code: 0, data } })
  })
  await context.route('https://assets.zice8.com/**', (route) => route.fulfill({
    contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=', 'base64'),
  }))
  const page = await context.newPage()
  lastPage = page
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${base}/${key}/${key}`)
  const click = (name) => page.getByRole('button', { name, exact: true }).click()
  await click('进入第一期')
  await click('进入天府公园')
  await click('查看天府公园详情')
  await page.locator('.tianfu-detail-media-inner img').waitFor()
  await click('下一张')
  await page.getByRole('button', { name: '《小亮老师的博物课》', exact: true }).click()
  await page.locator('.tianfu-book-reason-title').waitFor()
  await click('返回点位详情')
  await click('返回点位地图')
  await click('查看广汇美术馆详情')
  // Dispatch native media events to test reporting without streaming remote video.
  await page.locator('video').dispatchEvent('play')
  await page.locator('video').dispatchEvent('pause')
  await page.locator('video').dispatchEvent('play')
  await page.locator('video').dispatchEvent('ended')
  await page.locator('video').dispatchEvent('ended')
  await click('返回点位地图')
  await click('查看活动规则')
  await click('关闭活动规则')
  await click('查看精彩评论')
  await click('返回点位地图')
  await click('返回阅读地图')
  for (const [region, point] of [['兴隆湖', '查看兴隆湖详情'], ['海创园', '查看中科院成都分院详情']]) {
    await click(`进入${region}`)
    await click(point)
    await click('返回点位地图')
    await click('返回阅读地图')
  }
  await page.waitForTimeout(200)
  const count = (type) => events.filter((event) => event.eventType === type).length
  assert.equal(count('page_view'), 1, 'StrictMode and scene transitions must not inflate outer-page PV')
  assert.equal(count('tianfu_video_play'), 1, 'Pause/resume must not inflate plays')
  assert.equal(count('tianfu_video_end'), 1)
  assert.equal(count('tianfu_book_view'), 1)
  assert.equal(count('tianfu_point_view'), 5, 'Return to point detail is another view')
  assert.equal(count('tianfu_map_view'), 8)
  assert.equal(count('tianfu_rules_view'), 1)
  assert.equal(count('tianfu_review_view'), 1)
  assert(count('tianfu_image_view') >= 2)
  assert(events.filter((event) => event.eventType === 'tianfu_point_view').every((event) => event.extra.pointId && event.extra.region))
  assert.equal(events.find((event) => event.eventType === 'tianfu_book_view').extra.pointId, 'tianfu-park')

  const admin = await context.newPage()
  lastPage = admin
  admin.on('pageerror', (error) => errors.push(error.message))
  await admin.setViewportSize({ width: 1440, height: 1000 })
  let empty = false
  const metrics = { views: 5, visitors: 3, todayViews: 2, todayVisitors: 1 }
  const types = [...new Set(events.map((event) => event.eventType).filter((type) => type !== 'page_view'))]
  const breakdown = events.filter((event) => event.extra?.pointId || event.eventType === 'tianfu_map_view')
    .filter((event, index, rows) => rows.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(event)) === index)
    .map((event) => ({ eventType: event.eventType, ...event.extra, ...metrics }))
  await admin.route('**/api/admin/activities/**', (route) => {
    const data = route.request().url().includes('/charts') ? {
      access: { pvUvTrend: [{ date: '2026-10-20', pv: 0, uv: 0 }, { date: '2026-10-21', pv: empty ? 0 : 12, uv: empty ? 0 : 4 }] },
      tianfuReading: { trend: [{ date: '2026-10-20', points: 0, books: 0, plays: 0, readers: 0 }, { date: '2026-10-21', points: empty ? 0 : 5, books: empty ? 0 : 3, plays: empty ? 0 : 1, readers: empty ? 0 : 3 }] },
    } : {
      pv: empty ? 0 : 12, uv: empty ? 0 : 4, todayPv: empty ? 0 : 6, todayUv: empty ? 0 : 2,
      tianfuReading: { readers: empty ? 0 : 3, todayReaders: empty ? 0 : 1, currentStage: 2,
        events: Object.fromEntries(types.map((type) => [type, empty ? { views: 0, visitors: 0, todayViews: 0, todayVisitors: 0 } : metrics])), breakdown: empty ? [] : breakdown },
    }
    return route.fulfill({ json: { code: 0, data } })
  })
  await admin.goto(base)
  await admin.evaluate(async (activityKey) => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js')
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js')
    const { default: Dashboard } = await import('/src/projects/admin/pages/ActivityDashboard.jsx')
    await import('/src/projects/admin/style.css')
    document.getElementById('root').style.display = 'none'
    const host = document.createElement('main')
    host.className = 'admin-shell'
    host.style.padding = '24px'
    document.body.appendChild(host)
    ReactDOM.createRoot(host).render(React.createElement(Dashboard, { activity: { activityKey, type: activityKey }, compact: true }))
  }, key)
  await admin.getByText('点位浏览排行', { exact: true }).waitFor()
  assert.equal(await admin.getByText('正式参与人数', { exact: true }).count(), 0)
  assert.equal(await admin.getByText('完成率', { exact: true }).count(), 0)
  await admin.screenshot({ path: join(output, 'admin-desktop.png'), fullPage: true })
  await admin.setViewportSize({ width: 390, height: 844 })
  await admin.screenshot({ path: join(output, 'admin-mobile.png'), fullPage: true })
  assert(await admin.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Tables should scroll inside their containers')
  empty = true
  await admin.locator('.admin-overview-refresh button').click()
  await admin.getByText('暂无阅读记录，上线后随访问自动累计').first().waitFor()
  assert.equal(errors.length, 0, errors.join('\n'))
  console.log(JSON.stringify({ status: 'passed', eventCounts: Object.fromEntries([...new Set(events.map((event) => event.eventType))].map((type) => [type, count(type)])), screenshots: output }, null, 2))
} catch (error) {
  console.error('Browser errors:', errors)
  if (lastPage) console.error('Visible page:', (await lastPage.locator('body').innerText()).slice(0, 1500))
  throw error
} finally {
  await browser.close()
}
