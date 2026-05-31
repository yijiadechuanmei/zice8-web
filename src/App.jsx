import './App.css'
import { Suspense } from 'react'
import { projectRoutes } from './projects/index.jsx'

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center text-slate-500">
      加载中...
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="rounded-2xl bg-white/10 px-8 py-6 text-center">
        <h1 className="text-3xl font-bold text-white">项目不存在</h1>
        <p className="mt-3 text-sm text-slate-300">请检查访问路径</p>
      </div>
    </div>
  )
}

function App() {
  const pathname = normalizePath(window.location.pathname)
  const matchedProject = projectRoutes.find((project) => project.path === pathname)

  if (!matchedProject) return <NotFound />

  const ProjectComponent = matchedProject.Component
  return <Suspense fallback={<Loading />}><ProjectComponent /></Suspense>
}

export default App
