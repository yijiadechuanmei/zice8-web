import './App.css'
import VideoRankApp from './projects/video-rank/index.jsx'

function App() {
  if (window.location.pathname === '/video-rank' || window.location.pathname.startsWith('/video-rank/detail/')) {
    return <VideoRankApp />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="rounded-2xl bg-white/10 px-8 py-6 text-center">
        <h1 className="text-4xl font-bold text-amber-300">Zice8 Web</h1>
        <p className="mt-4 text-lg text-slate-200">Tailwind CSS 已生效</p>
      </div>
    </div>
  )
}

export default App
