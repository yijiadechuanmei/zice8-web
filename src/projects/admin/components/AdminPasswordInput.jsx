import { useState } from 'react'

export default function AdminPasswordInput({ value, onChange, placeholder, autoComplete, required = false }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="admin-password-field">
      <input
        value={value}
        onChange={onChange}
        type={visible ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />
      <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? '隐藏密码' : '显示密码'}>
        {visible ? '隐藏' : '显示'}
      </button>
    </div>
  )
}
