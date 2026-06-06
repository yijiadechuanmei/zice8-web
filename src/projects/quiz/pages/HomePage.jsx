export default function HomePage({ bootstrap, debug, onOpenRule, onStart, onOpenRank, onResume, onReset }) {
  const hasInProgressAttempt = bootstrap?.currentAttempt?.status === 'in_progress'
  const countTipText = `今日剩余 ${bootstrap?.remainingTodayAttempts ?? '-'} 次 / 总剩余 ${bootstrap?.remainingTotalAttempts ?? '-'} 次`

  return (
    <main className="quiz-page quiz-home">
      <section className="quiz-ivx-home" aria-label={bootstrap?.activity?.title || '端午知识竞赛首页'}>
        <div className="quiz-ivx-home-stage">
          <div className="quiz-ivx-home-bg" aria-hidden="true">
            <span className="quiz-ivx-bg-mark">首页背景图</span>
          </div>

          <div className="quiz-ivx-layer quiz-ivx-placeholder quiz-ivx-logo-layer" aria-hidden="true">
            <span>雪花Logo</span>
          </div>
          <div className="quiz-ivx-layer quiz-ivx-placeholder quiz-ivx-title-layer" aria-hidden="true">
            <span>活动主标题</span>
          </div>
          <div className="quiz-ivx-layer quiz-ivx-placeholder quiz-ivx-subtitle-layer" aria-hidden="true">
            <span>活动副标题</span>
          </div>
          <div className="quiz-ivx-layer quiz-ivx-placeholder quiz-ivx-count-tip-layer" aria-hidden="true">
            <span>答题数量提示</span>
            <small>{countTipText}</small>
          </div>

          <button className="quiz-ivx-layer quiz-ivx-button-layer quiz-ivx-rule-button" type="button" onClick={onOpenRule}>
            <span>活动规则按钮</span>
          </button>
          <button className="quiz-ivx-layer quiz-ivx-button-layer quiz-ivx-start-button" type="button" onClick={onStart}>
            <span>开始挑战按钮</span>
          </button>
          <button className="quiz-ivx-layer quiz-ivx-button-layer quiz-ivx-rank-button" type="button" onClick={onOpenRank}>
            <span>排行榜按钮</span>
          </button>
        </div>

        <div className="quiz-ivx-home-meta">
          {hasInProgressAttempt ? (
            <button className="quiz-button quiz-button-primary quiz-ivx-resume-button" type="button" onClick={onResume}>
              继续答题
            </button>
          ) : null}

          {debug ? (
            <button className="quiz-reset-button quiz-ivx-reset-button" type="button" onClick={onReset}>
              重置当前测试活动
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}
