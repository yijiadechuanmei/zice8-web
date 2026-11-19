import { trafficAssets } from "./config";

export const encouragement = (correct) =>
  correct >= 4
    ? "文明出行，你是安全“答”人！"
    : correct >= 2
      ? "安全知识再加油，继续向前！"
      : "每一次学习，都是更安全的出发。";

export async function createPoster(slogan) {
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
  ctx.fillText("文明交通", 375, 156);
  ctx.fillStyle = "#288fc2";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("安全出行 · 文明相伴", 375, 203);
  ctx.fillStyle = "#fffdf0e8";
  ctx.beginPath();
  ctx.roundRect(68, 285, 614, 360, 44);
  ctx.fill();
  ctx.fillStyle = "#dfedce";
  ctx.beginPath();
  ctx.roundRect(322, 316, 106, 9, 5);
  ctx.fill();
  const lines = slogan.length > 15 ? [slogan.slice(0, 13), slogan.slice(13)] : [slogan];
  ctx.fillStyle = "#347c49";
  ctx.font = "bold 55px sans-serif";
  lines.forEach((line, index) => ctx.fillText(line, 375, lines.length === 1 ? 490 : 465 + index * 82));
  ctx.fillStyle = "#258fc3";
  ctx.beginPath();
  ctx.arc(375, 574, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fffdf0";
  ctx.beginPath();
  ctx.roundRect(255, 695, 240, 58, 29);
  ctx.fill();
  ctx.fillStyle = "#337c49";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("文明交通 · 平安宁德", 375, 732);
  return canvas.toDataURL("image/png");
}
