export default function QuizToast({ visible, message }) {
  if (!visible || !message) return null

  return (
    <div className="quiz-toast-mask" role="status" aria-live="polite">
      <div className="quiz-toast-box">{message}</div>
    </div>
  )
}
