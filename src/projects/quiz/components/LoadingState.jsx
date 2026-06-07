export default function LoadingState({ text = '加载中...' }) {
  return (
    <div className="quiz-loading flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-[#143978] px-4 text-sm text-white/80">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-white/20 border-t-[#f7e26d]" />
      <p>{text}</p>
    </div>
  )
}
