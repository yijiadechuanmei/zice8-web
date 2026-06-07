import { useEffect, useRef, useState } from 'react'
import { Select } from 'antd'
import DesignStage from '../components/DesignStage'
import { quizAssets } from '../assets'

const departments = [
  "武汉事业部",
  "华南营运部",
  "总部派驻各部门",
  "党群工作部",
  "办公室",
  "销售人力部",
  "销售财务部",
  "销售管理部",
  "市场部",
  "武汉大区",
  "武汉周边大区",
  "现代零售大区",
  "创新发展大区",
  "湖北夜场大区",
  "黄石大区",
  "宜昌大区",
  "襄阳大区",
  "随州大区",
  "荆州大区",
  "黄冈大区",
  "岳阳大区",
  "长沙大区",
  "湖南夜场大区",
  "湘西大区",
  "株洲大区",
  "娄底大区",
  "常德大区",
  "南昌大区",
  "上饶大区",
  "九江大区",
  "赣州大区"
]

export default function ProfilePage({ participant, submitting, onSubmit, onBack, externalError = '' }) {
  const [name, setName] = useState(participant?.name || '')
  const [department, setDepartment] = useState(participant?.department || '')
  const [toastMessage, setToastMessage] = useState('')
  const toastTimerRef = useRef(null)

  function showToast(message) {
    if (!message) return
    setToastMessage(message)
    window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage('')
    }, 1500)
  }

  useEffect(() => {
    if (!externalError) return
    showToast(externalError)
  }, [externalError])

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current)
  }, [])

  function handleSubmit() {
    const normalizedName = name.trim()
    if (!normalizedName) return showToast('请输入姓名')
    if (!department) return showToast('请选择部门')
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

          <label className="absolute left-[176px] top-[475px] w-[402px]">
            <span className="sr-only">姓名</span>
            <input
              className="h-[56px] w-full rounded-full  px-[24px] text-[32px] text-[#fff7d1] text-center outline-none"
              value={name}
              maxLength={100}
              placeholder="请输入姓名"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="absolute left-[176px] top-[685px] h-[56px] w-[402px]">
            <span className="sr-only">部门</span>
            <Select
              value={department || undefined}
              onChange={(value) => setDepartment(value)}
              placeholder="请选择部门"
              options={departments.map((item) => ({ label: item, value: item }))}
              suffixIcon={null}
              showSearch={false}
              variant="borderless"
              className="quiz-profile-department-select h-full w-full"
              popupClassName="quiz-profile-department-popup"
              getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            />
          </label>

          <button
            className="absolute left-[390px] top-[834px] h-[109px] w-[221px] cursor-pointer bg-transparent p-0 outline-offset-4 focus-visible:outline-3 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-85"
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            aria-label="开始答题"
          >
            <img className="block h-full w-full" src={quizAssets.profile.buttonStart} alt="开始答题" />
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

        {toastMessage ? (
          <div className="pointer-events-none fixed left-1/2 top-[18vh] z-50 -translate-x-1/2 rounded-[18px] bg-[rgba(16,24,40,0.82)] px-[24px] py-[16px] text-center text-[24px] leading-[1.4] text-white shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
            {toastMessage}
          </div>
        ) : null}
      </section>
    </main>
  )
}
