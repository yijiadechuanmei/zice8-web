import { useEffect, useMemo, useRef, useState } from 'react'
import { CloseOutlined, LoadingOutlined } from '@ant-design/icons'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import {
  getLongwenBeerQuizPublicConfig,
  getLongwenBeerQuizState,
  redeemLongwenBeerPrize,
  startLongwenBeerQuiz,
  submitLongwenBeerAnswer,
} from './api'
import {
  assetUrl,
  LONGWEN_BEER_QUIZ_ACTIVITY_KEY,
  LONGWEN_BEER_QUIZ_ACTIVITY_TYPE,
  mergeConfig,
} from './config'
import './styles.css'

export default function LongwenBeerQuizProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || LONGWEN_BEER_QUIZ_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [state, setState] = useState(null)
  const [selectedOption, setSelectedOption] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const inputRef = useRef(null)
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig])

  useWechatShare(activityKey, publicConfig)
  const { authReady, blockedMessage } = useWechatAuth(activityKey, publicConfig)

  useEffect(() => {
    let alive = true
    getLongwenBeerQuizPublicConfig(activityKey).then((data) => {
      if (alive) setPublicConfig(data)
    }).catch(() => {})
    return () => { alive = false }
  }, [activityKey])

  useEffect(() => {
    if (!authReady) return undefined
    let alive = true
    setLoading(true)
    setError('')
    getLongwenBeerQuizState(activityKey).then((data) => {
      if (alive) setState(data)
    }).catch((requestError) => {
      if (alive) setError(requestError.message || '活动状态加载失败，请刷新页面重试')
    }).finally(() => {
      if (alive) setLoading(false)
    })
    return () => { alive = false }
  }, [activityKey, authReady])

  useEffect(() => {
    if (!blockedMessage) return
    setLoading(false)
    setError(blockedMessage)
  }, [blockedMessage])

  useEffect(() => {
    document.title = publicConfig?.title || '龙文请你喝啤酒'
  }, [publicConfig])

  useEffect(() => {
    setSelectedOption('')
  }, [state?.currentQuestion?.no])

  useEffect(() => {
    if (!redeemOpen) return undefined
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [redeemOpen])

  async function start() {
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      setState(await startLongwenBeerQuiz(activityKey))
    } catch (requestError) {
      setError(requestError.message || '开始失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitAnswer() {
    if (!selectedOption || !state?.currentQuestion || submitting) return
    setSubmitting(true)
    setError('')
    try {
      setState(await submitLongwenBeerAnswer(activityKey, {
        questionNo: Number(state.currentQuestion.no),
        selectedOption,
      }))
    } catch (requestError) {
      setError(requestError.message || '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function redeem(event) {
    event.preventDefault()
    if (!verificationCode.trim() || submitting) return
    setSubmitting(true)
    setError('')
    try {
      setState(await redeemLongwenBeerPrize(activityKey, verificationCode.trim()))
      setRedeemOpen(false)
      setVerificationCode('')
    } catch (requestError) {
      setError(requestError.message || '核销失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const backgroundImage = assetUrl(config.assetsBaseUrl, config.backgroundImage)
  const page = state?.phase || 'home'
  return (
    <main className="lw-app" aria-label="龙文请你喝啤酒互动答题">
      <section className={`lw-page lw-page--${page}`} style={{ backgroundImage: `url("${backgroundImage}")` }}>
        <div className="lw-shade" />
        {loading ? <LoadingState /> : null}
        {!loading && error && !state ? <ErrorState error={error} /> : null}
        {!loading && state?.phase === 'home' ? <HomePage config={config} onStart={start} loading={submitting} /> : null}
        {!loading && state?.phase === 'quiz' ? (
          <QuizPage config={config} state={state} selectedOption={selectedOption} onSelect={setSelectedOption} onSubmit={submitAnswer} loading={submitting} />
        ) : null}
        {!loading && state?.phase === 'result' ? (
          <ResultPage config={config} state={state} onRedeem={() => setRedeemOpen(true)} />
        ) : null}
        {error && state ? <p className="lw-inline-error" role="alert">{error}</p> : null}
        {redeemOpen ? (
          <RedeemDialog
            code={verificationCode}
            onCodeChange={setVerificationCode}
            onClose={() => setRedeemOpen(false)}
            onSubmit={redeem}
            submitting={submitting}
            inputRef={inputRef}
          />
        ) : null}
      </section>
    </main>
  )
}

function HomePage({ config, onStart, loading }) {
  return (
    <div className="lw-home">
      <ImageAsset className="lw-home-banner" src={assetUrl(config.assetsBaseUrl, config.homeBannerImage)} alt="百威黑金" />
      <ImageAsset className="lw-home-title" src={assetUrl(config.assetsBaseUrl, config.homeTitleImage)} alt="龙文请你喝啤酒" />
      <button className="lw-image-start" type="button" onClick={onStart} disabled={loading}>
        <span className="lw-image-start__glint" aria-hidden="true" />
        <span className="lw-image-start__title">开始测试</span>
        <span className="lw-image-start__meta">答对 3 题，赢百威黑金</span>
        <span className="lw-image-start__arrow" aria-hidden="true">›</span>
      </button>
      <ImageAsset className="lw-home-footer" src={assetUrl(config.assetsBaseUrl, config.homeFooterImage)} alt="百威黑金啤酒消费季" />
    </div>
  )
}

function QuizPage({ config, state, selectedOption, onSelect, onSubmit, loading }) {
  const question = state.currentQuestion
  return (
    <div className="lw-content lw-quiz-content">
      <ImageAsset className="lw-quiz-logo" src={assetUrl(config.assetsBaseUrl, config.homeBannerImage)} alt="百威黑金" />
      <div className="lw-progress" aria-label={`第 ${question.no} 题，共 ${state.totalQuestions} 题`}>
        <span>QUESTION {String(question.no).padStart(2, '0')}</span>
        <strong>{question.no} / {state.totalQuestions}</strong>
      </div>
      <div className="lw-question-rule" aria-hidden="true"><i /></div>
      <h1 className="lw-question-title">{question.title}</h1>
      <div className="lw-options" role="radiogroup" aria-label={question.title}>
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`lw-option ${selectedOption === option.id ? 'is-selected' : ''}`}
            onClick={() => onSelect(option.id)}
            role="radio"
            aria-checked={selectedOption === option.id}
          >
            <b>{option.id}</b><span>{option.text}</span>
          </button>
        ))}
      </div>
      <button className="lw-action-button" type="button" disabled={!selectedOption || loading} onClick={onSubmit}>
        {loading ? <LoadingOutlined /> : '确认答案'}
      </button>
      <p className="lw-tip">提交后不可修改，请确认后继续</p>
    </div>
  )
}

function ResultPage({ config, state, onRedeem }) {
  const result = state.result || {}
  const prizeImage = assetUrl(config.assetsBaseUrl, config.prizeImage)
  if (!result.won) {
    return (
      <div className="lw-content lw-result lw-result--lose">
        <p className="lw-eyebrow">测试结果</p>
        <h1>答对 <em>{state.correctCount}</em> / {state.totalQuestions} 题</h1>
        <div className="lw-result-line" />
        <h2>很遗憾未中奖</h2>
        <p>感谢参与百威黑金啤酒消费季</p>
      </div>
    )
  }
  return (
    <div className="lw-content lw-result lw-result--win">
      <p className="lw-eyebrow">测试结果</p>
      <h1>恭喜全部答对</h1>
      <p className="lw-win-subtitle">恭喜全部答对，获得：</p>
      <div className="lw-prize-image-wrap"><ImageAsset src={prizeImage} alt="百威 BUDWEISER 一组（3瓶）" /></div>
      <h2>百威 BUDWEISER 一组（3瓶）</h2>
      {result.redeemed ? (
        <div className="lw-redeemed">奖品已核销</div>
      ) : (
        <button className="lw-action-button" type="button" onClick={onRedeem}>核销奖品</button>
      )}
    </div>
  )
}

function RedeemDialog({ code, onCodeChange, onClose, onSubmit, submitting, inputRef }) {
  return (
    <div className="lw-dialog-backdrop" role="presentation">
      <form className="lw-dialog" onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="redeem-title">
        <button className="lw-dialog-close" type="button" onClick={onClose} aria-label="关闭核销窗口"><CloseOutlined /></button>
        <p className="lw-eyebrow">PRIZE REDEMPTION</p>
        <h2 id="redeem-title">核销奖品</h2>
        <label htmlFor="longwen-verification-code">请输入工作人员提供的核销码</label>
        <input id="longwen-verification-code" ref={inputRef} value={code} onChange={(event) => onCodeChange(event.target.value)} autoComplete="off" />
        <button className="lw-action-button" type="submit" disabled={!code.trim() || submitting}>{submitting ? <LoadingOutlined /> : '确认核销'}</button>
      </form>
    </div>
  )
}

function ImageAsset({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />
}

function LoadingState() {
  return <div className="lw-center-state"><LoadingOutlined /><span>加载活动中...</span></div>
}

function ErrorState({ error }) {
  return <div className="lw-center-state lw-center-state--error"><strong>暂时无法进入活动</strong><span>{error}</span></div>
}

export { LONGWEN_BEER_QUIZ_ACTIVITY_TYPE }
