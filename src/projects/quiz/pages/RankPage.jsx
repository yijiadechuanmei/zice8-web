import { formatQuizDuration, quizAssets } from '../assets'
import DesignStage from '../components/DesignStage'

export default function RankPage({
  ranks = [],
  loading = false,
  error = '',
  onRetry,
  onBack,
}) {
  return (
    <main className="quiz-page quiz-rank-page flex min-h-screen w-full justify-center bg-[#143978]">
      <section className="quiz-rank-shell w-full max-w-[750px]">
        <DesignStage height={1624}>
          <img className="absolute left-0 top-0 h-[1624px] w-[750px] object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[42px] top-[16px] h-[112px] w-[159px] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[508px] top-[22px] h-[100px] w-[192px] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />
          <img className="absolute left-[24px] top-[118px] h-[1204px] w-[700px] object-contain" src={quizAssets.common.panelMask} alt="" aria-hidden="true" />
          <img className="absolute left-[100px] top-[146px] h-[56px] w-[548px] object-contain" src={quizAssets.rank.title} alt="" aria-hidden="true" />
          <img className="absolute left-[64px] top-[240px] h-[96px] w-[618px] object-contain" src={quizAssets.rank.tableHeader} alt="" aria-hidden="true" />

          <div className="quiz-rank-content absolute left-[64px] top-[290px] h-[950px] w-[618px] text-[#173f2a]">
            {!loading && !ranks.length && !error ? <p className="rounded-lg bg-[#f7f4d8] px-[18px] py-[18px] text-center text-[22px] text-[#66724b]">暂无排行</p> : null}
            {(ranks.length || loading || error) ? (
              <div className="flex h-full flex-col">
                <div className="mt-[14px] flex flex-1 flex-col gap-[10px] overflow-auto pr-[4px]">
                  {ranks.map((item, index) => (
                    <div
                      className={`grid min-h-[58px] grid-cols-[84px_120px_120px_120px_120px] items-stretch gap-[8px] rounded-2xl px-[10px] py-[8px] text-[22px] ${
                        Number(item.rank || index + 1) <= 3 ? 'bg-[rgba(249,242,181,0.96)]' : 'bg-[rgba(255,250,237,0.92)]'
                      }`}
                      key={`${item.rank || index + 1}-${item.userId || item.participantId || index}`}
                    >
                      <strong className="flex items-center justify-center text-center text-[28px] font-black text-[#8a5d00]">{Number(item.rank || index + 1)}</strong>
                      <span className="flex items-center justify-center text-center whitespace-normal break-words leading-[1.2]">
                        {item.participantName || item.name || '未填写'}
                      </span>
                      <span className="flex items-center justify-center text-center whitespace-normal break-words leading-[1.2]">
                        {item.department || '-'}
                      </span>
                      <span className="flex items-center justify-center text-center">{item.totalScore || 0}</span>
                      <span className="flex items-center justify-center text-center">{formatQuizDuration(item.totalTimeMs)}</span>
                    </div>
                  ))}
                  {loading ? <p className="py-[10px] text-center text-[20px] text-white/80">加载中...</p> : null}
                  {!loading && error ? (
                    <button
                      className="rounded-lg bg-[rgba(255,250,237,0.92)] px-[18px] py-[12px] text-[20px] text-[#8a5d00]"
                      type="button"
                      onClick={onRetry}
                    >
                      加载失败，点击重试
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </DesignStage>
      </section>
      <button
        className="quiz-rank-home-button cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
        type="button"
        onClick={onBack}
        aria-label="返回首页"
      >
        <img className="block h-full w-full" src={quizAssets.common.buttonHome} alt="" aria-hidden="true" />
      </button>
    </main>
  )
}
