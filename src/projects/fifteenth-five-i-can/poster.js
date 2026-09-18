import { ASSETS, assetUrl } from "./config";

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("证书素材加载失败，请重试"));
    image.src = url;
  });
}

function wrap(context, text, maxWidth) {
  const lines = [];
  let current = "";
  for (const character of text) {
    if (current && context.measureText(current + character).width > maxWidth) {
      lines.push(current);
      current = character;
    } else current += character;
  }
  if (current) lines.push(current);
  return lines;
}

export async function renderCertificatePoster({
  nickname,
  selectedKeywords,
  futureMessage,
  wish,
  assetsBaseUrl,
}) {
  const [background] = await Promise.all([
    loadImage(assetUrl(ASSETS.certificate, assetsBaseUrl)),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 1166;
  canvas.height = 1630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器不支持海报合成");
  context.drawImage(background, 0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.fillStyle = "#092c83";
  context.font = 'bold 42px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText(`${nickname || "中汽青年"}同学：`, 583, 590);
  context.font = '30px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillStyle = "#57462b";
  context.fillText(`你选择了 ${selectedKeywords.join(" · ")}`, 583, 663);
  context.fillStyle = "#092c83";
  context.font = 'bold 34px "PingFang SC", "Microsoft YaHei", sans-serif';
  wrap(context, `「${futureMessage}」`, 880)
    .slice(0, 3)
    .forEach((line, index) => context.fillText(line, 583, 760 + index * 55));
  if (wish) {
    context.fillStyle = "#9b6d2e";
    context.font = '28px "PingFang SC", "Microsoft YaHei", sans-serif';
    context.fillText(`期盼：${wish}`, 583, 970);
  }
  context.fillStyle = "#57462b";
  context.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText("完成《十五五，我看行！》青年学习答题", 583, 1235);
  context.fillText("让我们以青春之名，奔赴2030。", 583, 1275);
  context.font = '22px "PingFang SC", "Microsoft YaHei", sans-serif';
  context.fillText(new Date().toLocaleDateString("zh-CN"), 583, 1460);
  return canvas.toDataURL("image/png");
}
