import { useEffect, useMemo, useState } from 'react'
import { getLvyuanFruitfulGamesAsset } from './config'
import Ih5Stage from './Ih5Stage'

const GAMES = [
  { background: 'spotGameBackgroundA', title: 'spotGameTitleA', top: 'spotGame1Top', bottom: 'spotGame1Bottom', topBox: [11, 109, 730, 619], bottomBox: [11, 735, 729, 619], spots: [
    ['268e1f43ec71891eca7a4cbd70bfa72d_8018_238_159.png', 164, 112, 238, 159, 738], ['3cbe11be4655a6b6996fc3f24ae78660_6681_141_141.png', 427, 162, 141, 141, 788], ['11f9eecf26f2c3ae8758611a60476efd_5907_117_117.png', 370, 473, 117, 117, 1099], ['11f9eecf26f2c3ae8758611a60476efd_5907_117_117.png', 592, 311, 117, 117, 937], ['640a234bb66c83aecc1e9e4ce76d9029_7075_154_154.png', 518, 534, 154, 154, 1160],
  ] },
  { background: 'spotGameBackgroundB', title: 'spotGameTitleB', top: 'spotGame2Top', bottom: 'spotGame2Bottom', topBox: [10, 207, 731, 600], bottomBox: [9, 820, 732, 603], spots: [
    ['f32cd7423052dc03eec144d2f86dd84e_6757_146_146.png', 77, 337, 146, 146, 955], ['be993c271a8b8b094f100eb9237386af_6390_133_133.png', 207, 649, 133, 133, 1267], ['be993c271a8b8b094f100eb9237386af_6390_133_133.png', 251, 414, 133, 133, 1032], ['5ea09cd8d4f6ad57571122e8cf776c37_6365_132_132.png', 591, 265, 132, 132, 883], ['ab2d4685e82e9b156bc26ae4f31755a8_6753_226_109.png', 204, 232, 226, 109, 850],
  ] },
  { background: 'spotGameBackgroundA', title: 'spotGameTitleA', top: 'spotGame3Top', bottom: 'spotGame3Bottom', topBox: [18, 108, 722, 615], bottomBox: [18, 734, 722, 619], spots: [
    ['2ca5d845e9dc544b95e66f6340d3dde3_6769_187_124.png', 163, 110, 187, 124, 739], ['3cbe11be4655a6b6996fc3f24ae78660_6681_141_141.png', 347, 231, 141, 141, 860], ['888df36250efd53577f8b8e91c906875_6445_134_134.png', 265, 347, 134, 134, 976], ['42337460acc15941dc9387988e8e5bdd_7516_146_189.png', 596, 370, 146, 189, 999], ['640a234bb66c83aecc1e9e4ce76d9029_7075_154_154.png', 500, 574, 154, 154, 1203],
  ] },
]

function Image({ asset, className, style, alt = '' }) {
  return <img className={className} style={style} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function SpotDifferenceFindGame({ onBack, onComplete }) {
  const game = useMemo(() => GAMES[Math.floor(Math.random() * GAMES.length)], [])
  const [found, setFound] = useState([])
  const [wrong, setWrong] = useState(false)
  const complete = found.length === game.spots.length
  useEffect(() => {
    if (!complete) return undefined
    const timer = window.setTimeout(onComplete, 1500)
    return () => window.clearTimeout(timer)
  }, [complete, onComplete])
  useEffect(() => {
    if (!wrong) return undefined
    const timer = window.setTimeout(() => setWrong(false), 1000)
    return () => window.clearTimeout(timer)
  }, [wrong])
  const mark = (index) => setFound((current) => current.includes(index) ? current : [...current, index])
  const boxStyle = ([left, top, width, height]) => ({ left, top, width, height })
  return <main className="lyfg-page lyfg-ih5-page lyfg-spot-find-page"><Ih5Stage label="乡韵怀旧找茬">
    <Image asset={game.background} className="lyfg-ih5-background" />
    <Image asset={game.title} className="lyfg-spot-find-title" alt="乡韵怀旧找茬" />
    <Image asset={game.top} className="lyfg-spot-find-picture" style={boxStyle(game.topBox)} />
    <Image asset={game.bottom} className="lyfg-spot-find-picture" style={boxStyle(game.bottomBox)} />
    <Image asset="spotGameHint" className="lyfg-spot-find-hint" alt="找出不同之处" />
    <button className="lyfg-spot-find-back" type="button" onClick={onBack} aria-label="返回找茬规则">‹</button>
    <div className="lyfg-spot-find-count">已找到 <b>{found.length}</b> / {game.spots.length}</div>
    <div className="lyfg-spot-interactions" onClick={(event) => { if (!event.target.closest('.lyfg-spot-hit')) setWrong(true) }}>
      {game.spots.flatMap(([asset, left, top, width, height, bottomTop], index) => [top, bottomTop].map((spotTop) => <button key={`${index}-${spotTop}`} className="lyfg-spot-hit" style={{ left, top: spotTop, width, height }} type="button" onClick={() => mark(index)} aria-label={`差异点 ${index + 1}`}>{found.includes(index) ? <Image asset={asset} className="lyfg-spot-selected" /> : null}</button>))}
    </div>
    {wrong ? <div className="lyfg-spot-wrong-lock" role="alert"><span>找错了，再仔细看看</span></div> : null}
    {complete ? <div className="lyfg-spot-find-success" role="status"><div><strong>恭喜你</strong><p>全部不同之处都找到了！</p></div></div> : null}
  </Ih5Stage></main>
}
