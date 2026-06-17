import QuestionHeader from '../components/QuestionHeader'
import Wheel from '../components/Wheel'

export default function WheelPage({
  phaseNo,
  segments,
  draw,
  drawing,
  loading,
  spinKey,
  onDraw,
  onOpenPrize,
  onWheelFinish,
  assets,
}) {
  return (
    <section className="relative z-10 flex h-full flex-col text-slate-900">
      <QuestionHeader
        title={`第 ${phaseNo || '-'} 期抽奖`}
        backgroundImageUrl={assets.bannerBackground}
        bookImageUrl={assets.bannerBook}
      />

      <div className="pql-wheel-stage flex-1 px-[32px] pb-[88px] pt-[28px]">
        <section className="relative overflow-hidden rounded-[32px] bg-white px-[32px] py-[36px] text-center shadow-[0_20px_52px_rgba(15,23,42,0.08)]">
          <Wheel
            segments={segments}
            targetIndex={draw?.wheelStopIndex}
            drawing={drawing}
            draw={draw}
            spinKey={spinKey}
            assets={assets}
            onDraw={onDraw}
            onOpenPrize={onOpenPrize}
            onFinish={onWheelFinish}
          />
          {loading ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/84 backdrop-blur-[2px]" aria-live="polite" aria-busy="true">
              <div className="inline-flex items-center gap-4 rounded-full bg-white px-6 py-4 text-[24px] font-bold text-blue-500 shadow-xl">
                <span className="h-8 w-8 animate-spin rounded-full border-[4px] border-blue-100 border-t-blue-500" aria-hidden="true" />
                <span>抽奖处理中...</span>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}
