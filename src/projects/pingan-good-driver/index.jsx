import { useEffect, useRef, useState } from 'react'
import './styles.css'

const ASSETS_BASE_URL = 'https://assets.zice8.com/safe_driver_quiz_lottery/pingan_good_driver_2026'

export default function PinganGoodDriverProject() {
  const [page, setPage] = useState('home')
  const [toastVisible, setToastVisible] = useState(false)
  const [rulesBackgroundFailed, setRulesBackgroundFailed] = useState(false)
  const [rulesButtonFailed, setRulesButtonFailed] = useState(false)
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
      <div className="pgd-canvas">
        {page === 'home' ? (
          <img className="pgd-background" src={`${ASSETS_BASE_URL}/home-background.png`} alt="" />
        ) : rulesBackgroundFailed ? (
          <div className="pgd-rules-pending" role="status"><strong>活动规则</strong><span>活动详情即将公布</span></div>
        ) : (
          <img className="pgd-background" src={`${ASSETS_BASE_URL}/rules-background.png`} alt="" onError={() => setRulesBackgroundFailed(true)} />
        )}
        {page === 'rules' ? (
          <button
            className="pgd-rules-back-button"
            type="button"
            aria-label="返回首页"
            onClick={() => { setToastVisible(false); setPage('home') }}
          />
        ) : null}
        {page === 'home' ? (
          <button
            className="pgd-start-button"
            type="button"
            aria-label="查看游戏规则"
            onClick={() => setPage('rules')}
          />
        ) : (
          <button
            className={`pgd-rules-start-button${rulesButtonFailed ? ' pgd-rules-start-button--fallback' : ''}`}
            type="button"
            aria-label="我已了解，开始游戏"
            onClick={showComingSoonToast}
          >
            {rulesButtonFailed ? <span>我已了解，开始游戏</span> : (
              <img src={`${ASSETS_BASE_URL}/rules-start-button.png`} alt="" onError={() => setRulesButtonFailed(true)} />
            )}
          </button>
        )}
        {toastVisible ? <div className="pgd-toast" role="status">敬请期待</div> : null}
      </div>
    </main>
  )
}
