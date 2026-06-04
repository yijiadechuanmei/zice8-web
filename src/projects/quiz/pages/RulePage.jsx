import QuizButton from '../components/QuizButton'

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
    <main className="quiz-page">
      <section className="quiz-panel">
        <h2>活动规则</h2>
        <ol className="quiz-rule-list">
          {rules.map((rule) => <li key={rule}>{rule}</li>)}
        </ol>
        <QuizButton variant="secondary" onClick={onBack}>返回首页</QuizButton>
      </section>
    </main>
  )
}
