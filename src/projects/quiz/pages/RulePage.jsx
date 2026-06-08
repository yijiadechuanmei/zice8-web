import DesignStage from '../components/DesignStage'
import { quizAssets } from '../assets'

export default function RulePage({ onBack }) {
  return (
    <main className="quiz-page flex min-h-screen w-full justify-center bg-[#143978] pb-7">
      <section className="w-full max-w-[750px]">
        <DesignStage height={1624}>
          <img className="absolute left-0 top-0 h-[1624px] w-[750px] object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[42px] top-[16px] h-[112px] w-[159px] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[508px] top-[22px] h-[100px] w-[192px] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />
          <img className="absolute left-[24px] top-[120px] h-[1204px] w-[700px] object-contain" src={quizAssets.common.panelMask} alt="" aria-hidden="true" />
          <img className="absolute left-[54px] top-[144px] h-[1130px] w-[660px] object-contain" src={quizAssets.rule.content} alt="" aria-hidden="true" />
          <img className="absolute left-[515px] top-[1185px] h-[159px] w-[258px] object-contain" src={quizAssets.rule.gift} alt="" aria-hidden="true" />

          <button
            className="absolute left-[272px] top-[1328px] h-[102px] w-[204px] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
            type="button"
            onClick={onBack}
            aria-label="返回首页"
          >
            <img className="block h-full w-full" src={quizAssets.rule.buttonHome} alt="" aria-hidden="true" />
          </button>
        </DesignStage>
      </section>
    </main>
  )
}
