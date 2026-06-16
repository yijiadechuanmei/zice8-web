import QuestionHeader from '../components/QuestionHeader'
import ResultCard from '../components/ResultCard'

export default function ResultPage({
  activityTitle,
  phaseNo,
  model,
  animatedScore,
  onStart,
  onGoWheel,
  onOpenPrize,
  assets,
}) {
  return (
    <section className="relative z-10 flex h-full flex-col text-slate-900">
      <QuestionHeader title={activityTitle} backgroundImageUrl={assets.bannerBackground} />

      <div className="pql-result-stage flex-1 px-[32px] pb-[88px] pt-[28px]">
        <section className="rounded-[32px] bg-white px-[32px] py-[36px] shadow-[0_20px_52px_rgba(15,23,42,0.08)]">
          <div className="text-center">
            <p className="text-[28px] font-medium text-slate-500">第 {phaseNo || '-'} 期</p>
          </div>
          <ResultCard
            model={model}
            animatedScore={animatedScore}
            assets={assets}
            onStart={onStart}
            onGoWheel={onGoWheel}
            onOpenPrize={onOpenPrize}
          />
        </section>
      </div>
    </section>
  )
}
