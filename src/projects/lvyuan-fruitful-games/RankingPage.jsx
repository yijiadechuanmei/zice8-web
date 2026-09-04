import { getLvyuanFruitfulGamesAsset } from './config'
import Ih5Stage from './Ih5Stage'

const RANKING = [
  ['清朗果园', 15880], ['金融卫士', 12860], ['安心守护', 11620], ['枇小护', 9840],
  ['硕果盈心', 9310], ['绿园新星', 8860], ['反诈达人', 8420], ['消保先锋', 7980],
  ['诚信伙伴', 7540], ['理财能手', 7110], ['清风使者', 6680], ['金融小将', 6250],
  ['安全达人', 5820], ['权益卫士', 5390], ['果园园丁', 4960], ['知识新秀', 4530],
  ['守护之星', 4100], ['消费明白人', 3670], ['绿色伙伴', 3240], ['安心果农', 2810],
]

function PosterImage({ asset, className, alt = '' }) {
  return <img className={className} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function RankingPage({ onBack }) {
  return <main className="lyfg-page lyfg-ih5-page lyfg-ranking-page"><Ih5Stage label="积分排行榜">
    <PosterImage asset="rankingBackground" className="lyfg-ih5-background" />
    <PosterImage asset="rankingSecond" className="lyfg-ranking-podium lyfg-ranking-podium--second" />
    <PosterImage asset="rankingFirst" className="lyfg-ranking-podium lyfg-ranking-podium--first" />
    <PosterImage asset="rankingThird" className="lyfg-ranking-podium lyfg-ranking-podium--third" />
    {RANKING.slice(0, 3).map(([name, score], index) => <div className={`lyfg-ranking-winner lyfg-ranking-winner--${index + 1}`} key={name}><strong>{name}</strong><b>{score}</b></div>)}
    <section className="lyfg-ranking-list" aria-label="第4名至第20名">
      {RANKING.slice(3).map(([name, score], index) => <div className="lyfg-ranking-row" key={name} style={{ '--row-index': index }}>
        <PosterImage asset="rankingRow" className="lyfg-ranking-row-bg" />
        <span className="lyfg-ranking-number">{index + 4}</span>
        <PosterImage asset={index % 2 === 0 ? 'rankingAvatarA' : 'rankingAvatarB'} className="lyfg-ranking-avatar" />
        <strong className="lyfg-ranking-name">{name}</strong><b className="lyfg-ranking-score">{score}</b>
      </div>)}
    </section>
    <button className="lyfg-ih5-action lyfg-ranking-back" type="button" onClick={onBack} aria-label="返回首页"><PosterImage asset="rankingBack" className="lyfg-ih5-fill-image" alt="返回首页" /></button>
  </Ih5Stage></main>
}
