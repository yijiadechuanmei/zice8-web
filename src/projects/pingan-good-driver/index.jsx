import { useEffect, useMemo, useRef, useState } from 'react'
import { DownOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
import { API_BASE_URL, getToken } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { setDocumentTitle } from '../../shared/utils/documentTitle'
import { abandonQuiz, answerQuestion, drawPrize, getActivityConfig, getState, startQuiz, submitClaim } from './api'
import './styles.css'

const ASSETS_BASE_URL = 'https://assets.zice8.com/safe_driver_quiz_lottery/pingan_good_driver_2026'
const PLATE_TYPES = ['小型汽车号牌（蓝牌）', '大型汽车号牌（黄牌）', '小型新能源汽车号牌（绿牌）', '大型新能源汽车号牌（黄绿牌）']
const PLATE_KEYS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

export default function PinganGoodDriverProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || 'pingan_good_driver_2026'
  const [page, setPage] = useState('home')
  const [selectedOption, setSelectedOption] = useState(null)
  const [question, setQuestion] = useState(null)
  const [questionNo, setQuestionNo] = useState(1)
  const [publicConfig, setPublicConfig] = useState(null)
  const [drawFinished, setDrawFinished] = useState(false)
  const [missOpen, setMissOpen] = useState(false)
  const [claim, setClaim] = useState({ name: '', phone: '', plateType: '', plateSuffix: '' })
  const [claimError, setClaimError] = useState('')
  const [profilePicker, setProfilePicker] = useState(null)
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
  const quizInProgressRef = useRef(false)
  const { authReady, blockedMessage } = useWechatAuth(activityKey, publicConfig)
  const shareConfig = useMemo(() => publicConfig ? { ...publicConfig, shareTitle: publicConfig.title } : null, [publicConfig])
  useWechatShare(activityKey, shareConfig)

  useEffect(() => {
    return () => { window.clearTimeout(toastTimer.current); window.clearTimeout(drawTimer.current); window.clearTimeout(afterToastTimer.current) }
  }, [])

  useEffect(() => { setDocumentTitle(publicConfig?.title) }, [publicConfig?.title])

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
      if (state.won && !state.claimSubmitted) setPage('claim')
      else if (state.status === 'in_progress') { setQuestion(state.question); setQuestionNo(state.questionNo); setPage('quiz') }
    }).catch((error) => { if (active) showComingSoonToast(error.message || '活动状态加载失败') })
    return () => { active = false }
  }, [activityKey, authReady])

  useEffect(() => {
    const abandonOnExit = () => {
      if (!eligibleRef.current && !quizInProgressRef.current) return
      const token = getToken()
      if (!token) return
      fetch(`${API_BASE_URL}/safe-driver-quiz/activities/${encodeURIComponent(activityKey)}/abandon`, {
        method: 'POST', keepalive: true, headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    const reloadAfterRestore = (event) => { if (event.persisted) window.location.reload() }
    window.addEventListener('pagehide', abandonOnExit)
    window.addEventListener('pageshow', reloadAfterRestore)
    return () => { window.removeEventListener('pagehide', abandonOnExit); window.removeEventListener('pageshow', reloadAfterRestore); abandonOnExit() }
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
    if (!authReady) { showComingSoonToast(blockedMessage || '请在微信中打开活动'); return }
    setBusy(true)
    try {
      const state = await startQuiz(activityKey)
      quizInProgressRef.current = true
      setQuestion(state.question)
      setQuestionNo(state.questionNo)
      setSelectedOption(null)
      setDrawFinished(false)
      setWheelRotation(0)
      setPage('quiz')
    } catch (error) { showComingSoonToast(error.message || '开始答题失败') }
    finally { setBusy(false) }
  }

  async function leaveQuiz() {
    if (busy || toastBlocking) return
    setBusy(true)
    try {
      await abandonQuiz(activityKey)
      quizInProgressRef.current = false
      setSelectedOption(null)
      setQuestion(null)
      setPage('home')
    } catch (error) { showComingSoonToast(error.message || '退出答题失败，请重试') }
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
          quizInProgressRef.current = false
          showComingSoonToast('本轮答题结束，未能全部答对', () => {
            setSelectedOption(null)
            setQuestion(null)
            setPage('home')
          })
        }
      } else if (result.status === 'eligible') {
        quizInProgressRef.current = false
        eligibleRef.current = true
        setPage('result')
      } else if (result.status === 'failed') {
        quizInProgressRef.current = false
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
    if (busy) return
    setBusy(true)
    try {
      const result = await drawPrize(activityKey)
      eligibleRef.current = false
      setWheelRotation(360 * 5 + 360 - result.wheelIndex * 60)
      drawTimer.current = window.setTimeout(() => {
        setDrawFinished(true)
        if (result.won) showComingSoonToast(`恭喜获得${result.prizeName}`, () => setPage('claim'))
        else setMissOpen(true)
        setBusy(false)
      }, 4500)
    } catch (error) { setBusy(false); showComingSoonToast(error.message || '抽奖失败，请重试') }
  }

  async function saveClaim(event) {
    event.preventDefault()
    if (busy) return
    const normalizedClaim = {
      name: claim.name.trim(), phone: claim.phone.trim(), plateType: claim.plateType,
      plateNumber: `赣D${claim.plateSuffix}`,
    }
    if (normalizedClaim.name.length < 2) { setClaimError('请填写至少 2 个字的姓名'); return }
    if (!/^1[3-9]\d{9}$/.test(normalizedClaim.phone)) { setClaimError('请填写有效的 11 位手机号'); return }
    if (!PLATE_TYPES.includes(normalizedClaim.plateType)) { setClaimError('请选择车辆号牌种类'); return }
    const requiredLength = claim.plateType.includes('新能源') ? 6 : 5
    if (!new RegExp(`^[A-Z0-9]{${requiredLength}}$`).test(claim.plateSuffix)) { setClaimError(`请填写${requiredLength}位车牌号码`); return }
    setClaimError('')
    setBusy(true)
    try {
      await submitClaim(activityKey, normalizedClaim)
      setPage('home')
      showComingSoonToast('奖品信息登记成功')
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
        ) : page === 'claim' ? (
          <img className="pgd-background" src={`${ASSETS_BASE_URL}/claim-profile-background.png`} alt="" />
        ) : rulesBackgroundFailed ? (
          <div className="pgd-rules-pending" role="status"><strong>活动规则</strong><span>活动详情即将公布</span></div>
        ) : (
          <img className="pgd-background" src={`${ASSETS_BASE_URL}/rules-background.png`} alt="" onError={() => setRulesBackgroundFailed(true)} />
        )}
        {page === 'rules' || page === 'quiz' || page === 'claim' ? (
          <button
            className={`pgd-rules-back-button${page === 'claim' ? ' pgd-claim-back-button' : ''}`}
            type="button"
            aria-label="返回首页"
            onClick={page === 'quiz' ? leaveQuiz : () => setPage('home')}
          >{page === 'claim' ? '‹' : null}</button>
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
                <p className="pgd-question-count">第 {questionNo} 题 <span>/ 共 {question?.questionCount || 5} 题</span></p>
                <h1>{question?.text || '正在加载题目'}</h1>
              </div>
              <div className={`pgd-answer-list${question?.type === 'multiple' ? ' pgd-answer-list--multiple' : ''}`} role={question?.type === 'multiple' ? 'group' : 'radiogroup'} aria-label={question?.type === 'multiple' ? '选择答案，可多选' : '选择答案'}>
                {(question?.options || []).map((option) => (
                  <button
                    key={option.key}
                    className={`pgd-answer-option${selectedOption?.includes(option.key) ? ' is-selected' : ''}`}
                    type="button"
                    role={question?.type === 'multiple' ? 'checkbox' : 'radio'}
                    aria-checked={Boolean(selectedOption?.includes(option.key))}
                    onClick={() => setSelectedOption((current) => {
                      if (question?.type !== 'multiple') return option.key
                      const selected = new Set(current || '')
                      if (selected.has(option.key)) selected.delete(option.key)
                      else selected.add(option.key)
                      return [...selected].sort().join('')
                    })}
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
              disabled={busy || drawFinished}
            >
              <img src={`${ASSETS_BASE_URL}/lottery-center-button.png`} alt="" />
            </button>
          </>
        ) : null}
        {page === 'claim' ? (
          <form className="pgd-profile-form" onSubmit={saveClaim} noValidate>
            <input className="pgd-profile-field pgd-profile-name" aria-label="姓名" placeholder="请输入您的姓名" value={claim.name} onChange={(event) => { setClaim({ ...claim, name: event.target.value }); setClaimError('') }} maxLength={60} autoComplete="name" />
            <UserOutlined className="pgd-profile-icon pgd-profile-name-icon" aria-hidden="true" />
            <input className="pgd-profile-field pgd-profile-phone" aria-label="手机号码" placeholder="请输入手机号码" type="tel" inputMode="tel" value={claim.phone} onChange={(event) => { setClaim({ ...claim, phone: event.target.value }); setClaimError('') }} maxLength={11} autoComplete="tel" />
            <PhoneOutlined className="pgd-profile-icon pgd-profile-phone-icon" aria-hidden="true" />
            <button className={`pgd-profile-field pgd-profile-plate-type${claim.plateType ? '' : ' is-placeholder'}`} type="button" aria-label="车辆号牌种类" onClick={() => setProfilePicker('type')}>
              <span>{claim.plateType || '请选择号牌种类'}</span><DownOutlined aria-hidden="true" />
            </button>
            <button className="pgd-profile-field pgd-profile-plate-number" type="button" aria-label="车辆号码" onClick={() => setProfilePicker('number')}>
              <span className="pgd-plate-prefix">赣D·</span><span className={claim.plateSuffix ? 'pgd-plate-suffix' : 'pgd-plate-placeholder'}>{claim.plateSuffix || '请输入字母和数字'}</span>
            </button>
            {claimError ? <div className="pgd-profile-error" role="alert">{claimError}</div> : null}
            <button className="pgd-profile-submit" type="submit" disabled={busy} aria-label={busy ? '提交中' : '确认提交'} />
          </form>
        ) : null}
        {page === 'claim' && profilePicker ? <>
          <div className="pgd-profile-picker-mask" onClick={() => setProfilePicker(null)} aria-hidden="true" />
          {profilePicker === 'type' ? (
            <div className="pgd-plate-type-list" role="dialog" aria-modal="true" aria-label="选择车辆号牌种类">
              <h2>选择车辆号牌种类</h2>
              {PLATE_TYPES.map((type, index) => <button className="pgd-plate-type-option" type="button" key={type} onClick={() => {
                setClaim({ ...claim, plateType: type, plateSuffix: claim.plateSuffix.slice(0, index >= 2 ? 6 : 5) })
                setClaimError('')
                setProfilePicker(null)
              }}><span className={`pgd-plate-color pgd-plate-color-${index}`} /><span>{type}</span><span className={`pgd-plate-radio${claim.plateType === type ? ' is-selected' : ''}`} /></button>)}
              <button className="pgd-picker-cancel" type="button" onClick={() => setProfilePicker(null)}>取消</button>
            </div>
          ) : (
            <div className="pgd-plate-keyboard" role="dialog" aria-modal="true" aria-label="输入车辆号码">
              <div className="pgd-plate-keyboard-head"><strong>赣D·{claim.plateSuffix}<span className="pgd-plate-cursor">|</span></strong><button type="button" onClick={() => setProfilePicker(null)}>完成</button></div>
              {PLATE_KEYS.map((row) => <div className="pgd-plate-key-row" key={row}>
                {[...row].map((key) => <button type="button" key={key} onClick={() => {
                  const limit = claim.plateType.includes('新能源') ? 6 : 5
                  setClaim((current) => ({ ...current, plateSuffix: (current.plateSuffix + key).slice(0, limit) }))
                  setClaimError('')
                }}>{key}</button>)}
                {row === 'ZXCVBNM' ? <button className="pgd-plate-key-delete" type="button" aria-label="删除末位" onClick={() => setClaim((current) => ({ ...current, plateSuffix: current.plateSuffix.slice(0, -1) }))}>⌫</button> : null}
              </div>)}
            </div>
          )}
        </> : null}
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
