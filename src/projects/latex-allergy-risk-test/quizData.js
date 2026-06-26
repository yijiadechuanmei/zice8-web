export const QUESTIONS = [
  {
    id: 'q1',
    dimension: '职业暴露',
    title: '你是否从事以下职业或曾长期接触橡胶手套？',
    multiple: true,
    noneOption: 'E',
    maxScore: 4,
    options: [
      { id: 'A', text: '医护/牙科相关（医生、护士、护理员等）', score: 1 },
      { id: 'B', text: '实验室或科研（经常佩戴防护手套）', score: 1 },
      { id: 'C', text: '美发、美容或家务清洁（长期使用橡胶手套）', score: 1 },
      { id: 'D', text: '食品加工或餐饮（佩戴手套处理食材）', score: 1 },
      { id: 'E', text: '以上均无', score: 0 },
    ],
    knowledge: {
      title: '职业暴露是乳胶过敏重要的后天风险因素',
      body: [
        '乳胶手套中的天然乳胶蛋白可经皮肤吸收或粉末吸入致敏。',
        '医护人员乳胶过敏患病率达 8%–17%，远超普通人群的 1%–2%。',
        '如果你选择了 A–D 中的任何一项，意味着你的免疫系统可能已长期接触乳胶蛋白。日常中选用无乳胶的个人护理产品，是降低持续暴露的有效方式。',
      ],
      highlights: [
        '乳胶手套中的天然乳胶蛋白可经皮肤吸收或粉末吸入致敏。',
      ],
      reference: '参考：WAO 乳胶过敏综述 (Parisi et al., 2021)；CDC 医护人员乳胶过敏监测数据',
    },
  },
  {
    id: 'q2',
    dimension: '食物交叉过敏',
    title: '你在吃以下哪些食物时，曾出现过嘴唇/口腔发痒、肿胀或喉咙不适？',
    multiple: true,
    noneOption: 'E',
    maxScore: 12,
    options: [
      { id: 'A', text: '香蕉', score: 3 },
      { id: 'B', text: '牛油果', score: 3 },
      { id: 'C', text: '猕猴桃', score: 3 },
      { id: 'D', text: '栗子', score: 3 },
      { id: 'E', text: '以上均无', score: 0 },
    ],
    knowledge: {
      title: '乳胶-水果综合征：你的免疫系统在「误认」',
      body: [
        '当你吃香蕉、牛油果、猕猴桃、栗子嘴唇发痒时，免疫系统可能「认错」了。这些水果与天然乳胶含有相同的 Hev b 致敏蛋白。',
        '这种现象叫「乳胶-水果综合征」。临床数据显示：30%–50% 有上述食物交叉反应的人，同时也是乳胶过敏的潜在高危人群。',
        '你对这些水果的反应越明显，乳胶过敏的可能性就越高。',
      ],
      highlights: [
        '你对这些水果的反应越明显，乳胶过敏的可能性就越高。',
      ],
      reference: '参考：Gromek et al., JCM 2024；WAO/EAACI 过敏指南',
    },
  },
  {
    id: 'q3',
    dimension: '过敏体质',
    title: '以下描述哪项符合你的情况？',
    multiple: true,
    noneOption: 'E',
    maxScore: 4,
    options: [
      { id: 'A', text: '有过敏性鼻炎或季节性打喷嚏、流涕', score: 1 },
      { id: 'B', text: '有湿疹或特应性皮炎病史', score: 1 },
      { id: 'C', text: '有哮喘或运动后反复喘息史', score: 1 },
      { id: 'D', text: '对花粉、尘螨、宠物毛发有明确过敏反应', score: 1 },
      { id: 'E', text: '以上均无', score: 0 },
    ],
    knowledge: {
      title: '过敏体质，是乳胶过敏最大的先天隐患',
      body: [
        '如果你本身容易过敏，免疫系统本身就比普通人更「警觉」。',
        '这种体质的人，遇到乳胶蛋白时更容易「记住」它，下次再接触就可能起反应。',
        '数据显示：有过敏家族史或多重过敏史的人，乳胶过敏风险是普通人的数倍。',
      ],
      highlights: [
        '数据显示：有过敏家族史或多重过敏史的人，乳胶过敏风险是普通人的数倍。',
      ],
      reference: '参考：WAO 乳胶过敏综述；EAACI 过敏指南',
    },
  },
  {
    id: 'q4',
    dimension: '日常隐形势原',
    title: '以下哪些场景你曾出现过皮肤不适？',
    multiple: true,
    noneOption: 'D',
    maxScore: 6,
    options: [
      { id: 'A', text: '吹气球后用纸擦嘴，发现嘴唇稍肿或痒', score: 2 },
      { id: 'B', text: '戴橡胶家务手套后，手掌发红或起小疹', score: 2 },
      { id: 'C', text: '穿弹力腰带/松紧内衣后腰间瘙痒', score: 2 },
      { id: 'D', text: '以上均无', score: 0 },
    ],
    knowledge: {
      title: '乳胶比你想象的更无处不在',
      body: [
        '气球、家务手套、内衣松紧带、牙科橡皮障、泳帽密封圈，乳胶远比你以为的更无处不在。',
        '如果多个场景同时出现反应，提示你的免疫系统可能已经「记住」了乳胶蛋白，这是系统性致敏的信号。',
        '与其每天躲避无处不在的乳胶，不如从你最常接触的那一件开始，换一种选择。',
      ],
      highlights: [
        '如果多个场景同时出现反应，提示你的免疫系统可能已经「记住」了乳胶蛋白，这是系统性致敏的信号。',
      ],
      reference: '参考：DermNet NZ - Latex Allergy；UpToDate 临床综述',
    },
  },
  {
    id: 'q5',
    dimension: '安全套直接接触',
    title: '你在使用过乳胶安全套后，是否出现过以下任一症状？',
    multiple: true,
    noneOption: 'D',
    maxScore: 6,
    options: [
      { id: 'A', text: '接触部位立刻出现瘙痒、灼热疼痛、红疹，停用后慢慢消退', score: 5 },
      { id: 'B', text: '接触部位在半小时后出现瘙痒、灼热疼痛、红疹', score: 3 },
      { id: 'C', text: '接触部位在48-72小时后出现瘙痒、灼热疼痛、红疹', score: 1 },
      { id: 'D', text: '没有任何不适', score: 0 },
    ],
    knowledge: {
      title: '这是乳胶过敏最直接的信号',
      body: [
        '接触部位出现瘙痒、灼热疼痛、红疹并停用后消退，是 IgE 介导的 I 型接触性荨麻疹的典型表现。',
        '即使只是轻微灼热感，也不应忽视。长期反复接触可能导致皮肤增生、苔藓样改变或色素沉着，严重者甚至可能出现呼吸困难、血压降低休克等表现。',
        '聚异戊二烯材质的仿生皮安全套不含天然乳胶蛋白，可从源头消除过敏原。',
      ],
      highlights: [
        '即使只是轻微灼热感，也不应忽视。长期反复接触可能导致皮肤增生、苔藓样改变或色素沉着，严重者甚至可能出现呼吸困难、血压降低休克等表现。',
      ],
      reference: '参考：WAO/EAACI 诊断指南；UpToDate - Latex Allergy Diagnosis',
    },
  },
]

export const RESULT_LEVELS = [
  {
    id: 'low',
    min: 0,
    max: 3,
    label: '较低',
    dots: 1,
    color: '#52b788',
    title: '你目前的乳胶过敏风险较低',
    description: '在全球约 1%–6% 的乳胶过敏人群中，你目前不在高风险区间。但乳胶过敏可能在反复接触后逐步产生，每一份在意自己的身体，都值得被认真对待。',
    cta: '了解杰士邦仿生皮，从材质源头规避未来风险',
    subcopy: '仿生皮材质 + 玻尿酸润滑，不含天然乳胶蛋白',
  },
  {
    id: 'mid-low',
    min: 4,
    max: 8,
    label: '中等偏低',
    dots: 2,
    color: '#f2c94c',
    title: '存在一定的乳胶过敏隐患',
    description: '全球约有 1%–6% 的人面临乳胶过敏风险，你的部分指标出现信号。这可能意味着免疫系统对乳胶蛋白已有一定敏感度。无需过度担心，但值得关注。',
    cta: '换用杰士邦仿生皮，给身体更温柔的选择',
    subcopy: '仿生肤感 + 无乳胶配方，敏感肌也安心',
  },
  {
    id: 'mid-high',
    min: 9,
    max: 15,
    label: '中等偏高',
    dots: 3,
    color: '#f2994a',
    title: '乳胶过敏可能性较高',
    description: '多个维度同时出现阳性信号。在全球 1%–6% 的乳胶过敏人群中，你可能属于需要重点关注的那一部分。建议就医确诊，同时从现在开始，替自己选一个更安心的答案。',
    cta: '杰士邦仿生皮 · 医学科普验证的无乳胶方案',
    subcopy: '从源头消除乳胶过敏原，不妥协亲密体验',
  },
  {
    id: 'high',
    min: 16,
    max: Infinity,
    label: '偏高',
    dots: 4,
    color: '#e85d75',
    title: '建议就医评估，并优先避免乳胶接触',
    description: '多个关键维度呈现强阳性。如果你曾在使用乳胶制品后出现过过敏症状，请务必就医。对乳胶过敏的人来说，每一次接触都不是小事，你值得一个不必担心的选择。',
    cta: '杰士邦仿生皮 · 不含乳胶蛋白的安心之选',
    subcopy: '全球过敏人群信赖的无乳胶亲密方案',
  },
]

export function scoreQuestion(question, selectedIds = []) {
  if (!selectedIds.length || selectedIds.includes(question.noneOption)) return 0
  if (question.id !== 'q5') {
    const scoreById = new Map(question.options.map((option) => [option.id, option.score]))
    return selectedIds.reduce((total, id) => total + Number(scoreById.get(id) || 0), 0)
  }

  const scores = { A: 5, B: 3, C: 1, D: 0 }
  const highest = selectedIds.reduce((max, id) => Math.max(max, scores[id] || 0), 0)
  const hasImmediate = selectedIds.includes('A') || selectedIds.includes('B')
  const hasDelayed = selectedIds.includes('C')
  return Math.min(highest + (hasImmediate && hasDelayed ? 1 : 0), 6)
}

export function getResultLevel(totalScore) {
  return RESULT_LEVELS.find((level) => totalScore >= level.min && totalScore <= level.max) || RESULT_LEVELS[0]
}

export function getDimensionStatus(question, selectedIds = [], score = 0) {
  if (!selectedIds.length || selectedIds.includes(question.noneOption) || score <= 0) return '未触发'
  if (question.id === 'q5') return selectedIds.includes('A') || selectedIds.includes('B') ? '直接反应' : '已触发'
  if (question.id === 'q2' && score >= 6) return '高风险信号'
  if (score >= Math.max(3, question.maxScore * 0.6)) return '高风险信号'
  return '已触发'
}
