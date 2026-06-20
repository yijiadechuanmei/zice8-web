import { lazy } from 'react'

const PhaseQuizLotteryProject = lazy(() => import('./phase-quiz-lottery/index.jsx'))
const MaterialRegistrationProject = lazy(() => import('./material-registration/index.jsx'))

export const projectRoutes = [
  {
    path: '/phase-quiz-lottery/:activityKey',
    Component: PhaseQuizLotteryProject,
  },
  {
    path: '/phase-quiz-lottery/:activityKey/:page',
    Component: PhaseQuizLotteryProject,
  },
  {
    path: '/appointment/:activityKey',
    Component: lazy(() => import('./appointment/index.jsx')),
  },
  {
    path: '/material_review_registration/:activityKey',
    Component: MaterialRegistrationProject,
  },
  {
    path: '/material-registration/:activityKey',
    Component: MaterialRegistrationProject,
  },
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
