import { formatQuizDuration, quizAssets } from '../assets'

export default function ResultPage({ result, onOpenRank, onBack }) {
  return (
    <main className="quiz-page quiz-design-page">
      <section className="quiz-design-screen quiz-result-page">
        <div className="quiz-design-stage quiz-result-stage">
          <img className="quiz-design-bg" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="quiz-design-logo-snow" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="quiz-design-logo-event" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />

          <img className="quiz-layer-img quiz-result-title-image" src={quizAssets.result.titleScore} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-result-score-panel" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-result-time-panel" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-result-score-label-image" src={quizAssets.result.labelScore} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-result-time-label-image" src={quizAssets.result.labelTime} alt="" aria-hidden="true" />

          <div className="quiz-dynamic-layer quiz-result-score-value">{result?.totalScore ?? 0} 分</div>
          <div className="quiz-dynamic-layer quiz-result-time-value">{formatQuizDuration(result?.totalTimeMs)}</div>

          <div className="quiz-dynamic-layer quiz-result-stats">
            <div><strong>{result?.correctCount ?? 0}</strong><span>答对</span></div>
            <div><strong>{result?.wrongCount ?? 0}</strong><span>答错</span></div>
            <div><strong>{result?.timeoutCount ?? 0}</strong><span>超时</span></div>
            <div><strong>{result?.rankInfo?.rank ?? '-'}</strong><span>排名</span></div>
          </div>

          <button className="quiz-image-button quiz-result-rank-button" type="button" onClick={onOpenRank} aria-label="查看排行榜">
            <img src={quizAssets.result.buttonRank} alt="" aria-hidden="true" />
          </button>

          <button className="quiz-image-button quiz-result-home-button" type="button" onClick={onBack} aria-label="返回首页">
            <img src={quizAssets.common.buttonHome} alt="" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  )
}
