import { useEffect, useRef, useState } from 'react'
import './styles.css'

const ASSETS_BASE_URL = 'https://assets.zice8.com/safe_driver_quiz_lottery/pingan_good_driver_2026'

export default function PinganGoodDriverProject() {
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef(null)

  useEffect(() => {
    document.title = '“平安好司机”零违法挑战赛'
    return () => window.clearTimeout(toastTimer.current)
  }, [])

  function showComingSoonToast() {
    window.clearTimeout(toastTimer.current)
    setToastVisible(true)
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 1800)
  }

  return (
    <main className="pgd-page">
      <div className="pgd-home-canvas">
        <img
          className="pgd-home-background"
          src={`${ASSETS_BASE_URL}/home-background.png`}
          alt=""
        />
        <button
          className="pgd-start-button"
          type="button"
          aria-label="开始答题"
          onClick={showComingSoonToast}
        />
        {toastVisible ? <div className="pgd-toast" role="status">敬请期待</div> : null}
      </div>
    </main>
  )
}
