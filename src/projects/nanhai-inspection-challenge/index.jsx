import { useEffect, useMemo, useState } from 'react'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import {
  createAuthorization,
  drawPrize,
  getBootstrap,
  previewAnswer,
  submitAnswer,
  syncAuthorization,
  syncPayout,
} from './api'
import {
  NANHAI_ART,
  NANHAI_INSPECTION_CHALLENGE_TITLE,
  nanhaiAsset,
} from './config'
import './styles.css'

const FALLBACK_SEGMENTS = [
  { label: '5元', amount: 500 },
  { label: '10元', amount: 1000 },
  { label: '20元', amount: 2000 },
  { label: '50元', amount: 5000 },
  { label: '未中奖', amount: 0 },
  { label: '5元', amount: 500 },
  { label: '10元', amount: 1000 },
  { label: '20元', amount: 2000 },
]

export default function NanhaiInspectionChallenge({ routeParams }) {
  const activityKey = routeParams?.activityKey || ''
  const [bootstrap, setBootstrap] = useState(null)
  const [page, setPage] = useState('home')
  const [activeLevel, setActiveLevel] = useState(null)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(null)
  const [selectedOption, setSelectedOption] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [wheelRotation, setWheelRotation] = useState(0)
  const [wheelSpinning, setWheelSpinning] = useState(false)

  const shareActivity = useMemo(() => ({
    title: bootstrap?.activity?.shareTitle || NANHAI_INSPECTION_CHALLENGE_TITLE,
    shareTitle: bootstrap?.activity?.shareTitle || NANHAI_INSPECTION_CHALLENGE_TITLE,
    shareDesc: bootstrap?.activity?.shareDesc || '巡检幸福南海，学习工伤预防知识',
    shareImage: bootstrap?.activity?.shareImage || bootstrap?.config?.shareImage,
  }), [bootstrap])
  useWechatShare(activityKey, shareActivity)

  useEffect(() => {
    let alive = true
    getBootstrap(activityKey)
      .then((data) => {
        if (!alive) return
        setBootstrap(data)
        if (data.draw) setPage('share')
      })
      .catch((err) => alive && setError(readError(err, '活动加载失败')))
    trackPageView(activityKey, '/nanhai-inspection-challenge', {
      activityType: 'nanhai_inspection_challenge',
    })
    return () => { alive = false }
  }, [activityKey])

  const progress = bootstrap?.progress
  const preview = Boolean(bootstrap?.preview)
  const correctCodes = new Set(progress?.correctQuestionCodes || [])
  const allCompleted = (progress?.completedLevels || 0) >= 5
  const segments = bootstrap?.config?.wheelSegments || FALLBACK_SEGMENTS

  function openScene(level) {
    if (!isLevelAvailable(level, progress)) {
      setError('请先完成上一关')
      return
    }
    setActiveLevel(level)
    setPage('scene')
    trackEvent(activityKey, 'level_open', { levelNo: level.levelNo })
  }

  function openQuestion(index) {
    if (!activeLevel) return
    setActiveQuestionIndex(index)
    setSelectedOption('')
    setFeedback(null)
    setError('')
    trackEvent(activityKey, 'question_open', {
      levelNo: activeLevel.levelNo,
      questionCode: activeLevel.questions[index]?.code,
    })
  }

  async function handleAnswer() {
    const question = activeLevel?.questions?.[activeQuestionIndex]
    if (!question || !selectedOption || busy) return
    setBusy('answer')
    try {
      const payload = {
        questionCode: question.code,
        selectedOption,
        requestId: createRequestId('answer'),
      }
      const result = preview
        ? await previewAnswer(activityKey, activeLevel.levelNo, payload)
        : await submitAnswer(activityKey, activeLevel.levelNo, payload)
      const nextPreviewProgress = preview
        ? buildPreviewProgress(bootstrap, result.correct ? question.code : null, !result.correct)
        : null
      setBootstrap((current) => ({
        ...current,
        progress: {
          ...current.progress,
          ...(nextPreviewProgress || result.progress),
          correctQuestionCodes: preview
            ? nextPreviewProgress.correctQuestionCodes
            : result.correct
              ? Array.from(new Set([...(current.progress.correctQuestionCodes || []), question.code]))
              : current.progress.correctQuestionCodes,
        },
      }))
      const nextProgress = nextPreviewProgress || result.progress
      setFeedback({
        correct: result.correct,
        explanation: result.explanation,
        completedAll: (nextProgress?.completedLevels || 0) >= 5,
      })
      trackEvent(activityKey, 'question_answer', {
        levelNo: activeLevel.levelNo,
        questionCode: question.code,
        correct: result.correct,
      })
    } catch (err) {
      setError(readError(err, '提交答案失败'))
    } finally {
      setBusy('')
    }
  }

  function closeFeedback() {
    const finishedAll = feedback?.correct && feedback?.completedAll
    setFeedback(null)
    setSelectedOption('')
    setActiveQuestionIndex(null)
    if (finishedAll) {
      setActiveLevel(null)
      setPage('success')
    }
  }

  async function handleAuthorization() {
    if (busy) return
    setBusy('authorization')
    setError('')
    try {
      let authorization = await createAuthorization(activityKey)
      setBootstrap((current) => ({ ...current, authorization }))
      if (!authorization.effective) {
        if (!authorization.packageInfo) throw new Error('微信未返回授权参数')
        await invokeMerchantTransferAuthorization(authorization)
        await wait(900)
        authorization = await syncAuthorization(activityKey)
        setBootstrap((current) => ({ ...current, authorization }))
      }
      if (!authorization.effective) throw new Error(`授权状态：${authorization.state}`)
    } catch (err) {
      setError(readError(err, '微信零钱转账授权失败'))
    } finally {
      setBusy('')
    }
  }

  async function handleDraw() {
    if (busy || wheelSpinning) return
    if (preview) {
      setBootstrap((current) => ({
        ...current,
        draw: { preview: true, won: false, message: 'PC 预览不参与抽奖，不会创建红包或发放记录。' },
      }))
      setPage('share')
      return
    }
    if (!bootstrap?.authorization?.effective) {
      await handleAuthorization()
      return
    }
    setBusy('draw')
    setWheelSpinning(true)
    setError('')
    try {
      const result = await drawPrize(activityKey, createRequestId('draw'))
      const stopIndex = Number(result.wheelStopIndex || 0)
      setWheelRotation((current) => current + 1440 + (360 - stopIndex * 45))
      await wait(3900)
      setBootstrap((current) => ({ ...current, draw: result }))
      setPage('share')
      trackEvent(activityKey, 'lottery_result', {
        won: result.won,
        controlCode: result.controlCode,
        prizeAmount: result.prizeAmount,
      })
    } catch (err) {
      setError(readError(err, '抽奖失败'))
    } finally {
      setBusy('')
      setWheelSpinning(false)
    }
  }

  async function handleSyncPayout() {
    const payoutNo = bootstrap?.draw?.payoutNo
    if (!payoutNo || busy) return
    setBusy('sync')
    try {
      const draw = await syncPayout(activityKey, payoutNo)
      setBootstrap((current) => ({ ...current, draw }))
    } catch (err) {
      setError(readError(err, '发放状态同步失败'))
    } finally {
      setBusy('')
    }
  }

  if (!bootstrap && !error) return <LoadingView />
  if (!bootstrap) return <ErrorView error={error} />

  return (
    <main className="nh-challenge">
      {preview ? <button className="nh-preview-badge" onClick={() => setPage('home')}>PC 预览模式 · 不计入答题或抽奖</button> : null}
      {page === 'home' ? <HomePage onStart={() => setPage('rules')} /> : null}
      {page === 'rules' ? <RulesPage onEnter={() => setPage('map')} /> : null}
      {page === 'map' ? (
        <MapPage
          levels={bootstrap.levels || []}
          progress={progress}
          correctCodes={correctCodes}
          onOpenLevel={openScene}
          onBack={() => setPage(allCompleted ? 'wheel' : 'home')}
        />
      ) : null}
      {page === 'scene' && activeLevel ? (
        <ScenePage
          level={activeLevel}
          correctCodes={correctCodes}
          onOpenQuestion={openQuestion}
          onBack={() => setPage('map')}
        />
      ) : null}
      {page === 'success' ? <SuccessPage onBack={() => setPage('map')} /> : null}
      {page === 'wheel' ? (
        <WheelPage
          authorization={bootstrap.authorization}
          segments={segments}
          rotation={wheelRotation}
          spinning={wheelSpinning}
          busy={busy}
          preview={preview}
          onAuthorize={handleAuthorization}
          onDraw={handleDraw}
          onBack={() => setPage('map')}
        />
      ) : null}
      {page === 'share' ? (
        <SharePage draw={bootstrap.draw} busy={busy} preview={preview} onSync={handleSyncPayout} onHome={() => setPage('home')} />
      ) : null}
      {activeLevel && activeQuestionIndex !== null ? (
        <QuestionDialog
          level={activeLevel}
          questionIndex={activeQuestionIndex}
          selectedOption={selectedOption}
          busy={busy === 'answer'}
          onSelect={setSelectedOption}
          onSubmit={handleAnswer}
          onClose={() => { setActiveQuestionIndex(null); setSelectedOption('') }}
        />
      ) : null}
      {feedback ? <AnswerFeedback feedback={feedback} onClose={closeFeedback} /> : null}
      {error ? <button className="nh-toast" onClick={() => setError('')}>{error}</button> : null}
    </main>
  )
}

function HomePage({ onStart }) {
  return <ArtPage art={NANHAI_ART.home} onAction={{ start: onStart }} />
}

function RulesPage({ onEnter }) {
  return <ArtPage art={NANHAI_ART.rules} onAction={{ 'enter-map': onEnter }} />
}

function SuccessPage({ onBack }) {
  return <ArtPage art={NANHAI_ART.success} onAction={{ 'back-map': onBack }} />
}

function ArtPage({ art, onAction = {}, children, rotatedChildren, className = '' }) {
  const [canvasW, canvasH] = art.canvas
  return (
    <section
      className={`nh-art-page ${className}`}
      style={{ '--canvas-w': canvasW, '--canvas-h': canvasH }}
    >
      <div className="nh-art-page__frame">
        <div className="nh-art-page__rotated">
          <img className="nh-art-page__background" src={nanhaiAsset(art.background)} alt="" />
          {(art.layers || []).map((layer) => (
            <ArtLayer key={`${layer[0]}-${layer[1]}-${layer[2]}`} layer={layer} canvas={art.canvas} onAction={onAction[layer[5]]} />
          ))}
          {rotatedChildren}
        </div>
        <div className="nh-art-page__overlay">{children}</div>
      </div>
    </section>
  )
}

function ArtLayer({ layer, canvas, onAction, className = '' }) {
  const [filename, left, top, width, height] = layer
  const style = {
    left: `${(left / canvas[0]) * 100}%`,
    top: `${(top / canvas[1]) * 100}%`,
    width: `${(width / canvas[0]) * 100}%`,
    height: `${(height / canvas[1]) * 100}%`,
  }
  if (onAction) {
    return <button className="nh-art-page__tap" style={style} onClick={onAction} aria-label="进入下一页"><img src={nanhaiAsset(filename)} alt="" /></button>
  }
  return <img className={`nh-art-page__layer ${className}`} style={style} src={nanhaiAsset(filename)} alt="" />
}

function MapPage({ levels, progress, correctCodes, onOpenLevel, onBack }) {
  const map = NANHAI_ART.map
  return (
    <ArtPage
      art={map}
      onAction={{ back: onBack }}
      className="nh-map-page"
      rotatedChildren={map.cards.map((card, index) => {
        const status = levelStatus(levels[index], progress, correctCodes)
        return <ArtLayer key={card[0]} layer={card} canvas={map.canvas} className={`nh-map-card is-${status}`} />
      })}
    >
      <div className="nh-map-page__nodes">
        {levels.map((level, index) => {
          const card = map.cards[index]
          const status = levelStatus(level, progress, correctCodes)
          const position = rotatedRect(map.canvas, card[1], card[2], card[3], card[4])
          return (
            <button
              key={level.levelNo}
              className={`nh-map-node is-${status}`}
              style={position}
              onClick={() => onOpenLevel(level)}
              aria-label={`${level.title} ${status === 'completed' ? '已解锁' : status === 'available' ? '未解锁' : '未开放'}`}
            >
              <span>{status === 'completed' ? '已解锁' : status === 'available' ? '未解锁' : '暂未开放'}</span>
            </button>
          )
        })}
      </div>
    </ArtPage>
  )
}

function ScenePage({ level, correctCodes, onOpenQuestion, onBack }) {
  const scene = NANHAI_ART.scenes[level.levelNo - 1]
  return (
    <section className="nh-scene-page">
      <ArtPage
        art={scene}
        className="nh-scene-page__art"
        rotatedChildren={(
          <div className="nh-scene-pins">
            {level.questions.map((question, index) => {
              const pin = scene.pins[index]
              const completed = correctCodes.has(question.code)
              return (
                <button
                  key={question.code}
                  className={`nh-scene-pin ${completed ? 'is-completed' : ''}`}
                  style={sourceRect(scene.canvas, pin[1], pin[2], 82, 82)}
                  onClick={() => onOpenQuestion(index)}
                  aria-label={`第${index + 1}题${completed ? '已解锁' : '点击答题'}`}
                >
                  <img src={nanhaiAsset(pin[0])} alt="" />
                  {completed ? <span>已解锁</span> : null}
                </button>
              )
            })}
          </div>
        )}
      />
      <div className="nh-scene-back-anchor"><button className="nh-scene-back" onClick={onBack}>返回</button></div>
    </section>
  )
}

function QuestionDialog({ level, questionIndex, selectedOption, busy, onSelect, onSubmit, onClose }) {
  const question = level.questions[questionIndex]
  return (
    <div className="nh-question-mask" role="presentation">
      <section className="nh-question-dialog" role="dialog" aria-modal="true" aria-label={`${level.title}第${questionIndex + 1}题`}>
        <img className="nh-question-dialog__panel" src={nanhaiAsset(NANHAI_ART.questionPanel)} alt="" />
        <button className="nh-question-dialog__close" onClick={onClose} aria-label="关闭">×</button>
        <div className="nh-question-dialog__type">{question.questionType}</div>
        <p className="nh-question-dialog__count">{level.title} · 第 {questionIndex + 1} / 6 题</p>
        <h1>{question.title}</h1>
        <div className={`nh-question-options ${question.options.length === 2 ? 'is-judge' : ''}`}>
          {question.options.map((option) => (
            <button
              key={option.key}
              className={selectedOption === option.key ? 'is-selected' : ''}
              onClick={() => onSelect(option.key)}
              disabled={busy}
            >
              <i className={question.options.length === 2 ? 'nh-radio' : 'nh-option-key'}>{question.options.length === 2 ? null : option.key}</i><span>{option.text}</span>
            </button>
          ))}
        </div>
        <button className="nh-question-dialog__submit" disabled={!selectedOption || busy} onClick={onSubmit}>
          {busy ? '提交中…' : '提交答案'}
        </button>
      </section>
    </div>
  )
}

function AnswerFeedback({ onClose }) {
  return (
    <div className="nh-answer-mask" role="presentation">
      <section className="nh-answer-feedback" role="dialog" aria-modal="true">
        <img className="nh-answer-feedback__base" src={nanhaiAsset(NANHAI_ART.answerPanel)} alt="" />
        <img className="nh-answer-feedback__badge" src={nanhaiAsset(NANHAI_ART.answerCorrect)} alt="" />
        <button onClick={onClose} aria-label="继续答题"><img src={nanhaiAsset(NANHAI_ART.answerClose)} alt="继续" /></button>
      </section>
    </div>
  )
}

function WheelPage({ authorization, segments, rotation, spinning, busy, preview, onAuthorize, onDraw, onBack }) {
  return (
    <section className="nh-wheel-page">
      <button className="nh-wheel-page__back" onClick={onBack}>返回关卡</button>
      <p>全部关卡已解锁</p>
      <h1>幸运大转盘</h1>
      <div className="nh-wheel-stage">
        <i className="nh-wheel-pointer" />
        <div className="nh-wheel" style={{ transform: `rotate(${rotation}deg)` }}>
          {segments.map((segment, index) => {
            const angle = index * 45 + 22.5
            return <span key={`${segment.label}-${index}`} style={{ transform: `rotate(${angle}deg) translateY(-134px) rotate(${-angle}deg)` }}>{segment.label}</span>
          })}
          <b>抽奖</b>
        </div>
      </div>
      {preview ? (
        <button className="nh-wheel-primary" onClick={onDraw}>查看预览结束页</button>
      ) : !authorization?.effective ? (
        <button className="nh-wheel-primary" disabled={Boolean(busy)} onClick={onAuthorize}>{busy === 'authorization' ? '正在开通…' : '开通自动发放并抽奖'}</button>
      ) : (
        <button className="nh-wheel-primary" disabled={Boolean(busy) || spinning} onClick={onDraw}>{spinning ? '好运转动中…' : '立即抽奖'}</button>
      )}
      <small>{preview ? 'PC 预览不会创建抽奖、红包或发放流水。' : '每位用户仅可抽奖一次，奖励将按微信状态自动发放。'}</small>
    </section>
  )
}

function SharePage({ draw, busy, preview, onSync, onHome }) {
  const won = draw?.won
  const payoutSuccess = draw?.payoutStatus === 'success'
  const payoutFailed = draw?.payoutStatus === 'failed'
  return (
    <section className="nh-share-page">
      <ArtPage art={NANHAI_ART.share} onAction={{ share: () => {}, home: onHome }} />
      <div className="nh-share-page__result">
        <strong>{preview ? 'PC 预览完成' : won ? `恭喜抽中 ${draw.prizeAmountYuan} 元微信红包` : '本次未中奖'}</strong>
        <span>{draw?.message}</span>
        {won ? <small>发放状态：{payoutStatusText(draw.payoutStatus)}{draw.wechatState ? ` · ${draw.wechatState}` : ''}</small> : null}
        {payoutFailed ? <small className="is-failed">失败原因：{draw.failureReason || draw.failureCode || '请后台核验'}</small> : null}
        {won && !payoutSuccess && draw.payoutNo ? <button disabled={Boolean(busy)} onClick={onSync}>{busy === 'sync' ? '同步中…' : '查询发放状态'}</button> : null}
      </div>
    </section>
  )
}

function LoadingView() {
  return <main className="nh-challenge nh-loading"><i /><p>正在打开幸福南海巡检图…</p></main>
}

function ErrorView({ error }) {
  return <main className="nh-challenge nh-error-page"><h1>页面暂时无法打开</h1><p>{error}</p></main>
}

function isLevelAvailable(level, progress) {
  return level.levelNo <= Math.max(progress?.currentLevel || 1, progress?.completedLevels || 0)
}

function levelStatus(level, progress, correctCodes) {
  if (level.questions?.every((question) => correctCodes.has(question.code))) return 'completed'
  return isLevelAvailable(level, progress) ? 'available' : 'locked'
}

function rotatedRect([canvasW, canvasH], left, top, width, height) {
  return {
    left: `${((canvasH - top - height) / canvasH) * 100}%`,
    top: `${(left / canvasW) * 100}%`,
    width: `${(height / canvasH) * 100}%`,
    height: `${(width / canvasW) * 100}%`,
  }
}

function sourceRect([canvasW, canvasH], left, top, width, height) {
  return {
    left: `${(left / canvasW) * 100}%`,
    top: `${(top / canvasH) * 100}%`,
    width: `${(width / canvasW) * 100}%`,
    height: `${(height / canvasH) * 100}%`,
  }
}

function payoutStatusText(status) {
  const labels = { pending: '待发起', accepted: '已受理', processing: '发放中', success: '已到账', failed: '发放失败' }
  return labels[status] || status || '-'
}

function createRequestId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${random}`.slice(0, 100)
}

function buildPreviewProgress(bootstrap, newlyCorrectCode, wrongAnswer = false) {
  const currentProgress = bootstrap?.progress || {}
  const correctQuestionCodes = Array.from(new Set([
    ...(currentProgress.correctQuestionCodes || []),
    ...(newlyCorrectCode ? [newlyCorrectCode] : []),
  ]))
  const levels = bootstrap?.levels || []
  const completedLevels = levels.reduce((count, level) => (
    level.questions.every((question) => correctQuestionCodes.includes(question.code)) ? count + 1 : count
  ), 0)
  return {
    ...currentProgress,
    currentLevel: Math.min(completedLevels + 1, 5),
    completedLevels,
    correctCount: correctQuestionCodes.length,
    wrongCount: (currentProgress.wrongCount || 0) + (wrongAnswer ? 1 : 0),
    status: completedLevels >= 5 ? 'completed' : 'in_progress',
    correctQuestionCodes,
  }
}

function readError(error, fallback) {
  const message = error?.response?.data?.message || error?.message
  return typeof message === 'string' && message ? message : fallback
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function invokeMerchantTransferAuthorization(authorization) {
  return new Promise((resolve, reject) => {
    const invoke = () => {
      if (!window.WeixinJSBridge?.invoke) {
        reject(new Error('请在微信内打开活动'))
        return
      }
      window.WeixinJSBridge.invoke('requestMerchantTransfer', {
        mchId: authorization.mchId,
        appId: authorization.appId,
        package: authorization.packageInfo,
      }, (result) => {
        const message = result?.err_msg || result?.errMsg || ''
        if (/:(ok|success)$/i.test(message)) resolve(result)
        else reject(new Error(message || '微信授权未完成'))
      })
    }
    if (window.WeixinJSBridge?.invoke) invoke()
    else document.addEventListener('WeixinJSBridgeReady', invoke, { once: true })
  })
}
