import { formatQuizDuration, quizAssets } from '../assets'

export default function ResultPage({ result, onOpenRank, onBack }) {
  return (
    <main className="quiz-page flex min-h-screen w-full justify-center bg-[#143978] pb-7">
      <section className="w-full max-w-[750px]">
        <div className="relative aspect-[750/1624] min-h-screen w-full overflow-hidden bg-[#143978]">
          <img className="absolute inset-0 h-full w-full object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[5.6%] top-[0.985%] h-[6.8966%] w-[21.2%] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[67.7333%] top-[1.3547%] h-[6.1576%] w-[25.6%] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />

          <img className="absolute left-[14.6667%] top-[12.8079%] h-[3.0788%] w-[70%] object-contain" src={quizAssets.result.titleScore} alt="" aria-hidden="true" />
          <img className="absolute left-[20.2667%] top-[27.9557%] h-[6.7734%] w-[59.2%] object-contain" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="absolute left-[20.2667%] top-[40.8867%] h-[6.7734%] w-[59.2%] object-contain" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="absolute left-[42.4%] top-[23.5222%] h-[3.1404%] w-[14.6667%] object-contain" src={quizAssets.result.labelScore} alt="" aria-hidden="true" />
          <img className="absolute left-[42.6667%] top-[35.5911%] h-[3.1404%] w-[14.6667%] object-contain" src={quizAssets.result.labelTime} alt="" aria-hidden="true" />

          <div className="absolute left-[20.2667%] top-[30.3571%] w-[59.2%] text-center text-[clamp(20px,3.7vw,42px)] font-black text-[#173f2a]">
            {result?.totalScore ?? 0} 分
          </div>
          <div className="absolute left-[20.2667%] top-[43.2266%] w-[59.2%] text-center text-[clamp(20px,3.7vw,42px)] font-black text-[#173f2a]">
            {formatQuizDuration(result?.totalTimeMs)}
          </div>

          <div className="absolute left-[13.3333%] top-[54.4%] grid w-[73.3333%] grid-cols-2 gap-3">
            <div className="rounded-[18px] bg-[rgba(255,251,239,0.9)] p-[14px] text-center"><strong className="block text-[clamp(18px,3vw,32px)] text-[#173f2a]">{result?.correctCount ?? 0}</strong><span className="text-[clamp(12px,2vw,18px)] text-[#687345]">答对</span></div>
            <div className="rounded-[18px] bg-[rgba(255,251,239,0.9)] p-[14px] text-center"><strong className="block text-[clamp(18px,3vw,32px)] text-[#173f2a]">{result?.wrongCount ?? 0}</strong><span className="text-[clamp(12px,2vw,18px)] text-[#687345]">答错</span></div>
            <div className="rounded-[18px] bg-[rgba(255,251,239,0.9)] p-[14px] text-center"><strong className="block text-[clamp(18px,3vw,32px)] text-[#173f2a]">{result?.timeoutCount ?? 0}</strong><span className="text-[clamp(12px,2vw,18px)] text-[#687345]">超时</span></div>
            <div className="rounded-[18px] bg-[rgba(255,251,239,0.9)] p-[14px] text-center"><strong className="block text-[clamp(18px,3vw,32px)] text-[#173f2a]">{result?.rankInfo?.rank ?? '-'}</strong><span className="text-[clamp(12px,2vw,18px)] text-[#687345]">排名</span></div>
          </div>

          <button
            className="absolute left-[51.7333%] top-[51.2315%] h-[6.7118%] w-[29.4667%] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
            type="button"
            onClick={onOpenRank}
            aria-label="查看排行榜"
          >
            <img className="block h-full w-full" src={quizAssets.result.buttonRank} alt="" aria-hidden="true" />
          </button>

          <button
            className="absolute left-[17.8667%] top-[51.3547%] h-[6.7118%] w-[29.6%] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
            type="button"
            onClick={onBack}
            aria-label="返回首页"
          >
            <img className="block h-full w-full" src={quizAssets.common.buttonHome} alt="" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  )
}
