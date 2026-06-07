const QUIZ_ASSET_PREFIX = '/quiz/dragon-boat-2026'

export const quizAssets = {
  common: {
    bg: `${QUIZ_ASSET_PREFIX}/quiz-common-bg.png`,
    logoSnow: `${QUIZ_ASSET_PREFIX}/quiz-common-logo-snow.png`,
    logoEvent: `${QUIZ_ASSET_PREFIX}/quiz-common-logo-event.png`,
    panelMask: `${QUIZ_ASSET_PREFIX}/quiz-common-panel-mask.png`,
    panelCard: `${QUIZ_ASSET_PREFIX}/quiz-common-panel-card.png`,
    buttonHome: `${QUIZ_ASSET_PREFIX}/quiz-common-button-home.png`,
  },
  rule: {
    content: `${QUIZ_ASSET_PREFIX}/quiz-rule-content.png`,
    buttonHome: `${QUIZ_ASSET_PREFIX}/quiz-rule-button-home.png`,
  },
  profile: {
    title: `${QUIZ_ASSET_PREFIX}/quiz-profile-title.png`,
    subtitleTip: `${QUIZ_ASSET_PREFIX}/quiz-profile-subtitle-tip.png`,
    labelName: `${QUIZ_ASSET_PREFIX}/quiz-profile-label-name.png`,
    labelDepartment: `${QUIZ_ASSET_PREFIX}/quiz-profile-label-department.png`,
    buttonStart: `${QUIZ_ASSET_PREFIX}/quiz-profile-button-start.png`,
  },
  question: {
    panelMask: `${QUIZ_ASSET_PREFIX}/quiz-question-panel-mask.png`,
    progressBg: `${QUIZ_ASSET_PREFIX}/quiz-question-progress-bg.png`,
    titleOrder: `${QUIZ_ASSET_PREFIX}/quiz-question-title-order.png`,
    countdownBg: `${QUIZ_ASSET_PREFIX}/quiz-question-countdown-bg.png`,
    countdownNumber: `${QUIZ_ASSET_PREFIX}/quiz-question-countdown-number.png`,
    cardTitle: `${QUIZ_ASSET_PREFIX}/quiz-question-card-title.png`,
    optionBg: `${QUIZ_ASSET_PREFIX}/quiz-question-option-bg.png`,
    optionBadge: `${QUIZ_ASSET_PREFIX}/quiz-question-option-badge.png`,
    optionLabelA: `${QUIZ_ASSET_PREFIX}/quiz-question-option-label-a.png`,
  },
  result: {
    titleScore: `${QUIZ_ASSET_PREFIX}/quiz-result-title-score.png`,
    labelScore: `${QUIZ_ASSET_PREFIX}/quiz-result-label-score.png`,
    labelTime: `${QUIZ_ASSET_PREFIX}/quiz-result-label-time.png`,
    buttonRank: `${QUIZ_ASSET_PREFIX}/quiz-result-button-rank.png`,
  },
  rank: {
    title: `${QUIZ_ASSET_PREFIX}/quiz-rank-title.png`,
    tableHeader: `${QUIZ_ASSET_PREFIX}/quiz-rank-panel-table-header.png`,
  },
}

export function formatQuizDuration(ms) {
  return `${(Number(ms || 0) / 1000).toFixed(1)} 秒`
}
