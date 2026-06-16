import { useEffect, useMemo, useState } from 'react'
import QuestionCard from '../components/QuestionCard'
import QuestionHeader from '../components/QuestionHeader'
import ProgressBar from '../components/ProgressBar'
import StageLayout from '../components/StageLayout'

function getActivityKeyFromPathname() {
  const parts = window.location.pathname.split('/').filter(Boolean)
  return decodeURIComponent(parts[1] || '')
}

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
  const activityKey = useMemo(() => getActivityKeyFromPathname(), [])
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
    <main className="min-h-screen bg-[#eaf3ff]">
      <StageLayout className="flex min-h-screen flex-col items-center justify-center bg-[#eaf3ff] px-0 py-0">
        <div
          className="pql-stage relative overflow-hidden bg-[#eef5ff] text-slate-900"
          style={{ paddingBottom: 'max(80px, env(safe-area-inset-bottom))' }}
        >
          <div className="absolute inset-x-0 top-0 h-[370px] bg-[linear-gradient(180deg,#2F80FF_0%,#3790ff_52%,#78b6ff_100%)]" />
          <div className="absolute left-[-140px] top-[98px] h-[220px] w-[430px] rounded-full bg-white/12 blur-2xl" />
          <div className="absolute right-[-100px] top-[128px] h-[180px] w-[320px] rounded-full bg-white/14 blur-2xl" />
          <div className="absolute inset-x-0 top-[216px] h-[156px] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.54)_46%,rgba(255,255,255,0.96)_100%)]" />
          <div className="absolute inset-x-0 top-[255px] h-[76px] bg-[radial-gradient(circle_at_10%_0%,rgba(255,255,255,0.34),transparent_28%),radial-gradient(circle_at_36%_0%,rgba(255,255,255,0.2),transparent_28%),radial-gradient(circle_at_68%_0%,rgba(255,255,255,0.28),transparent_28%),radial-gradient(circle_at_92%_0%,rgba(255,255,255,0.22),transparent_28%)]" />

          <QuestionHeader title="知识问答" bookImageUrl={assets.bookHero} />

          <section className="relative z-10 px-6 pt-[248px]">
            <div className="rounded-[28px] bg-white/92 px-6 py-6 shadow-[0_16px_36px_rgba(50,110,190,0.10)] backdrop-blur-sm">
              <ProgressBar current={currentIndex + 1} total={total || 10} />
            </div>

            <div className="mt-4">
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
              <div className="w-[176px] rounded-2xl border border-white/40 bg-white/78 px-3 py-2 shadow-[0_10px_24px_rgba(35,87,180,0.16)] backdrop-blur-md">
                <div className="text-[11px] font-bold text-slate-600">DEV DEBUG</div>
                <div className="mt-1 break-all text-[10px] leading-4 text-slate-500">
                  <div>activityKey: {activityKey || '-'}</div>
                  <div>attemptId: {debugAttemptId || '-'}</div>
                </div>
                <div className="mt-2 grid gap-1">
                  <button
                    className="rounded-lg bg-blue-500 px-2 py-1 text-[11px] font-bold text-white"
                    type="button"
                    onClick={handleDebugReset}
                  >
                    重置答题数据
                  </button>
                  <button
                    className="rounded-lg bg-sky-100 px-2 py-1 text-[11px] font-bold text-blue-600"
                    type="button"
                    onClick={handleDebugRestart}
                  >
                    重新开始答题
                  </button>
                  <button
                    className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600"
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
