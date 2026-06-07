import { useState } from 'react'
import { quizAssets } from '../assets'

const departments = ['综合部', '市场部', '技术部', '运营部', '财务部', '其他']

export default function ProfilePage({ participant, submitting, onSubmit, onBack }) {
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
    <main className="quiz-page quiz-design-page">
      <section className="quiz-design-screen quiz-profile-page">
        <div className="quiz-design-stage quiz-profile-stage">
          <img className="quiz-design-bg" src={quizAssets.common.bg} alt="" aria-hidden="true" />
          <img className="quiz-design-logo-snow" src={quizAssets.common.logoSnow} alt="雪花Logo" />
          <img className="quiz-design-logo-event" src={quizAssets.common.logoEvent} alt="" aria-hidden="true" />

          <img className="quiz-layer-img quiz-profile-title-image" src={quizAssets.profile.title} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-profile-subtitle-image" src={quizAssets.profile.subtitleTip} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-profile-name-panel" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-profile-department-panel" src={quizAssets.common.panelCard} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-profile-name-label-image" src={quizAssets.profile.labelName} alt="" aria-hidden="true" />
          <img className="quiz-layer-img quiz-profile-department-label-image" src={quizAssets.profile.labelDepartment} alt="" aria-hidden="true" />

          <label className="quiz-dynamic-layer quiz-profile-field quiz-profile-name-field">
            <span className="quiz-visually-hidden">姓名</span>
            <input value={name} maxLength={100} placeholder="请输入姓名" onChange={(event) => setName(event.target.value)} />
          </label>

          <label className="quiz-dynamic-layer quiz-profile-field quiz-profile-department-field">
            <span className="quiz-visually-hidden">部门</span>
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="">请选择部门</option>
              {departments.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>

          {error ? <div className="quiz-dynamic-layer quiz-profile-error">{error}</div> : null}

          <button className="quiz-image-button quiz-profile-start-button" type="button" onClick={handleSubmit} disabled={submitting} aria-label="开始答题">
            <img src={quizAssets.profile.buttonStart} alt="" aria-hidden="true" />
            <span className="quiz-image-button-text">{submitting ? '提交中...' : '开始答题'}</span>
          </button>

          <button className="quiz-image-button quiz-profile-home-button" type="button" onClick={onBack} aria-label="返回首页">
            <img src={quizAssets.common.buttonHome} alt="" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  )
}
