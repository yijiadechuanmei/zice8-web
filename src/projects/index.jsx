import { lazy } from 'react'

export const projectRoutes = [
  {
    path: '/video-rank',
    Component: lazy(() => import('./video-rank/index.jsx')),
  },
]

