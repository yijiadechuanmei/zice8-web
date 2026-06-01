export default function SnapshotUserNotice({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-950">当前为微信快照页</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          当前页面仅可浏览部分内容，暂不能参与活动、提交资料、留言或计入排行榜。请点击右下角「使用完整服务」后授权进入完整活动。
        </p>
        <button onClick={onClose} className="mt-6 min-h-12 w-full rounded-xl bg-slate-950 px-4 font-semibold text-white">
          我知道了
        </button>
      </div>
    </div>
  )
}
