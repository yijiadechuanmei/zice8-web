export const ROLES = {
  cuicui: {
    id: 'cuicui',
    name: '翠翠',
    rangeLabel: '5-8 分',
    title: '你是茶峒山水养出来的温柔灵魂，纯粹、干净、通透。',
    description: [
      '你心思细腻、不善言辞，习惯把心事悄悄藏在心底。对待感情羞涩又执着，不懂争抢、不愿伤人，宁愿自己委屈，也愿意温柔善待世界。',
      '你骨子里带着天然的天真与柔软，像白塔下的溪水、渡口边的晚风，安静治愈。你一生都在等待、在坚守，忠于本心、忠于温柔，是世间最干净纯粹的模样。',
    ],
    comment: '青山渡水，温柔藏心，你是人间最纯粹的月光。',
  },
  grandpa: {
    id: 'grandpa',
    name: '老船夫（爷爷）',
    rangeLabel: '9-12 分',
    title: '你是世间最靠谱、最温柔的守护者。',
    description: [
      '你一生淳朴善良、本分踏实，凡事优先为别人考虑，习惯性付出、习惯性包容。你不善言辞，却用一生的安稳与坚守，护着身边人的岁岁平安。',
      '你重情义、有底线、懂体谅，从不计较得失，宁愿自己辛苦，也不愿旁人受累。你就像渡口永远不缺席的渡船，默默承载人间烟火与温柔善意。',
    ],
    comment: '半生渡人，一生向善，你是世人最安稳的归途。',
  },
  tianbao: {
    id: 'tianbao',
    name: '天保大佬',
    rangeLabel: '13-16 分',
    title: '你坦荡憨厚、成熟稳重，自带坦荡大气的人格魅力。',
    description: [
      '你做人真诚直白、不扭捏、不矫情，重兄弟情义、懂人情世故。面对感情你清醒克制、懂得成全，爱得磊落、放得体面。',
      '你不追求虚无的浪漫，向往踏实安稳的生活，遇事沉稳、待人宽厚，是靠谱、值得托付一生的人。烟火寻常最动人，你自带安稳踏实的温柔。',
    ],
    comment: '磊落坦荡，温润宽厚，人间最靠谱的烟火凡人。',
  },
  nuosong: {
    id: 'nuosong',
    name: '傩送二佬',
    rangeLabel: '17-20 分',
    title: '你是骨子里藏着自由与浪漫的少年。',
    description: [
      '你鲜活热烈、敢爱敢恨、心性纯粹，不被世俗规矩束缚，忠于本心、忠于热爱。你温柔细腻又洒脱不羁，既有少年的傲气，也有独有的深情。',
      '你愿意为喜欢的人奔赴山海，愿意为真挚的感情长久守候。你不甘平庸、不愿将就，永远热烈、永远赤诚、永远向往自由与真爱。',
    ],
    comment: '山野有风，少年有梦，你是茶峒最热烈的风月。',
  },
}

export const ROLE_ORDER = ['cuicui', 'grandpa', 'tianbao', 'nuosong']

export const SCORE_RANGES = [
  { roleId: 'cuicui', min: 5, max: 8 },
  { roleId: 'grandpa', min: 9, max: 12 },
  { roleId: 'tianbao', min: 13, max: 16 },
  { roleId: 'nuosong', min: 17, max: 20 },
]

export const QUESTIONS = [
  {
    id: 'q1',
    title: '闲暇无事，你更偏爱哪种状态？',
    options: [
      { id: 'A', text: '一个人安静发呆、看风景', role: 'cuicui', score: 1 },
      { id: 'B', text: '帮家人、熟人处理琐事', role: 'grandpa', score: 2 },
      { id: 'C', text: '踏踏实实做点事，安稳度日', role: 'tianbao', score: 3 },
      { id: 'D', text: '结伴出游，喜欢自由热闹', role: 'nuosong', score: 4 },
    ],
  },
  {
    id: 'q2',
    title: '面对喜欢的人，你的状态更接近？',
    options: [
      { id: 'A', text: '默默暗恋，不敢主动，害怕打扰', role: 'cuicui', score: 1 },
      { id: 'B', text: '稳重克制，听从长辈安排、讲求分寸', role: 'grandpa', score: 2 },
      { id: 'C', text: '喜欢就直说，得不到就体面放手', role: 'tianbao', score: 3 },
      { id: 'D', text: '主动奔赴，愿意为爱意奔赴远方', role: 'nuosong', score: 4 },
    ],
  },
  {
    id: 'q3',
    title: '你和朋友同时喜欢一样东西，你会？',
    options: [
      { id: 'A', text: '默默退让，委屈自己成全他人', role: 'cuicui', score: 1 },
      { id: 'B', text: '尽量调和矛盾，谁都不想得罪', role: 'grandpa', score: 2 },
      { id: 'C', text: '主动成全朋友，道义优先', role: 'tianbao', score: 3 },
      { id: 'D', text: '遵从本心，公平争取不留遗憾', role: 'nuosong', score: 4 },
    ],
  },
  {
    id: 'q4',
    title: '遇到烦心事，你通常会？',
    options: [
      { id: 'A', text: '独自消化情绪，悄悄自愈', role: 'cuicui', score: 1 },
      { id: 'B', text: '藏起情绪，优先照顾别人感受', role: 'grandpa', score: 2 },
      { id: 'C', text: '冷静克制，快速调整状态', role: 'tianbao', score: 3 },
      { id: 'D', text: '坦然释放，不压抑自己本心', role: 'nuosong', score: 4 },
    ],
  },
  {
    id: 'q5',
    title: '你最向往的生活画面是？',
    options: [
      { id: 'A', text: '青山绿水，清净自在，岁月温柔', role: 'cuicui', score: 1 },
      { id: 'B', text: '守着一方渡口，迎来送往，安稳度日', role: 'grandpa', score: 2 },
      { id: 'C', text: '烟火寻常，踏实安稳，岁岁平安', role: 'tianbao', score: 3 },
      { id: 'D', text: '山野自由，随心而行，不负热爱', role: 'nuosong', score: 4 },
    ],
  },
]

export function scoreAnswers(answers) {
  return QUESTIONS.reduce((total, question) => {
    const selectedOptionId = answers[question.id]
    const selectedOption = question.options.find((option) => option.id === selectedOptionId)
    return total + (selectedOption?.score || 0)
  }, 0)
}

export function getResultRole(totalScore) {
  const matchedRange = SCORE_RANGES.find((range) => totalScore >= range.min && totalScore <= range.max)
  return ROLES[matchedRange?.roleId || ROLE_ORDER[0]]
}
