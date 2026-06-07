import { useState } from 'react'
import { quizAssets } from '../assets'

const departments = ['综合部', '市场部', '技术部', '运营部', '财务部', '其他']

export default function ProfilePage({ participant, submitting, onSubmit, onBack, externalError = '' }) {
  const [name, setName] = useState(participant?.name || '')
  const [department, setDepartment] = useState(participant?.department || '')
  const [error, setError] = useState('')

  function handleSubmit() {
    const normalizedName = name.trim()
    if (!normalizedName) return setError('请输入姓名')
    if (!department) return setError('请选择部门')
    setError('')
    onSubmit({ name: normalizedName, department })
  }

  return (
    <main className="quiz-page flex min-h-screen w-full justify-center bg-[#143978] pb-7">
      <section className="w-full max-w-[750px]">
        <div className="relative aspect-[750/1624] min-h-screen w-full overflow-hidden bg-[#143978]">
          <img className="absolute inset-0 h-full w-full object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[5.6%] top-[0.985%] h-[6.8966%] w-[21.2%] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[67.7333%] top-[1.3547%] h-[6.1576%] w-[25.6%] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />

          <img className="absolute left-[14.6667%] top-[13.0542%] h-[3.0788%] w-[70%] object-contain" src={quizAssets.profile.title} alt="" aria-hidden="true" />
          <img className="absolute left-[15.2%] top-[18.1034%] h-[2.2167%] w-[69.3333%] object-contain" src={quizAssets.profile.subtitleTip} alt="" aria-hidden="true" />
          <img className="absolute left-[17.6%] top-[27.7094%] h-[7.3892%] w-[64.8%] object-contain" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="absolute left-[17.6%] top-[40.6404%] h-[7.3892%] w-[64.8%] object-contain" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="absolute left-[42.6667%] top-[23.399%] h-[3.1404%] w-[14.9333%] object-contain" src={quizAssets.profile.labelName} alt="" aria-hidden="true" />
          <img className="absolute left-[42.6667%] top-[35.4679%] h-[3.1404%] w-[14.9333%] object-contain" src={quizAssets.profile.labelDepartment} alt="" aria-hidden="true" />

          <label className="absolute left-[23.5%] top-[30.85%] w-[53.5%]">
            <span className="sr-only">姓名</span>
            <input
              className="w-full rounded-full bg-[rgba(255,252,243,0.92)] px-[18px] py-3 text-[clamp(14px,2.35vw,24px)] text-[#173f2a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] outline-none"
              value={name}
              maxLength={100}
              placeholder="请输入姓名"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="absolute left-[23.5%] top-[43.8%] w-[53.5%]">
            <span className="sr-only">部门</span>
            <select
              className="w-full rounded-full bg-[rgba(255,252,243,0.92)] px-[18px] py-3 text-[clamp(14px,2.35vw,24px)] text-[#173f2a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] outline-none"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="">请选择部门</option>
              {departments.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>

          {error || externalError ? (
            <div className="absolute left-[17.6%] top-[52.7%] w-[64.8%] rounded-[14px] bg-[rgba(254,226,226,0.95)] px-[14px] py-[10px] text-[clamp(13px,2.1vw,20px)] leading-[1.5] text-[#9f1d1d]">
              {error || externalError}
            </div>
          ) : null}

          <button
            className="absolute left-[52%] top-[51.3547%] h-[6.6502%] w-[29.4667%] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-85"
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            aria-label="开始答题"
          >
            <img className="block h-full w-full" src={quizAssets.profile.buttonStart} alt="" aria-hidden="true" />
            <span className="absolute inset-0 flex items-center justify-center text-[clamp(14px,2.7vw,28px)] font-extrabold text-[#fff7d1] [text-shadow:0_2px_8px_rgba(24,40,84,0.35)]">
              {submitting ? '提交中...' : '开始答题'}
            </span>
          </button>

          <button
            className="absolute left-[19.2%] top-[51.4163%] h-[6.6502%] w-[29.4667%] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
            type="button"
            onClick={onBack}
            aria-label="返回首页"
          >
            <img className="block h-full w-full" src={quizAssets.common.buttonHome} alt="" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  )
}
