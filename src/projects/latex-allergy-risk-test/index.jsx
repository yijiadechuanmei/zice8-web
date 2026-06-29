import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOutlined,
  CheckOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
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

const WECHAT_LAUNCH_OPTIONS = { openTagList: ['wx-open-launch-weapp'] }

function isWechatBrowser() {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)
}

function isMiniProgramEnabled(miniProgram) {
  return Boolean(miniProgram?.enabled && miniProgram.username && miniProgram.path)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function miniProgramPath(miniProgram) {
  if (!miniProgram?.query) return miniProgram?.path || ''
  const separator = miniProgram.path.includes('?') ? '&' : '?'
  return `${miniProgram.path}${separator}${miniProgram.query}`
}

function pickRandomImage(images) {
  if (!images.length) return ''
  return images[Math.floor(Math.random() * images.length)]
}

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
  const productCarouselImages = useMemo(
    () => (config.productCarouselImages || [])
      .map((filename) => assetUrl(config.assetsBaseUrl, filename))
      .filter(Boolean),
    [config.assetsBaseUrl, config.productCarouselImages],
  )
  const miniProgramEnabled = isMiniProgramEnabled(config.miniProgram)
  const currentQuestion = QUESTIONS[questionIndex]
  const selectedIds = answers[currentQuestion?.id] || []
  const scores = useMemo(() => getSelectedScoreMap(answers), [answers])
  const totalScore = useMemo(
    () => Object.values(scores).reduce((total, score) => total + score, 0),
    [scores],
  )
  const resultLevel = useMemo(() => getResultLevel(totalScore), [totalScore])

  useWechatShare(activityKey, publicConfig, undefined, miniProgramEnabled ? WECHAT_LAUNCH_OPTIONS : undefined)

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
          resultLevel={resultLevel}
          miniProgram={config.miniProgram}
          logoImage={logoImage}
          productCarouselImages={productCarouselImages}
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
      <div className="latex-hero-badge">7.8世界过敏日·特别策划</div>
      <div className="latex-eyebrow">别让敏感 困住亲密</div>
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
          <p
            className={question.knowledge.highlights?.includes(paragraph) ? 'latex-knowledge-highlight' : undefined}
            key={paragraph}
          >
            {paragraph}
          </p>
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

function StorePreviewButton({ label, onClick }) {
  return (
    <button className="latex-primary-button" type="button" onClick={onClick}>
      <ShoppingCartOutlined />
      <span>{label}</span>
    </button>
  )
}

function StorePreviewModal({ image, miniProgram, onClose, onFallback }) {
  const enabled = isMiniProgramEnabled(miniProgram)
  const path = enabled ? miniProgramPath(miniProgram) : ''
  const envVersion = miniProgram?.envVersion || 'release'
  const inWechat = isWechatBrowser()
  const launchRef = useRef(null)
  const escapedImage = escapeHtml(image)
  const template = `
    <style>
      .latex-store-launch-template {
        appearance: none;
        box-sizing: border-box;
        display: block;
        width: 100%;
        padding: 0;
        border: 0;
        background: transparent;
      }
      .latex-store-launch-template img {
        display: block;
        width: 100%;
        max-height: 68vh;
        object-fit: contain;
        border-radius: 18px;
      }
    </style>
    <button class="latex-store-launch-template" type="button">
      <img src="${escapedImage}" alt="">
    </button>
  `

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (enabled && inWechat) {
        launchRef.current?.click?.()
        return
      }
      const fallbackUrl = miniProgram?.fallbackUrl
      if (fallbackUrl) {
        window.location.href = fallbackUrl
        return
      }
      onFallback?.()
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [enabled, inWechat, miniProgram?.fallbackUrl, onFallback])

  function handleFallbackLaunch() {
    const fallbackUrl = miniProgram?.fallbackUrl
    if (fallbackUrl) {
      window.location.href = fallbackUrl
      return
    }
    onFallback?.()
  }

  return (
    <div className="latex-store-modal-mask" role="dialog" aria-modal="true" aria-label="杰士邦仿生皮产品图">
      <div className="latex-store-modal-panel">
        {enabled && inWechat ? (
          <wx-open-launch-weapp
            class="latex-store-launch-open-tag"
            username={miniProgram.username}
            path={path}
            env-version={envVersion}
            ref={launchRef}
          >
            <script type="text/wxtag-template" dangerouslySetInnerHTML={{ __html: template }} />
          </wx-open-launch-weapp>
        ) : (
          <button
            className="latex-store-modal-image-button"
            type="button"
            onClick={handleFallbackLaunch}
            aria-label="查看杰士邦仿生皮"
          >
            <img className="latex-store-modal-image" src={image} alt="杰士邦仿生皮产品图" />
          </button>
        )}
        <button className="latex-store-modal-close" type="button" onClick={onClose} aria-label="关闭">
          <CloseOutlined />
        </button>
      </div>
    </div>
  )
}

function ProductCarousel({ images }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return undefined
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length)
    }, 2800)
    return () => window.clearInterval(timer)
  }, [images.length])

  if (!images.length) return null

  return (
    <div className="latex-product-carousel" aria-label="杰士邦仿生皮产品图">
      <div className="latex-product-carousel-track">
        {images.map((image, index) => (
          <img
            alt={`杰士邦仿生皮产品图 ${index + 1}`}
            className={index === activeIndex ? 'is-active' : ''}
            key={image}
            src={image}
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        ))}
      </div>
      {images.length > 1 ? (
        <div className="latex-product-carousel-dots" aria-hidden="true">
          {images.map((image, index) => (
            <i className={index === activeIndex ? 'is-active' : ''} key={image} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ResultPage({ answers, scores, resultLevel, miniProgram, logoImage, productCarouselImages, onStore }) {
  const [shareVisible, setShareVisible] = useState(false)
  const [storePreviewImage, setStorePreviewImage] = useState('')
  const ctaLabel = onStore ? '前往微信店铺选购' : resultLevel.cta

  function openStorePreview() {
    const previewImage = pickRandomImage(productCarouselImages)
    if (!previewImage) {
      onStore?.()
      return
    }
    setStorePreviewImage(previewImage)
  }

  return (
    <>
      <section className="latex-result latex-page-in" aria-label="测试结果页" style={{ '--risk-color': resultLevel.color }}>
        <p className="latex-result-kicker">你的乳胶过敏风险等级</p>
        <div className="latex-gauge">
          <div className="latex-gauge-ring">
            <strong>{resultLevel.label}</strong>
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
          <StorePreviewButton label={ctaLabel} onClick={openStorePreview} />
          <p>{resultLevel.subcopy}</p>
          <button className="latex-ghost-button" type="button" onClick={() => setShareVisible(true)}>
            <span>点击分享给朋友测试</span>
          </button>
        </div>

        <footer className="latex-result-footer">
          <p>本测试参考 WAO/EAACI 国际过敏指南设计</p>
          <p>仅作健康科普参考，不构成医学诊断。如有不适请咨询专业医生。</p>
          <ProductCarousel images={productCarouselImages} />
          <div className="latex-result-brand">
            {logoImage ? (
              <img
                className="latex-result-logo"
                src={logoImage}
                alt="品牌标识"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            ) : null}
            <strong>7月8日杰士邦仿生皮 · 世界过敏日特别策划</strong>
          </div>
        </footer>
      </section>

      {shareVisible ? (
        <div className="latex-share-mask" role="button" tabIndex={0} onClick={() => setShareVisible(false)}>
          <div className="latex-share-panel">
            <div className="latex-share-cue" aria-hidden="true">
              <svg className="latex-share-arrow" viewBox="0 0 120 120" focusable="false" aria-hidden="true">
                <path d="M24 92C34 53 61 31 100 25" />
                <path d="M76 10L102 24L88 52" />
              </svg>
            </div>
            <p>点击右上角分享给朋友测试</p>
          </div>
        </div>
      ) : null}

      {storePreviewImage ? (
        <StorePreviewModal
          image={storePreviewImage}
          miniProgram={miniProgram}
          onClose={() => setStorePreviewImage('')}
          onFallback={onStore}
        />
      ) : null}
    </>
  )
}
