/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react'

const PhaseQuizLotteryProject = lazy(() => import('./phase-quiz-lottery/index.jsx'))
const MaterialRegistrationProject = lazy(() => import('./material-registration/index.jsx'))
const AudioDebugProject = lazy(() => import('./audio-debug/index.jsx'))
const AntiFraudBoardGameProject = lazy(() => import('./anti-fraud-board-game/index.jsx'))

export const projectRoutes = [
  {
    path: '/phase-quiz-lottery/:activityKey',
    Component: PhaseQuizLotteryProject,
  },
  {
    path: '/anti-fraud-board-game/:activityKey',
    Component: AntiFraudBoardGameProject,
  },
  {
    path: '/anti_fraud_board_game/:activityKey',
    Component: AntiFraudBoardGameProject,
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
    path: '/tjrcb-pension-manual/:activityKey',
    Component: lazy(() => import('./tjrcb-pension-manual/index.jsx')),
  },
  {
    path: '/tjrcb_pension_manual/:activityKey',
    Component: lazy(() => import('./tjrcb-pension-manual/index.jsx')),
  },
  {
    path: '/tjrcb-pension-manual/:activityKey/debug',
    Component: AudioDebugProject,
  },
  {
    path: '/tjrcb_pension_manual/:activityKey/debug',
    Component: AudioDebugProject,
  },
  {
    path: '/audio-debug/:activityKey',
    Component: AudioDebugProject,
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
