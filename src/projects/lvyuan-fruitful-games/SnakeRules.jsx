import { getLvyuanFruitfulGamesAsset } from './config'
import Ih5Stage from './Ih5Stage'

function PosterImage({ asset, className, alt = '' }) {
  return <img className={className} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function SnakeRules({ onBack, onStart }) {
  return (
    <main className="lyfg-page lyfg-ih5-page lyfg-ih5-snake-rules-page">
      <Ih5Stage label="贪吃蛇游戏规则">
        <PosterImage asset="background" className="lyfg-ih5-background" />
        <PosterImage asset="snakeRulesTitle" className="lyfg-ih5-snake-rules-title" alt="贪吃蛇游戏规则" />
        <PosterImage asset="snakeRulesDiagram" className="lyfg-ih5-snake-rules-diagram" alt="贪吃蛇游戏说明" />
        <button className="lyfg-ih5-action lyfg-ih5-snake-rules-back" type="button" onClick={onStart} aria-label="开始贪吃蛇游戏">
          <PosterImage asset="snakeRulesBack" className="lyfg-ih5-fill-image" alt="开始游戏" />
        </button>
        <button className="lyfg-ih5-action lyfg-ih5-snake-rules-start" type="button" onClick={onBack} aria-label="返回游戏选择">
          <PosterImage asset="snakeRulesStart" className="lyfg-ih5-fill-image" alt="返回游戏选择" />
        </button>
      </Ih5Stage>
    </main>
  )
}
