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
  ctx.fillStyle = "#4e995b";
  ctx.font = "bold 44px sans-serif";
  ctx.fillText("文明交通知识问答", 375, 124);
  ctx.fillStyle = "#2c7a46";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("安全“答”人 · 挑战成绩", 375, 190);
  ctx.fillStyle = "#2e8ec5";
  ctx.font = "bold 140px sans-serif";
  ctx.fillText(String(state.attempt.score), 375, 400);
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("本次获得积分", 375, 454);
  ctx.fillStyle = "#31593e";
  ctx.font = "30px sans-serif";
  ctx.fillText(
    `回答 ${state.attempt.answered} 题 · 答对 ${state.attempt.correct} 题`,
    375,
    540,
  );
  ctx.fillText(
    `累计 ${state.rank?.score || 0} 分 · 排名 ${state.rank?.rank || "—"}`,
    375,
    600,
  );
  ctx.fillStyle = "#2e8ec5";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(encouragement(state.attempt.correct), 375, 695);
  ctx.fillStyle = "#2c613d";
  ctx.font = "24px sans-serif";
  ctx.fillText("2026 全国交通安全日 · 文明出行", 375, 790);
  return canvas.toDataURL("image/png");
}
