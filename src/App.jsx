import './App.css'
import { Suspense, useSyncExternalStore } from 'react'
import { projectRoutes } from './projects/index.jsx'
import QuizLoadingState from './projects/quiz/components/LoadingState.jsx'
import {
  getUnavailableActivity,
  subscribeActivityAvailability,
} from './shared/activityAvailability'
import ActivityUnavailablePage from './shared/components/ActivityUnavailablePage.jsx'

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1)
  return pathname
}

function matchRoute(pathname, routePath) {
  const pathnameParts = normalizePath(pathname).split('/').filter(Boolean)
  const routeParts = routePath.split('/').filter(Boolean)
  if (pathnameParts.length !== routeParts.length) return null

  const params = {}
  for (let index = 0; index < routeParts.length; index += 1) {
    const routePart = routeParts[index]
    const pathnamePart = pathnameParts[index]
    if (routePart.startsWith(':')) {
      params[routePart.slice(1)] = decodeURIComponent(pathnamePart || '')
      continue
    }
    if (routePart !== pathnamePart) return null
  }
  return params
}

function Loading() {
  return <div className="min-h-screen bg-white" aria-label="页面加载中" />
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
  const unavailableActivity = useSyncExternalStore(
    subscribeActivityAvailability,
    getUnavailableActivity,
    getUnavailableActivity,
  )
  const pathname = normalizePath(window.location.pathname)
  const matchedProject = projectRoutes
    .map((project) => ({ project, params: matchRoute(pathname, project.path) }))
    .find((item) => item.params)

  if (!matchedProject) return <NotFound />
  if (unavailableActivity) return <ActivityUnavailablePage />

  const ProjectComponent = matchedProject.project.Component
  const fallback = matchedProject.project.path === '/quiz' ? <QuizLoadingState text="答题活动加载中..." /> : <Loading />
  return <Suspense fallback={fallback}><ProjectComponent routeParams={matchedProject.params} /></Suspense>
}

export default App
