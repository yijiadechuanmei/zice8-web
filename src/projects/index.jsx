import { lazy } from 'react'

export const projectRoutes = [
  {
    path: '/video-rank',
    Component: lazy(() => import('./video-rank/index.jsx')),
  },
  {
    path: '/quiz',
    Component: lazy(() => import('./quiz/index.jsx')),
  },
  {
    path: '/admin',
    Component: lazy(() => import('./admin/index.jsx')),
  },
  {
    path: '/admin/tools/payment-test',
    Component: lazy(() => import('./admin/index.jsx')),
  },
]
