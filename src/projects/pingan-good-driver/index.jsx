import { useEffect } from 'react'
import './styles.css'

const ASSETS_BASE_URL = 'https://assets.zice8.com/safe_driver_quiz_lottery/pingan_good_driver_2026'

export default function PinganGoodDriverProject() {
  useEffect(() => {
    document.title = '“平安好司机”零违法挑战赛'
  }, [])

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
          aria-label="开始答题，活动页面正在筹备中"
          disabled
        />
      </div>
    </main>
  )
}
