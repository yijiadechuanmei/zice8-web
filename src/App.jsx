import './App.css'
import { Component, Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { projectRoutes } from './projects/index.jsx'
import QuizLoadingState from './projects/quiz/components/LoadingState.jsx'
import {
  getUnavailableActivity,
  subscribeActivityAvailability,
} from './shared/activityAvailability'
import ActivityUnavailablePage from './shared/components/ActivityUnavailablePage.jsx'
import { request } from './shared/api/request'
import { setDocumentTitle } from './shared/utils/documentTitle'

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
  return <div className="flex min-h-screen items-center justify-center bg-white text-slate-600" role="status">页面加载中…</div>
}

class ProjectErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-slate-700" role="alert">
        <p>页面加载失败，请检查网络后重试</p>
        <button type="button" className="rounded bg-slate-800 px-5 py-2 text-white" onClick={() => window.location.reload()}>重新加载</button>
      </div>
    }
    return this.props.children
  }
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

function getActivityKey(params) {
  if (params.activityKey) return params.activityKey
  const searchParams = new URLSearchParams(window.location.search)
  return searchParams.get('activity_key') || searchParams.get('activityKey') || ''
}

function ProjectRoute({ project, params, fallback }) {
  const ProjectComponent = project.Component
  return (
    <ProjectErrorBoundary>
      <Suspense fallback={fallback}>
        <ProjectComponent routeParams={params} />
      </Suspense>
    </ProjectErrorBoundary>
  )
}

function ActivityGate({ activityKey, project, params, fallback }) {
  const [gateStatus, setGateStatus] = useState('checking')

  useEffect(() => {
    let active = true

    request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })
      .then((config) => {
        setDocumentTitle(config?.title)
        if (active) setGateStatus('available')
      })
      .catch((error) => {
        if (!active) return
        setGateStatus(Number(error?.status) === 404 ? 'unavailable' : 'bypass')
      })

    return () => {
      active = false
    }
  }, [activityKey])

  if (gateStatus === 'checking') return fallback
  if (gateStatus === 'unavailable') return <ActivityUnavailablePage />
  return <ProjectRoute project={project} params={params} fallback={fallback} />
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

  const rawActivityKey = getActivityKey(matchedProject.params)
  const activityKey = matchedProject.project.normalizeActivityKey
    ? matchedProject.project.normalizeActivityKey(rawActivityKey)
    : rawActivityKey
  const routeParams = matchedProject.params.activityKey && activityKey !== rawActivityKey
    ? { ...matchedProject.params, activityKey }
    : matchedProject.params
  if (
    unavailableActivity?.activityKey === activityKey
    || unavailableActivity?.activityKey === rawActivityKey
  ) return <ActivityUnavailablePage />

  const fallback = matchedProject.project.path.startsWith('/quiz') ? <QuizLoadingState text="答题活动加载中..." /> : <Loading />
  const gateExcluded = matchedProject.project.activityGateExcludedKeys?.includes(activityKey)
    || matchedProject.project.activityGateExcludedKeys?.includes(rawActivityKey)
  const gateEnabled = import.meta.env.VITE_ACTIVITY_GATE_ENABLED !== 'false'
    && matchedProject.project.activityGate
    && activityKey
    && !gateExcluded

  if (gateEnabled) {
    return (
      <ActivityGate
        key={activityKey}
        activityKey={activityKey}
        project={matchedProject.project}
        params={routeParams}
        fallback={fallback}
      />
    )
  }

  return <ProjectRoute project={matchedProject.project} params={routeParams} fallback={fallback} />
}

export default App
