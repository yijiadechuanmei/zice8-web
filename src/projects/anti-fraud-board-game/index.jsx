import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { request } from '../../shared/api/request'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import {
  ANTI_FRAUD_BOARD_GAME_ACTIVITY_KEY,
  BOARD_POINTS,
  BOARD_TILES,
  QUESTION_BANK,
  antiFraudBoardAssets,
} from './config'
import './styles.css'

const PAGE = {
  HOME: 'home',
  GAME: 'game',
  POSTER: 'poster',
}

const DESIGN_WIDTH = 375
const DESIGN_HEIGHT = 812
// 棋盘旋转后从画布顶部上移 44px，滚动高度需扣除这段偏移，避免到底后出现空白。
const GAME_STAGE_HEIGHT = 1124
const POSTER_RENDER_SCALE = 2
const POSTER_CONTENT_OFFSET_Y = 52
const POSTER_QR_LEFT = 280
const POSTER_QR_TOP = 580
// 海报导出宽度为 750px，设计稿 63.5px 对应最终二维码外框 127px。
const POSTER_QR_SIZE = 63.5
const POSTER_QR_BORDER = 4
const POSTER_QR_CONTENT_SIZE = POSTER_QR_SIZE - POSTER_QR_BORDER * 2
const FINISH_INDEX = BOARD_POINTS.length - 1
const MOVE_STEP_MS = 1500
const ROLLING_MS = 2000
const ROLL_RESULT_MS = 2000
const HOME_ORIENTATION_PROMPT_MS = 2100
const MIN_QUESTION_COUNT = 4
const MAX_QUESTION_COUNT = 5
const DICE_MIN = 1
const DICE_MAX = 6
const ANTI_FRAUD_BGM_VOLUME = 0.22
const ANSWER_SOUND_VOLUME = 1

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getQuestionTarget() {
  return getRandomInteger(MIN_QUESTION_COUNT, MAX_QUESTION_COUNT)
}

function getConstrainedRoll(remainingSteps, remainingQuestions) {
  const futureQuestions = remainingQuestions - 1
  const minimumRoll = Math.max(DICE_MIN, remainingSteps - futureQuestions * DICE_MAX)
  const maximumRoll = Math.min(DICE_MAX, remainingSteps - futureQuestions * DICE_MIN)

  return getRandomInteger(minimumRoll, maximumRoll)
}

function useIsLandscape() {
  const getValue = () => typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  const [isLandscape, setIsLandscape] = useState(getValue)

  useEffect(() => {
    function updateOrientation() {
      setIsLandscape(getValue())
    }

    updateOrientation()
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)
    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  return isLandscape
}

function useDesignScale(stageHeight, fit = 'contain') {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      const width = window.innerWidth || DESIGN_WIDTH
      const height = window.innerHeight || DESIGN_HEIGHT
      const widthScale = width / DESIGN_WIDTH
      setScale(fit === 'width' ? widthScale : Math.min(widthScale, height / stageHeight))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    window.addEventListener('orientationchange', updateScale)
    return () => {
      window.removeEventListener('resize', updateScale)
      window.removeEventListener('orientationchange', updateScale)
    }
  }, [fit, stageHeight])

  return scale
}

function DesignStage({
  className = '',
  shellClassName = '',
  stageHeight = DESIGN_HEIGHT,
  fit = 'width',
  shellRef,
  children,
}) {
  const scale = useDesignScale(stageHeight, fit)

  return (
    <main ref={shellRef} className={`afbg-shell ${shellClassName}`}>
      <div className="afbg-stage-frame" style={{ width: DESIGN_WIDTH * scale, height: stageHeight * scale }}>
        <div
          className={`afbg-stage ${className}`}
          style={{ '--afbg-scale': scale, '--afbg-stage-height': `${stageHeight}px` }}
        >
          {children}
        </div>
      </div>
    </main>
  )
}

function LayerImage({ className = '', src, style, alt = '' }) {
  return <img className={`afbg-layer-image ${className}`} src={src} style={style} alt={alt} draggable="false" />
}

function loadPosterImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`海报素材加载失败：${src}`))
    image.src = src
  })
}

function getPosterActivityUrl(activityKey) {
  return `https://web.zice8.com/anti_fraud_board_game/${encodeURIComponent(activityKey)}`
}

async function renderPosterImage({ leftLabel, rightLabel, qrCanvas }) {
  if (!qrCanvas) throw new Error('二维码尚未生成')

  const posterAssets = antiFraudBoardAssets.poster
  const [background, card, title, footer, badge] = await Promise.all([
    loadPosterImage(posterAssets.background),
    loadPosterImage(posterAssets.card),
    loadPosterImage(posterAssets.title),
    loadPosterImage(posterAssets.footer),
    loadPosterImage(posterAssets.badge),
  ])
  const canvas = document.createElement('canvas')
  canvas.width = DESIGN_WIDTH * POSTER_RENDER_SCALE
  canvas.height = DESIGN_HEIGHT * POSTER_RENDER_SCALE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('无法创建海报画布')

  context.scale(POSTER_RENDER_SCALE, POSTER_RENDER_SCALE)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  const posterY = (value) => value + POSTER_CONTENT_OFFSET_Y
  context.drawImage(background, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)
  context.drawImage(card, 11, posterY(74), 351, 530)
  context.drawImage(title, 45, posterY(5), 282, 170)
  context.drawImage(footer, 6, posterY(618), 361, 85)
  context.drawImage(badge, 61, posterY(469), 256, 40)

  context.font = '900 20px "PingFang SC", "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  for (const { text, left } of [
    { text: leftLabel, left: 56 },
    { text: rightLabel, left: 224 },
  ]) {
    const centerX = left + 58.5
    const centerY = posterY(411.5)
    context.fillStyle = 'rgba(255, 255, 255, 0.71)'
    context.fillText(text, centerX + 1, centerY + 1)
    context.fillStyle = '#ff791e'
    context.fillText(text, centerX, centerY)
  }

  context.fillStyle = '#fff'
  context.fillRect(POSTER_QR_LEFT, POSTER_QR_TOP, POSTER_QR_SIZE, POSTER_QR_SIZE)
  context.imageSmoothingEnabled = false
  context.drawImage(
    qrCanvas,
    POSTER_QR_LEFT + POSTER_QR_BORDER,
    POSTER_QR_TOP + POSTER_QR_BORDER,
    POSTER_QR_CONTENT_SIZE,
    POSTER_QR_CONTENT_SIZE,
  )

  return canvas.toDataURL('image/png')
}

function createQuestionDeck() {
  const deck = QUESTION_BANK.map((_, index) => index)
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1))
    const currentIndex = deck[index]
    deck[index] = deck[nextIndex]
    deck[nextIndex] = currentIndex
  }
  return deck
}

function HomePage({ onStart }) {
  return (
    <DesignStage className="afbg-home" shellClassName="afbg-home-shell" fit="width">
      <LayerImage className="afbg-home-ribbon" src={antiFraudBoardAssets.home.topRibbon} style={{ left: 9, top: 18, width: 355, height: 40 }} />
      <LayerImage className="afbg-home-title" src={antiFraudBoardAssets.home.title} style={{ left: 44, top: 73, width: 288, height: 213 }} />
      <LayerImage className="afbg-home-subtitle" src={antiFraudBoardAssets.home.subtitle} style={{ left: 53, top: 305, width: 267, height: 49 }} />
      <LayerImage className="afbg-home-mascot" src={antiFraudBoardAssets.home.mascot} style={{ left: 59, top: 406, width: 252, height: 185 }} />
      <button className="afbg-image-button afbg-start-button" type="button" onClick={onStart} aria-label="开始游戏">
        <LayerImage src={antiFraudBoardAssets.home.startButton} />
      </button>
      <LayerImage className="afbg-home-footer" src={antiFraudBoardAssets.home.footer} style={{ left: 30, top: 691, width: 313, height: 18 }} />
    </DesignStage>
  )
}

function OrientationPrompt({ black = false }) {
  const copy = <>请竖置手机锁定方向后<br />再横屏参与游戏</>

  return (
    <div className={`afbg-orientation-prompt ${black ? 'afbg-orientation-prompt-black' : ''}`} role="status" aria-live="polite">
      <div className="afbg-orientation-phone" aria-hidden="true"><span /></div>
      <div className="afbg-orientation-copy">{copy}</div>
    </div>
  )
}

function formatElapsed(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${minutes}分${rest}秒`
}

function BoardScene({
  position,
  moving,
  elapsed,
  rollPhase,
  rollValue,
  question,
  feedback,
  success,
  onRoll,
  onAnswer,
  onContinue,
  onGoPoster,
  showLandscapePrompt,
}) {
  const currentPoint = BOARD_POINTS[position] || BOARD_POINTS[0]
  const shellRef = useRef(null)
  const scrollAnimationRef = useRef(null)

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    window.cancelAnimationFrame(scrollAnimationRef.current)
    const frame = shell.querySelector('.afbg-stage-frame')
    const scale = frame ? frame.getBoundingClientRect().width / DESIGN_WIDTH : 1
    const characterCenterY = (currentPoint.x - 44 + 60) * scale
    const targetTop = Math.max(0, characterCenterY - shell.clientHeight / 2)
    const maxTop = Math.max(0, shell.scrollHeight - shell.clientHeight)
    const nextTop = Math.min(targetTop, maxTop)

    if (!moving) {
      shell.scrollTop = nextTop
      return undefined
    }

    const startTop = shell.scrollTop
    const distance = nextTop - startTop
    const startTime = performance.now()

    function step(now) {
      const progress = Math.min((now - startTime) / MOVE_STEP_MS, 1)
      shell.scrollTop = startTop + distance * progress
      if (progress < 1) {
        scrollAnimationRef.current = window.requestAnimationFrame(step)
      }
    }

    scrollAnimationRef.current = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(scrollAnimationRef.current)
  }, [currentPoint.x, moving, position])

  return (
    <>
    <DesignStage className="afbg-game" shellClassName="afbg-game-shell" stageHeight={GAME_STAGE_HEIGHT} fit="width" shellRef={shellRef}>
      <div className="afbg-board-rotator">
        <LayerImage src={antiFraudBoardAssets.game.board} style={{ left: 0, top: 0, width: 1168, height: 375 }} />
        <LayerImage src={antiFraudBoardAssets.game.startDecor} style={{ left: 55, top: 153, width: 135, height: 144 }} />
        <LayerImage src={antiFraudBoardAssets.game.finishDecor} style={{ left: 1066, top: 116, width: 93, height: 90 }} />
        <LayerImage src={antiFraudBoardAssets.game.lamp} style={{ left: 568, top: 59, width: 37, height: 62 }} />
        <LayerImage src={antiFraudBoardAssets.game.signTop} style={{ left: 53, top: 24, width: 116, height: 52 }} />
        <LayerImage src={antiFraudBoardAssets.game.signBottom} style={{ left: 55, top: 304, width: 116, height: 50 }} />
        <LayerImage src={antiFraudBoardAssets.game.badge} style={{ left: 655, top: 20, width: 86, height: 95 }} />
        {BOARD_TILES.map((tile, index) => (
          <LayerImage
            key={`${tile.x}-${tile.y}`}
            className={index < position ? '' : 'afbg-tile-muted'}
            src={antiFraudBoardAssets.game.tile}
            style={{ left: tile.x, top: tile.y, width: 68, height: 68 }}
          />
        ))}
        <button
          className="afbg-character"
          type="button"
          onClick={onRoll}
          disabled={Boolean(moving || question || feedback || success)}
          style={{ left: currentPoint.x, top: currentPoint.y }}
          aria-label="随机前进"
        >
          <LayerImage src={antiFraudBoardAssets.game.character} />
          {!moving && !question && !feedback && !success ? (
            <div className={`afbg-roll-hint ${position >= 4 && position <= 6 ? 'is-lowered' : ''}`}>
              <LayerImage src={antiFraudBoardAssets.game.prompt} />
            </div>
          ) : null}
        </button>
        <div className="afbg-step-text" style={{ left: 96, top: 312 }}>{position} 步</div>
        <div className="afbg-time-text" style={{ left: 91, top: 39 }} onDoubleClick={onGoPoster}>{formatElapsed(elapsed)}</div>
      </div>
    </DesignStage>

    {rollPhase ? <RollOverlay phase={rollPhase} value={rollValue} /> : null}
    {question ? <QuestionOverlay question={question} onAnswer={onAnswer} /> : null}
    {feedback ? <FeedbackOverlay feedback={feedback} onContinue={onContinue} /> : null}
    {success ? <SuccessOverlay onGoPoster={onGoPoster} /> : null}
    {showLandscapePrompt ? <OrientationPrompt black /> : null}
    </>
  )
}

function RollOverlay({ phase, value }) {
  const isResult = phase === 'result'

  return (
    <div className="afbg-roll-overlay" aria-live="polite">
      <section className="afbg-roll-stage">
        <img className="afbg-roll-glow" src={antiFraudBoardAssets.game.diceGlow} alt="" draggable="false" />
        {isResult ? (
          <>
            <div className="afbg-roll-result-wrap">
              <img src={antiFraudBoardAssets.game.diceResult} alt="" draggable="false" />
            </div>
            <img className="afbg-roll-result-text" src={antiFraudBoardAssets.game.diceResultText} alt="" draggable="false" />
            <div className="afbg-roll-value">{value}</div>
          </>
        ) : (
          <>
            <div className="afbg-roll-dice-wrap">
              <img src={antiFraudBoardAssets.game.diceRolling} alt="" draggable="false" />
            </div>
            <img className="afbg-roll-wait-text" src={antiFraudBoardAssets.game.diceRollingText} alt="" draggable="false" />
          </>
        )}
      </section>
    </div>
  )
}

function QuestionOverlay({ question, onAnswer }) {
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [referenceVisible, setReferenceVisible] = useState(false)
  const optionIcons = [
    antiFraudBoardAssets.game.optionA,
    antiFraudBoardAssets.game.optionB,
    antiFraudBoardAssets.game.optionC,
  ]

  const submitAnswer = () => {
    if (selectedIndex === null) return
    onAnswer(selectedIndex)
  }

  return (
    <div className="afbg-mask">
      <section className="afbg-question-stage" aria-live="polite">
        <img className="afbg-question-bg" src={antiFraudBoardAssets.game.questionCard} alt="" draggable="false" />
        <div className="afbg-question-title">
          <div className="afbg-question-title-inner">{question.title}</div>
          {question.referenceImage ? (
            <button
              className="afbg-question-reference-trigger"
              type="button"
              onClick={() => setReferenceVisible(true)}
            >
              （点击查看图片）
            </button>
          ) : null}
        </div>
        <div className="afbg-options" role="radiogroup" aria-label="请选择答案">
          {question.options.map((option, index) => (
            <button
              key={option}
              className={`afbg-option ${selectedIndex === index ? 'is-selected' : ''}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              role="radio"
              aria-checked={selectedIndex === index}
            >
              <img
                className="afbg-option-icon"
                src={optionIcons[index] || antiFraudBoardAssets.game.optionA}
                alt=""
                draggable="false"
              />
              <span className="afbg-option-copy">{option}</span>
            </button>
          ))}
        </div>
        <button
          className="afbg-question-submit"
          type="button"
          onClick={submitAnswer}
          disabled={selectedIndex === null}
          aria-label="提交答案"
        >
          <img src={antiFraudBoardAssets.game.nextButton} alt="" draggable="false" />
        </button>
      </section>
      {referenceVisible ? (
        <button
          className="afbg-question-reference-mask"
          type="button"
          onClick={() => setReferenceVisible(false)}
          aria-label="关闭题目参考图片"
        >
          <img className="afbg-question-reference-image" src={question.referenceImage} alt="题目参考图片" draggable="false" />
        </button>
      ) : null}
    </div>
  )
}

function FeedbackOverlay({ feedback, onContinue }) {
  return (
    <div className="afbg-mask">
      <section className="afbg-feedback-stage" aria-live="polite">
        {feedback.correct ? (
          <img
            className="afbg-feedback-correct-panel"
            src={antiFraudBoardAssets.game.correctAnswerPanel}
            alt=""
            draggable="false"
          />
        ) : (
          <>
            <img
              className="afbg-feedback-wrong-panel"
              src={antiFraudBoardAssets.game.answerPanel}
              alt=""
              draggable="false"
            />
            <div className="afbg-feedback-analysis">
              <div className="afbg-feedback-heading">答案解析</div>
              <div className="afbg-feedback-underline" />
              <div className="afbg-feedback-copy">{feedback.analysis}</div>
            </div>
          </>
        )}
        <button className="afbg-feedback-hitarea" type="button" onClick={onContinue} aria-label="继续" />
      </section>
    </div>
  )
}

function SuccessOverlay({ onGoPoster }) {
  return (
    <div className="afbg-mask">
      <section className="afbg-success-stage">
        <img className="afbg-success-panel" src={antiFraudBoardAssets.game.successPanel} alt="" draggable="false" />
        <img className="afbg-success-poster-image" src={antiFraudBoardAssets.game.posterButton} alt="" draggable="false" />
        <button className="afbg-success-hitarea" type="button" onClick={onGoPoster} aria-label="查看海报" />
      </section>
    </div>
  )
}

function PosterPage({ activityKey, allCorrect, onReplay }) {
  const [posterUrl, setPosterUrl] = useState('')
  const [posterError, setPosterError] = useState('')
  const [composeVersion, setComposeVersion] = useState(0)
  const qrSourceRef = useRef(null)
  const activityUrl = useMemo(() => getPosterActivityUrl(activityKey), [activityKey])
  const labels = useMemo(() => (
    allCorrect
      ? { left: '所向披靡', right: '高' }
      : { left: '火眼金睛', right: '中' }
  ), [allCorrect])

  useEffect(() => {
    let cancelled = false
    let retryTimer = null
    let attempts = 0

    function composePoster() {
      const qrCanvas = qrSourceRef.current?.querySelector('canvas')
      if (!qrCanvas || !qrCanvas.width || !qrCanvas.height) {
        attempts += 1
        if (attempts < 30) {
          retryTimer = window.setTimeout(composePoster, 50)
        } else if (!cancelled) {
          setPosterError('二维码生成失败，请点击重试')
        }
        return
      }
      renderPosterImage({
        leftLabel: labels.left,
        rightLabel: labels.right,
        qrCanvas,
      })
        .then((url) => {
          if (!cancelled) {
            setPosterUrl(url)
            setPosterError('')
          }
        })
        .catch((error) => {
          console.error('反诈棋盘海报合成失败', error)
          if (!cancelled) setPosterError('海报生成失败，点击重试')
        })
    }

    composePoster()

    return () => {
      cancelled = true
      if (retryTimer) window.clearTimeout(retryTimer)
    }
  }, [composeVersion, labels])

  return (
    <>
      <DesignStage className="afbg-poster" shellClassName="afbg-poster-shell" fit="width">
        <LayerImage src={antiFraudBoardAssets.poster.card} style={{ left: 11, top: 74 + POSTER_CONTENT_OFFSET_Y, width: 351, height: 530 }} />
        <LayerImage src={antiFraudBoardAssets.poster.title} style={{ left: 45, top: 5 + POSTER_CONTENT_OFFSET_Y, width: 282, height: 170 }} />
        <LayerImage src={antiFraudBoardAssets.poster.footer} style={{ left: 6, top: 618 + POSTER_CONTENT_OFFSET_Y, width: 361, height: 85 }} />
        <div className="afbg-poster-label" style={{ left: 56, top: 396 + POSTER_CONTENT_OFFSET_Y }}>{labels.left}</div>
        <div className="afbg-poster-label" style={{ left: 224, top: 396 + POSTER_CONTENT_OFFSET_Y }}>{labels.right}</div>
        <LayerImage src={antiFraudBoardAssets.poster.badge} style={{ left: 61, top: 469 + POSTER_CONTENT_OFFSET_Y, width: 256, height: 40 }} />
        <div
          ref={qrSourceRef}
          className="afbg-poster-qrcode"
          style={{
            left: POSTER_QR_LEFT,
            top: POSTER_QR_TOP,
            width: POSTER_QR_SIZE,
            height: POSTER_QR_SIZE,
            padding: POSTER_QR_BORDER,
          }}
        >
          <QRCodeCanvas
            value={activityUrl}
            size={256}
            level="M"
            includeMargin={false}
            style={{ width: POSTER_QR_CONTENT_SIZE, height: POSTER_QR_CONTENT_SIZE }}
          />
        </div>
        <button className="afbg-replay-hitarea" type="button" onClick={onReplay} aria-label="再玩一次" />
        {posterUrl ? (
          <img
            className="afbg-poster-generated"
            src={posterUrl}
            alt="反诈棋盘游戏海报，长按图片即可保存"
            draggable="false"
          />
        ) : null}
        {posterError ? (
          <button
            className="afbg-poster-retry"
            type="button"
            onClick={() => {
              setPosterUrl('')
              setPosterError('')
              setComposeVersion((value) => value + 1)
            }}
          >
            {posterError}
          </button>
        ) : null}
      </DesignStage>
    </>
  )
}

export default function AntiFraudBoardGameApp({ routeParams }) {
  const activityKey = routeParams?.activityKey || ANTI_FRAUD_BOARD_GAME_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [page, setPage] = useState(PAGE.HOME)
  const [position, setPosition] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [moving, setMoving] = useState(false)
  const [rollPhase, setRollPhase] = useState(null)
  const [rollValue, setRollValue] = useState(null)
  const [question, setQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [success, setSuccess] = useState(false)
  const [rollCount, setRollCount] = useState(0)
  const [hasWrongAnswer, setHasWrongAnswer] = useState(false)
  const [showHomeOrientationPrompt, setShowHomeOrientationPrompt] = useState(false)
  const isLandscape = useIsLandscape()
  const questionDeckRef = useRef([])
  const questionTargetRef = useRef(MIN_QUESTION_COUNT)
  const correctSoundRef = useRef(null)
  const wrongSoundRef = useRef(null)
  const moveTimerRef = useRef(null)
  const rollTimerRef = useRef(null)
  const rollResultTimerRef = useRef(null)
  const homeOrientationTimerRef = useRef(null)

  const title = useMemo(() => {
    if (activityKey === ANTI_FRAUD_BOARD_GAME_ACTIVITY_KEY) return '识假防骗 从你我每一次警惕开始'
    return '识假防骗'
  }, [activityKey])
  const bgmConfig = useMemo(() => {
    const configuredBgm = publicConfig?.bgmConfig || publicConfig?.mobileConfig?.bgm
    if (!configuredBgm || typeof configuredBgm !== 'object') return configuredBgm

    const configuredVolume = Number(configuredBgm.volume)
    const volume = configuredBgm.volume == null || !Number.isFinite(configuredVolume) ? 1 : configuredVolume
    return {
      ...configuredBgm,
      volume: Math.min(Math.max(volume, 0), ANTI_FRAUD_BGM_VOLUME),
    }
  }, [publicConfig])

  useEffect(() => {
    document.title = title
  }, [title])

  useEffect(() => {
    let cancelled = false
    request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })
      .then((config) => {
        if (!cancelled) setPublicConfig(config)
      })
      .catch(() => {
        if (!cancelled) setPublicConfig({})
      })
    return () => {
      cancelled = true
    }
  }, [activityKey])

  useEffect(() => {
    if (page !== PAGE.GAME || success) return undefined
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [page, success])

  useEffect(() => () => {
    window.clearTimeout(moveTimerRef.current)
    window.clearTimeout(rollTimerRef.current)
    window.clearTimeout(rollResultTimerRef.current)
    window.clearTimeout(homeOrientationTimerRef.current)
  }, [])

  const resetGame = useCallback(() => {
    window.clearTimeout(moveTimerRef.current)
    window.clearTimeout(rollTimerRef.current)
    window.clearTimeout(rollResultTimerRef.current)
    window.clearTimeout(homeOrientationTimerRef.current)
    setPosition(0)
    setElapsed(0)
    setMoving(false)
    setRollPhase(null)
    setRollValue(null)
    setQuestion(null)
    setFeedback(null)
    setSuccess(false)
    setRollCount(0)
    setHasWrongAnswer(false)
    questionDeckRef.current = []
    questionTargetRef.current = getQuestionTarget()
  }, [])

  const playAnswerSound = useCallback((correct) => {
    const audio = correct ? correctSoundRef.current : wrongSoundRef.current
    if (!audio) return
    audio.currentTime = 0
    audio.volume = ANSWER_SOUND_VOLUME
    audio.play().catch(() => {})
  }, [])

  const handleStart = useCallback(() => {
    resetGame()
    setShowHomeOrientationPrompt(true)
    homeOrientationTimerRef.current = window.setTimeout(() => {
      setShowHomeOrientationPrompt(false)
      setPage(PAGE.GAME)
    }, HOME_ORIENTATION_PROMPT_MS)
  }, [resetGame])

  const showQuestionAt = useCallback((nextPosition) => {
    if (!questionDeckRef.current.length) questionDeckRef.current = createQuestionDeck()
    const bankIndex = questionDeckRef.current.pop()
    setQuestion({ ...QUESTION_BANK[bankIndex], position: nextPosition })
  }, [])

  const handleRoll = useCallback(() => {
    if (moving || question || feedback || success) return
    const remainingSteps = FINISH_INDEX - position
    const remainingQuestions = questionTargetRef.current - rollCount
    const roll = getConstrainedRoll(remainingSteps, remainingQuestions)
    const target = position + roll
    setMoving(true)
    setRollPhase('rolling')
    setRollValue(null)

    let next = position
    const finishMove = () => {
      setMoving(false)
      setRollCount((count) => count + 1)
      showQuestionAt(target)
    }

    const moveOneStep = () => {
      next += 1
      setPosition(next)
      if (next >= target) {
        moveTimerRef.current = window.setTimeout(finishMove, MOVE_STEP_MS)
        return
      }
      moveTimerRef.current = window.setTimeout(moveOneStep, MOVE_STEP_MS)
    }

    rollTimerRef.current = window.setTimeout(() => {
      setRollValue(roll)
      setRollPhase('result')
      rollResultTimerRef.current = window.setTimeout(() => {
        setRollPhase(null)
        moveOneStep()
      }, ROLL_RESULT_MS)
    }, ROLLING_MS)
  }, [feedback, moving, position, question, rollCount, showQuestionAt, success])

  const handleAnswer = useCallback((answerIndex) => {
    if (!question) return
    const correct = answerIndex === question.answerIndex
    playAnswerSound(correct)
    if (!correct) setHasWrongAnswer(true)
    setFeedback({
      correct,
      analysis: question.analysis,
      isFinal: question.position >= FINISH_INDEX,
    })
    setQuestion(null)
  }, [playAnswerSound, question])

  const handleContinue = useCallback(() => {
    if (feedback?.isFinal) setSuccess(true)
    setFeedback(null)
  }, [feedback])

  const handleGoPoster = useCallback(() => {
    setPage(PAGE.POSTER)
  }, [])

  const handleReplay = useCallback(() => {
    resetGame()
    setShowHomeOrientationPrompt(false)
    setPage(PAGE.HOME)
  }, [resetGame])

  return (
    <>
      {page === PAGE.HOME ? (
        <>
          <HomePage onStart={handleStart} />
          {showHomeOrientationPrompt ? <OrientationPrompt /> : null}
        </>
      ) : null}
      {page === PAGE.GAME ? (
        <BoardScene
          position={position}
          moving={moving}
          elapsed={elapsed}
          rollPhase={rollPhase}
          rollValue={rollValue}
          question={question}
          feedback={feedback}
          success={success}
          onRoll={handleRoll}
          onAnswer={handleAnswer}
          onContinue={handleContinue}
          onGoPoster={handleGoPoster}
          showLandscapePrompt={isLandscape}
        />
      ) : null}
      {page === PAGE.POSTER ? <PosterPage activityKey={activityKey} allCorrect={!hasWrongAnswer} onReplay={handleReplay} /> : null}
      <ActivityBgmPlayer bgm={bgmConfig} activityKey={activityKey} />
      <audio ref={correctSoundRef} src={antiFraudBoardAssets.game.correctSound} preload="auto" aria-hidden="true" />
      <audio ref={wrongSoundRef} src={antiFraudBoardAssets.game.wrongSound} preload="auto" aria-hidden="true" />
    </>
  )
}
