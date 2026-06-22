import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
const DESIGN_HEIGHT = 724
const FINISH_INDEX = BOARD_POINTS.length - 1
const MOVE_INTERVAL_MS = 330
const SUCCESS_TO_POSTER_MS = 1000

function useDesignScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      const width = window.innerWidth || DESIGN_WIDTH
      const height = window.innerHeight || DESIGN_HEIGHT
      setScale(Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    window.addEventListener('orientationchange', updateScale)
    return () => {
      window.removeEventListener('resize', updateScale)
      window.removeEventListener('orientationchange', updateScale)
    }
  }, [])

  return scale
}

function DesignStage({ className = '', children }) {
  const scale = useDesignScale()

  return (
    <main className="afbg-shell">
      <div
        className={`afbg-stage ${className}`}
        style={{ '--afbg-scale': scale }}
      >
        {children}
      </div>
    </main>
  )
}

function LayerImage({ className = '', src, style, alt = '' }) {
  return <img className={`afbg-layer-image ${className}`} src={src} style={style} alt={alt} draggable="false" />
}

function HomePage({ onStart }) {
  return (
    <DesignStage className="afbg-home">
      <LayerImage src={antiFraudBoardAssets.home.topRibbon} style={{ left: 9, top: 18, width: 355, height: 40 }} />
      <LayerImage src={antiFraudBoardAssets.home.title} style={{ left: 44, top: 73, width: 288, height: 213 }} />
      <LayerImage src={antiFraudBoardAssets.home.subtitle} style={{ left: 53, top: 305, width: 267, height: 49 }} />
      <LayerImage src={antiFraudBoardAssets.home.mascot} style={{ left: 59, top: 406, width: 252, height: 185 }} />
      <button className="afbg-image-button afbg-start-button" type="button" onClick={onStart} aria-label="开始游戏">
        <LayerImage src={antiFraudBoardAssets.home.startButton} />
      </button>
      <LayerImage src={antiFraudBoardAssets.home.footer} style={{ left: 30, top: 691, width: 313, height: 18 }} />
    </DesignStage>
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
  lastRoll,
  elapsed,
  question,
  feedback,
  success,
  onRoll,
  onAnswer,
  onContinue,
  onGoPoster,
}) {
  const currentPoint = BOARD_POINTS[position] || BOARD_POINTS[0]

  return (
    <DesignStage className="afbg-game">
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
            <LayerImage className="afbg-roll-hint" src={antiFraudBoardAssets.game.prompt} />
          ) : null}
        </button>
        <div className="afbg-step-text" style={{ left: 96, top: 312 }}>{lastRoll || position} 步</div>
        <div className="afbg-time-text" style={{ left: 91, top: 39 }}>{formatElapsed(elapsed)}</div>
      </div>

      {question ? <QuestionOverlay question={question} onAnswer={onAnswer} /> : null}
      {feedback ? <FeedbackOverlay feedback={feedback} onContinue={onContinue} /> : null}
      {success ? <SuccessOverlay onGoPoster={onGoPoster} /> : null}
    </DesignStage>
  )
}

function QuestionOverlay({ question, onAnswer }) {
  return (
    <div className="afbg-mask">
      <section className="afbg-question-card" aria-live="polite">
        <LayerImage className="afbg-question-bg" src={antiFraudBoardAssets.game.questionCard} />
        <div className="afbg-question-title">{question.title}</div>
        <div className="afbg-options">
          {question.options.map((option, index) => (
            <button
              key={option}
              className="afbg-option"
              type="button"
              onClick={() => onAnswer(index)}
            >
              <img
                src={[
                  antiFraudBoardAssets.game.optionA,
                  antiFraudBoardAssets.game.optionB,
                  antiFraudBoardAssets.game.optionC,
                ][index] || antiFraudBoardAssets.game.optionA}
                alt=""
                draggable="false"
              />
              <span>{option}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function FeedbackOverlay({ feedback, onContinue }) {
  return (
    <div className="afbg-mask">
      <section className="afbg-feedback-card">
        <div className={`afbg-feedback-status ${feedback.correct ? 'is-correct' : 'is-wrong'}`}>
          {feedback.correct ? '答对啦' : '答错啦'}
        </div>
        <div className="afbg-feedback-heading">答案解析</div>
        <p>{feedback.analysis}</p>
        <button className="afbg-next-button" type="button" onClick={onContinue} aria-label="继续">
          <img src={antiFraudBoardAssets.game.nextButton} alt="" draggable="false" />
        </button>
      </section>
    </div>
  )
}

function SuccessOverlay({ onGoPoster }) {
  return (
    <div className="afbg-mask">
      <section className="afbg-success-card">
        <img src={antiFraudBoardAssets.game.successPanel} alt="" draggable="false" />
        <button className="afbg-poster-button" type="button" onClick={onGoPoster} aria-label="查看海报">
          <img src={antiFraudBoardAssets.game.posterButton} alt="" draggable="false" />
        </button>
      </section>
    </div>
  )
}

function PosterPage({ onReplay }) {
  return (
    <DesignStage className="afbg-poster">
      <div className="afbg-poster-text afbg-poster-end">答题结束<br />成绩排名敬请期待</div>
      <LayerImage src={antiFraudBoardAssets.poster.card} style={{ left: 11, top: 74, width: 351, height: 530 }} />
      <LayerImage src={antiFraudBoardAssets.poster.title} style={{ left: 45, top: 5, width: 282, height: 170 }} />
      <LayerImage src={antiFraudBoardAssets.poster.footer} style={{ left: 6, top: 618, width: 361, height: 85 }} />
      <div className="afbg-poster-label" style={{ left: 56, top: 396 }}>火眼金睛</div>
      <div className="afbg-poster-label" style={{ left: 224, top: 396 }}>中</div>
      <LayerImage src={antiFraudBoardAssets.poster.badge} style={{ left: 61, top: 469, width: 256, height: 40 }} />
      <button className="afbg-replay-hitarea" type="button" onClick={onReplay} aria-label="再玩一次" />
    </DesignStage>
  )
}

export default function AntiFraudBoardGameApp({ routeParams }) {
  const activityKey = routeParams?.activityKey || ANTI_FRAUD_BOARD_GAME_ACTIVITY_KEY
  const [page, setPage] = useState(PAGE.HOME)
  const [position, setPosition] = useState(0)
  const [lastRoll, setLastRoll] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [moving, setMoving] = useState(false)
  const [question, setQuestion] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [success, setSuccess] = useState(false)
  const [questionOffset, setQuestionOffset] = useState(0)
  const audioRef = useRef(null)
  const successTimerRef = useRef(null)

  const title = useMemo(() => {
    if (activityKey === ANTI_FRAUD_BOARD_GAME_ACTIVITY_KEY) return '识假防骗 从你我每一次警惕开始'
    return '识假防骗'
  }, [activityKey])

  useEffect(() => {
    document.title = title
  }, [title])

  useEffect(() => {
    if (page !== PAGE.GAME || success) return undefined
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [page, success])

  useEffect(() => () => window.clearTimeout(successTimerRef.current), [])

  const playBgm = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.45
    audio.play().catch(() => {})
  }, [])

  const resetGame = useCallback(() => {
    window.clearTimeout(successTimerRef.current)
    setPosition(0)
    setLastRoll(0)
    setElapsed(0)
    setMoving(false)
    setQuestion(null)
    setFeedback(null)
    setSuccess(false)
    setQuestionOffset(0)
  }, [])

  const handleStart = useCallback(() => {
    resetGame()
    setPage(PAGE.GAME)
    playBgm()
  }, [playBgm, resetGame])

  const showQuestionAt = useCallback((nextPosition) => {
    const bankIndex = (nextPosition + questionOffset) % QUESTION_BANK.length
    setQuestion({ ...QUESTION_BANK[bankIndex], position: nextPosition })
    setQuestionOffset((value) => value + 1)
  }, [questionOffset])

  const handleRoll = useCallback(() => {
    if (moving || question || feedback || success) return
    const roll = Math.floor(Math.random() * 3) + 1
    const target = Math.min(position + roll, FINISH_INDEX)
    setLastRoll(roll)
    setMoving(true)

    let next = position
    const timer = window.setInterval(() => {
      next += 1
      setPosition(next)
      if (next >= target) {
        window.clearInterval(timer)
        setMoving(false)
        if (target >= FINISH_INDEX) {
          setSuccess(true)
          successTimerRef.current = window.setTimeout(() => {
            setPage(PAGE.POSTER)
          }, SUCCESS_TO_POSTER_MS)
          return
        }
        showQuestionAt(target)
      }
    }, MOVE_INTERVAL_MS)
  }, [feedback, moving, position, question, showQuestionAt, success])

  const handleAnswer = useCallback((answerIndex) => {
    if (!question) return
    const correct = answerIndex === question.answerIndex
    setFeedback({
      correct,
      analysis: question.analysis,
    })
    setQuestion(null)
  }, [question])

  const handleContinue = useCallback(() => {
    setFeedback(null)
  }, [])

  const handleGoPoster = useCallback(() => {
    window.clearTimeout(successTimerRef.current)
    setPage(PAGE.POSTER)
  }, [])

  const handleReplay = useCallback(() => {
    resetGame()
    setPage(PAGE.HOME)
  }, [resetGame])

  return (
    <>
      {page === PAGE.HOME ? <HomePage onStart={handleStart} /> : null}
      {page === PAGE.GAME ? (
        <BoardScene
          position={position}
          moving={moving}
          lastRoll={lastRoll}
          elapsed={elapsed}
          question={question}
          feedback={feedback}
          success={success}
          onRoll={handleRoll}
          onAnswer={handleAnswer}
          onContinue={handleContinue}
          onGoPoster={handleGoPoster}
        />
      ) : null}
      {page === PAGE.POSTER ? <PosterPage onReplay={handleReplay} /> : null}
      <audio ref={audioRef} src={antiFraudBoardAssets.bgm} loop preload="none" />
    </>
  )
}
