// OSS 替换入口：仅修改下列 URL；业务页面不持有图片路径。
export const trafficAssets = {
  home: new URL("./assets/home-original.jpg", import.meta.url).href,
  cyclingBear: new URL("./assets/cycling-bear.png", import.meta.url).href,
  stickyNotes: new URL("./assets/sticky-notes.png", import.meta.url).href,
  quizScene: new URL("./assets/quiz-scene.png", import.meta.url).href,
  resultScene: new URL("./assets/result-scene.png", import.meta.url).href,
};
export const trafficActivity = {
  type: "jtqa",
  key: "jc122",
  title: "文明交通知识问答",
  claimDate: "2026 年 12 月 2 日",
  claimTime: "19:00—20:30",
  claimPlace: "蕉城夜市签到兑换区",
};
