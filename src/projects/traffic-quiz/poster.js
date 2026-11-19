import { trafficAssets } from "./config";

export const encouragement = (correct) =>
  correct >= 4
    ? "文明出行，你是安全“答”人！"
    : correct >= 2
      ? "安全知识再加油，继续向前！"
      : "每一次学习，都是更安全的出发。";

const slogans = [
  "头盔戴稳，平安随行",
  "红灯停一步，安全一大步",
  "礼让斑马线，文明在身边",
  "不闯灯、不逆行，平安一路行",
  "骑行守规则，归家每一程",
  "车让人，人快走，文明交通一起守",
  "路口多观察，安全有保障",
  "文明出行，从戴好头盔开始",
];
let lastSlogan = "";
export function nextSafetySlogan() {
  const options = slogans.filter((item) => item !== lastSlogan);
  lastSlogan = options[Math.floor(Math.random() * options.length)];
  return lastSlogan;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

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

  // Campaign masthead: bold green ribbon tied to the original home palette.
  ctx.fillStyle = "#285b38";
  ctx.beginPath();
  ctx.moveTo(0, 64); ctx.lineTo(750, 64); ctx.lineTo(750, 244);
  ctx.lineTo(375, 214); ctx.lineTo(0, 244); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f2cf42";
  roundRect(ctx, 330, 91, 90, 8, 4);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff9e9";
  ctx.font = "bold 34px sans-serif";
  ctx.fillText("文明交通", 375, 157);
  ctx.fillStyle = "#d9edc5";
  ctx.font = "22px sans-serif";
  ctx.fillText("安全出行倡议", 375, 198);

  // Oversized paper headline with a hand-cut, editorial silhouette.
  ctx.save();
  ctx.shadowColor = "#21492a35";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#fff9e8f2";
  roundRect(ctx, 58, 308, 634, 430, 38);
  ctx.restore();
  ctx.fillStyle = "#f2cf42";
  roundRect(ctx, 96, 348, 12, 72, 6);

  const parts = slogan.split(/[，、]/).filter(Boolean);
  const lines = parts.length > 1 ? parts.slice(0, 3) : [slogan];
  const fontSize = lines.length === 1 ? 66 : lines.length === 2 ? 58 : 49;
  const lineGap = fontSize * 1.32;
  const startY = 522 - ((lines.length - 1) * lineGap) / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${fontSize}px sans-serif`;
  lines.forEach((line, index) => {
    const y = startY + index * lineGap;
    ctx.fillStyle = index === lines.length - 1 ? "#258fc3" : "#2f7043";
    ctx.shadowColor = "#d8e7c8";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
    ctx.fillText(line, 375, y, 540);
  });
  ctx.shadowColor = "transparent";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f2cf42";
  ctx.beginPath(); ctx.arc(635, 375, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3b8651";
  ctx.beginPath(); ctx.arc(635, 375, 6, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#285b38";
  roundRect(ctx, 178, 784, 394, 62, 31);
  ctx.fillStyle = "#fff9e9";
  ctx.font = "bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("文明守法 · 平安回家", 375, 824);
  return canvas.toDataURL("image/png");
}
