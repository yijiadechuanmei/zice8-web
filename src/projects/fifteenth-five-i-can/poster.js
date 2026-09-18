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
  const textLeft = 186;
  const textRight = 966;
  const maxTextWidth = textRight - textLeft;
  const paragraphIndent = 64;
  context.textAlign = "left";
  context.fillStyle = "#092c83";
  context.font = '32px "PingFang SC", "Microsoft YaHei", sans-serif';
  const displayName = nickname || "中汽青年";
  context.fillText(displayName, textLeft, 652);
  const nameWidth = context.measureText(displayName).width;
  context.beginPath();
  context.moveTo(textLeft, 659);
  context.lineTo(textLeft + nameWidth, 659);
  context.lineWidth = 2;
  context.strokeStyle = context.fillStyle;
  context.stroke();
  context.fillText("同学：", textLeft + nameWidth, 652);
  const bodyLines = [
    "已完成中汽中心“十五五”发展纲要线上学习，",
    "读懂集团战略，锚定青春方向，",
    "以青春之力建功世界一流汽车全价值链技术服务机构建设。",
  ];
  let bodyLineIndex = 0;
  bodyLines.forEach((line) => {
    wrap(context, line, maxTextWidth - paragraphIndent)
      .forEach((wrappedLine) => {
        context.fillText(wrappedLine, textLeft + paragraphIndent, 756 + bodyLineIndex * 58);
        bodyLineIndex += 1;
      });
  });
  const keywordLines = wrap(
    context,
    `你的青春关键词：${selectedKeywords.join(" · ")}`,
    maxTextWidth - paragraphIndent,
  ).slice(0, 3);
  keywordLines.forEach((line, index) => context.fillText(line, textLeft + paragraphIndent, 1028 + index * 56));
  let nextParagraphY = 1028 + keywordLines.length * 56 + 34;
  if (wish) {
    wrap(context, `青春期盼：${wish}`, maxTextWidth - paragraphIndent)
      .slice(0, 2)
      .forEach((line, index) => context.fillText(line, textLeft + paragraphIndent, nextParagraphY + index * 56));
    nextParagraphY += 112;
  }
  context.textAlign = "right";
  context.fillText("中汽中心团委", textRight, Math.max(1194, nextParagraphY + 18));
  return canvas.toDataURL("image/png");
}
