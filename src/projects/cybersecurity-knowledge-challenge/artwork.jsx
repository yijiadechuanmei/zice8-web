/* eslint-disable react-refresh/only-export-components */
import { layouts } from './layouts'
const SOURCE_ASSET_ROOT = 'https://file3.ih5.cn/v35/edt/u10013600'
export const asset = (name) => `${SOURCE_ASSET_ROOT}/${name}`
export const ART = Object.fromEntries(Object.values(layouts).flat().map((v) => [v.src.split('_')[0].replace('.png', ''), v.src]))
export const src = (id) => asset(ART[id] || id)
export function Picture({ id, x, y, w, h, onClick, label, className = '', disabled = false, style = {} }) {
  const position = { position: 'absolute', left: x, top: y, width: w, height: h, ...style }
  const img = <img src={src(id)} alt={onClick ? '' : (label || '')} draggable={false} />
  return onClick ? <button type="button" className={`cyber-picture cyber-button ${className}`} style={position} onClick={onClick} aria-label={label} disabled={disabled}>{img}</button> : <div className={`cyber-picture ${className}`} style={position}>{img}</div>
}
export function Artwork({ page, actions = {}, omit = [], classes = {} }) {
  return layouts[page].filter((v) => !v.modal && !omit.some((id) => v.src.startsWith(id))).map((v) => {
    const id = v.src.split('_')[0].replace('.png', '')
    const action = actions[id]
    return <Picture key={`${v.src}:${v.x}:${v.y}`} id={v.src} {...v} onClick={action?.onClick} label={action?.label} disabled={action?.disabled} className={classes[id] || ''} />
  })
}
export const PRIZE_ART = { cup: '79cde7710e78ec3fa445d45b5db8d5e0', pillow: 'ccd59680942cf673e3b24e4169db0a0a', lucky: '7e0684f704cefbaac29683fdfc97e390', mousepad: 'e433c133c59973398f40f9e588225178', none: 'text-1d1ce1877686' }
export const backId = 'text-bf1fb3d4749d'
export const otherBackId = 'text-717e0a8c2a48'
