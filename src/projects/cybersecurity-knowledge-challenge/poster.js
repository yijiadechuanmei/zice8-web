import { src } from './artwork'

const POSTER_OSS_ROOT = 'https://zice8-assets.oss-cn-shanghai.aliyuncs.com/'
const POSTER_FILES = {
  '14dba9edc1f271124020174158ee6a13': '14dba9edc1f271124020174158ee6a13_115131_258_258.png',
  '332f549dcf52581618af699dd7edf8f6': '332f549dcf52581618af699dd7edf8f6_680487_646_1240.png',
  '74181980fe59f9fd8b38583c2c487e23': '74181980fe59f9fd8b38583c2c487e23_679720_646_1238.png',
}

const PERSONAL_TITLES = [
  '网络安全先锋',
  '网络安全卫士',
  '网络安全达人',
  '网络安全新锐',
  '网络安全标兵',
  '智慧网安先锋',
  '智能安全先锋',
  '数据安全达人',
  '数据安全卫士',
  '云端安全卫士',
  '密码安全达人',
  '信息安全达人',
  '网安答题先锋',
  '网安闯关先锋',
  '网安知识达人',
  '网安学习先锋',
  '网安进阶先锋',
  '网安守护先锋',
]

const TEAM_TITLES = [
  '网安先锋',
  '数据守护',
  '安全护航',
  '数智护航',
  '网安精英',
  '网安尖兵',
  '交投卫士',
  '交通护航',
]

function posterAsset(id) {
  return src(POSTER_FILES[id] || id).replace('https://assets.zice8.com/', POSTER_OSS_ROOT)
}
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => reject(new Error('图片加载超时，请重试')), 15000)
    img.onload = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); reject(new Error('图片加载失败，请重试')) }
    img.src = url
  })
}
export const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
export const formatCountdown = (seconds) => {
  const safe = Math.max(0, seconds)
  return safe.toFixed(2)
}
export function achievementTitle(mode, progress) {
  const titles = mode === 'team' ? TEAM_TITLES : PERSONAL_TITLES
  const seed = String(
    progress?.attempt?.id ||
    progress?.attempt?.startedAt ||
    progress?.name ||
    progress?.teamName ||
    'cybersecurity-challenge',
  )
  const index = [...seed].reduce(
    (total, character) => (total * 31 + character.codePointAt(0)) >>> 0,
    0,
  ) % titles.length
  return titles[index]
}

export async function makePoster({ mode, progress, avatarUrl = '', qrCanvas, title = achievementTitle(mode, progress) }) {
  if (!progress?.succeeded || !qrCanvas) throw new Error('闯关成功后才能生成海报')
  const canvas = document.createElement('canvas')
  canvas.width = 646; canvas.height = mode === 'team' ? 1240 : 1238
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持海报合成')
  const fallbackAvatar = posterAsset('14dba9edc1f271124020174158ee6a13')
  const [background, avatar] = await Promise.all([
    loadImage(posterAsset(mode === 'team' ? '332f549dcf52581618af699dd7edf8f6' : '74181980fe59f9fd8b38583c2c487e23')),
    avatarUrl ? loadImage(avatarUrl).catch(() => loadImage(fallbackAvatar)) : loadImage(fallbackAvatar),
  ])
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#cc2320'; ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center'
  const statY = mode === 'team' ? 894 : 888
  if (mode === 'team') {
    // Team poster keeps the two reference fields: recommendation code and elapsed time.
    ctx.fillText(formatTime(progress.attempt.durationSeconds), 192, statY)
    ctx.fillText(progress.recommendCode || '', 450, statY)
  } else {
    ctx.fillText(String(progress.attempt.score), 190, statY)
    ctx.fillText(formatTime(progress.attempt.durationSeconds), 449, statY)
  }
  const teamName = progress.teamName || progress.companyName || '网络安全先锋队'
  ctx.fillStyle = '#9b6b31'
  const fit = (text, maxWidth, size) => { while (size > 14) { ctx.font = `${size}px sans-serif`; if (ctx.measureText(text).width <= maxWidth) break; size-- } }
  const ellipsis = (text, maxWidth) => {
    if (ctx.measureText(text).width <= maxWidth) return text
    let value = text
    while (value && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1)
    return `${value}…`
  }
  const wrap = (text, maxWidth) => {
    const lines = []
    let line = ''
    for (const character of text) {
      if (line && ctx.measureText(line + character).width > maxWidth) { lines.push(line); line = character } else line += character
    }
    if (line) lines.push(line)
    return lines
  }
  if (mode === 'team') {
    ctx.fillStyle = '#fffaf7'; ctx.fillRect(24, 699, 598, 50)
    ctx.fillStyle = '#9b6b31'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ellipsis(`${teamName}团队获得`, 598), 323, 734)
  }
  ctx.fillStyle = '#c91822'; ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center'
  ctx.fillText(`「${title}」称号`, 323, 789)
  ctx.save(); ctx.beginPath(); ctx.arc(97, 1114, 45, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(avatar, 52, 1069, 90, 90); ctx.restore()
  ctx.textAlign = 'left'; fit(progress.name || '网络安全守护者', 236, 27); ctx.fillText(progress.name || '网络安全守护者', mode === 'team' ? 160 : 162, mode === 'team' ? 1100 : 1124)
  if (mode === 'team') {
    ctx.font = '22px sans-serif'; ctx.fillStyle = '#9b6b31'
    const lines = wrap(`所属团队：${teamName}`, 236).slice(0, 2)
    lines.forEach((line, index) => ctx.fillText(line, 160, 1132 + index * 25))
  }
  ctx.drawImage(qrCanvas, mode === 'team' ? 421 : 423, 1060, 96, 96)
  return canvas.toDataURL('image/png')
}
