import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  ReloadOutlined,
  ShareAltOutlined,
} from '@ant-design/icons'
import { trackEvent, trackPageView } from '../../shared/analytics'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getBorderTownRoleTestPublicConfig } from './api'
import {
  assetUrl,
  BORDER_TOWN_ROLE_TEST_ACTIVITY_KEY,
  BORDER_TOWN_ROLE_TEST_ACTIVITY_TYPE,
  mergeConfig,
} from './config'
import { QUESTIONS, ROLES, SCORE_RANGES, getResultRole, scoreAnswers } from './quizData'
import './styles.css'

export default function BorderTownRoleTestProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || BORDER_TOWN_ROLE_TEST_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [step, setStep] = useState('landing')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [shareVisible, setShareVisible] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig])
  const heroImage = assetUrl(config.assetsBaseUrl, config.heroImage)
  const homeBackgroundImage = assetUrl(config.assetsBaseUrl, config.homeBackgroundImage)
  const pageBackgroundImage = assetUrl(
    config.assetsBaseUrl,
    config.pageBackgroundImage || config.homeBackgroundImage,
  )
  const homeIntroImage = assetUrl(config.assetsBaseUrl, config.homeIntroImage)
  const homeTitleImage = assetUrl(config.assetsBaseUrl, config.homeTitleImage)
  const homeButtonImage = assetUrl(config.assetsBaseUrl, config.homeButtonImage)
  const bgmConfig = publicConfig?.bgmConfig || publicConfig?.mobileConfig?.bgm || config.bgm
  const currentQuestion = QUESTIONS[questionIndex]
  const totalScore = useMemo(() => scoreAnswers(answers), [answers])
  const resultRole = useMemo(() => getResultRole(totalScore), [totalScore])
  const answeredCount = Object.keys(answers).length
  const progress = step === 'quiz' ? ((questionIndex + 1) / QUESTIONS.length) * 100 : 0

  useWechatShare(activityKey, publicConfig)

  useEffect(() => {
    let cancelled = false
    getBorderTownRoleTestPublicConfig(activityKey)
      .then((data) => {
        if (!cancelled) setPublicConfig(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activityKey])

  useEffect(() => {
    document.title = publicConfig?.title || '测测你是《边城》里的谁？'
    trackPageView(activityKey, '/border-town-role-test', {
      activityType: publicConfig?.type || BORDER_TOWN_ROLE_TEST_ACTIVITY_TYPE,
      pageKey: step,
    })
  }, [activityKey, publicConfig, step])

  function startTest() {
    setStep('quiz')
    setQuestionIndex(0)
    setAnswers({})
    setAdvancing(false)
    trackEvent({
      activityKey,
      eventType: 'enter_activity',
      page: '/border-town-role-test',
      extra: { pageKey: 'landing', eventName: 'start_test' },
    })
  }

  function selectOption(option) {
    if (advancing) return
    setAdvancing(true)
    const nextAnswers = { ...answers, [currentQuestion.id]: option.id }
    setAnswers(nextAnswers)
    trackEvent({
      activityKey,
      eventType: 'submit_profile',
      page: '/border-town-role-test',
      extra: {
        pageKey: currentQuestion.id,
        optionId: option.id,
        role: option.role,
      },
    })

    window.setTimeout(() => {
      if (questionIndex >= QUESTIONS.length - 1) {
        setStep('result')
      } else {
        setQuestionIndex((current) => current + 1)
      }
      setAdvancing(false)
    }, 180)
  }

  function previousQuestion() {
    setAdvancing(false)
    if (questionIndex <= 0) {
      setStep('landing')
      return
    }
    setQuestionIndex((current) => current - 1)
  }

  function restart() {
    setAnswers({})
    setQuestionIndex(0)
    setShareVisible(false)
    setAdvancing(false)
    setStep('landing')
  }

  return (
    <main
      className="border-town-app"
      style={{
        ...(heroImage ? { '--border-town-hero-image': `url("${heroImage}")` } : {}),
        ...(pageBackgroundImage ? { '--border-town-page-bg': `url("${pageBackgroundImage}")` } : {}),
      }}
    >
      {step === 'landing' ? (
        <LandingPage
          backgroundImage={homeBackgroundImage}
          buttonImage={homeButtonImage}
          introImage={homeIntroImage}
          onStart={startTest}
          titleImage={homeTitleImage}
        />
      ) : null}
      {step === 'quiz' ? (
        <QuizPage
          answer={answers[currentQuestion.id] || ''}
          advancing={advancing}
          progress={progress}
          question={currentQuestion}
          questionIndex={questionIndex}
          onBack={previousQuestion}
          onSelect={selectOption}
        />
      ) : null}
      {step === 'result' ? (
        <ResultPage
          answeredCount={answeredCount}
          resultRole={resultRole}
          totalScore={totalScore}
          onRestart={restart}
          onShare={() => setShareVisible(true)}
        />
      ) : null}
      {shareVisible ? <ShareOverlay onClose={() => setShareVisible(false)} /> : null}
      {bgmConfig?.enabled && bgmConfig?.url ? <ActivityBgmPlayer bgm={bgmConfig} activityKey={activityKey} /> : null}
    </main>
  )
}

function LandingPage({ backgroundImage, buttonImage, introImage, onStart, titleImage }) {
  return (
    <section className="border-town-landing border-town-page-in" aria-label="测测你是《边城》里的谁？">
      <div className="border-town-fixed-stage border-town-home-stage">
        {backgroundImage ? <img className="border-town-home-bg" src={backgroundImage} alt="" /> : null}
        {introImage ? <img className="border-town-home-intro-img" src={introImage} alt="" /> : null}
        {titleImage ? (
          <img className="border-town-home-title-img" src={titleImage} alt="测测你是《边城》里的谁？" />
        ) : (
          <div className="border-town-home-title-fallback">
            <h1>测测你是《边城》里的谁？</h1>
            <p>茶峒山水多情，世人各有风骨</p>
          </div>
        )}
        <div className="border-town-home-intro-fallback">
          <p>沈从文笔下的边城，藏尽世间温柔、纯粹与遗憾。</p>
          <p>温柔、坦荡、隐忍、热烈……</p>
          <p>走进山水茶峒，测测你的灵魂，最贴合书中哪一个人。</p>
        </div>
        <button className="border-town-home-start" type="button" onClick={onStart} aria-label="开始测试">
          {buttonImage ? <img src={buttonImage} alt="" /> : <span>开始测试</span>}
        </button>
      </div>
    </section>
  )
}

function QuizPage({ answer, advancing, progress, question, questionIndex, onBack, onSelect }) {
  return (
    <section className="border-town-quiz border-town-page-in" aria-label={`第 ${questionIndex + 1} 题`}>
      <div className="border-town-fixed-stage border-town-quiz-stage">
        <button className="border-town-back-button" type="button" onClick={onBack} aria-label="返回上一题">
          <ArrowLeftOutlined />
        </button>
        <header className="border-town-quiz-header">
          <p>第{questionIndex + 1}题 / 共{QUESTIONS.length}题</p>
          <div className="border-town-progress" aria-label={`答题进度 ${questionIndex + 1}/${QUESTIONS.length}`}>
            <i><b style={{ width: `${progress}%` }} /></i>
          </div>
        </header>

        <article className="border-town-question">
          <h2>{question.title}</h2>
        </article>

        <div className="border-town-options">
          {question.options.map((option) => {
            const selected = answer === option.id
            return (
              <button
                className={`border-town-option${selected ? ' is-selected' : ''}`}
                key={option.id}
                type="button"
                onClick={() => onSelect(option)}
                disabled={advancing}
              >
                <span>{option.id}</span>
                <strong>{option.text}</strong>
                {selected ? <CheckOutlined /> : null}
              </button>
            )
          })}
        </div>
        <button className="border-town-next-button" type="button" disabled>
          下一题
        </button>
      </div>
    </section>
  )
}

function ResultPage({ answeredCount, resultRole, totalScore, onRestart, onShare }) {
  return (
    <section className="border-town-result border-town-page-in" aria-label="测试结果">
      <div className="border-town-fixed-stage border-town-result-stage">
        <h1>测试结果</h1>
        <div className="border-town-result-name">你是：{resultRole.name}</div>

        <article className="border-town-result-copy">
          <h2>{resultRole.title}</h2>
          {resultRole.description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <p className="border-town-result-comment">专属评语：{resultRole.comment}</p>
        </article>

        <p className="border-town-score-note">
          已完成 {answeredCount}/{QUESTIONS.length} 题 · 总分 {totalScore}/20 分
        </p>
        <ScoreBars totalScore={totalScore} activeRoleId={resultRole.id} />

        <div className="border-town-actions">
          <button className="border-town-secondary-button" type="button" onClick={onRestart}>
            <ReloadOutlined />
            重新测试
          </button>
          <button className="border-town-secondary-button" type="button" onClick={onShare}>
            <ShareAltOutlined />
            分享结果
          </button>
        </div>
      </div>
    </section>
  )
}

function ScoreBars({ totalScore, activeRoleId }) {
  const maxScore = QUESTIONS.length * 4
  return (
    <div className="border-town-score-list" aria-label="分数区间">
      {SCORE_RANGES.map((range) => {
        const roleId = range.roleId
        const role = ROLES[roleId]
        const rangeMidpoint = (range.min + range.max) / 2
        const width = roleId === activeRoleId ? (totalScore / maxScore) * 100 : (rangeMidpoint / maxScore) * 100
        return (
          <div className={roleId === activeRoleId ? 'is-active' : ''} key={roleId}>
            <span>{role.name}</span>
            <i><b style={{ width: `${width}%` }} /></i>
            <strong>{role.rangeLabel}</strong>
          </div>
        )
      })}
    </div>
  )
}

function ShareOverlay({ onClose }) {
  return (
    <div className="border-town-share-mask" role="button" tabIndex={0} onClick={onClose}>
      <div className="border-town-share-panel">
        <svg viewBox="0 0 120 120" focusable="false" aria-hidden="true">
          <path d="M24 92C34 53 61 31 100 25" />
          <path d="M76 10L102 24L88 52" />
        </svg>
        <p>点击右上角分享给朋友测试</p>
      </div>
    </div>
  )
}
