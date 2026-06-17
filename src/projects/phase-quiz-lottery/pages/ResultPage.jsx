import { useEffect } from 'react'
import ResultCard from '../components/ResultCard'

export default function ResultPage({
  model,
  draw,
  stockExhausted,
  animatedScore,
  onStart,
  onGoWheel,
  onOpenPrize,
  assets,
}) {
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  return (
    <section className="relative z-10 flex h-full flex-col overflow-hidden text-slate-900">
      <div className="pql-result-stage flex-1 overflow-hidden px-[32px] pb-[88px] pt-[36px]">
        <section className="rounded-[32px] bg-white px-[24px] py-[24px] shadow-[0_20px_52px_rgba(15,23,42,0.08)]">
          <ResultCard
            model={model}
            draw={draw}
            stockExhausted={stockExhausted}
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
