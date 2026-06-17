import { useEffect, useRef } from 'react'
import ResultCard from '../components/ResultCard'

export default function ResultPage({
  activityKey,
  phaseNo,
  model,
  draw,
  stockExhausted,
  drawEntryBlockedReason,
  animatedScore,
  onStart,
  onGoWheel,
  onOpenPrize,
  onTrackResultView,
  onTrackDrawClick,
  onTrackStockEmpty,
  assets,
}) {
  const trackedResultViewRef = useRef('')
  const trackedStockEmptyRef = useRef('')

  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [])

  useEffect(() => {
    if (!activityKey) return
    const trackKey = [
      activityKey,
      phaseNo || '-',
      model?.attempt?.attemptId || model?.attemptId || '-',
      draw?.drawId || model?.draw?.drawId || '-',
      model?.state || '-',
      stockExhausted ? 'stock' : 'flow',
    ].join('|')
    if (trackedResultViewRef.current === trackKey) return
    trackedResultViewRef.current = trackKey
    onTrackResultView?.()
  }, [activityKey, draw?.drawId, model?.attempt?.attemptId, model?.attemptId, model?.draw?.drawId, model?.state, onTrackResultView, phaseNo, stockExhausted])

  useEffect(() => {
    if (!activityKey) return
    if (!stockExhausted && drawEntryBlockedReason !== 'STOCK_EMPTY') return
    const trackKey = [
      activityKey,
      phaseNo || '-',
      draw?.drawId || model?.draw?.drawId || '-',
      drawEntryBlockedReason || '-',
      stockExhausted ? 'stock' : 'blocked',
    ].join('|')
    if (trackedStockEmptyRef.current === trackKey) return
    trackedStockEmptyRef.current = trackKey
    onTrackStockEmpty?.()
  }, [activityKey, draw?.drawId, drawEntryBlockedReason, model?.draw?.drawId, onTrackStockEmpty, phaseNo, stockExhausted])

  return (
    <section className="relative z-10 flex h-full flex-col overflow-hidden text-slate-900">
      <div className="pql-result-stage flex-1 overflow-hidden px-[32px] pb-[88px] pt-[36px]">
        <section className="rounded-[32px] bg-white px-[24px] py-[24px] shadow-[0_20px_52px_rgba(15,23,42,0.08)]">
          <ResultCard
            model={model}
            draw={draw}
            stockExhausted={stockExhausted}
            drawEntryBlockedReason={drawEntryBlockedReason}
            animatedScore={animatedScore}
            assets={assets}
            onStart={onStart}
            onGoWheel={onGoWheel}
            onTrackDrawClick={onTrackDrawClick}
            onOpenPrize={onOpenPrize}
          />
        </section>
      </div>
    </section>
  )
}
