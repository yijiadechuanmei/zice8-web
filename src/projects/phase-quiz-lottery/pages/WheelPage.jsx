import { useEffect, useRef } from 'react'
import { trackEvent } from '../../../shared/analytics'
import QuestionHeader from '../components/QuestionHeader'
import Wheel from '../components/Wheel'

export default function WheelPage({
  activityKey,
  phaseNo,
  segments,
  targetIndex,
  draw,
  drawing,
  loading,
  spinKey,
  onDraw,
  onOpenPrize,
  onWheelFinish,
  assets,
}) {
  const trackedWheelStartRef = useRef('')
  const trackedWheelFinishRef = useRef('')

  useEffect(() => {
    if (!activityKey) return
    const trackKey = [activityKey, phaseNo || '-', 'wheel_start'].join('|')
    if (trackedWheelStartRef.current === trackKey) return
    trackedWheelStartRef.current = trackKey
    trackEvent({
      activityKey,
      eventType: 'lottery_wheel_start',
      page: '/phase-quiz-lottery',
      extra: {
        phaseNo: phaseNo || null,
        wheelStatus: draw?.status || null,
      },
    })
  }, [activityKey, draw?.status, phaseNo])

  function handleWheelFinish() {
    if (activityKey) {
      const trackKey = [activityKey, phaseNo || '-', draw?.drawId || '-', 'wheel_finish'].join('|')
      if (trackedWheelFinishRef.current !== trackKey) {
        trackedWheelFinishRef.current = trackKey
        trackEvent({
          activityKey,
          eventType: 'lottery_wheel_finish',
          page: '/phase-quiz-lottery',
          extra: {
            phaseNo: phaseNo || null,
            drawId: draw?.drawId || null,
            wheelStatus: draw?.status || null,
            won: Boolean(draw?.won),
            soldOut: Boolean(draw?.soldOut),
          },
        })
      }
    }
    onWheelFinish?.()
  }

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
            targetIndex={targetIndex}
            drawing={drawing}
            draw={draw}
            spinKey={spinKey}
            assets={assets}
            onDraw={onDraw}
            onOpenPrize={onOpenPrize}
            onFinish={handleWheelFinish}
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
