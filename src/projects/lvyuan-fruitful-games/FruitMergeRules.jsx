import { getLvyuanFruitfulGamesAsset } from './config'
import Ih5Stage from './Ih5Stage'

function PosterImage({ asset, className, alt = '' }) {
  return <img className={className} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function FruitMergeRules({ onBack, onComingSoon }) {
  return (
    <main className="lyfg-page lyfg-ih5-page lyfg-ih5-rules-page">
      <Ih5Stage label="合成水果规则">
        <PosterImage asset="background" className="lyfg-ih5-background" />
        <PosterImage asset="mergeRulesTitle" className="lyfg-ih5-rules-title" alt="合成水果游戏规则" />
        <PosterImage asset="mergeRulesDiagram" className="lyfg-ih5-rules-diagram" alt="种子、树苗与水果的合成规则" />
        <button className="lyfg-ih5-action lyfg-ih5-rules-back" type="button" onClick={onComingSoon} aria-label="敬请期待">
          <PosterImage asset="mergeRulesBack" className="lyfg-ih5-fill-image" alt="敬请期待" />
        </button>
        <button className="lyfg-ih5-action lyfg-ih5-rules-start" type="button" onClick={onBack} aria-label="返回游戏选择">
          <PosterImage asset="mergeRulesStart" className="lyfg-ih5-fill-image" alt="返回游戏选择" />
        </button>
      </Ih5Stage>
    </main>
  )
}
