/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react'

const PhaseQuizLotteryProject = lazy(() => import('./phase-quiz-lottery/index.jsx'))
const MaterialRegistrationProject = lazy(() => import('./material-registration/index.jsx'))
const AudioDebugProject = lazy(() => import('./audio-debug/index.jsx'))
const AntiFraudBoardGameProject = lazy(() => import('./anti-fraud-board-game/index.jsx'))
const TufeCampusOpenDayProject = lazy(() => import('./tufe-campus-open-day/index.jsx'))
const Xiwuqi99RoadNightProject = lazy(() => import('./xiwuqi-99-road-night/index.jsx'))
const QuizProject = lazy(() => import('./quiz/index.jsx'))

export const projectRoutes = [
  {
    path: '/xiwuqi-99-road-night/:activityKey',
    Component: Xiwuqi99RoadNightProject,
    activityGate: true,
  },
  {
    path: '/xiwuqi_99_road_night/:activityKey',
    Component: Xiwuqi99RoadNightProject,
    activityGate: true,
  },
  {
    path: '/phase-quiz-lottery/:activityKey',
    Component: PhaseQuizLotteryProject,
    activityGate: true,
  },
  {
    path: '/anti-fraud-board-game/:activityKey',
    Component: AntiFraudBoardGameProject,
    activityGate: true,
  },
  {
    path: '/anti_fraud_board_game/:activityKey',
    Component: AntiFraudBoardGameProject,
    activityGate: true,
  },
  {
    path: '/tufe-campus-open-day/:activityKey',
    Component: TufeCampusOpenDayProject,
    activityGate: true,
  },
  {
    path: '/tufe_campus_open_day/:activityKey',
    Component: TufeCampusOpenDayProject,
    activityGate: true,
  },
  {
    path: '/phase-quiz-lottery/:activityKey/:page',
    Component: PhaseQuizLotteryProject,
    activityGate: true,
  },
  {
    path: '/appointment/:activityKey',
    Component: lazy(() => import('./appointment/index.jsx')),
    activityGate: true,
  },
  {
    path: '/material_review_registration/:activityKey',
    Component: MaterialRegistrationProject,
    activityGate: true,
    activityGateExcludedKeys: ['material_community_registration_20260620'],
  },
  {
    path: '/material-registration/:activityKey',
    Component: MaterialRegistrationProject,
    activityGate: true,
    activityGateExcludedKeys: ['material_community_registration_20260620'],
  },
  {
    path: '/tjrcb-pension-manual/:activityKey',
    Component: lazy(() => import('./tjrcb-pension-manual/index.jsx')),
    activityGate: true,
  },
  {
    path: '/tjrcb_pension_manual/:activityKey',
    Component: lazy(() => import('./tjrcb-pension-manual/index.jsx')),
    activityGate: true,
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
    activityGate: true,
  },
  {
    path: '/quiz/:activityKey',
    Component: QuizProject,
    activityGate: true,
  },
  {
    path: '/quiz',
    Component: QuizProject,
    activityGate: true,
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
