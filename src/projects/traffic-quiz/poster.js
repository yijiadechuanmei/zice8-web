import { trafficAssets } from "./config";

export const encouragement = (correct) =>
  correct >= 4
    ? "文明出行，你是安全“答”人！"
    : correct >= 2
      ? "安全知识再加油，继续向前！"
      : "每一次学习，都是更安全的出发。";

export async function createPoster(state) {
  const canvas = document.createElement("canvas");
  canvas.width = 750;
  canvas.height = 1334;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法生成海报");
  const scene = new window.Image();
  scene.crossOrigin = "anonymous";
  scene.src = trafficAssets.resultScene;
  await new Promise((resolve, reject) => {
    scene.onload = resolve;
    scene.onerror = reject;
  });
  ctx.drawImage(scene, 0, 0, 750, 1334);
  ctx.textAlign = "center";
  ctx.fillStyle = "#408d52";
  ctx.font = "bold 38px sans-serif";
  ctx.fillText("文明交通知识问答", 375, 126);
  ctx.fillStyle = "#2b8fc0";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("挑战成绩", 375, 177);
  ctx.fillStyle = "#fffdf0dc";
  ctx.beginPath();
  ctx.roundRect(82, 220, 586, 464, 42);
  ctx.fill();
  ctx.fillStyle = "#398b50";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("本次获得", 375, 332);
  ctx.fillStyle = "#258fc3";
  ctx.font = "bold 180px sans-serif";
  ctx.fillText(String(state.attempt.score), 350, 500);
  ctx.fillStyle = "#3b8050";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText("分", 492, 496);
  ctx.fillStyle = "#f1f5e8";
  ctx.beginPath();
  ctx.roundRect(122, 540, 506, 90, 24);
  ctx.fill();
  const metrics = [
    { value: String(state.attempt.correct), label: "答对" },
    { value: String(state.attempt.answered), label: "答题" },
    { value: String(state.rank?.rank || "—"), label: "排名" },
  ];
  metrics.forEach((metric, index) => {
    const x = 207 + index * 168;
    ctx.fillStyle = "#2f8551";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(metric.value, x, 584);
    ctx.fillStyle = "#68866b";
    ctx.font = "22px sans-serif";
    ctx.fillText(metric.label, x, 612);
  });
  ctx.fillStyle = "#4d8054";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(encouragement(state.attempt.correct), 375, 654);
  ctx.fillStyle = "#fffdf0";
  ctx.beginPath();
  ctx.roundRect(258, 715, 234, 54, 27);
  ctx.fill();
  ctx.fillStyle = "#337c49";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("安全出行 · 文明相伴", 375, 750);
  return canvas.toDataURL("image/png");
}
