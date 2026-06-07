import { useEffect, useRef, useState } from 'react'

export default function Countdown({ seconds, active, onTimeout, className = '', numberClassName = '', labelClassName = '' }) {
  const [remaining, setRemaining] = useState(Math.max(Number(seconds || 0), 0))
  const timeoutFiredRef = useRef(false)

  useEffect(() => {
    setRemaining(Math.max(Number(seconds || 0), 0))
    timeoutFiredRef.current = false
  }, [seconds])

  useEffect(() => {
    if (!active || remaining <= 0) return
    const timer = window.setTimeout(() => setRemaining((value) => Math.max(value - 1, 0)), 1000)
    return () => window.clearTimeout(timer)
  }, [active, remaining])

  useEffect(() => {
    if (!active || remaining !== 0 || timeoutFiredRef.current) return
    timeoutFiredRef.current = true
    onTimeout?.()
  }, [active, remaining, onTimeout])

  return (
    <div
      className={`inline-flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#177245] text-white transition-colors ${
        remaining <= 3 ? 'bg-[#b42318]' : ''
      } ${className}`}
    >
      <span className={`text-[26px] font-black leading-none ${numberClassName}`}>{remaining}</span>
      <small className={`ml-0.5 text-xs ${labelClassName}`}>秒</small>
    </div>
  )
}
