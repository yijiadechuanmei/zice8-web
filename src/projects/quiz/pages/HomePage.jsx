import DesignStage from '../components/DesignStage'

export default function HomePage({ bootstrap, debug, onOpenRule, onStart, onOpenRank, onResume, onReset }) {
  const hasInProgressAttempt = bootstrap?.currentAttempt?.status === 'in_progress'
  const remainingTodayAttempts = bootstrap?.remainingTodayAttempts ?? '-'
  const assets = {
    bg: '/quiz/quiz-home-bg.png',
    logo: '/quiz/quiz-home-logo.png',
    title: '/quiz/quiz-home-title.png',
    subtitle: '/quiz/quiz-home-subtitle.png',
    countTip: '/quiz/quiz-home-count-tip.png',
    ruleButton: '/quiz/quiz-home-rule-btn.png',
    startButton: '/quiz/quiz-home-start-btn.png',
    rankButton: '/quiz/quiz-home-rank-btn.png',
  }

  return (
    <main className="quiz-page flex min-h-screen w-full flex-col items-center justify-start gap-[18px] bg-[#143978] pb-7">
      <section className="flex w-full flex-col items-center gap-4" aria-label={bootstrap?.activity?.title || '端午知识竞赛首页'}>
        <div className="w-full max-w-[750px]">
          <DesignStage height={1624}>
            <img className="absolute left-0 top-0 h-[1624px] w-[750px] object-cover" src={assets.bg} alt="" aria-hidden="true" />
            <img className="absolute left-[42px] top-[16px] h-[112px] w-[159px] object-contain" src={assets.logo} alt="雪花Logo" />
            <img
              className="absolute left-[92px] top-[104px] h-[312px] w-[585px] object-contain"
              src={assets.title}
              alt={bootstrap?.activity?.title || '活动主标题'}
            />
            <img className="absolute left-[96px] top-[436px] h-[50px] w-[596px] object-contain" src={assets.subtitle} alt="活动副标题" />
            <img className="absolute left-[182px] top-[512px] h-[50px] w-[386px] object-contain" src={assets.countTip} alt="答题数量提示" />
            <div
              className="absolute left-[346px] top-[514px] h-[42px] w-[60px] text-center text-[32px] font-black leading-none text-[#fff7d1] [text-shadow:0_2px_8px_rgba(24,40,84,0.45)]"
              aria-label={`今日剩余 ${remainingTodayAttempts} 次`}
            >
              {remainingTodayAttempts}
            </div>

            <button
              className="absolute left-[154px] top-[580px] h-[105px] w-[427px] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white active:scale-[0.985]"
              type="button"
              onClick={onOpenRule}
              aria-label="活动规则"
            >
              <img className="block h-full w-full" src={assets.ruleButton} alt="" aria-hidden="true" />
            </button>
            <button
              className="absolute left-[154px] top-[696px] h-[105px] w-[427px] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white active:scale-[0.985]"
              type="button"
              onClick={onStart}
              aria-label="开始挑战"
            >
              <img className="block h-full w-full" src={assets.startButton} alt="" aria-hidden="true" />
            </button>
            <button
              className="absolute left-[154px] top-[814px] h-[105px] w-[427px] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white active:scale-[0.985]"
              type="button"
              onClick={onOpenRank}
              aria-label="排行榜"
            >
              <img className="block h-full w-full" src={assets.rankButton} alt="" aria-hidden="true" />
            </button>
          </DesignStage>
        </div>

        <div className="flex w-full max-w-[750px] flex-col gap-3 px-3 max-[380px]:px-2">
          {hasInProgressAttempt ? (
            <button
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#177245] px-4 text-base font-extrabold text-white transition-colors hover:bg-[#145f39]"
              type="button"
              onClick={onResume}
            >
              继续答题
            </button>
          ) : null}

          {debug ? (
            <button
              className="min-h-11 w-full rounded-lg border border-dashed border-[#b54708] bg-[rgba(255,247,237,0.88)] px-4 text-sm font-bold text-[#9a3412]"
              type="button"
              onClick={onReset}
            >
              重置当前测试活动
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}
