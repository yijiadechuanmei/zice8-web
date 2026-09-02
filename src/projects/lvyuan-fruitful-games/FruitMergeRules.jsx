import { getLvyuanFruitfulGamesAsset } from './config'

function PosterImage({ asset, className, alt = '' }) {
  return <img className={className} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function FruitMergeRules({ onBack, onStart }) {
  return (
    <main className="lyfg-page lyfg-ih5-page lyfg-ih5-rules-page">
      <section className="lyfg-ih5-canvas" aria-label="合成水果规则">
        <PosterImage asset="background" className="lyfg-ih5-background" />
        <PosterImage asset="mergeRulesTitle" className="lyfg-ih5-rules-title" alt="合成水果游戏规则" />
        <PosterImage asset="mergeRulesDiagram" className="lyfg-ih5-rules-diagram" alt="种子、树苗与水果的合成规则" />
        <button className="lyfg-ih5-action lyfg-ih5-rules-back" type="button" onClick={onBack} aria-label="返回游戏选择">
          <PosterImage asset="mergeRulesBack" className="lyfg-ih5-fill-image" alt="返回" />
        </button>
        <button className="lyfg-ih5-action lyfg-ih5-rules-start" type="button" onClick={onStart} aria-label="开始合成水果游戏">
          <PosterImage asset="mergeRulesStart" className="lyfg-ih5-fill-image" alt="开始游戏" />
        </button>
      </section>
    </main>
  )
}
