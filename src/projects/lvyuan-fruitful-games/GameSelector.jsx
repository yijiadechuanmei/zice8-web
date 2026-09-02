import { getLvyuanFruitfulGamesAsset } from './config'
import Ih5Stage from './Ih5Stage'

function PosterImage({ asset, className, alt = '' }) {
  return <img className={className} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function GameSelector({ onSelectSnake, onSelectFruitMerge }) {
  return (
    <main className="lyfg-page lyfg-ih5-page lyfg-ih5-selector-page">
      <Ih5Stage label="游戏选择">
        <PosterImage asset="background" className="lyfg-ih5-background" />
        <PosterImage asset="selectorTitle" className="lyfg-ih5-selector-title" alt="游戏选择" />
        <PosterImage asset="selectorSubtitle" className="lyfg-ih5-selector-subtitle" alt="选择喜欢的游戏" />
        <button className="lyfg-ih5-action lyfg-ih5-game-card lyfg-ih5-game-card--snake" type="button" onClick={onSelectSnake} aria-label="进入贪吃蛇游戏">
          <PosterImage asset="selectorSnake" className="lyfg-ih5-fill-image" alt="贪吃蛇" />
        </button>
        <span className="lyfg-ih5-game-card lyfg-ih5-game-card--spot-difference" aria-label="找茬游戏，敬请期待">
          <PosterImage asset="selectorSpotDifference" className="lyfg-ih5-fill-image" alt="找茬游戏，敬请期待" />
        </span>
        <button className="lyfg-ih5-action lyfg-ih5-game-card lyfg-ih5-game-card--fruit-merge" type="button" onClick={onSelectFruitMerge} aria-label="查看合成水果规则">
          <PosterImage asset="selectorFruitMerge" className="lyfg-ih5-fill-image" alt="合成水果" />
        </button>
        <PosterImage asset="selectorFooter" className="lyfg-ih5-selector-footer" alt="完成游戏，获得积分与海报" />
      </Ih5Stage>
    </main>
  )
}
