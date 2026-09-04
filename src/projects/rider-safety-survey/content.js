export const ACTIVITY_TYPE = "rider_safety_survey";
export const ACTIVITY_KEY = "rider_safety_survey_20260827";

export const questions = [
  {
    id: "q1",
    section: "一、基础信息",
    title: "你跑单多久了？",
    options: [
      ["new", "新手（<1年）"],
      ["regular", "老手（1-3年）"],
      ["veteran", "资深（>3年）"],
    ],
  },
  {
    id: "q2",
    section: "一、基础信息",
    title: "你是全职还是兼职？",
    options: [
      ["full_time", "全职"],
      ["part_time", "兼职"],
    ],
  },
  {
    id: "q3",
    section: "二、交通安全",
    title: "送单时突然要接单/看导航，你会怎么操作？",
    options: [
      ["stop_safely", "靠边停稳再看"],
      ["glance", "减速瞄一眼"],
      ["voice", "用耳机语音操作"],
      ["one_hand", "单手骑单手看"],
    ],
  },
  {
    id: "q4",
    section: "二、交通安全",
    title: "下雨天，在斑马线滑倒了，你第一反应是？",
    options: [
      ["continue", "赶紧爬起来继续送，收工再说"],
      ["preserve_evidence", "拍照保留现场，然后报警/联系站长"],
      ["private_settlement", "先私了，不惊动保险"],
    ],
  },
  {
    id: "q5",
    section: "三、职业伤害保障",
    title: "平台给外卖骑手上了“职业伤害保障”，你了解吗？",
    options: [
      ["never_heard", "完全没听过"],
      ["heard", "听过名字"],
      ["understand", "基本明白"],
      ["expert", "门儿清"],
    ],
  },
  {
    id: "q6",
    section: "三、职业伤害保障",
    title: "如果跑单时受伤了，你会优先走哪个？",
    options: [
      ["commercial", "平台商业意外险"],
      ["occupational", "职业伤害保障"],
      ["both", "两个都报"],
      ["unknown", "不知道选哪个"],
    ],
  },
  {
    id: "q7",
    section: "三、职业伤害保障",
    title: "有人说“给点抽成，我帮你多报点赔款”，你会？",
    options: [
      ["reject", "直接拒绝，自己走官方"],
      ["tempted", "有点心动"],
      ["used_agent", "已经找过中介"],
    ],
  },
  {
    id: "q8",
    section: "四、金融素养",
    title: "你最怕骑手保险哪一点？",
    hint: "可多选",
    multiple: true,
    options: [
      ["terms", "条款看不懂"],
      ["low_reimbursement", "报销钱少"],
      ["slow", "赔款太慢"],
      ["unknown_coverage", "不知道保了啥"],
      ["other", "其他"],
    ],
  },
  {
    id: "q9",
    section: "四、金融素养",
    title: "在保险理赔过程中，遇到困难你会怎么办？",
    options: [
      ["insurer", "打保险公司电话"],
      ["third_party", "找第三方维权代理"],
      ["hotline_968133", "打968133（维权热线）"],
      ["give_up", "自认倒霉"],
    ],
  },
  {
    id: "q10",
    section: "四、金融素养",
    title: "下面哪些是骗局？",
    hint: "多选，全对才有效",
    multiple: true,
    options: [
      ["rebate_scam", "刷单返现"],
      ["claim_refund", "理赔双倍退款"],
      ["credit_repair", "低息贷款消除征信"],
      ["police_transfer", "公检法要求转账"],
    ],
  },
];

export const results = {
  road_ceiling: {
    title: "马路天花板",
    stars: 5,
    subtitle: "保险条款门儿清，报案流程像本能",
    resultImage: "515522b8146c6ff20183689170bc0eb2_526386_687_928.png",
    diagnosis: `哥/姐，您这安全意识简直刻进DNA了！靠边停车比驾校教练
还标准，分得清职伤和商保，骗子见了您都得绕道走。您不是来
跑单的，您是来给站点当安全总顾问的！
专属忠告：别光自己牛，带带旁边那个单手骑车的新手，站长给
您申请“以老带新”补贴！`,
  },
  veteran_driver: {
    title: "油门焊死·老司机",
    stars: 4,
    subtitle: "路况预判满分，但政策法律课翘课了",
    resultImage: "bf727a705ac2d252930cfbf7164680bf_611510_687_928.png",
    diagnosis: `车技这块您拿捏得死死的，下雨天滑倒都知道怎么拍照留证，
绝对是老江湖！但一问职伤保障就“马冬梅”—别嫌麻烦，国家
给交的保险不要白不要！另外，千万别信路边“代办多赔钱”的
中介，他们专坑您这种讲义气的实在人。
专属忠告：省下找中介的抽成钱，够加俩鸡腿了。下回培训课别
刷短视频了，听5分钟保命又省钱！`,
  },
  wallet_guardian: {
    title: "钱包守护神",
    stars: 4,
    subtitle: "骗术免疫，但骑车有点莽/社保有点懵",
    resultImage: "5a6a300bd76142d65e7aca6dd41a1d28_504347_687_928.png",
    diagnosis: `刷单、假理赔、征信修复……您一眼看穿，这觉悟不去搞反
诈宣传都屈才了！但一看Q3，您是不是经常单手扶把看手机？
骗子的钱骗不走，但马路牙子能“骗”走你的腿啊！
还有，福建那个职伤险是咱专属福利，抽空了解下，别让“懒
得看”耽误了工伤报销。
专属忠告：把反诈的脑子分一半给交通安全，您就是完美骑手。`,
  },
  rising_flyer: {
    title: "升级中的小飞侠",
    stars: 1,
    subtitle: "知道冲单奖在哪领，别的正在升级",
    resultImage: "a22e085d7b4b5f286073ad8d96eee395_590205_687_928.png",
    diagnosis: `新人吧？是不是眼里只有“爆单”和“时效”？别光顾着低头
跑！靠边停车不丢人，摔了才误单；万一碰了，先拍照再报警，
别学人家“私了”回头自己掏腰包修车！咱平台给你交了职伤险，
那是护身符，别当废纸扔了。
专属忠告：跑单前三天，先把这诊断书截屏存手机，比求神仙保
佑管用！`,
  },
  zen_rider: {
    title: "看淡一切·躺平侠",
    stars: 2,
    subtitle: "主打一个“随缘”，维权靠运气",
    resultImage: "7717640eaa51cbeeb03159746e4abc34_495053_687_928.png",
    diagnosis: `车技这块您拿捏得死死的，下雨天滑倒都知道怎么拍照留证，
绝对是老江湖！但一问职伤保障就“马冬梅”—别嫌麻烦，国家
给交的保险不要白不要！另外，千万别信路边“代办多赔钱”的
中介，他们专坑您这种讲义气的实在人。
专属忠告：省下找中介的抽成钱，够加俩鸡腿了。下回培训课别
刷短视频了，听5分钟保命又省钱！`,
  },
  hesitation_loses: {
    title: "犹豫就会败北",
    stars: 2,
    subtitle: "有基本常识，但面对中介定力不够",
    resultImage: "bf727a705ac2d252930cfbf7164680bf_611510_687_928.png",
    diagnosis: `车技这块您拿捏得死死的，下雨天滑倒都知道怎么拍照留证，
绝对是老江湖！但一问职伤保障就“马冬梅”—别嫌麻烦，国家
给交的保险不要白不要！另外，千万别信路边“代办多赔钱”的
中介，他们专坑您这种讲义气的实在人。
专属忠告：省下找中介的抽成钱，够加俩鸡腿了。下回培训课别
刷短视频了，听5分钟保命又省钱！`,
  },
};

export function scoreSurvey(answers) {
  const q8 = Array.isArray(answers.q8) ? answers.q8 : [];
  const q10 = Array.isArray(answers.q10) ? answers.q10 : [];
  const safety =
    (answers.q3 === "stop_safely" ? 2 : 0) +
    (answers.q4 === "preserve_evidence" ? 2 : 0);
  const policy =
    (["understand", "expert"].includes(answers.q5) ? 2 : 0) +
    (answers.q6 === "occupational" ? 2 : answers.q6 === "commercial" ? 1 : 0);
  const allScams = [
    "rebate_scam",
    "claim_refund",
    "credit_repair",
    "police_transfer",
  ].every((item) => q10.includes(item));
  const fraud =
    (answers.q7 === "reject" ? 2 : 0) +
    (["insurer", "hotline_968133"].includes(answers.q9) ? 2 : 0) +
    (allScams ? 2 : 0);
  const total = safety + policy + fraud;
  const unclear = [
    answers.q5 === "never_heard",
    answers.q6 === "unknown",
    answers.q9 === "give_up",
    q8.includes("unknown_coverage"),
  ].filter(Boolean).length;
  let resultCode;
  if (
    ["tempted", "used_agent"].includes(answers.q7) ||
    answers.q9 === "third_party"
  )
    resultCode = "hesitation_loses";
  else if (total >= 12 && safety >= 3 && policy >= 3 && fraud >= 3)
    resultCode = "road_ceiling";
  else if (unclear >= 2 && answers.q9 === "give_up") resultCode = "zen_rider";
  else if (answers.q1 === "new" && safety < 2 && policy < 2 && fraud < 2)
    resultCode = "rising_flyer";
  else if (safety === 4 && (policy <= 1 || fraud <= 1))
    resultCode = "veteran_driver";
  else if (fraud === 6 && (safety < 3 || policy < 3))
    resultCode = "wallet_guardian";
  else if (fraud >= safety && fraud >= policy) resultCode = "wallet_guardian";
  else if (safety >= policy) resultCode = "veteran_driver";
  else resultCode = "rising_flyer";
  return {
    scores: { safety, policy, fraud, total },
    resultCode,
    result: results[resultCode],
    painPoints: q8,
  };
}
