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

function wrapParagraph(context, text, maxWidth, indent) {
  const lines = [];
  let current = "";
  let availableWidth = maxWidth - indent;
  for (const character of text) {
    if (current && context.measureText(current + character).width > availableWidth) {
      lines.push({ text: current, indent: lines.length === 0 ? indent : 0 });
      current = character;
      availableWidth = maxWidth;
    } else current += character;
  }
  if (current) lines.push({ text: current, indent: lines.length === 0 ? indent : 0 });
  return lines;
}

function drawParagraph(context, text, {
  left,
  baseline,
  maxWidth,
  indent = 0,
  lineHeight,
  maxLines,
}) {
  const lines = wrapParagraph(context, text, maxWidth, indent).slice(0, maxLines);
  lines.forEach((line, index) => {
    context.fillText(line.text, left + line.indent, baseline + index * lineHeight);
  });
  return baseline + lines.length * lineHeight;
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
  const lineHeight = 52;
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
  let nextParagraphY = 742;
  bodyLines.forEach((line) => {
    nextParagraphY = drawParagraph(context, line, {
      left: textLeft,
      baseline: nextParagraphY,
      maxWidth: maxTextWidth,
      indent: paragraphIndent,
      lineHeight,
      maxLines: 2,
    });
  });
  nextParagraphY = Math.max(980, nextParagraphY + 22);
  nextParagraphY = drawParagraph(
    context,
    `你的青春关键词：${selectedKeywords.join(" · ")}`,
    {
      left: textLeft,
      baseline: nextParagraphY,
      maxWidth: maxTextWidth,
      indent: paragraphIndent,
      lineHeight,
      maxLines: 3,
    },
  ) + 20;
  if (wish) {
    nextParagraphY = drawParagraph(context, `青春期盼：${wish}`, {
      left: textLeft,
      baseline: nextParagraphY,
      maxWidth: maxTextWidth,
      indent: paragraphIndent,
      lineHeight,
      maxLines: 2,
    });
  }
  context.textAlign = "right";
  context.fillText("中汽中心团委", textRight, Math.min(1256, Math.max(1194, nextParagraphY + 20)));
  return canvas.toDataURL("image/png");
}
