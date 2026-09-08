/* eslint-disable react-refresh/only-export-components */
import { layouts } from './layouts'
const OSS_ASSET_ROOT = 'https://assets.zice8.com/cybersecurity_knowledge_challenge/cybersecurity_knowledge_challenge_2026'
export const asset = (name) => `${OSS_ASSET_ROOT}/${name}`
export const ART = Object.fromEntries(Object.values(layouts).flat().map((v) => [v.src.split('_')[0].replace('.png', ''), v.src]))
export const src = (id) => asset(ART[id] || id)
export function Picture({ id, x, y, w, h, onClick, label, className = '', disabled = false, style = {} }) {
  const position = { position: 'absolute', left: x, top: y, width: w, height: h, ...style }
  const img = <img src={src(id)} alt={onClick ? '' : (label || '')} draggable={false} />
  return onClick ? <button type="button" className={`cyber-picture cyber-button ${className}`} style={position} onClick={onClick} aria-label={label} disabled={disabled}>{img}</button> : <div className={`cyber-picture ${className}`} style={position}>{img}</div>
}
export function Artwork({ page, actions = {}, omit = [], classes = {}, animate = true }) {
  return layouts[page].filter((v) => !v.modal && !omit.some((id) => v.src.startsWith(id))).map((v, index) => {
    const id = v.src.split('_')[0].replace('.png', '')
    const action = actions[id]
    const enterClass = animate && index ? `cyber-art-enter cyber-art-enter-${index % 6}` : ''
    return <Picture key={`${v.src}:${v.x}:${v.y}`} id={v.src} {...v} onClick={action?.onClick} label={action?.label} disabled={action?.disabled} className={`${enterClass} ${classes[id] || ''}`.trim()} />
  })
}
export const PRIZE_ART = { cup: '79cde7710e78ec3fa445d45b5db8d5e0', pillow: 'ccd59680942cf673e3b24e4169db0a0a', lucky: '7e0684f704cefbaac29683fdfc97e390', mousepad: 'e433c133c59973398f40f9e588225178', none: 'text-1d1ce1877686' }
export const backId = 'text-bf1fb3d4749d'
export const otherBackId = 'text-717e0a8c2a48'
