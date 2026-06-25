import { useEffect, useMemo, useState } from 'react'
import {
  BookOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getLatexAllergyRiskTestPublicConfig } from './api'
import {
  assetUrl,
  LATEX_ALLERGY_RISK_TEST_ACTIVITY_KEY,
  LATEX_ALLERGY_RISK_TEST_ACTIVITY_TYPE,
  mergeConfig,
} from './config'
import {
  getDimensionStatus,
  getResultLevel,
  QUESTIONS,
  scoreQuestion,
} from './quizData'
import './styles.css'

const INTRO_CARDS = [
  { icon: QuestionCircleOutlined, text: '5道选择题\n快速筛查' },
  { icon: InfoCircleOutlined, text: '每题答完\n即时科普' },
  { icon: SafetyCertificateOutlined, text: '边测边学' },
]

function getSelectedScoreMap(answers) {
  return QUESTIONS.reduce((result, question) => {
    result[question.id] = scoreQuestion(question, answers[question.id] || [])
    return result
  }, {})
}

export default function LatexAllergyRiskTestProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || LATEX_ALLERGY_RISK_TEST_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [step, setStep] = useState('landing')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [knowledgeVisible, setKnowledgeVisible] = useState(false)
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig])
  const backgroundImage = assetUrl(config.assetsBaseUrl, config.backgroundImage)
  const logoImage = assetUrl(config.assetsBaseUrl, config.logoImage)
  const currentQuestion = QUESTIONS[questionIndex]
  const selectedIds = answers[currentQuestion?.id] || []
  const scores = useMemo(() => getSelectedScoreMap(answers), [answers])
  const totalScore = useMemo(
    () => Object.values(scores).reduce((total, score) => total + score, 0),
    [scores],
  )
  const resultLevel = useMemo(() => getResultLevel(totalScore), [totalScore])

  useWechatShare(activityKey, publicConfig)

  useEffect(() => {
    let cancelled = false
    getLatexAllergyRiskTestPublicConfig(activityKey)
      .then((data) => {
        if (!cancelled) setPublicConfig(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activityKey])

  useEffect(() => {
    document.title = publicConfig?.title || '乳胶过敏风险自测'
    trackPageView(activityKey, '/latex-allergy-risk-test', {
      activityType: publicConfig?.type || LATEX_ALLERGY_RISK_TEST_ACTIVITY_TYPE,
      pageKey: step,
    })
  }, [activityKey, publicConfig, step])

  function startTest() {
    setStep('quiz')
    setQuestionIndex(0)
    setKnowledgeVisible(false)
    trackEvent({
      activityKey,
      eventType: 'enter_activity',
      page: '/latex-allergy-risk-test',
      extra: { pageKey: 'landing', eventName: 'start_test' },
    })
  }

  function toggleOption(optionId) {
    if (!currentQuestion || knowledgeVisible) return
    const noneOption = currentQuestion.noneOption
    setAnswers((current) => {
      const currentIds = current[currentQuestion.id] || []
      let nextIds
      if (optionId === noneOption) {
        nextIds = currentIds.includes(optionId) ? [] : [optionId]
      } else {
        const withoutNone = currentIds.filter((id) => id !== noneOption)
        nextIds = withoutNone.includes(optionId)
          ? withoutNone.filter((id) => id !== optionId)
          : [...withoutNone, optionId]
      }
      return { ...current, [currentQuestion.id]: nextIds }
    })
  }

  function submitQuestion() {
    if (!selectedIds.length) return
    setKnowledgeVisible(true)
    trackEvent({
      activityKey,
      eventType: 'submit_profile',
      page: '/latex-allergy-risk-test',
      extra: {
        pageKey: currentQuestion.id,
        eventName: 'submit_question',
        score: scoreQuestion(currentQuestion, selectedIds),
      },
    })
  }

  function nextQuestion() {
    setKnowledgeVisible(false)
    if (questionIndex >= QUESTIONS.length - 1) {
      setStep('result')
      return
    }
    setQuestionIndex((current) => current + 1)
  }

  function restart() {
    setAnswers({})
    setQuestionIndex(0)
    setKnowledgeVisible(false)
    setStep('landing')
  }

  function goStore() {
    if (!config.storeUrl) return
    trackEvent({
      activityKey,
      eventType: 'external_link_click',
      page: '/latex-allergy-risk-test',
      extra: { label: '微信店铺', url: config.storeUrl },
    })
    window.location.href = config.storeUrl
  }

  return (
    <main
      className="latex-test-app"
      style={backgroundImage ? { '--latex-bg-image': `url("${backgroundImage}")` } : undefined}
    >
      {step === 'landing' ? <LandingPage logoImage={logoImage} onStart={startTest} /> : null}
      {step === 'quiz' ? (
        <QuizPage
          question={currentQuestion}
          questionIndex={questionIndex}
          selectedIds={selectedIds}
          knowledgeVisible={knowledgeVisible}
          onToggle={toggleOption}
          onSubmit={submitQuestion}
          onNext={nextQuestion}
        />
      ) : null}
      {step === 'result' ? (
        <ResultPage
          answers={answers}
          scores={scores}
          totalScore={totalScore}
          resultLevel={resultLevel}
          onRestart={restart}
          onStore={config.storeUrl ? goStore : null}
        />
      ) : null}
    </main>
  )
}

function LandingPage({ logoImage, onStart }) {
  return (
    <section className="latex-landing latex-page-in" aria-label="乳胶过敏风险自测封面页">
      {logoImage ? (
        <img
          className="latex-brand-logo"
          src={logoImage}
          alt="品牌标识"
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      ) : null}
      <div className="latex-hero-badge">别让敏感 困住亲密</div>
      <div className="latex-eyebrow">· 世 界 过 敏 日 · 特 别 策 划 ·</div>
      <h1 className="latex-title">乳胶过敏<br />风险自测</h1>
      <p className="latex-subtitle">
        全球约 1%–6% 的人对天然乳胶存在过敏风险
        <span>5道题 · 2分钟 · 了解你的真实状况</span>
      </p>

      <div className="latex-intro-cards" aria-label="测试特点">
        {INTRO_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <div className="latex-intro-card" key={card.text}>
              <span className="latex-card-orb"><Icon /></span>
              <span className="latex-card-line" />
              <strong>{card.text.split('\n').map((line) => <span key={line}>{line}</span>)}</strong>
            </div>
          )
        })}
      </div>

      <button className="latex-primary-button" type="button" onClick={onStart}>
        <span>点击测试</span>
        <RightOutlined />
      </button>

      <footer className="latex-disclaimer">
        <p><BookOutlined /> 基于临床文献设计，参考国际过敏学会 (WAO) 诊断指南</p>
        <p><SafetyCertificateOutlined /> 本测试仅供参考，不作为医学诊断依据。如有症状请咨询专业医生。</p>
      </footer>
    </section>
  )
}

function QuizPage({ question, questionIndex, selectedIds, knowledgeVisible, onToggle, onSubmit, onNext }) {
  return (
    <section className="latex-quiz latex-page-in" aria-label={`第 ${questionIndex + 1} 题`}>
      <div className="latex-progress">
        <span>{String(questionIndex + 1).padStart(2, '0')}</span>
        <div><i style={{ width: `${((questionIndex + 1) / QUESTIONS.length) * 100}%` }} /></div>
        <span>{QUESTIONS.length}</span>
      </div>

      <article className="latex-question-panel">
        <p className="latex-question-label">{question.dimension}</p>
        <h2>{question.title}</h2>
        <p className="latex-question-tip">可多选，选择“以上均无/没有任何不适”会自动清空其他选项。</p>
        <div className="latex-options">
          {question.options.map((option) => {
            const selected = selectedIds.includes(option.id)
            return (
              <button
                type="button"
                className={`latex-option${selected ? ' is-selected' : ''}`}
                key={option.id}
                onClick={() => onToggle(option.id)}
                disabled={knowledgeVisible}
              >
                <span>{option.id}</span>
                <strong>{option.text}</strong>
                {selected ? <CheckOutlined /> : null}
              </button>
            )
          })}
        </div>
      </article>

      <button
        className="latex-submit-button"
        type="button"
        onClick={onSubmit}
        disabled={!selectedIds.length || knowledgeVisible}
      >
        提交本题
      </button>

      {knowledgeVisible ? (
        <KnowledgeSheet question={question} isLast={questionIndex === QUESTIONS.length - 1} onNext={onNext} />
      ) : null}
    </section>
  )
}

function KnowledgeSheet({ question, isLast, onNext }) {
  return (
    <div className="latex-sheet-backdrop" role="presentation">
      <article className="latex-knowledge-sheet" aria-label="知识解析">
        <span className="latex-sheet-handle" />
        <p className="latex-sheet-kicker">知识解析</p>
        <h3>{question.knowledge.title}</h3>
        {question.knowledge.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <small>{question.knowledge.reference}</small>
        <button className="latex-primary-button latex-sheet-button" type="button" onClick={onNext}>
          <span>{isLast ? '查看测试结果' : '继续下一题'}</span>
          <RightOutlined />
        </button>
      </article>
    </div>
  )
}

function ResultPage({ answers, scores, totalScore, resultLevel, onRestart, onStore }) {
  return (
    <section className="latex-result latex-page-in" aria-label="测试结果页" style={{ '--risk-color': resultLevel.color }}>
      <p className="latex-result-kicker">你的乳胶过敏风险等级</p>
      <div className="latex-gauge">
        <div className="latex-gauge-ring">
          <strong>{resultLevel.label}</strong>
          <span>{totalScore} 分</span>
        </div>
        <div className="latex-risk-dots">
          {[1, 2, 3, 4].map((dot) => (
            <i key={dot} className={dot <= resultLevel.dots ? 'is-active' : ''} />
          ))}
        </div>
      </div>

      <article className="latex-result-card">
        <h1>{resultLevel.title}</h1>
        <p>{resultLevel.description}</p>
      </article>

      <div className="latex-dimension-table">
        <h2>分维度分析</h2>
        {QUESTIONS.map((question) => {
          const selectedIds = answers[question.id] || []
          const status = getDimensionStatus(question, selectedIds, scores[question.id] || 0)
          return (
            <div className="latex-dimension-row" key={question.id}>
              <span>{question.dimension}</span>
              <strong>{status}</strong>
            </div>
          )
        })}
      </div>

      <div className="latex-result-actions">
        <button className="latex-primary-button" type="button" onClick={onStore || undefined}>
          <ShoppingCartOutlined />
          <span>{onStore ? '前往微信店铺选购' : resultLevel.cta}</span>
        </button>
        <p>{resultLevel.subcopy}</p>
        <button className="latex-ghost-button" type="button" onClick={onRestart}>
          <ReloadOutlined />
          <span>重新测试</span>
        </button>
      </div>

      <footer className="latex-result-footer">
        <p>本测试参考 WAO/EAACI 国际过敏指南设计</p>
        <p>仅作健康科普参考，不构成医学诊断。如有不适请咨询专业医生。</p>
        <strong>杰士邦仿生皮 · 世界过敏日特别策划</strong>
      </footer>
    </section>
  )
}
