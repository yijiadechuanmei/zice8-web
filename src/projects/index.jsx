/* eslint-disable react-refresh/only-export-components */
import { lazy } from 'react'
import { normalizeAppointmentActivityKey } from './appointment/appointmentSkins'

const PhaseQuizLotteryProject = lazy(() => import('./phase-quiz-lottery/index.jsx'))
const BrochureQuizLotteryProject = lazy(() => import('./brochure-quiz-lottery/index.jsx'))
const ArtistCallLotteryProject = lazy(() => import('./artist-call-lottery/index.jsx'))
const SongWishLotteryProject = lazy(() => import('./song-wish-lottery/index.jsx'))
const MaterialRegistrationProject = lazy(() => import('./material-registration/index.jsx'))
const AudioDebugProject = lazy(() => import('./audio-debug/index.jsx'))
const AntiFraudBoardGameProject = lazy(() => import('./anti-fraud-board-game/index.jsx'))
const TufeCampusOpenDayProject = lazy(() => import('./tufe-campus-open-day/index.jsx'))
const Xiwuqi99RoadNightProject = lazy(() => import('./xiwuqi-99-road-night/index.jsx'))
const LatexAllergyRiskTestProject = lazy(() => import('./latex-allergy-risk-test/index.jsx'))
const BorderTownRoleTestProject = lazy(() => import('./border-town-role-test/index.jsx'))
const FeatureChallengeProject = lazy(() => import('./feature-challenge/index.jsx'))
const LongMarchStudyProject = lazy(() => import('./long-march-study/index.jsx'))
const QuizProject = lazy(() => import('./quiz/index.jsx'))
const AppointmentProject = lazy(() => import('./appointment/index.jsx'))

const activityTypeProjects = {
  artist_call_lottery: ArtistCallLotteryProject,
  'artist-call-lottery': ArtistCallLotteryProject,
  song_wish_lottery: SongWishLotteryProject,
  'song-wish-lottery': SongWishLotteryProject,
}

function ActivityTypeProject({ routeParams }) {
  const activityType = String(routeParams?.activityType || '').toLowerCase()
  const ProjectComponent = activityTypeProjects[activityType]
  if (!ProjectComponent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="rounded-2xl bg-white/10 px-8 py-6 text-center">
          <h1 className="text-3xl font-bold text-white">项目不存在</h1>
          <p className="mt-3 text-sm text-slate-300">请检查访问路径</p>
        </div>
      </div>
    )
  }
  return <ProjectComponent routeParams={routeParams} />
}

export const projectRoutes = [
  {
    path: '/feature-challenge/:activityKey',
    Component: FeatureChallengeProject,
    activityGate: true,
  },
  {
    path: '/feature_challenge/:activityKey',
    Component: FeatureChallengeProject,
    activityGate: true,
  },
  {
    path: '/border-town-role-test/:activityKey',
    Component: BorderTownRoleTestProject,
    activityGate: true,
  },
  {
    path: '/border_town_role_test/:activityKey',
    Component: BorderTownRoleTestProject,
    activityGate: true,
  },
  {
    path: '/long_march_study/:activityKey',
    Component: LongMarchStudyProject,
    activityGate: true,
  },
  {
    path: '/long-march-study/:activityKey',
    Component: LongMarchStudyProject,
    activityGate: true,
  },
  {
    path: '/latex-allergy-risk-test/:activityKey',
    Component: LatexAllergyRiskTestProject,
    activityGate: true,
  },
  {
    path: '/latex_allergy_risk_test/:activityKey',
    Component: LatexAllergyRiskTestProject,
    activityGate: true,
  },
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
    path: '/brochure-quiz-lottery/:activityKey',
    Component: BrochureQuizLotteryProject,
    activityGate: true,
  },
  {
    path: '/brochure_quiz_lottery/:activityKey',
    Component: BrochureQuizLotteryProject,
    activityGate: true,
  },
  {
    path: '/artist-call-lottery/:activityKey',
    Component: ArtistCallLotteryProject,
    activityGate: true,
  },
  {
    path: '/artist_call_lottery/:activityKey',
    Component: ArtistCallLotteryProject,
    activityGate: true,
  },
  {
    path: '/song-wish-lottery/:activityKey',
    Component: SongWishLotteryProject,
    activityGate: true,
  },
  {
    path: '/song_wish_lottery/:activityKey',
    Component: SongWishLotteryProject,
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
    Component: AppointmentProject,
    activityGate: true,
    normalizeActivityKey: normalizeAppointmentActivityKey,
  },
  {
    path: '/appointment_visit/:activityKey',
    Component: AppointmentProject,
    activityGate: true,
    normalizeActivityKey: normalizeAppointmentActivityKey,
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
    path: '/:activityType/:activityKey',
    Component: ActivityTypeProject,
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
