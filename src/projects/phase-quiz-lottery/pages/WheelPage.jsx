import QuestionHeader from '../components/QuestionHeader'
import Wheel from '../components/Wheel'

export default function WheelPage({
  activityTitle,
  phaseNo,
  segments,
  draw,
  canDraw,
  drawing,
  spinKey,
  onDraw,
  onOpenPrize,
  onWheelFinish,
  assets,
}) {
  return (
    <section className="relative z-10 flex h-full flex-col text-slate-900">
      <QuestionHeader
        title={activityTitle}
        backgroundImageUrl={assets.bannerBackground}
        bookImageUrl={assets.bannerBook}
      />

      <div className="pql-wheel-stage flex-1 px-[32px] pb-[88px] pt-[28px]">
        <section className="rounded-[32px] bg-white px-[32px] py-[36px] text-center shadow-[0_20px_52px_rgba(15,23,42,0.08)]">
          <p className="text-[32px] font-extrabold text-slate-900">第 {phaseNo || '-'} 期抽奖</p>
          <Wheel
            segments={segments}
            targetIndex={draw?.wheelStopIndex}
            drawing={drawing}
            draw={draw}
            canDraw={canDraw}
            spinKey={spinKey}
            assets={assets}
            onDraw={onDraw}
            onOpenPrize={onOpenPrize}
            onFinish={onWheelFinish}
          />
        </section>
      </div>
    </section>
  )
}
