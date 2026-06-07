import { formatQuizDuration, quizAssets } from '../assets'

export default function RankPage({ ranks, loading, onBack }) {
  return (
    <main className="quiz-page quiz-design-page">
      <section className="quiz-design-screen quiz-rank-page">
        <div className="quiz-design-stage quiz-rank-stage">
          <img className="quiz-design-bg" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="quiz-design-logo-snow" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="quiz-design-logo-event" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-rank-mask" src={quizAssets.common.panelMask} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-rank-title-image" src={quizAssets.rank.title} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-rank-header-image" src={quizAssets.rank.tableHeader} alt="" aria-hidden="true" />

          <div className="quiz-dynamic-layer quiz-rank-body">
            {loading ? <p className="quiz-muted">排行榜加载中...</p> : null}
            {!loading && !ranks.length ? <p className="quiz-empty">暂无排行</p> : null}
            {ranks.length ? (
              <div className="quiz-rank-board">
                <div className="quiz-rank-board-head">
                  <span>排名</span>
                  <span>姓名</span>
                  <span>部门</span>
                  <span>积分</span>
                  <span>时间</span>
                </div>
                <div className="quiz-rank-board-list">
                  {ranks.map((item) => (
                    <div className={`quiz-rank-board-row ${item.rank <= 3 ? 'is-top' : ''}`} key={`${item.rank}-${item.userId}`}>
                      <strong>{item.rank}</strong>
                      <span>{item.participantName || item.name || '未填写'}</span>
                      <span>{item.department || '-'}</span>
                      <span>{item.totalScore || 0}</span>
                      <span>{formatQuizDuration(item.totalTimeMs)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <button className="quiz-image-button quiz-rank-home-button" type="button" onClick={onBack} aria-label="返回首页">
            <img src={quizAssets.common.buttonHome} alt="" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  )
}
