import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWechatAuth } from "../../shared/hooks/useWechatAuth";
import { useWechatShare } from "../../shared/hooks/useWechatShare";
import {
  createAuthorization,
  drawPrize,
  getBootstrap,
  getPublicConfig,
  submitParticipantProfile,
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
  oauthScope: "snsapi_userinfo",
  requireUserinfo: true,
};
const activityAssetsBaseUrl = `https://assets.zice8.com/${ACTIVITY_TYPE}/${ACTIVITY_KEY}`;

const WHEEL_SEGMENTS = ["谢谢参与", "2元红包", "谢谢参与", "68元红包", "谢谢参与", "2元红包"];
const WHEEL_STOP_INDEX_BY_PRIZE = {
  cash_200: 1,
  cash_6800: 3,
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
  const [participant, setParticipant] = useState({ name: "", phone: "" });
  const canvasRef = useRef(null);
  const { authReady, blockedMessage, hasToken, reauth } = useWechatAuth(
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
        if (data.profileIncomplete) {
          reauth("missing-user-profile");
          return;
        }
        setBootstrap(data);
        setParticipant({
          name: data.participant?.name || "",
          phone: data.participant?.phone || "",
        });
        if (data.draw) {
          setDraw(data.draw);
          setStage("prize");
        } else if (data.submission) {
          setSubmission(normalizeSubmission(data.submission));
          setStage("result");
        }
      })
      .catch((error) => setNotice(readError(error, "问卷加载失败")));
  }, [activityKey, authReady, hasToken, preview, reauth]);

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

  const submitParticipant = async (event) => {
    event.preventDefault();
    if (busy) return;
    const name = participant.name.trim();
    const phone = participant.phone.trim();
    if (!name) {
      setNotice("请输入姓名");
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      setNotice("请输入正确的手机号码");
      return;
    }
    setBusy("profile");
    setNotice("");
    try {
      const data = preview
        ? { name, phone, completed: true }
        : await submitParticipantProfile(activityKey, { name, phone });
      setParticipant({ name: data.name, phone: data.phone });
      setBootstrap((current) => ({ ...current, participant: data }));
      if (bootstrap?.draw) setDraw(bootstrap.draw);
      if (bootstrap?.submission)
        setSubmission(normalizeSubmission(bootstrap.submission));
      setStage(
        bootstrap?.draw ? "prize" : bootstrap?.submission ? "result" : "survey",
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setNotice(readError(error, "资料提交失败，请稍后重试"));
    } finally {
      setBusy("");
    }
  };

  const startDraw = async () => {
    if (busy) return;
    setBusy("draw");
    setNotice("");
    setStage("dispatch");
    try {
      if (!preview)
        await ensureAuthorization(activityKey, bootstrap?.authorization);
      const data = preview
        ? previewPrize(query.get("prize"))
        : await drawPrize(activityKey, createRequestId());
      setDraw(data);
      await wait(720);
      setStage("wheel");
    } catch (error) {
      setDraw({
        id: "dispatch-failed",
        status: "miss",
        prizeType: "none",
        prizeName: null,
      });
      setNotice(readError(error, "红包发放未成功，本次为谢谢参与"));
      await wait(720);
      setStage("wheel");
    } finally {
      setBusy("");
    }
  };

  const drawPoster = useCallback(() => {
    if (!result || !submission || !canvasRef.current) return;
    paintPoster(canvasRef.current, result, submission.scores);
  }, [result, submission]);

  const completeWheel = useCallback(() => setStage("prize"), []);

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
      {stage === "intro" ? (
        <Intro
          onStart={() =>
            setStage(bootstrap?.participant?.completed ? "survey" : "profile")
          }
        />
      ) : null}
      {stage === "profile" ? (
        <ParticipantProfile
          value={participant}
          onChange={setParticipant}
          onSubmit={submitParticipant}
          busy={busy === "profile"}
        />
      ) : null}
      {stage === "survey" ? (
        <section className="rss-question-page" key={question.id}>
          <div className="rss-question-card">
            <p className="rss-category-title">
              {`${question.section}（${categoryQuestions.length}题）`}
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
      {stage === "dispatch" ? <PrizeDispatching /> : null}
      {stage === "wheel" ? (
        <PrizeWheel draw={draw} onComplete={completeWheel} />
      ) : null}
      {stage === "prize" ? (
        <PrizeResult
          draw={draw}
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
          src={`${activityAssetsBaseUrl}/c118bfc922cfec85d93da4220135ef3d_12255_550_355.png`}
          alt="护商行动 安商问卷"
          referrerPolicy="no-referrer"
        />
        <img
          className="rss-home-organizer"
          src={`${activityAssetsBaseUrl}/2f1a775078dbb7bc8f07a2fc83fee458_5019_510_126.png`}
          alt="主办单位"
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

function ParticipantProfile({ value, onChange, onSubmit, busy }) {
  return (
    <section className="rss-profile-page">
      <form className="rss-profile-card" onSubmit={onSubmit}>
        <p className="rss-section-kicker">JOIN THE SURVEY</p>
        <h1>填写参与资料</h1>
        <p>请先填写姓名和手机号码，再开始答题。</p>
        <label>
          <span>姓名</span>
          <input
            required
            maxLength="100"
            autoComplete="name"
            placeholder="请输入姓名"
            value={value.name}
            onChange={(event) =>
              onChange((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <label>
          <span>手机号码</span>
          <input
            required
            inputMode="tel"
            pattern="1\d{10}"
            maxLength="11"
            autoComplete="tel"
            placeholder="请输入手机号码"
            value={value.phone}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                phone: event.target.value.replace(/\D/g, "").slice(0, 11),
              }))
            }
          />
        </label>
        <button className="rss-primary" type="submit" disabled={busy}>
          {busy ? "正在进入问卷…" : "开始答题"}
        </button>
        <small>仅用于本次问卷参与与活动联络。</small>
      </form>
    </section>
  );
}

function PrizeDispatching() {
  return (
    <section className="rss-dispatch" aria-live="polite">
      <div className="rss-dispatch-icon" aria-hidden="true">
        <i />
        <b>¥</b>
      </div>
      <p>正在确认抽奖结果</p>
      <small>奖品由服务端库存与发放状态决定</small>
    </section>
  );
}

function PrizeWheel({ draw, onComplete }) {
  const targetIndex = wheelStopIndexForDraw(draw);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setRotation(1440 - targetIndex * 60);
    });
    const timer = window.setTimeout(onComplete, 3900);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [onComplete, targetIndex]);

  return (
    <section className="rss-wheel-page" aria-live="polite">
      <p className="rss-section-kicker">LUCKY WHEEL</p>
      <h1>幸运转盘</h1>
      <p className="rss-wheel-tip">结果已确定，正在转向本次抽奖结果</p>
      <div className="rss-wheel-stage">
        <div className="rss-wheel-pointer" aria-hidden="true" />
        <div
          className="rss-wheel"
          style={{ transform: `rotate(${rotation}deg)` }}
          aria-label="抽奖转盘"
        >
          {WHEEL_SEGMENTS.map((label, index) => {
            const angle = index * 60;
            return (
              <span
                className="rss-wheel-label"
                key={`${label}-${index}`}
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(-1 * min(31vw, 155px))) rotate(-90deg)`,
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
        <div className="rss-wheel-center">抽奖中</div>
      </div>
      <small>请稍候，转盘停止后公布结果</small>
    </section>
  );
}

function PrizeResult({ draw, onPoster }) {
  const won = isWinningDraw(draw);
  return (
    <section className="rss-prize-result">
      <p className="rss-section-kicker">DRAW RESULT</p>
      <div className={`rss-prize-orbit ${won ? "is-win" : ""}`}>
        <span>{won ? "LUCKY" : "SAFE"}</span>
      </div>
      <h1>{won ? "恭喜中奖" : "谢谢参与"}</h1>
      <h2>{won ? draw.prizeName : "平安到家就是今天的头奖"}</h2>
      {draw?.prizeType === "cash" && won ? (
        <p>测试阶段仅记录抽奖结果，不会发起真实红包发放。</p>
      ) : null}
      <button type="button" className="rss-text-button" onClick={onPoster}>
        返回查看诊断海报
      </button>
    </section>
  );
}

function isWinningDraw(draw) {
  return Boolean(
    draw?.status === "won" &&
      Object.prototype.hasOwnProperty.call(WHEEL_STOP_INDEX_BY_PRIZE, draw.prizeCode),
  );
}

function wheelStopIndexForDraw(draw) {
  return isWinningDraw(draw) ? WHEEL_STOP_INDEX_BY_PRIZE[draw.prizeCode] : 0;
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
  const type = ["cash", "cash_200", "cash_6800", "none"].includes(forced)
    ? forced
    : ["cash_200", "cash_6800", "none"][Math.floor(Math.random() * 3)];
  if (type === "cash" || type === "cash_200")
    return {
      id: "preview-cash-200",
      status: "won",
      prizeType: "cash",
      prizeCode: "cash_200",
      prizeName: "2元微信现金红包",
      prizeAmount: 200,
    };
  if (type === "cash_6800")
    return {
      id: "preview-cash-6800",
      status: "won",
      prizeType: "cash",
      prizeCode: "cash_6800",
      prizeName: "68元微信现金红包",
      prizeAmount: 6800,
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
