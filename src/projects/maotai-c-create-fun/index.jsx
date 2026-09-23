import { useEffect } from 'react'

export default function MaotaiCCreateFunProject() {
  useEffect(() => {
    document.title = '茅台向C造趣'
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#12100d] px-6 text-[#f5ebd9]">
      <section className="w-full max-w-sm text-center" aria-labelledby="maotai-c-create-fun-title">
        <p className="text-sm tracking-[0.35em] text-[#c7a469]">茅台向C造趣</p>
        <h1 id="maotai-c-create-fun-title" className="mt-5 text-3xl font-semibold tracking-[0.18em]">
          敬请期待
        </h1>
      </section>
    </main>
  )
}
