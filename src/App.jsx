import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="rounded-2xl bg-white/10 px-8 py-6 text-center">
        <h1 className="text-4xl font-bold text-amber-300">Zice8 Web</h1>
        <p className="mt-4 text-lg text-slate-200">Tailwind CSS 已生效</p>
      </div>
    </div>
  )
}

export default App
