import { useEffect, useRef } from 'react'
import { VIDEO_RANK_SPLASH_AUTO_ENTER_MS, VIDEO_RANK_SPLASH_IMAGE_URL } from '../config'

export default function SplashPage({ onEnter }) {
  const enteredRef = useRef(false)

  function enter() {
    if (enteredRef.current) return
    enteredRef.current = true
    onEnter()
  }

  useEffect(() => {
    const timer = window.setTimeout(enter, VIDEO_RANK_SPLASH_AUTO_ENTER_MS)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <button
      type="button"
      onClick={enter}
      className="fixed inset-0 z-30 flex h-screen w-screen items-center justify-center bg-[#f6b62a] p-0"
      aria-label="进入活动"
    >
      <img
        src={VIDEO_RANK_SPLASH_IMAGE_URL}
        alt=""
        className="max-h-[86vh] max-w-[86vw] object-contain"
        draggable="false"
      />
    </button>
  )
}
