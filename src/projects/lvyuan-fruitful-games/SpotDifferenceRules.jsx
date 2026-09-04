import { getLvyuanFruitfulGamesAsset } from './config'
import Ih5Stage from './Ih5Stage'

function PosterImage({ asset, className, alt = '' }) {
  return <img className={className} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function SpotDifferenceRules({ onBack, onStart }) {
  return (
    <main className="lyfg-page lyfg-ih5-page lyfg-ih5-spot-difference-rules-page">
      <Ih5Stage label="乡韵怀旧找茬规则">
        <PosterImage asset="spotDifferenceRulesBackground" className="lyfg-ih5-background" />
        <PosterImage asset="spotDifferenceRulesTitle" className="lyfg-ih5-spot-difference-rules-title" alt="乡韵怀旧找茬规则" />
        <PosterImage asset="spotDifferenceRulesDiagram" className="lyfg-ih5-spot-difference-rules-diagram" alt="找茬游戏规则说明" />
        <button className="lyfg-ih5-action lyfg-ih5-spot-difference-rules-start" type="button" onClick={onStart} aria-label="开始找茬游戏，敬请期待">
          <PosterImage asset="spotDifferenceRulesStart" className="lyfg-ih5-fill-image" alt="开始游戏" />
        </button>
        <button className="lyfg-ih5-action lyfg-ih5-spot-difference-rules-back" type="button" onClick={onBack} aria-label="返回游戏选择">
          <PosterImage asset="spotDifferenceRulesBack" className="lyfg-ih5-fill-image" alt="返回果园" />
        </button>
      </Ih5Stage>
    </main>
  )
}
