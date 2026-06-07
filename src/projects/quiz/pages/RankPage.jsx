import { formatQuizDuration, quizAssets } from '../assets'

export default function RankPage({ ranks, loading, onBack }) {
  return (
    <main className="quiz-page flex min-h-screen w-full justify-center bg-[#143978] pb-7">
      <section className="w-full max-w-[750px]">
        <div className="relative aspect-[750/1624] min-h-screen w-full overflow-hidden bg-[#143978]">
          <img className="absolute inset-0 h-full w-full object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[5.6%] top-[0.985%] h-[6.8966%] w-[21.2%] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[67.7333%] top-[1.3547%] h-[6.1576%] w-[25.6%] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />
          <img className="absolute left-[3.2%] top-[7.266%] h-[74.0764%] w-[93.2%] object-contain" src={quizAssets.common.panelMask} alt="" aria-hidden="true" />
          <img className="absolute left-[13.3333%] top-[8.9901%] h-[3.4483%] w-[73.0667%] object-contain" src={quizAssets.rank.title} alt="" aria-hidden="true" />
          <img className="absolute left-[8.5333%] top-[14.7783%] h-[5.9113%] w-[82.4%] object-contain" src={quizAssets.rank.tableHeader} alt="" aria-hidden="true" />

          <div className="absolute left-[8.5333%] top-[21.0591%] h-[56%] w-[82.4%] text-[#173f2a]">
            {loading ? <p className="text-sm text-white/80">排行榜加载中...</p> : null}
            {!loading && !ranks.length ? <p className="rounded-lg bg-[#f7f4d8] px-3 py-3 text-center text-sm text-[#66724b]">暂无排行</p> : null}
            {ranks.length ? (
              <div className="flex h-full flex-col">
                <div className="grid min-h-[42px] grid-cols-[40px_minmax(0,1fr)_minmax(0,0.9fr)_60px_72px] items-center gap-1.5 px-3 text-[12px] font-extrabold text-[#fff6d3] sm:grid-cols-[64px_minmax(0,1.1fr)_minmax(0,1fr)_92px_96px] sm:gap-2 sm:text-[clamp(12px,2vw,18px)]">
                  <span>排名</span>
                  <span>姓名</span>
                  <span>部门</span>
                  <span>积分</span>
                  <span>时间</span>
                </div>
                <div className="mt-3 flex flex-col gap-2 overflow-auto">
                  {ranks.map((item) => (
                    <div
                      className={`grid min-h-[52px] grid-cols-[40px_minmax(0,1fr)_minmax(0,0.9fr)_60px_72px] items-center gap-1.5 rounded-2xl px-3 text-[12px] ${
                        item.rank <= 3 ? 'bg-[rgba(249,242,181,0.96)]' : 'bg-[rgba(255,250,237,0.92)]'
                      } sm:grid-cols-[64px_minmax(0,1.1fr)_minmax(0,1fr)_92px_96px] sm:gap-2 sm:text-[clamp(12px,2vw,18px)]`}
                      key={`${item.rank}-${item.userId}`}
                    >
                      <strong className="text-center text-[clamp(16px,2.6vw,28px)] font-black text-[#8a5d00]">{item.rank}</strong>
                      <span className="truncate">{item.participantName || item.name || '未填写'}</span>
                      <span className="truncate">{item.department || '-'}</span>
                      <span className="truncate">{item.totalScore || 0}</span>
                      <span className="truncate">{formatQuizDuration(item.totalTimeMs)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <button
            className="absolute left-[34.9333%] top-[81.8966%] h-[6.7734%] w-[29.8667%] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
            type="button"
            onClick={onBack}
            aria-label="返回首页"
          >
            <img className="block h-full w-full" src={quizAssets.common.buttonHome} alt="" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  )
}
