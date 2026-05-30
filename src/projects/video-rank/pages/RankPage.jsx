import RankList from '../components/RankList'

export default function RankPage({ ranks, me, onBack }) {
  return (
    <main className="mx-auto min-h-screen max-w-[750px] bg-slate-100 px-4 py-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">完成优先，越早越靠前</p>
          <h1 className="text-2xl font-black text-slate-950">排行榜</h1>
        </div>
        <button onClick={onBack} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">返回首页</button>
      </div>
      <RankList ranks={ranks} currentUserId={me?.id} />
    </main>
  )
}
