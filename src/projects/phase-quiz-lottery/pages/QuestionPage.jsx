import { useEffect, useState } from 'react'
import QuestionCard from '../components/QuestionCard'
import QuestionHeader from '../components/QuestionHeader'
import ProgressBar from '../components/ProgressBar'
import StageLayout from '../components/StageLayout'

function getDebugAttemptId() {
  return (
    window.sessionStorage.getItem('phase-quiz-lottery-attempt-id') ||
    window.localStorage.getItem('phase-quiz-lottery-attempt-id') ||
    window.__phaseQuizLotteryAttemptId ||
    ''
  )
}

function clearPhaseQuizLotteryCache() {
  const storages = [window.sessionStorage, window.localStorage]
  const prefixes = ['phase-quiz-lottery', 'phaseQuizLottery', 'pql-']

  storages.forEach((storage) => {
    const keys = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (!key) continue
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        keys.push(key)
      }
    }
    keys.forEach((key) => storage.removeItem(key))
  })
}

export default function QuestionPage({
  activityKey,
  activityTitle,
  phaseNo,
  questions,
  currentIndex,
  submitting,
  onAnswer,
  assets,
}) {
  const question = questions[currentIndex] || null
  const total = questions.length || 0
  const [selectedValue, setSelectedValue] = useState(null)

  useEffect(() => {
    setSelectedValue(null)
  }, [question?.id])

  const debugEnabled = import.meta.env.DEV
  const [debugAttemptId, setDebugAttemptId] = useState(getDebugAttemptId())

  useEffect(() => {
    if (!debugEnabled) return undefined
    window.__phaseQuizLotteryDebugState = {
      activityKey,
      attemptId: getDebugAttemptId(),
    }
    const sync = () => setDebugAttemptId(getDebugAttemptId())
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [activityKey, debugEnabled])

  const handleDebugRefresh = () => setDebugAttemptId(getDebugAttemptId())

  const handleDebugReset = () => {
    clearPhaseQuizLotteryCache()
    handleDebugRefresh()
    window.location.reload()
  }

  const handleDebugRestart = () => {
    clearPhaseQuizLotteryCache()
    window.__phaseQuizLotteryAttemptId = ''
    handleDebugRefresh()
    window.location.replace(window.location.pathname)
  }

  const handleDebugClearCache = () => {
    clearPhaseQuizLotteryCache()
    handleDebugRefresh()
  }

  return (
    <main className="h-[100vh] overflow-hidden bg-[#eaf3ff]">
      <StageLayout className="bg-[#eaf3ff] px-0 py-0">
        <div
          className="pql-stage pql-question-stage relative overflow-hidden bg-[#eef5ff] text-slate-900"
          style={{ paddingBottom: 'max(80px, env(safe-area-inset-bottom))' }}
        >
          <QuestionHeader title="知识问答" bookImageUrl={assets.bookHero} />

          <section className="pql-question-content relative z-10 px-[32px] pt-[26px]">
            <div className="pql-progress-shell rounded-[28px] bg-white/92 px-6 py-6 shadow-[0_16px_36px_rgba(50,110,190,0.10)] backdrop-blur-sm">
              <ProgressBar current={currentIndex + 1} total={total || 10} />
            </div>

            <div className="mt-[24px]">
              <QuestionCard
                question={question}
                current={currentIndex + 1}
                total={total}
                selectedValue={selectedValue}
                submitting={submitting}
                onSelect={(value) => {
                  setSelectedValue(value)
                  onAnswer(value)
                }}
              />
            </div>
          </section>

          {debugEnabled ? (
            <div className="fixed right-3 top-[calc(env(safe-area-inset-top,0px)+10px)] z-[60]">
              <div className="w-[260px] rounded-2xl border border-white/40 bg-white/78 px-4 py-3 shadow-[0_10px_24px_rgba(35,87,180,0.16)] backdrop-blur-md">
                <div className="text-[18px] font-bold text-slate-600">DEV DEBUG</div>
                <div className="mt-1 break-all text-[16px] leading-6 text-slate-500">
                  <div>activityKey: {activityKey || '-'}</div>
                  <div>attemptId: {debugAttemptId || '-'}</div>
                </div>
                <div className="mt-2 grid gap-1">
                  <button
                    className="rounded-lg bg-blue-500 px-3 py-2 text-[18px] font-bold text-white"
                    type="button"
                    onClick={handleDebugReset}
                  >
                    重置答题数据
                  </button>
                  <button
                    className="rounded-lg bg-sky-100 px-3 py-2 text-[18px] font-bold text-blue-600"
                    type="button"
                    onClick={handleDebugRestart}
                  >
                    重新开始答题
                  </button>
                  <button
                    className="rounded-lg bg-slate-100 px-3 py-2 text-[18px] font-bold text-slate-600"
                    type="button"
                    onClick={handleDebugClearCache}
                  >
                    清空本地缓存
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </StageLayout>
    </main>
  )
}
