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
    title: "当孙悟空也开始防诈骗？宁德金融消保“神仙操作”破圈了！",
    coverUrl: "https://mmbiz.qpic.cn/mmbiz_jpg/mWJoJUWqQw36FwV3TiaIgpticeRe5YiboIianEbB5LGX3zXiaazG4upg6q8BGAsKoVWFqmWPicXNuLd7fAxfgibKM4wHA/0?wx_fmt=jpeg",
    url: "https://mp.weixin.qq.com/s/8SPxi8ylkUWDF4eq0xWf7g",
  },
  {
    title: "新就业形态人员速存！职业伤害怎么认、怎么赔，一文说清",
    coverUrl: "http://mmecoa.qpic.cn/sz_mmecoa_jpg/9yPxDmqsZB3gezSZ0VOZDibRQQdOZiabhHibSZUB4iaC77rvREr0u6GNosNqGkcQcEzEocOI0Xma1jHx9F6LwGEwseO2G5zyFcNPtIRPrXibFicEE/0?wx_fmt=jpeg",
    url: "https://mp.weixin.qq.com/s/dLG-j21PbrDhmIiYaQ0gGQ",
  },
  {
    title: "安全刻不容缓 |《电动自行车和二三轮摩托车交通安全警示教育片》重磅警醒！",
    coverUrl: "https://mmbiz.qpic.cn/sz_mmbiz_jpg/0xXd5Hlpz3Sk5Xr1beAvM3AyTvj3HeB4lTm49peoRKGRhXxa0uNqOq1aHsTUgBx70AzLOFEqvIXDbj79ibibuEUQ/0?wx_fmt=jpeg",
    url: "https://mp.weixin.qq.com/s/w3as5UUeRjLwZbcYYkIaqw",
  },
  {
    title: "跑单有保障，安心闯闽地｜人保财险福建骑手保险科普指南",
    coverUrl: "https://mmecoa.qpic.cn/mmecoa_jpg/CWowxSc0ZGNxo7fLt1HzjBQ7vnZpiaIJo4dNibJbzTaQM3IX0Ysf1ZkvFSgaoiapPicFsYwtdiboWorXUrp9qUMrJxt63wXkaw2cI7lFBVneiayts/640?wx_fmt=jpeg&from=appmsg",
    url: "https://mp.weixin.qq.com/s/it-607ONj7RLpOMjPuUrWw",
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
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
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
    if (!privacyAccepted) {
      setNotice("请先阅读并同意个人信息处理告知书");
      return;
    }
    setBusy("profile");
    setNotice("");
    try {
      const data = preview
        ? { name, phone, completed: true }
        : await submitParticipantProfile(activityKey, {
            name,
            phone,
            privacyNoticeConsent: true,
          });
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

  const acceptPrivacyNotice = () => {
    setPrivacyAccepted(true);
    setNotice("");
    setStage("profile");
  };

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
        <Intro onStart={() => setStage("privacy")} />
      ) : null}
      {stage === "privacy" ? (
        <PrivacyNotice
          onConfirm={acceptPrivacyNotice}
          onDecline={() => {
            setPrivacyAccepted(false);
            setStage("intro");
          }}
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
            <h1 className="rss-result-heading">测评结语</h1>
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
      {stage === "wheel" || stage === "prize" ? (
        <PrizeWheel
          draw={draw}
          showResult={stage === "prize"}
          onComplete={completeWheel}
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
        <p className="rss-home-reward-notice">
          本次问卷共设置 <strong>2010 个红包</strong>
          <br />
          <span className="rss-home-reward-rule">先答先得，抽完即止！诚邀您参与填写～</span>
        </p>
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

function PrivacyNotice({ onConfirm, onDecline }) {
  const [decision, setDecision] = useState("");
  const confirmDecision = () => {
    if (decision === "agree") onConfirm();
    if (decision === "decline") onDecline();
  };
  return (
    <div className="rss-privacy-mask" role="presentation">
      <article className="rss-privacy-card">
        <header>
          <h1 id="rss-privacy-title">个人信息处理告知书</h1>
        </header>
        <div className="rss-privacy-copy">
          <p>尊敬的用户：</p>
          <p>
            感谢您参与本次问卷调查。我们高度重视您的个人信息和隐私保护。为保障您的知情权、决定权及其他个人信息权益，在您填写问卷前，请您仔细阅读并充分理解本《个人信息处理告知书》。
          </p>
          <p>当您勾选“我已阅读并同意《个人信息处理告知书》”后，我们将在您授权同意的范围内处理您的个人信息。</p>

          <NoticeSection title="一、个人信息处理者">
            <p>个人信息处理者：【兴业银行宁德分行/人保财险宁德市分公司】</p>
          </NoticeSection>
          <NoticeSection title="二、个人信息处理目的">
            <p>我们收集和处理您的个人信息，主要用于以下目的：</p>
            <ol>
              <li>开展本次问卷调查、活动报名、信息登记及相关统计工作；</li>
              <li>确认参与人员身份，避免重复提交、虚假提交等情况；</li>
              <li>对问卷填写情况及活动参与情况进行统计、分析和汇总；</li>
              <li>根据本次活动实际需要，与您进行必要的通知、联系或结果反馈；</li>
              <li>保障问卷系统正常运行、维护系统安全并防范异常访问；</li>
              <li>履行法律法规规定的其他义务。</li>
            </ol>
            <p>我们不会将您的个人信息用于与本次问卷调查或活动无关的其他用途。如需改变个人信息处理目的，我们将依法重新向您告知，并在需要取得您同意的情况下重新取得您的同意。</p>
          </NoticeSection>
          <NoticeSection title="三、个人信息处理方式">
            <p>我们将通过您主动填写、提交问卷等方式收集您的个人信息，并根据本次问卷或活动需要，对相关信息进行收集、存储、使用、统计、分析、查询、核验及必要的删除等处理。</p>
            <p>我们将采取与个人信息安全风险相适应的技术措施和管理措施，对您的个人信息进行保护，防止未经授权的访问以及个人信息泄露、篡改、丢失。</p>
          </NoticeSection>
          <NoticeSection title="四、处理的个人信息种类">
            <p>根据本次问卷实际内容，我们需要处理以下个人信息：</p>
            <ol>
              <li><strong>基本身份信息</strong>：如姓名等；</li>
              <li><strong>联系信息</strong>：如手机号码等；</li>
              <li><strong>问卷填写信息</strong>：您在问卷中主动填写、选择或提交的答案、意见及其他内容；</li>
              <li><strong>活动参与信息</strong>：如报名信息、参与记录、答题记录、成绩、抽奖或活动结果等；</li>
              <li><strong>必要的网络及设备信息</strong>：如IP地址、访问时间、设备类型等，用于保障问卷系统安全、防止异常提交及进行必要的访问统计。</li>
            </ol>
            <p>实际收集的信息以本问卷页面中明确展示并要求您填写或授权的信息为准。</p>
            <p>我们将遵循合法、正当、必要和诚信原则，仅收集实现上述处理目的所必要的个人信息。</p>
          </NoticeSection>
          <NoticeSection title="五、个人信息保存期限">
            <p>您的个人信息原则上仅在实现本次问卷调查及活动目的所必要的最短期限内保存。</p>
            <p>本次问卷相关个人信息预计保存期限以法律、行政法规对个人信息保存期限为准。</p>
            <p>保存期限届满后，我们将依法对相关个人信息进行删除或者匿名化处理。</p>
          </NoticeSection>
          <NoticeSection title="六、个人信息共享、委托处理及对外提供">
            <p>我们承诺不会向与本次问卷调查或活动无关的第三方出售、出租或者提供您的个人信息。</p>
            <p>因问卷系统运行、服务器托管、云服务、短信服务、技术维护或活动执行等实际需要，我们可能委托必要的技术服务提供商处理部分个人信息。</p>
            <p>对于受托处理个人信息的服务提供商，我们将要求其按照约定的处理目的、期限、方式和个人信息种类处理相关信息，并采取必要措施保护您的个人信息安全。</p>
            <p>如我们需要向其他个人信息处理者提供您的个人信息，我们将按照法律法规要求向您告知接收方的名称或者姓名、联系方式、处理目的、处理方式以及个人信息种类，并在依法需要取得单独同意的情况下取得您的单独同意。</p>
            <p>除法律法规另有规定外，未经您的授权同意，我们不会向其他无关第三方提供您的个人信息。</p>
          </NoticeSection>
          <NoticeSection title="七、您的个人信息权利">
            <p>在符合法律法规规定的情况下，您对自己的个人信息享有以下权利：</p>
            <ol>
              <li>查询、查阅您的个人信息；</li><li>复制您的个人信息；</li><li>对不准确或者不完整的个人信息提出更正、补充；</li><li>请求删除您的个人信息；</li><li>撤回此前作出的个人信息处理授权或同意；</li><li>要求我们对个人信息处理规则进行解释说明；</li><li>限制或者拒绝我们对您的个人信息进行特定处理；</li><li>法律法规规定的其他个人信息权利。</li>
            </ol>
            <p>如您希望行使上述权利，可以通过本告知书第一条所列联系方式联系我们。我们将在核实您的身份后，按照法律法规规定的期限和要求处理您的请求。</p>
            <p>您撤回同意，不影响撤回前基于您的同意已经开展的个人信息处理活动的效力。</p>
          </NoticeSection>
          <NoticeSection title="八、不同意或撤回同意的影响">
            <p>您有权自主决定是否向我们提供个人信息。</p>
            <p>如果相关个人信息属于参与本次问卷调查或活动所必需的信息，在您不同意提供或撤回相关授权后，我们可能无法继续为您提供相应的问卷填写、活动参与、结果反馈等服务。</p>
            <p>对于非必要的个人信息，您拒绝提供原则上不会影响您使用其他基本功能。</p>
          </NoticeSection>
          <NoticeSection title="九、未成年人个人信息保护">
            <p>如您未满14周岁，请在您的父母或其他监护人陪同下阅读本告知书，并在取得父母或其他监护人同意后参与本次问卷。</p>
            <p>如本次问卷明确面向不满14周岁的未成年人，我们将按照法律法规要求制定专门的个人信息处理规则，并依法取得其父母或其他监护人的同意。</p>
          </NoticeSection>
          <NoticeSection title="十、告知书的更新">
            <p>如本次个人信息处理的目的、方式、个人信息种类、保存期限、共享范围等发生重大变化，我们将依法重新向您进行告知。</p>
            <p>对于依法需要重新取得您同意的事项，我们将在取得您的同意后再进行相关个人信息处理活动。</p>
          </NoticeSection>
          <NoticeSection title="十一、联系我们">
            <p>兴业银行宁德分行</p>
            <p>联系方式：2508815</p>
            <p>联系地址：宁德市天湖东路6号</p>
            <p>人保财险宁德市分公司</p>
            <p>联系方式：2795518</p>
            <p>联系地址：蕉城区蕉城南路9号</p>
            <p>如您对本次个人信息处理活动存在疑问、意见或投诉，或希望行使个人信息相关权利，可以通过上述联系方式与我们取得联系。</p>
          </NoticeSection>
        </div>
        <footer className="rss-privacy-actions">
          <label className="rss-consent-check">
            <input type="checkbox" checked={decision === "agree"} onChange={() => setDecision("agree")} />
            <span>我已阅读并充分理解《个人信息处理告知书》的全部内容，并同意按照上述规则处理本人个人信息。</span>
          </label>
          <label className="rss-consent-check rss-consent-decline">
            <input type="checkbox" checked={decision === "decline"} onChange={() => setDecision("decline")} />
            <span>我不同意上述个人信息处理规则。</span>
          </label>
          <button className="rss-primary" type="button" disabled={!decision} onClick={confirmDecision}>确定</button>
        </footer>
      </article>
    </div>
  );
}

function NoticeSection({ title, children }) {
  return <section><h2>{title}</h2>{children}</section>;
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
      <div className="rss-article-heading">
        <img
          className="rss-article-mascot rss-article-mascot-left"
          src={`${activityAssetsBaseUrl}/1.png`}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
        />
        <h2>安全知识推荐</h2>
        <img
          className="rss-article-mascot rss-article-mascot-right"
          src={`${activityAssetsBaseUrl}/2.png`}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
        />
      </div>
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
          <span className="rss-article-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M8 16 16 8" />
              <path d="M10 8h6v6" />
            </svg>
          </span>
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

function PrizeWheel({ draw, showResult, onComplete, onPoster }) {
  const targetIndex = wheelStopIndexForDraw(draw);
  const [rotation, setRotation] = useState(() => showResult ? 1440 - targetIndex * 60 : 0);

  useEffect(() => {
    if (showResult) return;
    const frame = window.requestAnimationFrame(() => {
      setRotation(1440 - targetIndex * 60);
    });
    const timer = window.setTimeout(onComplete, 3900);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [onComplete, targetIndex, showResult]);

  return (
    <>
    <section className="rss-wheel-page" aria-live="polite">
      <header className="rss-wheel-heading">
        <h1>幸运转盘</h1>
        <p className="rss-wheel-tip">{showResult ? "本次抽奖已完成" : "正在揭晓本次幸运奖励"}</p>
      </header>
      <div className="rss-wheel-stage">
        <i className="rss-wheel-halo rss-wheel-halo-one" aria-hidden="true" />
        <i className="rss-wheel-halo rss-wheel-halo-two" aria-hidden="true" />
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
        <div className="rss-wheel-center">{showResult ? "已开奖" : "抽奖中"}</div>
      </div>
      <div className="rss-wheel-status">
        <i aria-hidden="true" />
        <small>{showResult ? "本次结果已记录" : "请稍候，转盘停止后公布结果"}</small>
      </div>
    </section>
    {showResult ? <PrizeResult draw={draw} onPoster={onPoster} /> : null}
    </>
  );
}

function PrizeResult({ draw, onPoster }) {
  const won = isWinningDraw(draw);
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      className="rss-prize-modal"
      aria-labelledby="rss-prize-title"
      onCancel={(event) => { event.preventDefault(); onPoster(); }}
    >
    <section className={`rss-prize-result ${won ? "is-win" : "is-miss"}`}>
      <div className="rss-prize-light" aria-hidden="true" />
      <p className="rss-prize-caption">本次抽奖结果</p>
      <div className={`rss-prize-orbit ${won ? "is-win" : ""}`}>
        <i className="rss-prize-spark rss-prize-spark-one" aria-hidden="true" />
        <i className="rss-prize-spark rss-prize-spark-two" aria-hidden="true" />
        <span>{won ? "¥" : "安"}</span>
      </div>
      <h1 id="rss-prize-title">{won ? "恭喜中奖" : "谢谢参与"}</h1>
      <h2>{won ? draw.prizeName : "平安到家就是今天的头奖"}</h2>
      {draw?.prizeType === "cash" && won ? (
        <p className="rss-prize-notice">中奖红包将直接发放至微信支付零钱</p>
      ) : <p className="rss-prize-notice">感谢参与，愿您每一程都平安顺利。</p>}
      <button type="button" className="rss-prize-return" onClick={onPoster}>
        返回查看测评结语
      </button>
    </section>
    </dialog>
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
