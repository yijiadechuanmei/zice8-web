import QuizButton from '../components/QuizButton'

export default function HomePage({ bootstrap, onOpenRule, onStart, onOpenRank, onResume }) {
  return (
    <main className="quiz-page quiz-home">
      <section className="quiz-hero">
        <div className="quiz-badge">Quiz Template v1</div>
        <h1>{bootstrap?.activity?.title || '端午知识竞赛'}</h1>
        <p>每日 2 次机会，连续 3 天累计积分排名</p>
      </section>

      <section className="quiz-home-panel">
        <div className="quiz-stats">
          <div>
            <strong>{bootstrap?.remainingTodayAttempts ?? '-'}</strong>
            <span>今日剩余</span>
          </div>
          <div>
            <strong>{bootstrap?.remainingTotalAttempts ?? '-'}</strong>
            <span>总剩余</span>
          </div>
        </div>

        {bootstrap?.currentAttempt?.status === 'in_progress' ? (
          <QuizButton onClick={onResume}>继续答题</QuizButton>
        ) : null}
        <QuizButton onClick={onStart}>开始挑战</QuizButton>
        <QuizButton variant="secondary" onClick={onOpenRule}>活动规则</QuizButton>
        <QuizButton variant="secondary" onClick={onOpenRank}>排行榜</QuizButton>
      </section>
    </main>
  )
}
