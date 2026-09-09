/* eslint-disable react-refresh/only-export-components */
import { Picture, PRIZE_ART, src } from './artwork'
const sectors = [
  { image: 'ai_assistant', name: 'AI助手' },
  { image: 'pocket', name: '口袋' },
  { image: 'pillow', name: '腰枕' },
  { image: 'cup', name: '杯子' },
  { image: 'mousepad', name: '鼠标垫' },
  { image: 'headrest', name: '头枕' },
  { image: 'dun_dun_usb', name: '蹲蹲U盘' },
  { image: 'none', name: '谢谢参与' },
]
const sectorAngle = 360 / sectors.length
// Target rotations place the matching sector center under the fixed top pointer.
export const WHEEL_ANGLES = Object.fromEntries(sectors.map((item, index) => {
  const center = index * sectorAngle - 90 + sectorAngle / 2
  return [item.image, (360 - (center + 90) + 360) % 360]
}))
const point = (angle, radius) => [347 + Math.cos(angle * Math.PI / 180) * radius, 324 + Math.sin(angle * Math.PI / 180) * radius]
export function Wheel({ rotation, prizes = [] }) {
  return <>
    <Picture id="f79d5d674a55f547e986be446f382a91" x={31} y={293} w={697} h={678} />
    <svg aria-hidden="true" width="697" height="678" viewBox="0 0 697 678" style={{ position: 'absolute', left: 31, top: 293 }}>
      <g className="cyber-wheel" style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '347px 324px' }}>
        {sectors.map((item, i) => {
          const a = i * sectorAngle - 90; const b = a + sectorAngle; const center = a + sectorAngle / 2
          const start = point(a, 277); const end = point(b, 277)
          const [x, y] = point(center, 166)
          const [tx, ty] = point(center, 234)
          const name = prizes.find((p) => p.image === item.image)?.name || item.name
          return <g key={item.image}>
            <path d={`M347 324 L${start.join(' ')} A277 277 0 0 1 ${end.join(' ')} Z`} fill={i % 2 ? '#ffedcd' : '#ffe6ba'} stroke="#da4430" strokeWidth="5" />
            <image href={src(PRIZE_ART[item.image])} x={x - 47} y={y - 43} width="94" height="86" transform={`rotate(${center + 90} ${x} ${y})`} />
            <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#d32d26" fontSize="25" fontWeight="bold" transform={`rotate(${center + 90} ${tx} ${ty})`} textLength={name.length > 6 ? 175 : undefined} lengthAdjust="spacingAndGlyphs">{name}</text>
          </g>
        })}
        <circle cx="347" cy="324" r="76" fill="#fbe8c3" stroke="#a97737" strokeWidth="8" />
      </g>
    </svg>
  </>
}
