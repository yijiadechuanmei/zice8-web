import { useEffect } from 'react'

export default function PinganGoodDriverProject() {
  useEffect(() => {
    document.title = '“平安好司机”零违法挑战赛'
  }, [])

  return (
    <main className="min-h-[100svh] bg-slate-950 px-5 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100svh-6rem)] w-full max-w-[750px] flex-col items-center justify-center text-center">
        <p className="mb-4 text-sm tracking-[0.3em] text-amber-300">平安好司机</p>
        <h1 className="text-3xl font-bold leading-snug">零违法挑战赛</h1>
        <p className="mt-6 text-base leading-7 text-slate-300">活动页面正在筹备中，敬请期待。</p>
      </div>
    </main>
  )
}
