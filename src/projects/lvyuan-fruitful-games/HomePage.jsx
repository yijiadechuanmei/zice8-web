import { getLvyuanFruitfulGamesAsset } from './config'
import Ih5Stage from './Ih5Stage'

function PosterImage({ asset, className, alt = '' }) {
  return <img className={className} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function HomePage({ onStart, onRanking }) {
  return (
    <main className="lyfg-page lyfg-ih5-page lyfg-ih5-home-page">
      <Ih5Stage label="绿园消保 硕果盈心">
        <PosterImage asset="background" className="lyfg-ih5-background" />
        <PosterImage asset="homeTitle" className="lyfg-ih5-home-title" alt="绿园消保 硕果盈心" />
        <PosterImage asset="homeHero" className="lyfg-ih5-home-hero" alt="好果实游戏合集" />
        <button className="lyfg-ih5-action lyfg-ih5-home-ranking" type="button" onClick={onRanking} aria-label="查看积分排行榜">
          <PosterImage asset="homeRanking" className="lyfg-ih5-fill-image" alt="积分排行榜" />
        </button>
        <button className="lyfg-ih5-action lyfg-ih5-home-start" type="button" onClick={onStart} aria-label="进入游戏选择">
          <PosterImage asset="homeStart" className="lyfg-ih5-fill-image" alt="开始游戏" />
        </button>
      </Ih5Stage>
    </main>
  )
}
