import { useEffect, useRef, useState } from 'react'

export default function Countdown({ seconds, active, onTimeout }) {
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
    <div className={`quiz-countdown ${remaining <= 3 ? 'is-danger' : ''}`}>
      <span>{remaining}</span>
      <small>秒</small>
    </div>
  )
}
