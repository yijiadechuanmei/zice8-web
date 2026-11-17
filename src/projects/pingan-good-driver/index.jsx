import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL, getToken } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { answerQuestion, drawPrize, getActivityConfig, getState, startQuiz, submitClaim } from './api'
import './styles.css'

const ASSETS_BASE_URL = 'https://assets.zice8.com/safe_driver_quiz_lottery/pingan_good_driver_2026'

export default function PinganGoodDriverProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || 'pingan_good_driver_2026'
  const [page, setPage] = useState('home')
  const [selectedOption, setSelectedOption] = useState(null)
  const [question, setQuestion] = useState(null)
  const [questionNo, setQuestionNo] = useState(1)
  const [publicConfig, setPublicConfig] = useState(null)
  const [remainingToday, setRemainingToday] = useState(3)
  const [won, setWon] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const [drawFinished, setDrawFinished] = useState(false)
  const [missOpen, setMissOpen] = useState(false)
  const [claim, setClaim] = useState({ name: '', phone: '', address: '' })
  const [claimError, setClaimError] = useState('')
  const [wheelRotation, setWheelRotation] = useState(0)
  const [busy, setBusy] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastBlocking, setToastBlocking] = useState(false)
  const [toastText, setToastText] = useState('敬请期待')
  const [rulesBackgroundFailed, setRulesBackgroundFailed] = useState(false)
  const [rulesButtonFailed, setRulesButtonFailed] = useState(false)
  const toastTimer = useRef(null)
  const drawTimer = useRef(null)
  const afterToastTimer = useRef(null)
  const eligibleRef = useRef(false)
  const { authReady, blockedMessage } = useWechatAuth(activityKey, publicConfig)

  useEffect(() => {
    document.title = '“平安好司机”零违法挑战赛'
    return () => { window.clearTimeout(toastTimer.current); window.clearTimeout(drawTimer.current); window.clearTimeout(afterToastTimer.current) }
  }, [])

  useEffect(() => {
    let active = true
    getActivityConfig(activityKey).then((config) => { if (active) setPublicConfig(config) }).catch(() => {})
    return () => { active = false }
  }, [activityKey])

  useEffect(() => {
    if (!authReady) return undefined
    let active = true
    getState(activityKey).then((state) => {
      if (!active) return
      setRemainingToday(state.remainingToday)
      setWon(state.won)
      if (state.won && !state.claimSubmitted) { setPage('result'); setClaimOpen(true) }
      else if (state.status === 'in_progress') { setQuestion(state.question); setQuestionNo(state.questionNo); setPage('quiz') }
    }).catch((error) => { if (active) showComingSoonToast(error.message || '活动状态加载失败') })
    return () => { active = false }
  }, [activityKey, authReady])

  useEffect(() => {
    const abandonOnExit = () => {
      if (!eligibleRef.current) return
      const token = getToken()
      if (!token) return
      fetch(`${API_BASE_URL}/safe-driver-quiz/activities/${encodeURIComponent(activityKey)}/abandon`, {
        method: 'POST', keepalive: true, headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    window.addEventListener('pagehide', abandonOnExit)
    return () => { window.removeEventListener('pagehide', abandonOnExit); abandonOnExit() }
  }, [activityKey])

  function showComingSoonToast(message = '敬请期待', onHidden) {
    window.clearTimeout(toastTimer.current)
    window.clearTimeout(afterToastTimer.current)
    setToastText(message)
    setToastVisible(true)
    setToastBlocking(true)
    toastTimer.current = window.setTimeout(() => {
      setToastVisible(false)
      if (onHidden) {
        afterToastTimer.current = window.setTimeout(() => {
          onHidden()
          setToastBlocking(false)
        }, 20)
      } else setToastBlocking(false)
    }, 1800)
  }

  async function beginQuiz() {
    if (busy) return
    if (won) { showComingSoonToast('您已中奖，不能再次答题'); return }
    if (!authReady) { showComingSoonToast(blockedMessage || '请在微信中打开活动'); return }
    setBusy(true)
    try {
      const state = await startQuiz(activityKey)
      setQuestion(state.question)
      setQuestionNo(state.questionNo)
      setRemainingToday(state.remainingToday)
      setSelectedOption(null)
      setDrawFinished(false)
      setWheelRotation(0)
      setPage('quiz')
    } catch (error) { showComingSoonToast(error.message || '开始答题失败') }
    finally { setBusy(false) }
  }

  async function submitAnswer() {
    if (busy) return
    if (!selectedOption) { showComingSoonToast('请先选择答案'); return }
    setBusy(true)
    try {
      const result = await answerQuestion(activityKey, question.id, selectedOption)
      if (!result.correct) {
        if (result.status === 'in_progress') {
          showComingSoonToast('回答错误，进入下一题', () => {
            setQuestion(result.question)
            setQuestionNo(result.questionNo)
            setSelectedOption(null)
          })
        } else {
          showComingSoonToast(result.wrongCount >= 3 ? '累计答错3次，答题结束' : '本轮答题结束，未能全部答对', () => {
            setSelectedOption(null)
            setQuestion(null)
            setPage('home')
          })
        }
      } else if (result.status === 'eligible') {
        eligibleRef.current = true
        setPage('result')
      } else if (result.status === 'failed') {
        showComingSoonToast('本轮答题结束，未能全部答对', () => {
          setSelectedOption(null)
          setQuestion(null)
          setPage('home')
        })
      } else {
        setQuestion(result.question)
        setQuestionNo(result.questionNo)
        setSelectedOption(null)
      }
    } catch (error) { showComingSoonToast(error.message || '提交失败，请重试') }
    finally { setBusy(false) }
  }

  async function draw() {
    if (busy || won) return
    setBusy(true)
    try {
      const result = await drawPrize(activityKey)
      eligibleRef.current = false
      setWheelRotation(360 * 5 + 360 - result.wheelIndex * 60)
      drawTimer.current = window.setTimeout(() => {
        setDrawFinished(true)
        setWon(result.won)
        if (result.won) setClaimOpen(true)
        else setMissOpen(true)
        setBusy(false)
      }, 4500)
    } catch (error) { setBusy(false); showComingSoonToast(error.message || '抽奖失败，请重试') }
  }

  async function saveClaim(event) {
    event.preventDefault()
    if (busy) return
    const normalizedClaim = {
      name: claim.name.trim(), phone: claim.phone.trim(), address: claim.address.trim(),
    }
    if (normalizedClaim.name.length < 2) { setClaimError('请填写至少 2 个字的姓名'); return }
    if (!/^1[3-9]\d{9}$/.test(normalizedClaim.phone)) { setClaimError('请填写有效的 11 位手机号'); return }
    if (normalizedClaim.address.length < 6) { setClaimError('请填写完整的收货地址'); return }
    setClaimError('')
    setBusy(true)
    try {
      await submitClaim(activityKey, normalizedClaim)
      setClaimOpen(false)
      setPage('home')
      showComingSoonToast('邮寄信息提交成功')
    } catch (error) { setClaimError(error.message || '提交失败，请重试') }
    finally { setBusy(false) }
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
            onClick={beginQuiz}
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
                <p className="pgd-question-count">第 {questionNo} 题 <span>/ 共 5 题</span></p>
                <h1>{question?.text || '正在加载题目'}</h1>
              </div>
              <div className="pgd-answer-list" role="radiogroup" aria-label="选择答案">
                {(question?.options || []).map((option) => (
                  <button
                    key={option.key}
                    className={`pgd-answer-option${selectedOption === option.key ? ' is-selected' : ''}`}
                    type="button"
                    role="radio"
                    aria-checked={selectedOption === option.key}
                    onClick={() => setSelectedOption(option.key)}
                  >
                    <span className="pgd-answer-letter">{option.key}</span>
                    <span className="pgd-answer-text">{option.text}</span>
                    <span className="pgd-answer-radio" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>
            <button
              className="pgd-submit-button"
              type="button"
              aria-label="提交答案"
              onClick={submitAnswer}
            />
          </>
        ) : null}
        {page === 'result' ? (
          <>
            <img
              className="pgd-lottery-wheel"
              src={`${ASSETS_BASE_URL}/lottery-wheel.png`}
              alt="抽奖转盘"
              style={{ transform: `rotate(${wheelRotation}deg)` }}
            />
            <button
              className="pgd-lottery-center-button"
              type="button"
              aria-label="立即抽奖"
              onClick={draw}
              disabled={busy || won || drawFinished}
            >
              <img src={`${ASSETS_BASE_URL}/lottery-center-button.png`} alt="" />
            </button>
          </>
        ) : null}
        {page === 'home' && authReady ? <p className="pgd-attempt-count">今日剩余答题次数：{remainingToday}</p> : null}
        {claimOpen ? (
          <div className="pgd-claim-mask">
            <form className="pgd-claim-card" onSubmit={saveClaim} noValidate>
              <h2>恭喜中奖</h2>
              <p>请填写油卡邮寄信息</p>
              <label>姓名<input value={claim.name} onChange={(event) => { setClaim({ ...claim, name: event.target.value }); setClaimError('') }} maxLength={60} autoComplete="name" /></label>
              <label>电话<input value={claim.phone} onChange={(event) => { setClaim({ ...claim, phone: event.target.value }); setClaimError('') }} inputMode="tel" type="tel" maxLength={11} autoComplete="tel" /></label>
              <label>收货地址<textarea value={claim.address} onChange={(event) => { setClaim({ ...claim, address: event.target.value }); setClaimError('') }} maxLength={500} autoComplete="street-address" /></label>
              {claimError ? <div className="pgd-claim-error" role="alert">{claimError}</div> : null}
              <button type="submit" disabled={busy}>{busy ? '提交中…' : '提交邮寄信息'}</button>
            </form>
          </div>
        ) : null}
        {missOpen ? (
          <div className="pgd-claim-mask">
            <div className="pgd-claim-card pgd-miss-card" role="dialog" aria-modal="true" aria-label="抽奖结果">
              <h2>感谢参与</h2>
              <p>本次未中奖，欢迎再次挑战</p>
              <button type="button" onClick={() => { setMissOpen(false); setPage('home') }}>返回首页</button>
            </div>
          </div>
        ) : null}
        {toastBlocking ? <div className="pgd-toast-mask" aria-hidden="true" /> : null}
        {toastVisible ? <div className="pgd-toast" role="status">{toastText}</div> : null}
      </div>
    </main>
  )
}
