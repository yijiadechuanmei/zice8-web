export default function LoadingState({ text = '加载中...' }) {
  return (
    <div className="quiz-loading">
      <div className="quiz-loading-dot" />
      <p>{text}</p>
    </div>
  )
}
