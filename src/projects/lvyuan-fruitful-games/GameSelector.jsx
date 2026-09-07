import { useState } from 'react'
import { getLvyuanFruitfulGamesAsset } from './config'
import Ih5Stage from './Ih5Stage'

function PosterImage({ asset, className, alt = '' }) {
  return <img className={className} src={getLvyuanFruitfulGamesAsset(asset)} alt={alt} draggable="false" />
}

export default function GameSelector({ onRanking, onSelectSnake, onSelectSpotDifference, onSelectFruitMerge }) {
  return (
    <main className="lyfg-page lyfg-ih5-page lyfg-ih5-selector-page">
      <Ih5Stage label="游戏选择">
        <PosterImage asset="background" className="lyfg-ih5-background" />
        <PosterImage asset="selectorTitle" className="lyfg-ih5-selector-title" alt="游戏选择" />
        <PosterImage asset="selectorSubtitle" className="lyfg-ih5-selector-subtitle" alt="选择喜欢的游戏" />
        <button className="lyfg-ih5-action lyfg-ih5-game-card lyfg-ih5-game-card--snake" type="button" onClick={onSelectSnake} aria-label="进入贪吃蛇游戏">
          <PosterImage asset="selectorSnake" className="lyfg-ih5-fill-image" alt="贪吃蛇" />
        </button>
        <button className="lyfg-ih5-action lyfg-ih5-game-card lyfg-ih5-game-card--spot-difference" type="button" onClick={onSelectSpotDifference} aria-label="查看找茬游戏规则">
          <PosterImage asset="selectorSpotDifference" className="lyfg-ih5-fill-image" alt="找茬游戏" />
        </button>
        <button className="lyfg-ih5-action lyfg-ih5-game-card lyfg-ih5-game-card--fruit-merge" type="button" onClick={onSelectFruitMerge} aria-label="查看合成水果规则">
          <PosterImage asset="selectorFruitMerge" className="lyfg-ih5-fill-image" alt="合成水果" />
        </button>
        <button className="lyfg-ih5-action lyfg-ih5-selector-rules" type="button" onClick={onRanking} aria-label="查看积分排行榜">
          <PosterImage asset="homeRanking" className="lyfg-ih5-fill-image" alt="积分排行榜" />
        </button>
        <PosterImage asset="selectorFooter" className="lyfg-ih5-selector-footer" alt="完成游戏，获得积分与海报" />
      </Ih5Stage>
    </main>
  )
}

export function GameRulesModal({ onClose }) {
  const [atBottom, setAtBottom] = useState(false)
  return <div className="lyfg-game-rules-mask" role="dialog" aria-modal="true" aria-label="游戏规则">
    <section className="lyfg-game-rules-card">
      <PosterImage asset="gameRulesFrame" className="lyfg-game-rules-frame" />
      <button className="lyfg-game-rules-close" type="button" onClick={onClose} aria-label="关闭游戏规则">×</button>
      <article className="lyfg-game-rules-scroll" onScroll={(event) => { const node = event.currentTarget; setAtBottom(node.scrollTop + node.clientHeight >= node.scrollHeight - 12) }}>
        <h2>一、闯关与答题</h2>
        <p>1. 玩家可在游戏主页面任选一个游戏开始挑战。</p><p>2. 游戏闯关成功后，即可进入该游戏对应的锦囊答题环节。</p><p>3. 每个游戏共有三道锦囊问题，必须连续答对全部三道问题，才算完成本次挑战。</p><p>4. 如果任意一道锦囊问题回答错误，本次挑战立即失败，闯关成绩同时失效，且不能获得积分。</p><p>5. 答题失败后，系统将自动返回游戏主页面。</p><p>6. 每次挑战均可重新选择任一游戏，从头开始闯关。</p><p>7. 同一游戏可反复挑战，成功后均可再次进入三道锦囊题环节。</p>
        <h2>二、积分获取</h2>
        <p>1. 每次成功完成一个游戏，并连续答对该游戏的三道锦囊问题，可获得100积分。</p><p>2. 第三道锦囊问题回答正确后，系统将自动把100积分存入玩家的个人积分账户。</p><p>3. 积分到账后，页面将显示本次获得的积分和个人累计积分。</p><p>4. 锦囊答题过程中只要答错一道，本轮不获得任何积分。</p><p>5. 三个游戏均可反复挑战，每次挑战成功均可获得100积分。</p><p>6. 积分可持续累加，不设总积分上限。</p>
        <h2>三、积分等级</h2>
        <p className="lyfg-game-rules-level">累计获得100积分，可解锁“消保宣传员”称号及专属获奖海报。</p><p className="lyfg-game-rules-level">累计获得200积分，可升级为“消保小卫士”，并解锁对应等级的获奖海报。</p><p className="lyfg-game-rules-level">累计获得300积分及以上，可升级为“消保小天使”，并解锁最高等级获奖海报。</p><p>达到新的积分等级后，系统将自动解锁相应称号和获奖海报。已经获得的低等级海报仍可继续查看和保存。</p><p className="lyfg-game-rules-tip">温馨提示：游戏闯关成功不代表最终挑战成功，只有连续答对全部三道锦囊问题，才能获得本关积分。</p>
      </article>
      <div className={`lyfg-game-rules-hint ${atBottom ? 'is-hidden' : ''}`}>向上滑动查看更多</div>
    </section>
  </div>
}
