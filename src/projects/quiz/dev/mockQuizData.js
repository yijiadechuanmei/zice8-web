export const mockBootstrap = {
  activity: {
    title: '智汇风云 思维盛宴',
  },
  remainingTodayAttempts: 2,
  remainingTotalAttempts: 6,
  profileCompleted: false,
  canStart: true,
}

export const mockProfile = {
  name: '张三',
  department: '市场部',
  errorMessage: '信息未匹配，请确认姓名和部门',
}

export const mockQuestionSingle = {
  attemptId: 'preview-attempt-single',
  totalQuestions: 6,
  currentQuestionSort: 1,
  remainingSeconds: 8,
  currentQuestion: {
    questionId: 'preview-question-single',
    questionSort: 1,
    title: '以下哪一项最符合端午节传统习俗？',
    type: 'single',
    timeLimitSeconds: 10,
    options: [
      { id: 'a', label: 'A', content: '赛龙舟' },
      { id: 'b', label: 'B', content: '赏菊花' },
      { id: 'c', label: 'C', content: '登高望远' },
      { id: 'd', label: 'D', content: '吃月饼' },
    ],
  },
}

export const mockQuestionMultiple = {
  attemptId: 'preview-attempt-multiple',
  totalQuestions: 6,
  currentQuestionSort: 2,
  remainingSeconds: 9,
  currentQuestion: {
    questionId: 'preview-question-multiple',
    questionSort: 2,
    title: '以下哪些内容通常与端午文化相关？',
    type: 'multiple',
    timeLimitSeconds: 10,
    options: [
      { id: 'a', label: 'A', content: '龙舟竞渡' },
      { id: 'b', label: 'B', content: '粽叶飘香' },
      { id: 'c', label: 'C', content: '艾草驱邪' },
      { id: 'd', label: 'D', content: '菊花雅集' },
      { id: 'e', label: 'E', content: '五彩绳祈福' },
    ],
  },
}

export const mockQuestionLongText = {
  attemptId: 'preview-attempt-long',
  totalQuestions: 6,
  currentQuestionSort: 3,
  remainingSeconds: 6,
  currentQuestion: {
    questionId: 'preview-question-long',
    questionSort: 3,
    title: '在企业文化活动中，若以“端午知识竞答 + 团队协作”作为主题，以下哪项描述最能体现“传统文化传播与组织协同”这两个目标的结合？',
    type: 'single',
    timeLimitSeconds: 10,
    options: [
      { id: 'a', label: 'A', content: '仅强调节日布景陈列，不组织互动学习，也不引导员工跨部门协作参与。' },
      { id: 'b', label: 'B', content: '将知识问答、节俗体验、团队积分和部门协同机制结合，让员工在参与中理解文化内涵与组织目标。' },
      { id: 'c', label: 'C', content: '只保留节日海报宣传，把活动改为单纯拍照打卡，弱化文化传播和互动机制。' },
      { id: 'd', label: 'D', content: '把活动完全外包，不保留企业内部参与机制，也不沉淀员工学习反馈。' },
    ],
  },
}

export const mockQuestionSixOptions = {
  attemptId: 'preview-attempt-six',
  totalQuestions: 6,
  currentQuestionSort: 4,
  remainingSeconds: 7,
  currentQuestion: {
    questionId: 'preview-question-six',
    questionSort: 4,
    title: '以下哪些元素可作为端午主题视觉创作素材？',
    type: 'multiple',
    timeLimitSeconds: 10,
    options: [
      { id: 'a', label: 'A', content: '粽子' },
      { id: 'b', label: 'B', content: '龙舟' },
      { id: 'c', label: 'C', content: '艾草' },
      { id: 'd', label: 'D', content: '香囊' },
      { id: 'e', label: 'E', content: '五彩绳' },
      { id: 'f', label: 'F', content: '屈原主题插画' },
    ],
  },
}

export const mockResult = {
  totalScore: 80,
  totalTimeMs: 53700,
  correctCount: 4,
  wrongCount: 2,
  timeoutCount: 1,
  rankInfo: {
    rank: 3,
  },
}

export const mockRankEmpty = []

export const mockRankList = [
  { userId: '1', rank: 1, participantName: '王小龙', department: '市场部', totalScore: 120, totalTimeMs: 43800 },
  { userId: '2', rank: 2, participantName: '李海波', department: '运营部', totalScore: 110, totalTimeMs: 46200 },
  { userId: '3', rank: 3, participantName: '赵雨晴', department: '技术部', totalScore: 100, totalTimeMs: 53700 },
  { userId: '4', rank: 4, participantName: '陈立', department: '综合部', totalScore: 95, totalTimeMs: 54100 },
  { userId: '5', rank: 5, participantName: '周宁', department: '财务部', totalScore: 90, totalTimeMs: 55200 },
  { userId: '6', rank: 6, participantName: '孙可', department: '市场部', totalScore: 88, totalTimeMs: 55900 },
  { userId: '7', rank: 7, participantName: '郑晓梅', department: '技术部', totalScore: 86, totalTimeMs: 57300 },
  { userId: '8', rank: 8, participantName: '吴松', department: '运营部', totalScore: 82, totalTimeMs: 58800 },
  { userId: '9', rank: 9, participantName: '冯洁', department: '综合部', totalScore: 80, totalTimeMs: 60100 },
  { userId: '10', rank: 10, participantName: '褚一鸣', department: '其他', totalScore: 78, totalTimeMs: 62900 },
]

export const mockRankLongText = mockRankList.map((item, index) => ({
  ...item,
  userId: `long-${item.userId}`,
  rank: index + 1,
  participantName: `${item.participantName}·华东大区品牌传播专项项目组`,
  department: `${item.department}·企业文化与组织协同推进办公室`,
}))

export const previewFeedbackMap = {
  correct: {
    isCorrect: true,
    isTimeout: false,
    selectedOptions: ['A'],
    correctOptions: ['A'],
  },
  wrong: {
    isCorrect: false,
    isTimeout: false,
    selectedOptions: ['B'],
    correctOptions: ['A'],
  },
  timeout: {
    isCorrect: false,
    isTimeout: true,
    selectedOptions: [],
    correctOptions: ['A'],
  },
}
