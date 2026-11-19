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
  const load = (source) => new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
  const [quizScene, resultScene] = await Promise.all([
    load(trafficAssets.quizScene),
    load(trafficAssets.resultScene),
  ]);
  // The two existing illustrations are layered into one richer campaign scene.
  ctx.drawImage(quizScene, 0, 0, 750, 1334);
  ctx.drawImage(
    resultScene,
    0,
    resultScene.height * 0.42,
    resultScene.width,
    resultScene.height * 0.58,
    0,
    640,
    750,
    694,
  );
  ctx.fillStyle = "#285b38";
  ctx.fillRect(0, 0, 750, 64);
  ctx.fillStyle = "#f2cf42";
  roundRect(ctx, 58, 94, 162, 44, 22);
  ctx.fillStyle = "#285b38";
  ctx.textAlign = "center";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("文明交通", 139, 123);

  // A road-sign composition lets the slogan sit inside the illustration.
  ctx.fillStyle = "#2a3130";
  roundRect(ctx, 72, 208, 606, 324, 18);
  ctx.fillStyle = "#f4c92f";
  roundRect(ctx, 84, 220, 582, 300, 11);
  ctx.fillStyle = "#fff3ad";
  roundRect(ctx, 105, 241, 540, 258, 7);
  ctx.fillStyle = "#2a3130";
  ctx.fillRect(360, 532, 30, 166);
  ctx.fillStyle = "#2a3130";
  ctx.fillRect(306, 688, 138, 22);

  const parts = slogan.split(/[，、]/).filter(Boolean);
  const lines = parts.length > 1 ? parts.slice(0, 3) : [slogan];
  const fontSize = lines.length === 1 ? 76 : lines.length === 2 ? 67 : 56;
  const lineGap = fontSize * 1.28;
  const startY = 374 - ((lines.length - 1) * lineGap) / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${fontSize}px sans-serif`;
  lines.forEach((line, index) => {
    const y = startY + index * lineGap;
    ctx.fillStyle = index === 0 ? "#285b38" : "#208bbd";
    ctx.shadowColor = "#fff4a9";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 5;
    ctx.fillText(line, 375, y, 600);
  });
  ctx.shadowColor = "transparent";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#e54b3e";
  roundRect(ctx, 127, 462, 132, 8, 4);
  ctx.fillStyle = "#278fc1";
  roundRect(ctx, 278, 462, 72, 8, 4);
  ctx.fillStyle = "#fff7dc";
  roundRect(ctx, 493, 1113, 190, 46, 23);
  ctx.fillStyle = "#285b38";
  ctx.font = "bold 17px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("文明守法 · 平安回家", 588, 1143);
  return canvas.toDataURL("image/png");
}
