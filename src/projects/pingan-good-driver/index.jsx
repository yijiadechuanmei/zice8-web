import { useEffect, useRef, useState } from 'react'
import './styles.css'

const ASSETS_BASE_URL = 'https://assets.zice8.com/safe_driver_quiz_lottery/pingan_good_driver_2026'

export default function PinganGoodDriverProject() {
  const [page, setPage] = useState('home')
  const [selectedOption, setSelectedOption] = useState(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastText, setToastText] = useState('敬请期待')
  const [rulesBackgroundFailed, setRulesBackgroundFailed] = useState(false)
  const [rulesButtonFailed, setRulesButtonFailed] = useState(false)
  const toastTimer = useRef(null)

  useEffect(() => {
    document.title = '“平安好司机”零违法挑战赛'
    return () => window.clearTimeout(toastTimer.current)
  }, [])

  function showComingSoonToast(message = '敬请期待') {
    window.clearTimeout(toastTimer.current)
    setToastText(message)
    setToastVisible(true)
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 1800)
  }

  return (
    <main className="pgd-page">
      <div className="pgd-canvas">
        {page === 'home' ? (
          <img className="pgd-background" src={`${ASSETS_BASE_URL}/home-background.png`} alt="" />
        ) : page === 'quiz' ? (
          <img className="pgd-background" src={`${ASSETS_BASE_URL}/quiz-background.png`} alt="" />
        ) : page === 'result' ? (
          <img className="pgd-background" src={`${ASSETS_BASE_URL}/result-wheel-background.png`} alt="" />
        ) : rulesBackgroundFailed ? (
          <div className="pgd-rules-pending" role="status"><strong>活动规则</strong><span>活动详情即将公布</span></div>
        ) : (
          <img className="pgd-background" src={`${ASSETS_BASE_URL}/rules-background.png`} alt="" onError={() => setRulesBackgroundFailed(true)} />
        )}
        {page === 'rules' || page === 'quiz' ? (
          <button
            className="pgd-rules-back-button"
            type="button"
            aria-label="返回首页"
            onClick={() => { setToastVisible(false); setPage(page === 'quiz' ? 'rules' : 'home') }}
          />
        ) : null}
        {page === 'home' ? (
          <button
            className="pgd-start-button"
            type="button"
            aria-label="查看游戏规则"
            onClick={() => setPage('rules')}
          />
        ) : page === 'rules' ? (
          <button
            className={`pgd-rules-start-button${rulesButtonFailed ? ' pgd-rules-start-button--fallback' : ''}`}
            type="button"
            aria-label="我已了解，开始游戏"
            onClick={() => { setSelectedOption(null); setPage('quiz') }}
          >
            {rulesButtonFailed ? <span>我已了解，开始游戏</span> : (
              <img src={`${ASSETS_BASE_URL}/rules-start-button.png`} alt="" onError={() => setRulesButtonFailed(true)} />
            )}
          </button>
        ) : null}
        {page === 'quiz' ? (
          <>
            <section className="pgd-question-panel" aria-label="答题区">
              <div className="pgd-question-copy">
                <p className="pgd-question-count">第 1 题 <span>/ 共 5 题</span></p>
                <h1>题目内容待配置</h1>
              </div>
              <div className="pgd-answer-list" role="radiogroup" aria-label="选择答案">
                {['A', 'B', 'C', 'D'].map((option) => (
                  <button
                    key={option}
                    className={`pgd-answer-option${selectedOption === option ? ' is-selected' : ''}`}
                    type="button"
                    role="radio"
                    aria-checked={selectedOption === option}
                    onClick={() => setSelectedOption(option)}
                  >
                    <span className="pgd-answer-letter">{option}</span>
                    <span className="pgd-answer-text">选项内容待配置</span>
                    <span className="pgd-answer-radio" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
            <button
              className="pgd-submit-button"
              type="button"
              aria-label="提交答案"
              onClick={() => {
                if (selectedOption) setPage('result')
                else showComingSoonToast('请先选择答案')
              }}
            />
          </>
        ) : null}
        {page === 'result' ? (
          <>
            <img
              className="pgd-lottery-wheel"
              src={`${ASSETS_BASE_URL}/lottery-wheel.png`}
              alt="抽奖转盘"
            />
            <button
              className="pgd-lottery-center-button"
              type="button"
              aria-label="立即抽奖"
              onClick={() => showComingSoonToast('抽奖功能即将开放')}
            >
              <img src={`${ASSETS_BASE_URL}/lottery-center-button.png`} alt="" />
            </button>
          </>
        ) : null}
        {toastVisible ? <div className="pgd-toast" role="status">{toastText}</div> : null}
      </div>
    </main>
  )
}
