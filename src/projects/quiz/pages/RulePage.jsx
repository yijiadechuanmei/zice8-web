import { quizAssets } from '../assets'

export default function RulePage({ onBack }) {
  return (
    <main className="quiz-page flex min-h-screen w-full justify-center bg-[#143978] pb-7">
      <section className="w-full max-w-[750px]">
        <div className="relative aspect-[750/1624] min-h-screen w-full overflow-hidden bg-[#143978]">
          <img className="absolute inset-0 h-full w-full object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[5.6%] top-[0.985%] h-[6.8966%] w-[21.2%] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[67.7333%] top-[1.3547%] h-[6.1576%] w-[25.6%] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />
          <img className="absolute left-[3.2%] top-[7.3892%] h-[74.0764%] w-[93.2%] object-contain" src={quizAssets.common.panelMask} alt="" aria-hidden="true" />
          <img className="absolute left-[7.2%] top-[8.8669%] h-[69.5197%] w-[88%] object-contain" src={quizAssets.rule.content} alt="" aria-hidden="true" />

          <button
            className="absolute left-[36.2667%] top-[81.7734%] h-[6.2808%] w-[27.2%] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
            type="button"
            onClick={onBack}
            aria-label="返回首页"
          >
            <img className="block h-full w-full" src={quizAssets.rule.buttonHome} alt="" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  )
}
