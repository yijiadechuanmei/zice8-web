import { QUIZ_VERSION, quizAssets } from '../assets'
import DesignStage from './DesignStage'
import {
  FENGCHENG_ACTIVITY_KEY,
  createFengchengLocalPublicConfig,
  getFengchengAssets,
} from '../fengcheng/config'
import '../quiz.css'
import '../fengcheng/fengcheng.css'

export default function LoadingState() {
  const isFengchengLoading = window.location.pathname.includes(FENGCHENG_ACTIVITY_KEY)

  if (isFengchengLoading) {
    const assets = getFengchengAssets(createFengchengLocalPublicConfig())
    return (
      <main className="quiz-loading-page fengcheng-loading-page" aria-label="加载中">
        <section className="fengcheng-stage-wrap">
          <DesignStage height={1624}>
            <div className="fengcheng-bg-fallback" />
            <img className="fengcheng-home-bg" src={assets.homeBackground} alt="" aria-hidden="true" />
            <div className="fengcheng-loading-card">
              <div className="fengcheng-loading-title">活动加载中</div>
              <div className="fengcheng-loading-bar" aria-hidden="true">
                <i />
              </div>
            </div>
          </DesignStage>
        </section>
        <div className="quiz-version-badge">v{QUIZ_VERSION}</div>
      </main>
    )
  }

  return (
    <main className="quiz-loading-page" style={{ '--quiz-common-bg': `url(${quizAssets.common.bg})` }} aria-label="加载中">
      <div className="quiz-loading-only-bar" aria-hidden="true">
        <div className="quiz-loading-only-fill" />
      </div>
      <div className="quiz-version-badge">v{QUIZ_VERSION}</div>
    </main>
  )
}
