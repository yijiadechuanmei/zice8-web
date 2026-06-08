import { useEffect, useRef, useState } from 'react'

export default function Countdown({ seconds, active, paused = false, onTimeout, className = '', numberClassName = '', labelClassName = '' }) {
  const [remaining, setRemaining] = useState(Math.max(Number(seconds || 0), 0))
  const timeoutFiredRef = useRef(false)

  useEffect(() => {
    setRemaining(Math.max(Number(seconds || 0), 0))
    timeoutFiredRef.current = false
  }, [seconds])

  useEffect(() => {
    if (!active || paused || remaining <= 0) return
    const timer = window.setTimeout(() => setRemaining((value) => Math.max(value - 1, 0)), 1000)
    return () => window.clearTimeout(timer)
  }, [active, paused, remaining])

  useEffect(() => {
    if (!active || paused || remaining !== 0 || timeoutFiredRef.current) return
    timeoutFiredRef.current = true
    onTimeout?.()
  }, [active, paused, remaining, onTimeout])

  return (
    <div
      className={`inline-flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#177245] text-[#177245] transition-colors ${
        remaining <= 3 ? 'bg-[#b42318]' : ''
      } ${className}`}
    >
      <span className={`text-[26px] font-black leading-none ${numberClassName}`}>{remaining}</span>
      <small className={`ml-0.5 text-xs ${labelClassName}`}>秒</small>
    </div>
  )
}
