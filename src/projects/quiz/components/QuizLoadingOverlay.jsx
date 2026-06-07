export default function QuizLoadingOverlay({ visible }) {
  if (!visible) return null

  return (
    <div className="quiz-loading-overlay" aria-label="加载中">
      <span className="quiz-loading-spinner" aria-hidden="true" />
    </div>
  )
}
