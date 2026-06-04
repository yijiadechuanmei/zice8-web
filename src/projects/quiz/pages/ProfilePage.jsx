import { useState } from 'react'
import QuizButton from '../components/QuizButton'

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
    <main className="quiz-page">
      <section className="quiz-panel">
        <h2>实名认证</h2>
        <label className="quiz-field">
          <span>姓名</span>
          <input value={name} maxLength={100} placeholder="请输入姓名" onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="quiz-field">
          <span>部门</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="">请选择部门</option>
            {departments.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>
        {error ? <div className="quiz-error">{error}</div> : null}
        <QuizButton disabled={submitting} onClick={handleSubmit}>{submitting ? '提交中...' : '开始答题'}</QuizButton>
        <QuizButton variant="secondary" onClick={onBack}>返回首页</QuizButton>
      </section>
    </main>
  )
}
