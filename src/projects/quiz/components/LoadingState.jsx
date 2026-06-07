export default function LoadingState({ text = '加载中...' }) {
  return (
    <div
      className="quiz-loading-page flex min-h-screen w-full items-center justify-center bg-cover bg-top bg-no-repeat px-4"
      style={{ backgroundImage: "url('/quiz/dragon-boat-2026/quiz-common-bg.png')" }}
    >
      <div className="flex min-w-[320px] max-w-[420px] flex-col items-center gap-[22px] rounded-[24px] bg-white/72 px-[48px] py-[40px] text-center shadow-[0_18px_50px_rgba(10,24,34,0.22)] backdrop-blur-[3px]">
        <p className="text-[30px] font-bold tracking-[0.02em] text-[#255332]">{text}</p>
        <div className="h-[16px] w-[320px] overflow-hidden rounded-full border-[3px] border-[#0a3b18] bg-[#001905]">
          <div className="quiz-loading-progress h-full w-[55%] rounded-full bg-[#5a9650] animate-pulse" />
        </div>
      </div>
    </div>
  )
}
