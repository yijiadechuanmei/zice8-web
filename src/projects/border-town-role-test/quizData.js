export const ROLES = {
  cuicui: {
    id: 'cuicui',
    name: '翠翠',
    rangeLabel: '5-8 分',
    title: '你是茶峒山水滋养出的大自然儿女，纯粹干净，眸子清亮如山间溪水。',
    description: [
      '平日里天真活泼又乖巧孝顺，常主动帮爷爷分担渡口琐事；心思细腻内敛，面对情愫格外含蓄被动，满心欢喜只会悄悄藏在心底。对待心上人一往情深、执着专一，不懂争抢、不愿伤人，即便满心委屈，依旧温柔善待世间万物。',
      '骨子里自带山野赋予的柔软天真，像白塔旁缓缓流淌的河水、渡口轻柔的晚风，安静又治愈。心上人离去后，你抱着满心期许静静等候，忠于心底那份独一份的温柔，是全书最干净通透的灵魂。',
    ],
    comment: '青山渡水，温柔藏心，你是人间最纯粹的月光。',
  },
  grandpa: {
    id: 'grandpa',
    name: '老船夫（爷爷）',
    rangeLabel: '9-12 分',
    title: '你是旁人心中踏实可靠、温柔宽厚的守护者。',
    description: [
      '一生守着渡口本分度日，摆渡数十载分文不取，淳朴善良、重义轻利，凡事总先顾及身边人的冷暖，习惯默默付出、包容所有人。毕生心愿便是护好翠翠，为她的婚事处处筹谋、思虑深远，愿意扛下所有生活苦难，从不愿让孙女受半分委屈。',
      '但你骨子里过分谦卑谨慎，遇事优柔寡断，顾虑太多反而常常错失良机。满心皆是善意，却因不懂直白袒露心意，无形中酿成难以弥补的遗憾，如同常年停靠岸边的渡船，承载着满船烟火，也藏着一身无人知晓的纠结与心酸。',
    ],
    comment: '半生渡人，一生向善，你是世人最安稳的归途。',
  },
  tianbao: {
    id: 'tianbao',
    name: '天保大佬',
    rangeLabel: '13-16 分',
    title: '你坦荡憨厚、成熟稳重，一身豪爽大气的烟火气质。',
    description: [
      '为人真诚直白、不拘小节，心思纯粹从不扭捏矫情，格外看重兄弟情义与人情道义。明知自己深爱翠翠，得知弟弟早已动心后，便大方主动成全，爱意坦荡，放下时体面通透，从无半分怨怼。',
      '不贪浮华浪漫，一心向往踏实安稳的寻常日子，遇事沉着冷静，待人宽厚包容，是身边人可以全然托付、值得信赖依靠的人。甘愿独自外出闯滩消解心事，把遗憾藏在心底，独留温柔与成全给旁人。',
    ],
    comment: '磊落坦荡，温润宽厚，人间最靠谱的烟火凡人。',
  },
  nuosong: {
    id: 'nuosong',
    name: '傩送二佬',
    rangeLabel: '17-20 分',
    title: '你是一身少年意气，藏着浪漫与自由的茶峒少年。',
    description: [
      '样貌俊秀、擅长山歌，勤勉果敢、热忱赤诚，骨子里挣脱世俗束缚，不为碾坊财富、豪门联姻所动摇，一心追寻灵魂契合的真挚爱意，敢爱敢恨，愿意为心上人奔赴山野、奔赴远方。',
      '性格洒脱细腻，待人永远热烈赤诚，可内心也藏着无法释怀的挣扎与愧疚。兄长的意外离世成为跨不过的心结，一边放不下纯粹的爱意，一边困于对兄长的亏欠，最终选择独自远走，在热爱与愧疚之间长久矛盾徘徊。鲜活耀眼，却也背负着独属于自己的遗憾。',
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
