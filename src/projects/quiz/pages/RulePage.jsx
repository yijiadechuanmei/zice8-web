import { quizAssets } from '../assets'

const rules = [
  '每人每天 2 次答题机会。',
  '连续答题 3 天。',
  '每次 6 道题。',
  '每题 10 秒倒计时。',
  '答对 1 题得 10 分。',
  '答错或超时不得分。',
  '每次满分 60 分。',
  '每天满分 120 分。',
  '排名按三日累计总积分排序。',
  '同分时，总用时少者靠前。',
  '总用时仍相同，最后一次完成时间早者靠前。',
]

export default function RulePage({ onBack }) {
  return (
    <main className="quiz-page quiz-design-page">
      <section className="quiz-design-screen quiz-rule-page">
        <div className="quiz-design-stage quiz-rule-stage">
          <img className="quiz-design-bg" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="quiz-design-logo-snow" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="quiz-design-logo-event" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-rule-mask" src={quizAssets.common.panelMask} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-rule-content-image" src={quizAssets.rule.content} alt="" aria-hidden="true" />

          <div className="quiz-dynamic-layer quiz-rule-text">
            <ol className="quiz-rule-list">
              {rules.map((rule) => <li key={rule}>{rule}</li>)}
            </ol>
          </div>

          <button className="quiz-image-button quiz-rule-home-button" type="button" onClick={onBack} aria-label="返回首页">
            <img src={quizAssets.rule.buttonHome} alt="" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  )
}
