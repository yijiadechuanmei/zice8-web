import { useEffect, useMemo, useState } from 'react'
import { getLvyuanFruitfulGamesAsset } from './config'
import Ih5Stage from './Ih5Stage'

const GAMES = [
  { background: 'spotGameBackgroundA', title: 'spotGameTitleA', top: 'spotGame1Top', bottom: 'spotGame1Bottom', topBox: [11, 109, 730, 619], bottomBox: [11, 735, 729, 619], spots: [[283, 192], [498, 232], [429, 532], [650, 370], [595, 611]] },
  { background: 'spotGameBackgroundB', title: 'spotGameTitleB', top: 'spotGame2Top', bottom: 'spotGame2Bottom', topBox: [10, 207, 731, 600], bottomBox: [9, 820, 732, 603], spots: [[150, 410], [317, 286], [318, 480], [657, 331], [273, 704]] },
  { background: 'spotGameBackgroundA', title: 'spotGameTitleA', top: 'spotGame3Top', bottom: 'spotGame3Bottom', topBox: [18, 108, 722, 615], bottomBox: [18, 734, 722, 619], spots: [[257, 172], [418, 302], [332, 414], [669, 465], [577, 651]] },
]

function Image({ asset, className, style, alt = '' }) {
  return <img className={className} style={style} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function SpotDifferenceFindGame({ onBack, onComplete }) {
  const game = useMemo(() => GAMES[Math.floor(Math.random() * GAMES.length)], [])
  const [found, setFound] = useState([])
  const complete = found.length === game.spots.length
  useEffect(() => {
    if (!complete) return undefined
    const timer = window.setTimeout(onComplete, 1500)
    return () => window.clearTimeout(timer)
  }, [complete, onComplete])
  const mark = (index) => setFound((current) => current.includes(index) ? current : [...current, index])
  const boxStyle = ([left, top, width, height]) => ({ left, top, width, height })
  const lowerOffset = game.bottomBox[1] - game.topBox[1]
  return <main className="lyfg-page lyfg-ih5-page lyfg-spot-find-page"><Ih5Stage label="乡韵怀旧找茬">
    <Image asset={game.background} className="lyfg-ih5-background" />
    <Image asset={game.title} className="lyfg-spot-find-title" alt="乡韵怀旧找茬" />
    <Image asset={game.top} className="lyfg-spot-find-picture" style={boxStyle(game.topBox)} />
    <Image asset={game.bottom} className="lyfg-spot-find-picture" style={boxStyle(game.bottomBox)} />
    <Image asset="spotGameHint" className="lyfg-spot-find-hint" alt="找出不同之处" />
    <button className="lyfg-spot-find-back" type="button" onClick={onBack} aria-label="返回找茬规则">‹</button>
    <div className="lyfg-spot-find-count">已找到 <b>{found.length}</b> / {game.spots.length}</div>
    {game.spots.flatMap(([x, y], index) => [0, lowerOffset].map((offset) => <button key={`${index}-${offset}`} className={`lyfg-spot-hit ${found.includes(index) ? 'is-found' : ''}`} style={{ left: x - 45, top: y + offset - 45 }} type="button" onClick={() => mark(index)} aria-label={`差异点 ${index + 1}`}><i /></button>))}
    {complete ? <div className="lyfg-spot-find-success" role="status"><div><strong>恭喜你</strong><p>全部不同之处都找到了！</p></div></div> : null}
  </Ih5Stage></main>
}
