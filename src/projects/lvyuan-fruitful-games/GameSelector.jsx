function SnakePreview() {
  return (
    <div className="lyfg-select-snake-preview" aria-hidden="true">
      <i /><i /><i /><i className="is-head"><b /><b /><em /></i>
      <span>好果实</span>
    </div>
  )
}

function FruitPreview() {
  return (
    <div className="lyfg-select-fruit-preview" aria-hidden="true">
      <i className="is-green-seed" />
      <strong>+</strong>
      <i className="is-brown-seed" />
      <b>→</b>
      <i className="is-tree" />
    </div>
  )
}

export default function GameSelector({ onSelectSnake, onSelectFruitMerge }) {
  return (
    <main className="lyfg-page lyfg-selector-page">
      <section className="lyfg-game-shell lyfg-selector-shell">
        <header className="lyfg-selector-header">
          <p className="lyfg-eyebrow"><span /> 绿园消保 · 游戏季 <span /></p>
          <div className="lyfg-title-lockup">
            <span className="lyfg-title-mark" aria-hidden="true">🍏</span>
            <div>
              <h1>硕果盈心</h1>
              <p>FRUITFUL HEART</p>
            </div>
          </div>
          <p className="lyfg-selector-intro">选择一款游戏，收获好果实</p>
        </header>

        <div className="lyfg-game-choice-list">
          <button className="lyfg-game-choice lyfg-game-choice--snake" type="button" onClick={onSelectSnake}>
            <SnakePreview />
            <span className="lyfg-game-choice-label">01 · 自由贪吃蛇</span>
            <strong>摇杆自由转向<br />收集果园好果实</strong>
            <em>开始游戏 →</em>
          </button>
          <button className="lyfg-game-choice lyfg-game-choice--merge" type="button" onClick={onSelectFruitMerge}>
            <FruitPreview />
            <span className="lyfg-game-choice-label">02 · 合成水果</span>
            <strong>双种合成升级<br />收获苹果与梨</strong>
            <em>开始合成 →</em>
          </button>
        </div>

        <p className="lyfg-selector-footer">完成游戏后，将开启消保答题挑战</p>
      </section>
    </main>
  )
}
