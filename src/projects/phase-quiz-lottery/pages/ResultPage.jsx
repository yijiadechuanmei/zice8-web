import ResultCard from '../components/ResultCard'
import StageLayout from '../components/StageLayout'

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
    <main className="h-[100vh] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(79,158,255,0.18),transparent_40%),linear-gradient(180deg,#edf5ff_0%,#f8fbff_100%)]">
      <StageLayout className="bg-cover bg-center px-0 py-0">
        <div className="pql-stage pql-result-stage relative overflow-hidden text-slate-800">
          <img className="absolute inset-0 h-full w-full object-cover" src={assets.bgResult} alt="" aria-hidden="true" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,137,255,0.88)_0%,rgba(33,137,255,0.72)_18%,rgba(237,245,255,0)_26%),linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0))]" />
          <img className="absolute right-8 top-34 z-10 h-28 w-40 object-contain" src={assets.bookHero} alt="" aria-hidden="true" />

          <header className="relative z-10 px-14 pt-44 text-center text-white">
            <p className="text-[28px] tracking-normal opacity-80">第 {phaseNo || '-'} 期</p>
            <h1 className="mt-4 text-[40px] leading-tight font-extrabold">{activityTitle || '答题结果'}</h1>
            <p className="mt-4 text-[28px] leading-[1.45] opacity-90">结果仅由后端返回，本页只渲染状态</p>
          </header>

          <section className="relative z-10 mx-6 mt-20 rounded-[32px] bg-white/92 px-7 py-8 shadow-[0_32px_88px_rgba(40,102,194,0.14)] backdrop-blur-md">
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
      </StageLayout>
    </main>
  )
}
