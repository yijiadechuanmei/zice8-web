const DEFAULT_QUIZ_ASSET_BASE_URL = 'https://assets.zice8.com/quiz/dragon-boat-2026'
const QUIZ_ASSET_BASE_URL = (
  import.meta.env.VITE_QUIZ_ASSET_BASE_URL ||
  DEFAULT_QUIZ_ASSET_BASE_URL
).replace(/\/$/, '')

export const QUIZ_VERSION = '20260608-quiz-v3'

export function quizAsset(name) {
  return `${QUIZ_ASSET_BASE_URL}/${name}`
}

export const quizAssets = {
  common: {
    bg: quizAsset('quiz-common-bg.png'),
    logoSnow: quizAsset('quiz-common-logo-snow.png'),
    logoEvent: quizAsset('quiz-common-logo-event.png'),
    panelMask: quizAsset('quiz-common-panel-mask.png'),
    panelCard: quizAsset('quiz-common-panel-card.png'),
    buttonHome: quizAsset('quiz-common-button-home.png'),
  },
  home: {
    bg: quizAsset('quiz-home-bg.png'),
    logo: quizAsset('quiz-home-logo.png'),
    title: quizAsset('quiz-home-title.png'),
    subtitle: quizAsset('quiz-home-subtitle.png'),
    countTip: quizAsset('quiz-home-count-tip.png'),
    ruleButton: quizAsset('quiz-home-rule-btn.png'),
    startButton: quizAsset('quiz-home-start-btn.png'),
    rankButton: quizAsset('quiz-home-rank-btn.png'),
  },
  rule: {
    content: quizAsset('quiz-rule-content.png'),
    gift: quizAsset('quiz-rule-gift.png'),
    buttonHome: quizAsset('quiz-rule-button-home.png'),
  },
  profile: {
    title: quizAsset('quiz-profile-title.png'),
    subtitleTip: quizAsset('quiz-profile-subtitle-tip.png'),
    labelName: quizAsset('quiz-profile-label-name.png'),
    labelDepartment: quizAsset('quiz-profile-label-department.png'),
    buttonStart: quizAsset('quiz-profile-button-start.png'),
  },
  question: {
    panelMask: quizAsset('quiz-question-panel-mask.png'),
    progressBg: quizAsset('quiz-question-progress-bg.png'),
    titleOrder: quizAsset('quiz-question-title-order.png'),
    countdownBg: quizAsset('quiz-question-countdown-bg.png'),
    countdownNumber: quizAsset('quiz-question-countdown-number.png'),
    cardTitle: quizAsset('quiz-question-card-title.png'),
  },
  result: {
    titleScore: quizAsset('quiz-result-title-score.png'),
    labelScore: quizAsset('quiz-result-label-score.png'),
    labelTime: quizAsset('quiz-result-label-time.png'),
    buttonRank: quizAsset('quiz-result-button-rank.png'),
  },
  rank: {
    title: quizAsset('quiz-rank-title.png'),
    tableHeader: quizAsset('quiz-rank-panel-table-header.png'),
  },
}

export function formatQuizDuration(ms) {
  return `${(Number(ms || 0) / 1000).toFixed(1)} 秒`
}
