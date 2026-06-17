function ActionButton({ tone = 'dark', disabled = false, children, onClick }) {
  return (
    <button
      className={[
        'min-h-[76px] w-full cursor-pointer rounded-full px-[22px] py-[14px] text-[28px] font-bold transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-white',
        tone === 'prize'
          ? 'bg-[linear-gradient(180deg,#F8C857_0%,#F59E0B_100%)] text-white shadow-[0_18px_36px_rgba(245,158,11,0.26)]'
          : tone === 'light'
            ? 'bg-slate-100 text-slate-800'
            : 'bg-slate-900 text-white',
      ].join(' ')}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function buildStatusCopy(model, stockExhausted) {
  if (!model) {
    return {
      headline: '活动加载中',
    }
  }

  if (model.state === 'ready_to_start') {
    return {
      headline: '本期答题已开启',
    }
  }

  if (model.state === 'no_open_phase') {
    return {
      headline: '当前暂无开放期次',
    }
  }

  if (stockExhausted) {
    return {
      headline: '奖品已发完',
    }
  }

  if (model.won) {
    return {
      headline: '抽奖结果已确认',
    }
  }

  if (Number(model?.result?.score || 0) >= 100 && model.eligibleForDraw) {
    return {
      headline: '满分达成',
    }
  }

  return {
    headline: '本期答题完成',
  }
}

export default function ResultCard({
  model,
  stockExhausted = false,
  animatedScore,
  assets,
  onStart,
  onGoWheel,
  onOpenPrize,
}) {
  const copy = buildStatusCopy(model, stockExhausted)
  const score = Number(animatedScore || model?.result?.score || 0)
  const canStart = model?.state === 'ready_to_start'
  const canDraw = Boolean(model?.eligibleForDraw && !model?.alreadyDrawn && !stockExhausted)
  const showPrize = Boolean(model?.won || model?.claim)
  const showStockExhaustedAction = Boolean(stockExhausted && !showPrize && !canStart)

  return (
    <>
      <div className="mt-[-34px] grid justify-items-center gap-[6px] text-center">
        <img className="h-[354px] w-[354px] object-contain" src={assets.resultTrophy} alt="" aria-hidden="true" />
        <p className="text-[38px] leading-[1.25] font-extrabold text-slate-900">{copy.headline}</p>
      </div>

      {!showPrize ? (
        <div className="mt-[12px] rounded-[24px] bg-slate-50 px-[22px] py-[20px] text-center">
          <div className="leading-none text-slate-900">
            <span className="text-[96px] font-extrabold">{score}</span>
            <span className="text-[38px] font-bold">分</span>
          </div>
          <div className="mt-[14px] flex justify-center gap-[24px] text-[24px] text-slate-500">
            <span>答对 {model?.result?.correctCount ?? 0} 题</span>
            <span>答错 {model?.result?.wrongCount ?? 0} 题</span>
          </div>
        </div>
      ) : null}

      <div className="mt-[18px] grid gap-[14px]">
        {canStart ? <ActionButton onClick={onStart}>开始答题</ActionButton> : null}
        {canDraw ? <ActionButton onClick={onGoWheel}>立即抽奖</ActionButton> : null}
        {showStockExhaustedAction ? <ActionButton disabled>奖品已发完</ActionButton> : null}
        {showPrize ? <ActionButton tone="prize" onClick={onOpenPrize}>我的奖品</ActionButton> : null}
        {!canStart && !canDraw && !showPrize && !showStockExhaustedAction ? (
          <ActionButton disabled>
            当前无可执行操作
          </ActionButton>
        ) : null}
      </div>
    </>
  )
}
