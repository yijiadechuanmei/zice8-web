import { src } from './artwork'

const POSTER_OSS_ROOT = 'https://zice8-assets.oss-cn-shanghai.aliyuncs.com/'

function posterAsset(id) {
  return src(id).replace('https://assets.zice8.com/', POSTER_OSS_ROOT)
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
export async function makePoster({ mode, progress, qrCanvas }) {
  if (!progress?.succeeded || !qrCanvas) throw new Error('闯关成功后才能生成海报')
  const canvas = document.createElement('canvas')
  canvas.width = 646; canvas.height = mode === 'team' ? 1240 : 1238
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器不支持海报合成')
  const [background, avatar] = await Promise.all([loadImage(posterAsset(mode === 'team' ? '332f549dcf52581618af699dd7edf8f6' : '74181980fe59f9fd8b38583c2c487e23')), loadImage(posterAsset('14dba9edc1f271124020174158ee6a13'))])
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#cc2320'; ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center'
  const y = mode === 'team' ? 894 : 888
  ctx.fillText(String(progress.attempt.score), mode === 'team' ? 140 : 190, y)
  ctx.fillText(formatTime(progress.attempt.durationSeconds), mode === 'team' ? 324 : 449, y)
  const teamName = progress.teamName || [progress.companyName, progress.departmentName].filter(Boolean).join('') || '网络安全先锋队'
  if (mode === 'team') ctx.fillText(progress.recommendCode || progress.phone?.slice(-6) || '', 510, y)
  // Reference personal poster has two statistic columns; team has three.
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
  ctx.save(); ctx.beginPath(); ctx.arc(97, 1114, 45, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(avatar, 52, 1069, 90, 90); ctx.restore()
  ctx.textAlign = 'left'; fit(progress.name || '网络安全守护者', 236, 27); ctx.fillText(progress.name || '网络安全守护者', mode === 'team' ? 160 : 162, mode === 'team' ? 1100 : 1124)
  if (mode === 'team') {
    ctx.font = '22px sans-serif'; ctx.fillStyle = '#9b6b31'
    const lines = wrap(`所属团队：${teamName}`, 236).slice(0, 2)
    const firstLineY = lines.length > 1 ? 1120 : 1132
    lines.forEach((line, index) => ctx.fillText(line, 160, firstLineY + index * 25))
  }
  ctx.drawImage(qrCanvas, mode === 'team' ? 421 : 423, 1060, 96, 96)
  return canvas.toDataURL('image/png')
}
