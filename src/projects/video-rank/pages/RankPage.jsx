import RankList from '../components/RankList'
import { VIDEO_RANK_VERSION } from '../config'

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
      <p className="mb-3 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-600 shadow-sm">
        每个视频需完成观看并提交该视频留言后，才计入完成数量。已在规则生效前完成的视频不受影响。
      </p>
      <RankList ranks={ranks} currentUserId={me?.id} />
      <footer className="pt-6 text-center text-xs text-slate-400">{VIDEO_RANK_VERSION}</footer>
    </main>
  )
}
