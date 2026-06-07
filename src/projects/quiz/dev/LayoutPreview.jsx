import { useMemo, useState } from 'react'
import HomePage from '../pages/HomePage'
import ProfilePage from '../pages/ProfilePage'
import QuestionPage from '../pages/QuestionPage'
import RankPage from '../pages/RankPage'
import ResultPage from '../pages/ResultPage'
import RulePage from '../pages/RulePage'
import {
  mockBootstrap,
  mockProfile,
  mockQuestionLongText,
  mockQuestionMultiple,
  mockQuestionSingle,
  mockQuestionSixOptions,
  mockRankEmpty,
  mockRankList,
  mockRankLongText,
  mockResult,
  previewFeedbackMap,
} from './mockQuizData'

const previewPages = [
  { key: 'home', label: '首页' },
  { key: 'rule', label: '规则页' },
  { key: 'profile', label: '实名认证页' },
  { key: 'question', label: '答题页' },
  { key: 'result', label: '结果页' },
  { key: 'rank', label: '排行榜页' },
]

const questionStates = [
  { key: 'normal', label: 'normal' },
  { key: 'selected', label: 'selected' },
  { key: 'correct', label: 'correct' },
  { key: 'wrong', label: 'wrong' },
  { key: 'timeout', label: 'timeout' },
  { key: 'multiple', label: 'multiple' },
  { key: 'longText', label: 'longText' },
  { key: 'sixOptions', label: 'sixOptions' },
]

const rankStates = [
  { key: 'empty', label: 'empty' },
  { key: 'few', label: 'few' },
  { key: 'many', label: 'many' },
  { key: 'longText', label: 'longText' },
]

function getQuestionPreview(state) {
  switch (state) {
    case 'selected':
      return { current: mockQuestionSingle, feedback: null, selectedOptions: ['B'] }
    case 'correct':
      return { current: mockQuestionSingle, feedback: previewFeedbackMap.correct, selectedOptions: ['A'] }
    case 'wrong':
      return { current: mockQuestionSingle, feedback: previewFeedbackMap.wrong, selectedOptions: ['B'] }
    case 'timeout':
      return { current: { ...mockQuestionSingle, remainingSeconds: 0 }, feedback: previewFeedbackMap.timeout, selectedOptions: [] }
    case 'multiple':
      return { current: mockQuestionMultiple, feedback: null, selectedOptions: ['A', 'C'] }
    case 'longText':
      return { current: mockQuestionLongText, feedback: null, selectedOptions: [] }
    case 'sixOptions':
      return { current: mockQuestionSixOptions, feedback: null, selectedOptions: ['A', 'D', 'F'] }
    case 'normal':
    default:
      return { current: mockQuestionSingle, feedback: null, selectedOptions: [] }
  }
}

function getRankPreview(state) {
  switch (state) {
    case 'few':
      return mockRankList.slice(0, 3)
    case 'many':
      return mockRankList
    case 'longText':
      return mockRankLongText
    case 'empty':
    default:
      return mockRankEmpty
  }
}

export default function LayoutPreview() {
  const [previewPage, setPreviewPage] = useState('home')
  const [questionState, setQuestionState] = useState('normal')
  const [rankState, setRankState] = useState('many')
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [previewSelectedOptions, setPreviewSelectedOptions] = useState(null)
  const [profileName, setProfileName] = useState(mockProfile.name)

  const questionPreview = useMemo(() => getQuestionPreview(questionState), [questionState])
  const rankPreview = useMemo(() => getRankPreview(rankState), [rankState])

  function navigate(page) {
    setPreviewPage(page)
  }

  return (
    <div className="relative min-h-screen bg-slate-900">
      {panelCollapsed ? (
        <button
          className="fixed left-3 top-3 z-[80] rounded-full border border-slate-700 bg-slate-950/92 px-4 py-2 text-sm font-bold text-white shadow-2xl backdrop-blur transition hover:bg-slate-900"
          type="button"
          onClick={() => setPanelCollapsed(false)}
        >
          打开调试面板
        </button>
      ) : (
        <aside className="fixed left-3 top-3 z-[80] w-[min(320px,calc(100vw-24px))] rounded-2xl border border-slate-700 bg-slate-950/92 p-4 text-white shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Layout Preview</p>
              <h2 className="mt-1 text-lg font-black">Quiz 页面调试</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-300">layout=1</span>
              <button
                className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
                type="button"
                onClick={() => setPanelCollapsed(true)}
              >
                折叠
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {previewPages.map((item) => (
              <button
                key={item.key}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  previewPage === item.key ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                type="button"
                onClick={() => navigate(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-300">答题页状态</span>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none"
                value={questionState}
                onChange={(event) => {
                  setQuestionState(event.target.value)
                  setPreviewSelectedOptions(null)
                  setPreviewPage('question')
                }}
              >
                {questionStates.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                type="button"
                onClick={() => {
                  setPreviewSelectedOptions([])
                  setPreviewPage('question')
                }}
              >
                清空选中
              </button>
              <button
                className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
                type="button"
                onClick={() => {
                  setProfileName('')
                  setPreviewPage('profile')
                }}
              >
                清空姓名
              </button>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-300">排行榜状态</span>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none"
                value={rankState}
                onChange={(event) => {
                  setRankState(event.target.value)
                  setPreviewPage('rank')
                }}
              >
                {rankStates.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            该模式仅渲染本地 mock 数据，不调用 bootstrap、答题、排行、结果等任何后端接口，也不会写入 attempt 缓存。
          </p>
        </aside>
      )}

      {previewPage === 'home' ? (
        <HomePage
          bootstrap={mockBootstrap}
          debug={false}
          onOpenRule={() => navigate('rule')}
          onStart={() => navigate('profile')}
          onOpenRank={() => navigate('rank')}
          onResume={() => navigate('question')}
          onReset={() => {}}
        />
      ) : null}

      {previewPage === 'rule' ? <RulePage onBack={() => navigate('home')} /> : null}

      {previewPage === 'profile' ? (
        <ProfilePage
          key={`profile-${profileName}-${mockProfile.department}`}
          participant={{ name: profileName, department: mockProfile.department }}
          submitting={false}
          externalError={mockProfile.errorMessage}
          onSubmit={(profile) => {
            console.log('layout preview submit profile', profile)
            navigate('question')
          }}
          onBack={() => navigate('home')}
        />
      ) : null}

      {previewPage === 'question' ? (
        <QuestionPage
          current={questionPreview.current}
          feedback={questionPreview.feedback}
          submitting={false}
          previewMode
          previewSelectedOptions={previewSelectedOptions ?? questionPreview.selectedOptions}
          onAnswer={() => {}}
          onTimeout={() => {}}
        />
      ) : null}

      {previewPage === 'result' ? (
        <ResultPage
          result={mockResult}
          onOpenRank={() => navigate('rank')}
          onBack={() => navigate('home')}
        />
      ) : null}

      {previewPage === 'rank' ? (
        <RankPage
          ranks={rankPreview}
          loading={false}
          onBack={() => navigate('home')}
        />
      ) : null}
    </div>
  )
}
