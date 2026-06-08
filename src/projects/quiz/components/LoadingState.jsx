import { QUIZ_VERSION, quizAssets } from '../assets'

export default function LoadingState() {
  return (
    <main className="quiz-loading-page" style={{ '--quiz-common-bg': `url(${quizAssets.common.bg})` }} aria-label="加载中">
      <div className="quiz-loading-only-bar" aria-hidden="true">
        <div className="quiz-loading-only-fill" />
      </div>
      <div className="quiz-version-badge">v{QUIZ_VERSION}</div>
    </main>
  )
}
