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
  scene.src = trafficAssets.roadScene;
  await new Promise((resolve, reject) => {
    scene.onload = resolve;
    scene.onerror = reject;
  });
  ctx.fillStyle = "#f8f0d5";
  ctx.fillRect(0, 0, 750, 1334);
  // A full-width illustrated road becomes the destination of the poster.
  ctx.drawImage(scene, 0, 700, 750, 422);
  ctx.fillStyle = "#285b38";
  ctx.fillRect(0, 0, 750, 70);
  ctx.fillStyle = "#d3e8b4";
  ctx.fillRect(0, 70, 750, 6);
  ctx.fillStyle = "#f2cf42";
  ctx.beginPath(); ctx.arc(666, 226, 156, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f8f0d5";
  ctx.beginPath(); ctx.arc(666, 226, 124, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#b9dd99";
  ctx.beginPath(); ctx.arc(87, 284, 100, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f8f0d5";
  ctx.beginPath(); ctx.arc(87, 284, 72, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#285b38";
  roundRect(ctx, 74, 108, 58, 170, 28);
  [140, 193, 246].forEach((y, index) => {
    ctx.fillStyle = ["#e74b3e", "#f2cf42", "#50a965"][index];
    ctx.beginPath(); ctx.arc(103, y, 15, 0, Math.PI * 2); ctx.fill();
  });

  const parts = slogan.split(/[，、]/).filter(Boolean);
  const lines = parts.length > 1 ? parts.slice(0, 3) : [slogan];
  const fontSize = lines.length === 1 ? 76 : lines.length === 2 ? 67 : 56;
  const lineGap = fontSize * 1.28;
  const startY = 452 - ((lines.length - 1) * lineGap) / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${fontSize}px sans-serif`;
  lines.forEach((line, index) => {
    const y = startY + index * lineGap;
    ctx.fillStyle = index === 0 ? "#285b38" : "#208bbd";
    ctx.shadowColor = "#fff9e8";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 5;
    ctx.fillText(line, 375, y, 600);
  });
  ctx.shadowColor = "transparent";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e54b3e";
  roundRect(ctx, 80, 650, 160, 9, 5);
  ctx.fillStyle = "#278fc1";
  roundRect(ctx, 258, 650, 94, 9, 5);
  ctx.save();
  ctx.strokeStyle = "#fff9e8";
  ctx.lineWidth = 8;
  ctx.setLineDash([18, 18]);
  ctx.beginPath();
  ctx.bezierCurveTo(414, 679, 530, 676, 612, 711);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#285b38";
  ctx.fillRect(0, 1122, 750, 212);
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff7dc";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("文明守法 · 平安回家", 375, 1274);
  return canvas.toDataURL("image/png");
}
