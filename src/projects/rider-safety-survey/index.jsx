import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWechatAuth } from "../../shared/hooks/useWechatAuth";
import { useWechatShare } from "../../shared/hooks/useWechatShare";
import {
  claimPrize,
  createAuthorization,
  drawPrize,
  getBootstrap,
  getPublicConfig,
  submitSurvey,
  syncAuthorization,
} from "./api";
import {
  ACTIVITY_KEY,
  ACTIVITY_TYPE,
  questions,
  results,
  scoreSurvey,
} from "./content";
import "./styles.css";

const previewConfig = {
  accessMode: "public",
  oauthScope: "snsapi_base",
  requireUserinfo: false,
};
const activityAssetsBaseUrl = `https://assets.zice8.com/${ACTIVITY_TYPE}/${ACTIVITY_KEY}`;

const categoryTitles = {
  基础信息: "一、基础信息（2题，点选即可）",
  交通安全: "二、交通安全（2题，情景判断）",
  职业伤害保障: "三、职业伤害保障（3题，认知+行为）",
  保险与金融素养: "四、保险与金融素养（3题，痛点+反诈）",
};

function syncVisibleViewportInset() {
  const sync = () => {
    const viewport = window.visualViewport;
    const visibleBottom = viewport
      ? viewport.offsetTop + viewport.height
      : window.innerHeight;
    const inset = Math.max(0, window.innerHeight - visibleBottom);
    document.documentElement.style.setProperty(
      "--rss-visible-bottom-inset",
      `${Math.ceil(inset)}px`,
    );
  };
  sync();
  window.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("resize", sync);
  window.visualViewport?.addEventListener("scroll", sync);
  return () => {
    window.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("resize", sync);
    window.visualViewport?.removeEventListener("scroll", sync);
    document.documentElement.style.removeProperty("--rss-visible-bottom-inset");
  };
}

export default function RiderSafetySurveyProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || ACTIVITY_KEY;
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const preview = query.get("preview") === "1";
  const [publicConfig, setPublicConfig] = useState(
    preview ? previewConfig : null,
  );
  const [bootstrap, setBootstrap] = useState(null);
  const [stage, setStage] = useState("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submission, setSubmission] = useState(null);
  const [draw, setDraw] = useState(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [claim, setClaim] = useState({
    recipientName: "",
    recipientPhone: "",
    recipientAddress: "",
  });
  const canvasRef = useRef(null);
  const { authReady, blockedMessage, hasToken } = useWechatAuth(
    activityKey,
    publicConfig,
    { replaceOAuthCallback: true },
  );
  useWechatShare(activityKey, publicConfig);

  useEffect(() => syncVisibleViewportInset(), []);

  useEffect(() => {
    if (preview) return;
    getPublicConfig(activityKey)
      .then(setPublicConfig)
      .catch((error) => setNotice(readError(error, "活动加载失败")));
  }, [activityKey, preview]);

  useEffect(() => {
    if (preview || !authReady || !hasToken) return;
    getBootstrap(activityKey)
      .then((data) => {
        setBootstrap(data);
        if (data.draw) {
          setDraw(data.draw);
          setStage("prize");
        } else if (data.submission) {
          setSubmission(normalizeSubmission(data.submission));
          setStage("result");
        }
      })
      .catch((error) => setNotice(readError(error, "问卷加载失败")));
  }, [activityKey, authReady, hasToken, preview]);

  const question = questions[index];
  const currentAnswer = answers[question?.id];
  const canContinue = question?.multiple
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0
    : Boolean(currentAnswer);
  const result = submission?.resultCode
    ? results[submission.resultCode]
    : submission?.result;
  const categoryQuestions = questions.filter(
    (item) => item.section === question?.section,
  );
  const categoryPosition =
    categoryQuestions.findIndex((item) => item.id === question?.id) + 1;

  const selectOption = (value) => {
    if (!question.multiple) {
      setAnswers((current) => ({ ...current, [question.id]: value }));
      return;
    }
    setAnswers((current) => {
      const selected = Array.isArray(current[question.id])
        ? current[question.id]
        : [];
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];
      return { ...current, [question.id]: next };
    });
  };

  const nextQuestion = async () => {
    if (!canContinue || busy) return;
    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setBusy("submit");
    setNotice("");
    try {
      const data = preview
        ? scoreSurvey(answers)
        : await submitSurvey(activityKey, answers);
      setSubmission(normalizeSubmission(data));
      setStage("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(readError(error, "提交失败，请稍后再试"));
    } finally {
      setBusy("");
    }
  };

  const startDraw = async () => {
    if (busy) return;
    setBusy("draw");
    setNotice("");
    try {
      if (!preview)
        await ensureAuthorization(activityKey, bootstrap?.authorization);
      setStage("lottery");
      await wait(1800);
      const data = preview
        ? previewPrize(query.get("prize"))
        : await drawPrize(activityKey, createRequestId());
      setDraw(data);
      setStage("prize");
    } catch (error) {
      setStage("result");
      setNotice(readError(error, "抽奖未完成，请稍后重试"));
    } finally {
      setBusy("");
    }
  };

  const submitClaim = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy("claim");
    try {
      const data = preview
        ? { ...draw, claimed: true, status: "claimed" }
        : await claimPrize(activityKey, claim);
      setDraw(data);
      setNotice("领奖信息已登记，请留意后续联系。");
    } catch (error) {
      setNotice(readError(error, "领奖信息提交失败"));
    } finally {
      setBusy("");
    }
  };

  const drawPoster = useCallback(() => {
    if (!result || !submission || !canvasRef.current) return;
    paintPoster(canvasRef.current, result, submission.scores);
  }, [result, submission]);

  useEffect(() => {
    drawPoster();
  }, [drawPoster]);

  if (!preview && blockedMessage)
    return (
      <Shell>
        <Status title={blockedMessage} text="请从活动微信链接重新进入" />
      </Shell>
    );
  if (!preview && (!publicConfig || !authReady))
    return (
      <Shell>
        <Status title="正在校准路线" text="加载问卷与微信身份…" />
      </Shell>
    );

  return (
    <Shell>
      {notice ? (
        <div className="rss-toast" role="status">
          {notice}
        </div>
      ) : null}
      {preview && !["intro", "survey"].includes(stage) ? (
        <div className="rss-preview-flag">
          本地流程预览 · 不写数据 / 不发红包
        </div>
      ) : null}
      {stage === "intro" ? <Intro onStart={() => setStage("survey")} /> : null}
      {stage === "survey" ? (
        <section className="rss-question-page" key={question.id}>
          <div className="rss-question-card">
            <p className="rss-category-title">
              {categoryTitles[question.section] || question.section}
            </p>
            <div
              className="rss-reference-progress"
              aria-label={`本分类第 ${categoryPosition} 题，共 ${categoryQuestions.length} 题`}
            >
              <i
                style={{
                  width: `${(categoryPosition / categoryQuestions.length) * 100}%`,
                }}
              />
            </div>
            <h1>
              {question.title}
              {question.hint ? <span>（{question.hint}）</span> : null}
            </h1>
            <div className="rss-options rss-reference-options">
              {question.options.map(([value, label], optionIndex) => {
                const active = question.multiple
                  ? currentAnswer?.includes(value)
                  : currentAnswer === value;
                return (
                  <button
                    type="button"
                    className={active ? "is-active" : ""}
                    key={value}
                    onClick={() => selectOption(value)}
                  >
                    <b>{String.fromCharCode(65 + optionIndex)}</b>
                    <span>{label}</span>
                    <i aria-hidden="true">{active ? "✓" : ""}</i>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            className="rss-submit-button"
            type="button"
            disabled={!canContinue || busy}
            onClick={nextQuestion}
          >
            {busy === "submit" ? "正在生成诊断…" : "提交本题"}
          </button>
        </section>
      ) : null}
      {stage === "result" && result ? (
        <section className="rss-result-scene">
          <p className="rss-section-kicker">
            RIDER SAFETY REPORT · {submission.scores.total}/14
          </p>
          <h1>你的骑手江湖称号</h1>
          <div className="rss-poster-wrap">
            <canvas
              ref={canvasRef}
              width="750"
              height="1100"
              aria-label={`${result.title}结果海报`}
            />
          </div>
          <div className="rss-score-lines">
            <ScoreLine
              label="安全防御力"
              value={submission.scores.safety}
              max={4}
            />
            <ScoreLine
              label="政策知晓度"
              value={submission.scores.policy}
              max={4}
            />
            <ScoreLine
              label="金融防骗术"
              value={submission.scores.fraud}
              max={6}
            />
          </div>
          <p className="rss-comment">{result.comment}</p>
          <div className="rss-advice">
            <span>专属忠告</span>
            {result.advice}
          </div>
          <div className="rss-result-actions">
            <button
              className="rss-primary"
              type="button"
              onClick={startDraw}
              disabled={busy === "draw"}
            >
              {busy === "draw" ? "准备抽奖…" : "立即抽奖"}
            </button>
          </div>
        </section>
      ) : null}
      {stage === "lottery" ? <LotteryAnimation /> : null}
      {stage === "prize" ? (
        <PrizeResult
          draw={draw}
          claim={claim}
          setClaim={setClaim}
          submitClaim={submitClaim}
          busy={busy}
          onPoster={() => setStage("result")}
        />
      ) : null}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <main className="rss-app">
      <div className="rss-road-lines" aria-hidden="true" />
      <div className="rss-shell">{children}</div>
    </main>
  );
}

function Intro({ onStart }) {
  return (
    <section className="rss-intro">
      <div className="rss-home-canvas">
        <img
          className="rss-home-background"
          src={`${activityAssetsBaseUrl}/home-background.png`}
          alt=""
          referrerPolicy="no-referrer"
        />
        <img
          className="rss-home-title"
          src={`${activityAssetsBaseUrl}/home-title.png`}
          alt="护商行动 安商问卷"
          referrerPolicy="no-referrer"
        />
        <button
          className="rss-home-start"
          type="button"
          onClick={onStart}
          aria-label="填写问卷"
        >
          <img
            src={`${activityAssetsBaseUrl}/home-start.png`}
            alt="填写问卷"
            referrerPolicy="no-referrer"
          />
        </button>
      </div>
    </section>
  );
}

function ScoreLine({ label, value, max }) {
  return (
    <div>
      <span>{label}</span>
      <i>
        <b style={{ width: `${(value / max) * 100}%` }} />
      </i>
      <strong>
        {value}/{max}
      </strong>
    </div>
  );
}

function LotteryAnimation() {
  return (
    <section className="rss-lottery">
      <div className="rss-radar">
        <i />
        <b>LUCK</b>
      </div>
      <p>正在扫描你的幸运路段</p>
      <small>奖品由服务端库存与预算共同锁定</small>
    </section>
  );
}

function PrizeResult({ draw, claim, setClaim, submitClaim, busy, onPoster }) {
  const won = draw?.status === "won" || draw?.status === "claimed";
  const physical = won && draw?.prizeType === "physical";
  return (
    <section className="rss-prize-result">
      <p className="rss-section-kicker">DRAW RESULT</p>
      <div className={`rss-prize-orbit ${won ? "is-win" : ""}`}>
        <span>{won ? "LUCKY" : "SAFE"}</span>
      </div>
      <h1>{won ? "恭喜中奖" : "谢谢参与"}</h1>
      <h2>{won ? draw.prizeName : "平安到家就是今天的头奖"}</h2>
      {draw?.prizeType === "cash" && won ? (
        <p>现金红包将按微信最终状态发放，请留意微信零钱通知。</p>
      ) : null}
      {physical && !draw.claimed ? (
        <form className="rss-claim-form" onSubmit={submitClaim}>
          <input
            required
            maxLength="100"
            placeholder="收件人姓名"
            value={claim.recipientName}
            onChange={(e) =>
              setClaim({ ...claim, recipientName: e.target.value })
            }
          />
          <input
            required
            pattern="1\d{10}"
            placeholder="手机号码"
            value={claim.recipientPhone}
            onChange={(e) =>
              setClaim({ ...claim, recipientPhone: e.target.value })
            }
          />
          <textarea
            required
            minLength="5"
            maxLength="500"
            placeholder="收件地址"
            value={claim.recipientAddress}
            onChange={(e) =>
              setClaim({ ...claim, recipientAddress: e.target.value })
            }
          />
          <button className="rss-primary" disabled={busy === "claim"}>
            {busy === "claim" ? "登记中…" : "登记领奖信息"}
          </button>
        </form>
      ) : null}
      {draw?.claimed ? (
        <div className="rss-claimed">✓ 领奖信息已登记</div>
      ) : null}
      <button type="button" className="rss-text-button" onClick={onPoster}>
        返回查看诊断海报
      </button>
    </section>
  );
}

function Status({ title, text }) {
  return (
    <section className="rss-status">
      <div className="rss-radar">
        <i />
      </div>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function normalizeSubmission(data) {
  if (data.resultCode && data.scores)
    return { ...data, result: results[data.resultCode] || data.result };
  return data;
}

function previewPrize(forced) {
  const type = ["cash", "physical", "none"].includes(forced)
    ? forced
    : ["cash", "physical", "none"][Math.floor(Math.random() * 3)];
  if (type === "cash")
    return {
      id: "preview-cash",
      status: "won",
      prizeType: "cash",
      prizeName: "0.30元微信现金红包",
      prizeAmount: 30,
    };
  if (type === "physical")
    return {
      id: "preview-physical",
      status: "won",
      prizeType: "physical",
      prizeName: "防晒冰袖",
    };
  return {
    id: "preview-none",
    status: "miss",
    prizeType: "none",
    prizeName: null,
  };
}

async function ensureAuthorization(activityKey, existing) {
  let authorization = existing;
  if (!authorization?.effective)
    authorization = await createAuthorization(activityKey);
  if (authorization.testMode || authorization.effective) return authorization;
  if (!authorization.packageInfo) throw new Error("微信未返回授权参数");
  await invokeMerchantTransferAuthorization(authorization);
  authorization = await syncAuthorization(activityKey);
  if (!authorization.effective) throw new Error("微信转账授权尚未生效");
  return authorization;
}

function invokeMerchantTransferAuthorization(authorization) {
  return new Promise((resolve, reject) => {
    const invoke = () => {
      if (!window.WeixinJSBridge?.invoke) {
        reject(new Error("请在微信内打开活动"));
        return;
      }
      window.WeixinJSBridge.invoke(
        "requestMerchantTransfer",
        {
          mchId: authorization.mchId,
          appId: authorization.appId,
          package: authorization.packageInfo,
        },
        (result) => {
          const message = result?.err_msg || result?.errMsg || "";
          if (/:(ok|success)$/i.test(message)) resolve(result);
          else reject(new Error(message || "微信授权未完成"));
        },
      );
    };
    if (window.WeixinJSBridge?.invoke) invoke();
    else
      document.addEventListener("WeixinJSBridgeReady", invoke, { once: true });
  });
}

function paintPoster(canvas, result, scores) {
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 750, 1100);
  gradient.addColorStop(0, "#62c7f7");
  gradient.addColorStop(1, "#087edc");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 750, 1100);
  ctx.strokeStyle = "rgba(255,255,255,.22)";
  ctx.lineWidth = 2;
  for (let y = -250; y < 1200; y += 84) {
    ctx.beginPath();
    ctx.moveTo(520, y);
    ctx.lineTo(750, y + 360);
    ctx.stroke();
  }
  ctx.fillStyle = "#e7f8ff";
  ctx.font = "700 24px Arial";
  ctx.fillText("RIDER SAFETY REPORT / 2026", 62, 78);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 68px Arial";
  ctx.fillText(result.title, 58, 205);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 29px Arial";
  ctx.fillText("★".repeat(result.stars), 62, 258);
  ctx.fillStyle = "#d6f2ff";
  ctx.font = "26px Arial";
  wrapCanvasText(ctx, result.subtitle, 62, 324, 620, 40);
  const metrics = [
    ["安全防御力", scores.safety, 4],
    ["政策知晓度", scores.policy, 4],
    ["金融防骗术", scores.fraud, 6],
  ];
  metrics.forEach(([label, value, max], i) => {
    const y = 430 + i * 102;
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 25px Arial";
    ctx.fillText(label, 62, y);
    ctx.fillStyle = "rgba(255,255,255,.28)";
    ctx.fillRect(62, y + 22, 520, 14);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(62, y + 22, (520 * value) / max, 14);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px Arial";
    ctx.fillText(`${value}/${max}`, 610, y + 9);
  });
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 25px Arial";
  ctx.fillText("专属忠告", 62, 765);
  ctx.fillStyle = "#d6f2ff";
  ctx.font = "25px Arial";
  wrapCanvasText(ctx, result.advice, 62, 818, 620, 39);
  ctx.fillStyle = "rgba(255,255,255,.78)";
  ctx.fillRect(62, 990, 626, 2);
  ctx.font = "700 21px Arial";
  ctx.fillText("跑得快，更要稳稳到家。", 62, 1040);
  ctx.textAlign = "right";
  ctx.fillStyle = "#d6f2ff";
  ctx.fillText(`${scores.total} / 14`, 688, 1040);
  ctx.textAlign = "left";
}

function wrapCanvasText(ctx, text, x, y, width, lineHeight) {
  let line = "";
  for (const char of text) {
    if (ctx.measureText(line + char).width > width) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else line += char;
  }
  if (line) ctx.fillText(line, x, y);
}

function createRequestId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readError(error, fallback) {
  const message =
    error?.response?.data?.message ||
    error?.response?.message ||
    error?.message;
  return typeof message === "string" ? message : fallback;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
