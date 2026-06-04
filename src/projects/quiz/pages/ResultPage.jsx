import QuizButton from '../components/QuizButton'

function formatMs(ms) {
  return `${(Number(ms || 0) / 1000).toFixed(1)} 秒`
}

export default function ResultPage({ result, onOpenRank, onBack }) {
  return (
    <main className="quiz-page">
      <section className="quiz-panel quiz-result">
        <div className="quiz-badge">答题完成</div>
        <h2>{result?.totalScore ?? 0} 分</h2>
        <div className="quiz-result-grid">
          <div><strong>{formatMs(result?.totalTimeMs)}</strong><span>总用时</span></div>
          <div><strong>{result?.correctCount ?? 0}</strong><span>答对</span></div>
          <div><strong>{result?.wrongCount ?? 0}</strong><span>答错</span></div>
          <div><strong>{result?.timeoutCount ?? 0}</strong><span>超时</span></div>
        </div>
        {result?.rankInfo?.rank ? <p className="quiz-muted">当前排名：第 {result.rankInfo.rank} 名</p> : null}
        <QuizButton onClick={onOpenRank}>查看排行榜</QuizButton>
        <QuizButton variant="secondary" onClick={onBack}>返回首页</QuizButton>
      </section>
    </main>
  )
}
