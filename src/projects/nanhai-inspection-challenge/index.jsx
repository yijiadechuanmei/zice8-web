import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  { label: '谢谢参与', amount: 0, probability: 30 },
  { label: '0.28元红包', amount: 28, probability: 50 },
  { label: '0.38元红包', amount: 38, probability: 10 },
  { label: '0.68元红包', amount: 68, probability: 4 },
  { label: '0.88元红包', amount: 88, probability: 3 },
  { label: '1.28元红包', amount: 128, probability: 2 },
  { label: '1.88元红包', amount: 188, probability: 1 },
]

// 新整盘从顶部“谢谢参与”开始顺时针共七个扇区。索引是抽奖结果的唯一落位依据：
// 后端保存的 wheelStopIndex 与这里一一对应，不能再由金额反推，避免库存、未中奖等
// 没有金额的结果沿用上一轮指针位置。
const WHEEL_POINTER_ANGLE_BY_STOP_INDEX = [
  0,
  360 / 7,
  360 / 7 * 2,
  360 / 7 * 3,
  360 / 7 * 4,
  360 / 7 * 5,
  360 / 7 * 6,
]

const WHEEL_STOP_INDEX_BY_AMOUNT = {
  0: 0,
  28: 1,
  38: 2,
  68: 3,
  88: 4,
  128: 5,
  188: 6,
}

export default function NanhaiInspectionChallenge({ routeParams }) {
  const activityKey = routeParams?.activityKey || ''
  const [bootstrap, setBootstrap] = useState(null)
  const [previewSeenQuestionCodes, setPreviewSeenQuestionCodes] = useState({})
  const [page, setPage] = useState('home')
  const [activeLevel, setActiveLevel] = useState(null)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(null)
  const [selectedOption, setSelectedOption] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [wheelRotation, setWheelRotation] = useState(0)
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [pageTransitioning, setPageTransitioning] = useState(false)
  const [levelAdvanceToast, setLevelAdvanceToast] = useState('')
  const pageTransitionTimer = useRef(null)
  const levelAdvanceTimer = useRef(null)

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
        setPreviewSeenQuestionCodes(buildPreviewSeenQuestionCodes(data.levels))
        if (data.draw) setPage('share')
      })
      .catch((err) => alive && setError(readError(err, '活动加载失败')))
    trackPageView(activityKey, '/nanhai-inspection-challenge', {
      activityType: 'nanhai_inspection_challenge',
    })
    return () => { alive = false }
  }, [activityKey])

  useEffect(() => () => {
    window.clearTimeout(pageTransitionTimer.current)
    window.clearTimeout(levelAdvanceTimer.current)
  }, [])

  const progress = bootstrap?.progress
  const preview = Boolean(bootstrap?.preview)
  const correctCodes = new Set(progress?.correctQuestionCodes || [])
  const segments = bootstrap?.config?.wheelSegments || FALLBACK_SEGMENTS

  function navigate(nextPage) {
    if (nextPage === page || pageTransitioning) return
    setPageTransitioning(true)
    window.clearTimeout(pageTransitionTimer.current)
    pageTransitionTimer.current = window.setTimeout(() => {
      setPage(nextPage)
      setPageTransitioning(false)
    }, 220)
  }

  function openScene(level) {
    if (!isLevelAvailable(level, progress)) {
      setError('请先完成上一关')
      return
    }
    setActiveLevel(level)
    window.clearTimeout(levelAdvanceTimer.current)
    setLevelAdvanceToast('')
    navigate('scene')
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

  function handlePreviewCompleteAll() {
    if (!preview) return
    setBootstrap((current) => ({
      ...current,
      progress: buildPreviewCompletedProgress(current),
    }))
    setActiveLevel(null)
    setActiveQuestionIndex(null)
    navigate('success')
    trackEvent(activityKey, 'preview_complete_all', { activityType: 'nanhai_inspection_challenge' })
  }

  function restartPreviewExperience() {
    if (!preview || pageTransitioning) return
    // 保留当前中奖结果直到分享页淡出完成；若此刻先清空 draw，分享页会短暂按未中奖态重绘。
    setPageTransitioning(true)
    window.clearTimeout(pageTransitionTimer.current)
    pageTransitionTimer.current = window.setTimeout(() => {
      setBootstrap((current) => ({
        ...current,
        draw: null,
        progress: buildPreviewInitialProgress(current),
      }))
      setPreviewSeenQuestionCodes((current) => (
        Object.keys(current).length ? current : buildPreviewSeenQuestionCodes(bootstrap?.levels)
      ))
      setActiveLevel(null)
      setActiveQuestionIndex(null)
      setFeedback(null)
      setSelectedOption('')
      setWheelRotation(0)
      setPage('map')
      setPageTransitioning(false)
    }, 220)
    trackEvent(activityKey, 'preview_restart', { activityType: 'nanhai_inspection_challenge' })
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
        ...(preview ? {
          shownQuestionCodes: previewSeenQuestionCodes[activeLevel.levelNo] || activeLevel.questions.map((item) => item.code),
          activeQuestionCodes: activeLevel.questions.map((item) => item.code),
          correctQuestionCodes: activeLevel.questions
            .filter((item) => correctCodes.has(item.code))
            .map((item) => item.code),
        } : {}),
      }
      const result = preview
        ? await previewAnswer(activityKey, activeLevel.levelNo, payload)
        : await submitAnswer(activityKey, activeLevel.levelNo, payload)
      const nextPreviewProgress = preview
        ? buildPreviewProgress(bootstrap, result.correct ? question.code : null, !result.correct)
        : null
      const nextCorrectQuestionCodes = result.correct
        ? Array.from(new Set([...(progress?.correctQuestionCodes || []), question.code]))
        : (progress?.correctQuestionCodes || [])
      const nextLevelQuestions = Array.isArray(result.levelQuestions) && result.levelQuestions.length === 2
        ? result.levelQuestions
        : activeLevel.questions
      const nextActiveLevel = { ...activeLevel, questions: nextLevelQuestions }
      const justUnlockedQuestion = result.correct && !correctCodes.has(question.code)
      const completedCurrentLevel = justUnlockedQuestion && activeLevel.questions.every(
        (item) => nextCorrectQuestionCodes.includes(item.code),
      )
      const completedAll = completedCurrentLevel && activeLevel.levelNo === 5
      setBootstrap((current) => ({
        ...current,
        levels: current.levels.map((level) => (
          level.levelNo === activeLevel.levelNo
            ? { ...level, questions: nextLevelQuestions }
            : level
        )),
        progress: {
          ...current.progress,
          ...(nextPreviewProgress || result.progress),
          correctQuestionCodes: preview
            ? nextPreviewProgress.correctQuestionCodes
            : nextCorrectQuestionCodes,
        },
      }))
      setActiveLevel(nextActiveLevel)
      if (preview && !result.correct) {
        setPreviewSeenQuestionCodes((current) => ({
          ...current,
          [activeLevel.levelNo]: Array.from(new Set([
            ...(current[activeLevel.levelNo] || activeLevel.questions.map((item) => item.code)),
            ...nextLevelQuestions.map((item) => item.code),
          ])),
        }))
      }
      if (completedCurrentLevel) {
        setFeedback(null)
        setSelectedOption('')
        setActiveQuestionIndex(null)
        const message = completedAll ? '恭喜完成全部关卡，闯关成功！' : '闯关成功，进入下一关'
        setLevelAdvanceToast(message)
        window.clearTimeout(levelAdvanceTimer.current)
        levelAdvanceTimer.current = window.setTimeout(() => {
          setLevelAdvanceToast('')
          if (completedAll) {
            setActiveLevel(null)
            navigate('success')
            return
          }
          const nextLevel = bootstrap?.levels?.find((level) => level.levelNo === activeLevel.levelNo + 1)
          if (nextLevel) {
            scrollSceneToTop()
            setActiveLevel(nextLevel)
            window.requestAnimationFrame(scrollSceneToTop)
          }
        }, 1500)
      }
      if (!completedCurrentLevel) {
        setFeedback({
          correct: result.correct,
          explanation: result.explanation,
          completedAll,
          completedCurrentLevel,
        })
      }
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
    setFeedback(null)
    setSelectedOption('')
    setActiveQuestionIndex(null)
  }

  function returnToMap() {
    window.clearTimeout(levelAdvanceTimer.current)
    setLevelAdvanceToast('')
    setActiveQuestionIndex(null)
    setFeedback(null)
    navigate('map')
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
      const prize = pickPreviewSegment(segments)
      const won = Number(prize.amount) > 0
      setWheelSpinning(true)
      setError('')
      try {
        setWheelRotation((current) => spinPointerToStopIndex(
          current,
          wheelStopIndexForAmount(prize.amount),
        ))
        await wait(3800)
        setBootstrap((current) => ({
          ...current,
          draw: {
            preview: true,
            won,
            prizeAmount: won ? prize.amount : null,
            prizeAmountYuan: won ? Number(prize.amount) / 100 : null,
            message: won
              ? `测试抽中 ${prize.label} 微信红包；不创建红包、库存或发放流水。`
              : '测试未中奖；不创建红包、库存或发放流水。',
          },
        }))
        await wait(1500)
        navigate('share')
      } finally {
        setWheelSpinning(false)
      }
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
      setWheelRotation((current) => spinPointerToStopIndex(
        current,
        Number.isInteger(result.wheelStopIndex)
          ? result.wheelStopIndex
          : wheelStopIndexForAmount(result.prizeAmount),
      ))
      await wait(3900)
      setBootstrap((current) => ({ ...current, draw: result }))
      navigate('share')
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
      <audio autoPlay loop preload="none" src={nanhaiAsset(NANHAI_ART.home.audio)} />
      {preview ? <button className="nh-preview-badge" onClick={() => navigate('home')}>测试模式 · 不计入答题或抽奖</button> : null}
      <div key={page} className={`nh-page-stage ${pageTransitioning ? 'is-leaving' : ''}`}>
      {page === 'home' ? <HomePage onStart={() => navigate('rules')} /> : null}
      {page === 'rules' ? <RulesPage onEnter={() => navigate('map')} /> : null}
      {page === 'map' ? (
        <MapPage
          levels={bootstrap.levels || []}
          progress={progress}
          correctCodes={correctCodes}
          onOpenLevel={openScene}
          preview={preview}
          onDebugComplete={handlePreviewCompleteAll}
        />
      ) : null}
      {page === 'scene' && activeLevel ? (
        <ScenePage
          level={activeLevel}
          correctCodes={correctCodes}
          onOpenQuestion={openQuestion}
          onBack={returnToMap}
        />
      ) : null}
      {page === 'success' ? <SuccessPage rotation={wheelRotation} onDraw={handleDraw} /> : null}
      {page === 'share' ? (
        <SharePage draw={bootstrap.draw} busy={busy} preview={preview} onSync={handleSyncPayout} onRestart={restartPreviewExperience} onHome={() => navigate('home')} />
      ) : null}
      </div>
      {activeLevel && activeQuestionIndex !== null ? createPortal(
        <QuestionDialog
          level={activeLevel}
          questionIndex={activeQuestionIndex}
          selectedOption={selectedOption}
          busy={busy === 'answer'}
          onSelect={setSelectedOption}
          onSubmit={handleAnswer}
          onClose={() => { setActiveQuestionIndex(null); setSelectedOption('') }}
        />,
        document.body,
      ) : null}
      {feedback ? createPortal(<AnswerFeedback feedback={feedback} onClose={closeFeedback} />, document.body) : null}
      {levelAdvanceToast ? createPortal(<div className="nh-level-advance-toast" role="status">{levelAdvanceToast}</div>, document.body) : null}
      {error ? <button className="nh-toast" onClick={() => setError('')}>{error}</button> : null}
    </main>
  )
}

function HomePage({ onStart }) {
  return <ArtPage art={NANHAI_ART.home} onAction={{ start: onStart }} className="nh-home-page" />
}

function RulesPage({ onEnter }) {
  return <ArtPage art={NANHAI_ART.rules} onAction={{ 'enter-map': onEnter }} className="nh-rules-page" />
}

function SuccessPage({ rotation, onDraw }) {
  const success = NANHAI_ART.success
  const [baseFilename, baseLeft, baseTop, baseWidth, baseHeight] = success.wheel.base
  const [ringFilename, ringLeft, ringTop, ringWidth, ringHeight] = success.wheel.ring
  const [pointerFilename, pointerLeft, pointerTop, pointerWidth, pointerHeight] = success.wheel.pointer
  const ringCenterX = ringLeft + ringWidth / 2
  const ringCenterY = ringTop + ringHeight / 2
  return (
    <ArtPage
      art={success}
      onAction={{ draw: onDraw }}
      className="nh-success-page"
      rotatedChildren={(
        <>
          <img className="nh-success-wheel-base" src={nanhaiAsset(baseFilename)} style={sourceRect(success.canvas, baseLeft, baseTop, baseWidth, baseHeight)} alt="" />
          <img className="nh-success-wheel-ring" src={nanhaiAsset(ringFilename)} style={sourceRect(success.canvas, ringLeft, ringTop, ringWidth, ringHeight)} alt="" />
          <div
            className="nh-success-wheel-pointer-spin"
            style={{ ...sourcePoint(success.canvas, ringCenterX, ringCenterY), '--pointer-rotation': `${rotation}deg` }}
          >
            <img className="nh-success-wheel-pointer" src={nanhaiAsset(pointerFilename)} style={sourceRect(success.canvas, pointerLeft, pointerTop, pointerWidth, pointerHeight)} alt="" />
          </div>
        </>
      )}
    />
  )
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
        {children ? <div className="nh-art-page__overlay">{children}</div> : null}
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

function MapPage({ levels, progress, correctCodes, onOpenLevel, preview, onDebugComplete }) {
  const map = NANHAI_ART.map
  const [selectedLevelNo, setSelectedLevelNo] = useState(null)
  const selectedLevel = levels.find((level) => level.levelNo === selectedLevelNo)
  return (
    <ArtPage
      art={map}
      onAction={{
        'start-scene': selectedLevel ? () => onOpenLevel(selectedLevel) : undefined,
        'debug-complete': preview ? onDebugComplete : undefined,
      }}
      className="nh-map-page"
      rotatedChildren={map.cards.map((card, index) => {
        const status = levelStatus(levels[index], progress, correctCodes)
        const unlockedLock = map.unlockedLocks[index]
        return (
          <Fragment key={card[0]}>
            <ArtLayer
              key={card[0]}
              layer={card}
              canvas={map.canvas}
              className={`nh-map-card is-${status}${selectedLevelNo === levels[index].levelNo ? ' is-selected' : ''}`}
            />
            {status === 'completed' ? (
              <img
                className="nh-map-unlocked-lock"
                src={nanhaiAsset(NANHAI_ART.unlockedLock)}
                style={sourceRect(map.canvas, ...unlockedLock)}
                alt=""
              />
            ) : null}
          </Fragment>
        )
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
              onClick={() => status !== 'locked' && setSelectedLevelNo(level.levelNo)}
              aria-pressed={selectedLevelNo === level.levelNo}
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
              const pinIndex = Number(question.code.slice(-2)) - 1
              const pin = scene.pins[pinIndex] || scene.pins[index]
              const completed = correctCodes.has(question.code)
              return (
                <button
                  key={question.code}
                  className={`nh-scene-pin ${completed ? 'is-completed' : ''}`}
                  style={sourceRect(scene.canvas, pin[1], pin[2], 82, 82)}
                  onClick={() => onOpenQuestion(index)}
                  aria-label={`第${index + 1}题${completed ? '已解锁' : '点击答题'}`}
                >
                  <img className="nh-scene-pin__trigger" src={nanhaiAsset(pin[0])} alt="" />
                  {completed ? <span>已解锁</span> : null}
                </button>
              )
            })}
          </div>
        )}
      />
      {createPortal(
        <div className="nh-scene-back-anchor"><button className="nh-scene-back" onClick={onBack}>返回</button></div>,
        document.body,
      )}
    </section>
  )
}

function QuestionDialog({ level, questionIndex, selectedOption, busy, onSelect, onSubmit, onClose }) {
  const question = level.questions[questionIndex]
  return (
    <div className="nh-question-mask" role="presentation">
      <section className="nh-question-dialog" role="dialog" aria-modal="true" aria-label={`${level.title}第${questionIndex + 1}题`}>
        <img className="nh-question-dialog__panel" src={nanhaiAsset(NANHAI_ART.questionPanel)} alt="" />
        <button className="nh-question-dialog__dismiss" onClick={onClose} aria-label="关闭" />
        <div className="nh-question-dialog__type">{question.questionType}</div>
        <p className="nh-question-dialog__count">{level.title} · 第 {questionIndex + 1} / {level.questions.length} 题</p>
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
        <button className="nh-question-dialog__cancel" onClick={onClose}>关闭</button>
      </section>
    </div>
  )
}

function AnswerFeedback({ feedback, onClose }) {
  return (
    <div className="nh-answer-mask" role="presentation">
      <section className="nh-answer-feedback" role="dialog" aria-modal="true">
        <img
          className="nh-answer-feedback__result"
          src={nanhaiAsset(feedback.correct ? NANHAI_ART.answerPanel : NANHAI_ART.answerCorrect)}
          alt=""
        />
        <button onClick={onClose} aria-label="继续答题"><img src={nanhaiAsset(NANHAI_ART.answerClose)} alt="继续" /></button>
      </section>
    </div>
  )
}

function SharePage({ draw, busy, preview, onSync, onRestart, onHome }) {
  const won = draw?.won
  const shareArt = won ? NANHAI_ART.share : {
    ...NANHAI_ART.share,
    layers: NANHAI_ART.share.layers.map((layer) => (
      layer[5] === 'result-panel' ? [NANHAI_ART.share.noWinPanel, ...layer.slice(1)] : layer
    )),
  }
  const payoutSuccess = draw?.payoutStatus === 'success'
  const payoutFailed = draw?.payoutStatus === 'failed'
  const prizeAmount = Number.isFinite(Number(draw?.prizeAmountYuan)) ? String(draw.prizeAmountYuan) : ''
  return (
    <section className="nh-share-page">
      <ArtPage
        art={shareArt}
        onAction={{ share: onRestart, home: onHome }}
        rotatedChildren={won && prizeAmount ? (
          <div className="nh-share-prize-amount" style={sourceRect(shareArt.canvas, 559, 367, 261, 134)}><div>{prizeAmount}</div></div>
        ) : null}
      />
      {!preview ? (
        <div className="nh-share-page__result">
          <strong>{won ? `恭喜抽中 ${draw.prizeAmountYuan} 元微信红包` : '本次未中奖'}</strong>
          <span>{draw?.message}</span>
          {won ? <small>发放状态：{payoutStatusText(draw.payoutStatus)}{draw.wechatState ? ` · ${draw.wechatState}` : ''}</small> : null}
          {payoutFailed ? <small className="is-failed">失败原因：{draw.failureReason || draw.failureCode || '请后台核验'}</small> : null}
          {won && !payoutSuccess && draw.payoutNo ? <button disabled={Boolean(busy)} onClick={onSync}>{busy === 'sync' ? '同步中…' : '查询发放状态'}</button> : null}
        </div>
      ) : null}
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

function sourcePoint([canvasW, canvasH], left, top) {
  return {
    '--pointer-origin-x': `${(left / canvasW) * 100}%`,
    '--pointer-origin-y': `${(top / canvasH) * 100}%`,
  }
}

function wheelStopIndexForAmount(prizeAmount) {
  return WHEEL_STOP_INDEX_BY_AMOUNT[Number(prizeAmount)] ?? 0
}

function spinPointerToStopIndex(currentRotation, wheelStopIndex) {
  const targetAngle = WHEEL_POINTER_ANGLE_BY_STOP_INDEX[Number(wheelStopIndex)]
  if (targetAngle === undefined) return currentRotation + 1440
  const currentAngle = ((currentRotation % 360) + 360) % 360
  const remainingAngle = (targetAngle - currentAngle + 360) % 360
  return currentRotation + 1440 + remainingAngle
}

function pickPreviewSegment(segments) {
  const items = Array.isArray(segments) && segments.length ? segments : FALLBACK_SEGMENTS
  const hasProbability = items.some((item) => Number.isFinite(Number(item?.probability)))
  if (!hasProbability) {
    return items[Math.floor(Math.random() * items.length)] || FALLBACK_SEGMENTS[0]
  }
  const totalProbability = items.reduce((sum, item) => sum + Math.max(Number(item?.probability) || 0, 0), 0)
  if (totalProbability <= 0) return FALLBACK_SEGMENTS[0]
  let cursor = Math.random() * totalProbability
  for (const item of items) {
    cursor -= Math.max(Number(item?.probability) || 0, 0)
    if (cursor < 0) return item
  }
  return items[items.length - 1] || FALLBACK_SEGMENTS[0]
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

function buildPreviewSeenQuestionCodes(levels) {
  return Object.fromEntries((levels || []).map((level) => [
    level.levelNo,
    (level.questions || []).map((question) => question.code),
  ]))
}

function buildPreviewCompletedProgress(bootstrap) {
  const currentProgress = bootstrap?.progress || {}
  const correctQuestionCodes = (bootstrap?.levels || []).flatMap((level) => level.questions.map((question) => question.code))
  return {
    ...currentProgress,
    currentLevel: 5,
    completedLevels: 5,
    correctCount: correctQuestionCodes.length,
    status: 'completed',
    correctQuestionCodes,
  }
}

function buildPreviewInitialProgress(bootstrap) {
  const currentProgress = bootstrap?.progress || {}
  return {
    ...currentProgress,
    currentLevel: 1,
    completedLevels: 0,
    correctCount: 0,
    wrongCount: 0,
    status: 'in_progress',
    completedAt: null,
    correctQuestionCodes: [],
  }
}

function readError(error, fallback) {
  const message = error?.response?.data?.message || error?.message
  return typeof message === 'string' && message ? message : fallback
}

function scrollSceneToTop() {
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  window.scrollTo(0, 0)
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
