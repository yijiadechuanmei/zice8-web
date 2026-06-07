import { useMemo } from 'react'
import { formatQuizDuration, quizAssets } from '../assets'
import DesignStage from '../components/DesignStage'

export default function RankPage({ ranks, loading, onBack }) {
  const sortedRanks = useMemo(
    () =>
      [...ranks]
        .sort((left, right) => {
          const scoreDelta = Number(right.totalScore || 0) - Number(left.totalScore || 0)
          if (scoreDelta !== 0) return scoreDelta

          const timeDelta = Number(left.totalTimeMs || 0) - Number(right.totalTimeMs || 0)
          if (timeDelta !== 0) return timeDelta

          return String(left.userId || '').localeCompare(String(right.userId || ''), 'zh-Hans-CN', { numeric: true })
        })
        .map((item, index) => ({ ...item, displayRank: index + 1 })),
    [ranks],
  )

  return (
    <main className="quiz-page flex min-h-screen w-full justify-center bg-[#143978] pb-7">
      <section className="w-full max-w-[750px]">
        <DesignStage height={1624}>
          <img className="absolute left-0 top-0 h-[1624px] w-[750px] object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[42px] top-[16px] h-[112px] w-[159px] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[508px] top-[22px] h-[100px] w-[192px] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />
          <img className="absolute left-[24px] top-[118px] h-[1204px] w-[700px] object-contain" src={quizAssets.common.panelMask} alt="" aria-hidden="true" />
          <img className="absolute left-[100px] top-[146px] h-[56px] w-[548px] object-contain" src={quizAssets.rank.title} alt="" aria-hidden="true" />
          <img className="absolute left-[64px] top-[240px] h-[96px] w-[618px] object-contain" src={quizAssets.rank.tableHeader} alt="" aria-hidden="true" />

          <div className="absolute left-[64px] top-[290px] h-[950px] w-[618px] text-[#173f2a]">
            {loading ? <p className="text-[22px] text-white/80">排行榜加载中...</p> : null}
            {!loading && !sortedRanks.length ? <p className="rounded-lg bg-[#f7f4d8] px-[18px] py-[18px] text-center text-[22px] text-[#66724b]">暂无排行</p> : null}
            {sortedRanks.length ? (
              <div className="flex h-full flex-col">
                {/* <div className="grid h-[54px] grid-cols-[84px_150px_150px_92px_120px] items-center gap-[8px] px-[10px] bg-[#47803d]  text-[18px] font-extrabold text-[#fff6d3]">
                  <span>排名</span>
                  <span>姓名</span>
                  <span>部门</span>
                  <span>积分</span>
                  <span>时间</span>
                </div> */}
                <div className="mt-[14px] flex flex-col gap-[10px] overflow-auto">
                  {sortedRanks.map((item) => (
                    <div
                      className={`grid h-[58px] grid-cols-[84px_120px_120px_120px_120px] items-center gap-[8px] rounded-2xl px-[10px] text-[22px] ${
                        item.displayRank <= 3 ? 'bg-[rgba(249,242,181,0.96)]' : 'bg-[rgba(255,250,237,0.92)]'
                      }`}
                      key={`${item.displayRank}-${item.userId}`}
                    >
                      <strong className="text-center text-[28px] text-ce font-black text-[#8a5d00]">{item.displayRank}</strong>
                      <span className="truncate text-center">{item.participantName || item.name || '未填写'}</span>
                      <span className="truncate text-center">{item.department || '-'}</span>
                      <span className="truncate text-center">{item.totalScore || 0}</span>
                      <span className="truncate text-center">{formatQuizDuration(item.totalTimeMs)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <button
            className="absolute left-[262px] top-[1330px] h-[110px] w-[224px] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
            type="button"
            onClick={onBack}
            aria-label="返回首页"
          >
            <img className="block h-full w-full" src={quizAssets.common.buttonHome} alt="" aria-hidden="true" />
          </button>
        </DesignStage>
      </section>
    </main>
  )
}
