import { useState } from 'react'
import DesignStage from '../components/DesignStage'
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
        <DesignStage height={1624}>
          <img className="absolute left-0 top-0 h-[1624px] w-[750px] object-cover" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="absolute left-[42px] top-[16px] h-[112px] w-[159px] object-contain" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="absolute left-[508px] top-[22px] h-[100px] w-[192px] object-contain" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />

          <img className="absolute left-[110px] top-[212px] h-[50px] w-[526px] object-contain" src={quizAssets.profile.title} alt="" aria-hidden="true" />
          <img className="absolute left-[114px] top-[294px] h-[36px] w-[520px] object-contain" src={quizAssets.profile.subtitleTip} alt="" aria-hidden="true" />
          <img className="absolute left-[132px] top-[450px] h-[120px] w-[486px] object-contain" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="absolute left-[132px] top-[660px] h-[120px] w-[486px] object-contain" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="absolute left-[320px] top-[380px] h-[50px] w-[112px] object-contain" src={quizAssets.profile.labelName} alt="" aria-hidden="true" />
          <img className="absolute left-[320px] top-[576px] h-[50px] w-[112px] object-contain" src={quizAssets.profile.labelDepartment} alt="" aria-hidden="true" />

          <label className="absolute left-[176px] top-[501px] w-[402px]">
            <span className="sr-only">姓名</span>
            <input
              className="h-[56px] w-full rounded-full bg-[rgba(255,252,243,0.92)] px-[24px] text-[24px] text-[#173f2a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] outline-none"
              value={name}
              maxLength={100}
              placeholder="请输入姓名"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="absolute left-[176px] top-[711px] w-[402px]">
            <span className="sr-only">部门</span>
            <select
              className="h-[56px] w-full rounded-full bg-[rgba(255,252,243,0.92)] px-[24px] text-[24px] text-[#173f2a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] outline-none"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="">请选择部门</option>
              {departments.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>

          {error || externalError ? (
            <div className="absolute left-[132px] top-[856px] w-[486px] rounded-[14px] bg-[rgba(254,226,226,0.95)] px-[18px] py-[12px] text-[22px] leading-[1.5] text-[#9f1d1d]">
              {error || externalError}
            </div>
          ) : null}

          <button
            className="absolute left-[390px] top-[834px] h-[109px] w-[221px] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-85"
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            aria-label="开始答题"
          >
            <img className="block h-full w-full" src={quizAssets.profile.buttonStart} alt="" aria-hidden="true" />
            <span className="absolute inset-0 flex items-center justify-center text-[28px] font-extrabold text-[#fff7d1] [text-shadow:0_2px_8px_rgba(24,40,84,0.35)]">
              {submitting ? '提交中...' : '开始答题'}
            </span>
          </button>

          <button
            className="absolute left-[144px] top-[836px] h-[109px] w-[221px] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white"
            type="button"
            onClick={onBack}
            aria-label="返回首页"
          >
            <img className="block h-full w-full" src={quizAssets.common.buttonHome} alt="" aria-hidden="true" />
          </button>
        </DesignStage>
      </section>
    </main>
  )
}
