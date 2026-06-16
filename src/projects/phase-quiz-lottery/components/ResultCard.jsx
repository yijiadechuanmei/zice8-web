function ActionButton({ tone = 'blue', disabled = false, children, onClick }) {
  return (
    <button
      className={[
        'min-h-14 w-full rounded-full px-6 py-4 text-lg font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50',
        tone === 'green'
          ? 'bg-gradient-to-b from-emerald-400 to-emerald-500 shadow-[0_16px_34px_rgba(16,185,129,0.26)]'
          : tone === 'coral'
            ? 'bg-gradient-to-b from-rose-400 to-red-400 shadow-[0_16px_34px_rgba(248,113,113,0.26)]'
            : 'bg-gradient-to-b from-sky-400 to-blue-500 shadow-[0_16px_34px_rgba(59,130,246,0.26)]',
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
      description: '正在同步当前活动进度',
    }
  }

  if (model.state === 'ready_to_start') {
    return {
      headline: '本期答题已开启',
      description: '完成全部 5 题并满分，即可进入抽奖页',
    }
  }

  if (model.state === 'no_open_phase') {
    return {
      headline: '当前暂无开放期次',
      description: '活动未开始或当前期次已结束，请稍后再来',
    }
  }

  if (model.soldOut) {
    return {
      headline: '本期奖品已抽完',
      description: model.message || '本次成绩已记录，可查看我的奖品状态',
    }
  }

  if (model.won) {
    return {
      headline: '恭喜获得抽奖资格',
      description: '奖品状态已由后端确认，可查看我的奖品',
    }
  }

  if (Number(model?.result?.score || 0) >= 100 && model.eligibleForDraw) {
    return {
      headline: '满分达成',
      description: '可以进入抽奖页，由后端返回转盘结果',
    }
  }

  return {
    headline: '本期答题完成',
    description: '未满分时不能抽奖，下一期继续冲刺',
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
      <div className="relative flex min-h-48 justify-center">
        <img className="h-44 w-44 object-contain md:h-56 md:w-56" src={assets.trophy} alt="" aria-hidden="true" />
        <img className="absolute bottom-0 h-14 w-56 object-contain md:h-18 md:w-72" src={assets.ribbon} alt="" aria-hidden="true" />
      </div>

      <div className="mt-3 rounded-[30px] bg-gradient-to-b from-white to-blue-50 px-6 py-7 text-center">
        <p className="text-2xl leading-tight font-extrabold text-slate-800 md:text-4xl">{copy.headline}</p>
        <p className="mt-3 text-sm leading-7 text-slate-500 md:text-lg">{copy.description}</p>
        <div className="mt-5 leading-none text-blue-500">
          <span className="text-7xl font-extrabold tracking-[-0.04em] md:text-9xl">{score}</span>
          <span className="text-4xl font-bold md:text-6xl">分</span>
        </div>
        <div className="mt-5 flex justify-center gap-4 text-sm text-slate-500 md:gap-7 md:text-base">
          <span>答对 {model?.result?.correctCount ?? 0} 题</span>
          <span>答错 {model?.result?.wrongCount ?? 0} 题</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        {canStart ? <ActionButton tone="green" onClick={onStart}>开始答题</ActionButton> : null}
        {canDraw ? <ActionButton tone="green" onClick={onGoWheel}>去抽奖</ActionButton> : null}
        {showPrize ? <ActionButton tone="coral" onClick={onOpenPrize}>我的奖品</ActionButton> : null}
        {!canStart && !canDraw && !showPrize ? (
          <ActionButton tone="blue" disabled>
            当前无可执行操作
          </ActionButton>
        ) : null}
      </div>
    </>
  )
}
