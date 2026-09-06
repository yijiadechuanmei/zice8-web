import { useEffect, useState } from 'react'
import { getLvyuanFruitfulGamesAsset } from './config'
import { getLvyuanFruitfulGamesRanking } from './api'
import Ih5Stage from './Ih5Stage'

function PosterImage({ asset, className, alt = '' }) {
  return <img className={className} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function RankingPage({ activityKey, onBack }) {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    getLvyuanFruitfulGamesRanking(activityKey)
      .then((result) => { if (alive) setRanking(result?.rankings || []) })
      .catch(() => { if (alive) setRanking([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [activityKey])
  return <main className="lyfg-page lyfg-ih5-page lyfg-ranking-page"><Ih5Stage label="积分排行榜">
    <PosterImage asset="rankingBackground" className="lyfg-ih5-background" />
    <PosterImage asset="rankingSecond" className="lyfg-ranking-podium lyfg-ranking-podium--second" />
    <PosterImage asset="rankingFirst" className="lyfg-ranking-podium lyfg-ranking-podium--first" />
    <PosterImage asset="rankingThird" className="lyfg-ranking-podium lyfg-ranking-podium--third" />
    {ranking.slice(0, 3).map((item, index) => <div className={`lyfg-ranking-winner lyfg-ranking-winner--${index + 1}`} key={item.userId}><strong>{item.nickname}</strong><b>{item.score}</b></div>)}
    <section className="lyfg-ranking-list" aria-label="第4名至第20名">
      {ranking.slice(3).map((item, index) => <div className="lyfg-ranking-row" key={item.userId} style={{ '--row-index': index }}>
        <PosterImage asset="rankingRow" className="lyfg-ranking-row-bg" />
        <span className="lyfg-ranking-number">{index + 4}</span>
        <PosterImage asset={index % 2 === 0 ? 'rankingAvatarA' : 'rankingAvatarB'} className="lyfg-ranking-avatar" />
        <strong className="lyfg-ranking-name">{item.nickname}</strong><b className="lyfg-ranking-score">{item.score}</b>
      </div>)}
      {!loading && ranking.length === 0 ? <div className="lyfg-ranking-empty">暂无排名，快来完成挑战吧</div> : null}
    </section>
    <button className="lyfg-ih5-action lyfg-ranking-back" type="button" onClick={onBack} aria-label="返回首页"><PosterImage asset="rankingBack" className="lyfg-ih5-fill-image" alt="返回首页" /></button>
  </Ih5Stage></main>
}
