import { useEffect } from 'react'
import './ActivityUnavailablePage.css'

export default function ActivityUnavailablePage() {
  useEffect(() => {
    document.title = '活动暂未开放'
  }, [])

  return (
    <main className="activity-unavailable-page" aria-labelledby="activity-unavailable-title">
      <section className="activity-unavailable-content">
        <p className="activity-unavailable-code" aria-hidden="true">404</p>
        <span className="activity-unavailable-line" aria-hidden="true" />
        <h1 id="activity-unavailable-title">活动暂未开放</h1>
        <p className="activity-unavailable-description">该活动已结束或暂未启用</p>
      </section>
    </main>
  )
}
