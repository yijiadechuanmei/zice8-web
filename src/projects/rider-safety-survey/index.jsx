import { useCallback, useEffect, useMemo, useState } from "react";
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
  oauthScope: "snsapi_base",
  requireUserinfo: false,
};
const activityAssetsBaseUrl = `https://assets.zice8.com/${ACTIVITY_TYPE}/${ACTIVITY_KEY}`;

const WHEEL_SEGMENTS = ["谢谢参与", "2元红包", "谢谢参与", "68元红包", "谢谢参与", "2元红包"];
const WHEEL_STOP_INDEX_BY_PRIZE = {
  cash_200: 1,
  cash_6800: 3,
};

const SAFETY_ARTICLES = [
  {
    title: "安全刻不容缓 |《电动自行车和二三轮摩托车交通安全警示教育片》重磅警醒！",
    coverUrl: "https://mmbiz.qpic.cn/sz_mmbiz_jpg/0xXd5Hlpz3Sk5Xr1beAvM3AyTvj3HeB4lTm49peoRKGRhXxa0uNqOq1aHsTUgBx70AzLOFEqvIXDbj79ibibuEUQ/0?wx_fmt=jpeg",
    url: "https://mp.weixin.qq.com/s/w3as5UUeRjLwZbcYYkIaqw",
  },
  {
    title: "警花说道 | 文明相伴骑乘两轮车，这些危险行为可不能有！",
    coverUrl: "https://mmbiz.qpic.cn/sz_mmbiz_jpg/0xXd5Hlpz3SO23Eb03C7UfCn09twMvg1ILqvdxtfJscAgnhu8gbBhT7ibCZls5J71j01NvgC2KRw06AXXTjq6rA/0?wx_fmt=jpeg",
    url: "https://mp.weixin.qq.com/s/ph-XrpNHHZOwG7gW0FuX0A",
  },
  {
    title: "大警示① | 砰！这些二轮车事故案例，光是看看都会觉得疼！",
    coverUrl: "https://mmbiz.qpic.cn/sz_mmbiz_jpg/0xXd5Hlpz3R0wNzCJAyss5YoSecw6picI2N03E7c6AuVPdicGFQzag38VMdEbU4ia0S3pZH9rc8qsib5fak5upltow/0?wx_fmt=jpeg",
    url: "https://mp.weixin.qq.com/s/E6Q5tPu7fqkLK3RFwHVj4Q",
  },
  {
    title: "新就业形态人员速存！职业伤害怎么认、怎么赔，一文说清",
    coverUrl: "http://mmecoa.qpic.cn/sz_mmecoa_jpg/9yPxDmqsZB3gezSZ0VOZDibRQQdOZiabhHibSZUB4iaC77rvREr0u6GNosNqGkcQcEzEocOI0Xma1jHx9F6LwGEwseO2G5zyFcNPtIRPrXibFicEE/0?wx_fmt=jpeg",
    url: "https://mp.weixin.qq.com/s/dLG-j21PbrDhmIiYaQ0gGQ",
  },
  {
    title: "安全出行 一路有爱丨职业伤害保障为您护航",
    coverUrl: "https://mmbiz.qpic.cn/mmbiz_jpg/nYbkgOObZhxP4AxOIwM0QOOlic1K0DhAEC2ogJic6Euexfc2Uv00rmqokM1YSyhSdd1n3pMdK986UdicczXKpxlpA/0?wx_fmt=jpeg",
    url: "https://mp.weixin.qq.com/s/bM1DNi--wKITIp5rKfakvQ",
  },
];

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
  const { authReady, blockedMessage, hasToken } = useWechatAuth(
    activityKey,
    publicConfig,
    {
      replaceOAuthCallback: true,
      oauthScopeOverride: "snsapi_base",
    },
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
        setParticipant({
          name: data.participant?.name || "",
          phone: data.participant?.phone || "",
        });
        if (data.submission) setSubmission(normalizeSubmission(data.submission));
        if (data.draw) {
          setDraw(data.draw);
          setStage("prize");
        } else if (data.submission) {
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
  const hasDraw = Boolean(draw?.id);
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

  const completeWheel = useCallback(() => setStage("prize"), []);

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
          <div className="rss-result-canvas">
            <img
              className="rss-result-card"
              src={`${activityAssetsBaseUrl}/${result.resultImage}`}
              alt={`${result.title}结果卡`}
              referrerPolicy="no-referrer"
            />
            <h1 className="rss-result-heading">诊断评语</h1>
            <p className="rss-result-diagnosis">{result.diagnosis}</p>
            <button
              className="rss-result-draw"
              type="button"
              onClick={hasDraw ? () => setStage("prize") : startDraw}
              disabled={busy === "draw"}
              aria-label={
                busy === "draw"
                  ? "正在准备抽奖"
                  : hasDraw
                    ? "查看奖品"
                    : "立即抽奖"
              }
            >
              {busy === "draw" ? "正在准备抽奖…" : hasDraw ? "查看奖品" : "立即抽奖"}
            </button>
          </div>
          <SafetyArticleLinks />
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

function SafetyArticleLinks() {
  return (
    <nav className="rss-article-list" aria-label="安全知识推荐">
      <h2>安全知识推荐</h2>
      {SAFETY_ARTICLES.map((article) => (
        <a className="rss-article-link" href={article.url} key={article.url}>
          <img
            src={article.coverUrl}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
          <span className="rss-article-copy">
            <span className="rss-article-title">{article.title}</span>
          </span>
          <span className="rss-article-arrow" aria-hidden="true">↗</span>
        </a>
      ))}
    </nav>
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
