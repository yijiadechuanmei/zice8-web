import QuizButton from '../components/QuizButton'

function formatMs(ms) {
  const value = Number(ms || 0) / 1000
  return `${value.toFixed(1)} 秒`
}

export default function RankPage({ ranks, loading, onBack }) {
  return (
    <main className="quiz-page">
      <section className="quiz-panel">
        <h2>排行榜</h2>
        {loading ? <p className="quiz-muted">排行榜加载中...</p> : null}
        {!loading && !ranks.length ? <p className="quiz-empty">暂无排行</p> : null}
        {ranks.length ? (
          <div className="quiz-rank-list">
            {ranks.map((item) => (
              <div className={`quiz-rank-item ${item.rank <= 3 ? 'is-top' : ''}`} key={`${item.rank}-${item.userId}`}>
                <strong>{item.rank}</strong>
                <div>
                  <b>{item.participantName || item.name || '未填写'}</b>
                  <span>{item.department || '-'}</span>
                </div>
                <div className="quiz-rank-score">
                  <b>{item.totalScore || 0} 分</b>
                  <span>{formatMs(item.totalTimeMs)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <QuizButton variant="secondary" onClick={onBack}>返回首页</QuizButton>
      </section>
    </main>
  )
}
