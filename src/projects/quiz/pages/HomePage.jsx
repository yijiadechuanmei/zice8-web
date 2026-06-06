export default function HomePage({ bootstrap, debug, onOpenRule, onStart, onOpenRank, onResume, onReset }) {
  const hasInProgressAttempt = bootstrap?.currentAttempt?.status === 'in_progress'
  const assets = {
    bg: '/quiz/quiz-home-bg.png',
    logo: '/quiz/quiz-home-logo.png',
    title: '/quiz/quiz-home-title.png',
    subtitle: '/quiz/quiz-home-subtitle.png',
    countTip: '/quiz/quiz-home-count-tip.png',
    ruleButton: '/quiz/quiz-home-rule-btn.png',
    startButton: '/quiz/quiz-home-start-btn.png',
    rankButton: '/quiz/quiz-home-rank-btn.png',
  }

  return (
    <main className="quiz-page quiz-home">
      <section className="quiz-home-page" aria-label={bootstrap?.activity?.title || '端午知识竞赛首页'}>
        <div className="quiz-home-scale-wrap">
          <div className="quiz-home-design-stage">
            <img className="quiz-home-bg" src={assets.bg} alt="" aria-hidden="true" />
            <img className="quiz-home-logo" src={assets.logo} alt="雪花Logo" />
            <img className="quiz-home-title" src={assets.title} alt={bootstrap?.activity?.title || '活动主标题'} />
            <img className="quiz-home-subtitle" src={assets.subtitle} alt="活动副标题" />
            <img className="quiz-home-count-tip" src={assets.countTip} alt="答题数量提示" />

            <button className="quiz-home-image-button quiz-home-rule-button" type="button" onClick={onOpenRule} aria-label="活动规则">
              <img src={assets.ruleButton} alt="" aria-hidden="true" />
            </button>
            <button className="quiz-home-image-button quiz-home-start-button" type="button" onClick={onStart} aria-label="开始挑战">
              <img src={assets.startButton} alt="" aria-hidden="true" />
            </button>
            <button className="quiz-home-image-button quiz-home-rank-button" type="button" onClick={onOpenRank} aria-label="排行榜">
              <img src={assets.rankButton} alt="" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="quiz-home-meta">
          {hasInProgressAttempt ? (
            <button className="quiz-button quiz-button-primary quiz-home-resume-button" type="button" onClick={onResume}>
              继续答题
            </button>
          ) : null}

          {debug ? (
            <button className="quiz-reset-button quiz-home-reset-button" type="button" onClick={onReset}>
              重置当前测试活动
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}
