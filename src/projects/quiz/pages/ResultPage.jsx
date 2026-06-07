import { formatQuizDuration, quizAssets } from '../assets'
import DesignStage from '../components/DesignStage'

export default function ResultPage({ result, onOpenRank, onBack }) {
  return (
    <main className="quiz-page flex min-h-screen w-full justify-center bg-[#143978] pb-7">
      <section className="w-full max-w-[750px]">
        <DesignStage height={1624}>
          <img className="absolute left-0 top-0 h-[1624px] w-[750px] object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[42px] top-[16px] h-[112px] w-[159px] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[508px] top-[22px] h-[100px] w-[192px] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />

          <img className="absolute left-[110px] top-[208px] h-[50px] w-[526px] object-contain" src={quizAssets.result.titleScore} alt="" aria-hidden="true" />
          <img className="absolute left-[152px] top-[454px] h-[110px] w-[444px] object-contain" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="absolute left-[152px] top-[664px] h-[110px] w-[444px] object-contain" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="absolute left-[318px] top-[382px] h-[50px] w-[110px] object-contain" src={quizAssets.result.labelScore} alt="" aria-hidden="true" />
          <img className="absolute left-[320px] top-[578px] h-[50px] w-[110px] object-contain" src={quizAssets.result.labelTime} alt="" aria-hidden="true" />

          <div className="absolute left-[152px] top-[470px] w-[444px] text-center text-[42px]  text-[#fff7d1]">
            {result?.totalScore ?? 0} 分
          </div>
          <div className="absolute left-[152px] top-[682px] w-[444px] text-center text-[42px]  text-[#fff7d1]">
            {formatQuizDuration(result?.totalTimeMs)}
          </div>

          <button
            className="absolute left-[388px] top-[832px] h-[110px] w-[224px] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
            type="button"
            onClick={onOpenRank}
            aria-label="查看排行榜"
          >
            <img className="block h-full w-full" src={quizAssets.result.buttonRank} alt="" aria-hidden="true" />
          </button>

          <button
            className="absolute left-[134px] top-[832px] h-[110px] w-[224px] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
            type="button"
            onClick={onBack}
            aria-label="返回首页"
          >
            <img className="block h-full w-full" src={quizAssets.common.buttonHome} alt="" aria-hidden="true" />
          </button>
        </DesignStage>
      </section>
    </main>
  )
}
