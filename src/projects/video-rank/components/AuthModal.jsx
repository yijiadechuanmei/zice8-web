export default function AuthModal({ onAuthorize, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-5">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-950">参与活动需要授权</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          本活动需要获取你的微信头像昵称，并填写姓名、部门，用于视频观看记录、留言展示和排行榜统计。
        </p>
        <div className="mt-6 grid gap-3">
          <button onClick={onAuthorize} className="min-h-12 rounded-xl bg-slate-950 px-4 font-semibold text-white">
            授权并继续
          </button>
          <button onClick={onCancel} className="min-h-12 rounded-xl bg-slate-100 px-4 font-semibold text-slate-700">
            先浏览看看
          </button>
        </div>
      </div>
    </div>
  )
}
