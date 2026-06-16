function ActionButton({ tone = 'dark', disabled = false, children, onClick }) {
  return (
    <button
      className={[
        'min-h-[92px] w-full rounded-full px-[24px] py-[18px] text-[30px] font-bold transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white',
        tone === 'light' ? 'bg-slate-100 text-slate-800' : 'bg-slate-900 text-white',
      ].join(' ')}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function buildStatusCopy(model) {
  if (!model) {
    return {
      headline: '活动加载中',
      description: '正在同步当前活动进度。',
    }
  }

  if (model.state === 'ready_to_start') {
    return {
      headline: '本期答题已开启',
      description: '完成全部 5 题并满分，才可进入抽奖环节。',
    }
  }

  if (model.state === 'no_open_phase') {
    return {
      headline: '当前暂无开放期次',
      description: '活动未开始或当前期次已结束，请稍后再来。',
    }
  }

  if (model.soldOut) {
    return {
      headline: '本期奖品已抽完',
      description: model.message || '本次成绩已记录，可查看我的奖品状态。',
    }
  }

  if (model.won) {
    return {
      headline: '抽奖结果已确认',
      description: '奖品状态已由后端返回，可直接查看我的奖品。',
    }
  }

  if (Number(model?.result?.score || 0) >= 100 && model.eligibleForDraw) {
    return {
      headline: '满分达成',
      description: '已满足抽奖条件，可进入抽奖页。',
    }
  }

  return {
    headline: '本期答题完成',
    description: '结果已记录，本次未满足抽奖条件。',
  }
}

export default function ResultCard({
  model,
  animatedScore,
  assets,
  onStart,
  onGoWheel,
  onOpenPrize,
}) {
  const copy = buildStatusCopy(model)
  const score = Number(animatedScore || model?.result?.score || 0)
  const canStart = model?.state === 'ready_to_start'
  const canDraw = Boolean(model?.eligibleForDraw && !model?.alreadyDrawn)
  const showPrize = Boolean(model?.won || model?.claim)

  return (
    <>
      <div className="mt-[24px] grid justify-items-center gap-[24px] text-center">
        <img className="h-[160px] w-[160px] object-contain" src={assets.prizeBox} alt="" aria-hidden="true" />
        <div>
          <p className="text-[40px] leading-[1.3] font-extrabold text-slate-900">{copy.headline}</p>
          <p className="mt-[16px] text-[28px] leading-[1.7] text-slate-600">{copy.description}</p>
        </div>
      </div>

      <div className="mt-[28px] rounded-[28px] bg-slate-50 px-[28px] py-[32px] text-center">
        <div className="leading-none text-slate-900">
          <span className="text-[112px] font-extrabold tracking-[-0.04em]">{score}</span>
          <span className="text-[44px] font-bold">分</span>
        </div>
        <div className="mt-[20px] flex justify-center gap-[28px] text-[28px] text-slate-500">
          <span>答对 {model?.result?.correctCount ?? 0} 题</span>
          <span>答错 {model?.result?.wrongCount ?? 0} 题</span>
        </div>
      </div>

      <div className="mt-[28px] grid gap-[18px]">
        {canStart ? <ActionButton onClick={onStart}>开始答题</ActionButton> : null}
        {canDraw ? <ActionButton onClick={onGoWheel}>去抽奖</ActionButton> : null}
        {showPrize ? <ActionButton tone="light" onClick={onOpenPrize}>我的奖品</ActionButton> : null}
        {!canStart && !canDraw && !showPrize ? (
          <ActionButton disabled>
            当前无可执行操作
          </ActionButton>
        ) : null}
      </div>
    </>
  )
}
