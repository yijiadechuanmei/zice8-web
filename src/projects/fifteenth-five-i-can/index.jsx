/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState } from "react";
import { LoadingOutlined } from "@ant-design/icons";
import { useWechatAuth } from "../../shared/hooks/useWechatAuth";
import { useWechatShare } from "../../shared/hooks/useWechatShare";
import {
  getPublicConfig,
  getState,
  saveKeywords,
  start,
  submitAnswer,
  submitFutureMessage,
  submitName,
} from "./api";
import {
  ASSETS,
  FIFTEENTH_FIVE_I_CAN_ACTIVITY_KEY,
  KEYWORD_LAYOUT,
  PUBLIC_ACTIVITY_DATA,
  assetUrl,
  keywordLabel,
  mergeConfig,
} from "./config";
import { renderCertificatePoster } from "./poster";
import "./styles.css";

function publicState(progress = {}) {
  const answers = Array.isArray(progress.answers) ? progress.answers : [];
  const selectedKeywords = Array.isArray(progress.selectedKeywords)
    ? progress.selectedKeywords.filter((item) => PUBLIC_ACTIVITY_DATA.keywords.includes(item))
    : [];
  const completeQuiz = answers.length === PUBLIC_ACTIVITY_DATA.questions.length;
  const futureMessage = typeof progress.futureMessage === "string" ? progress.futureMessage : "";
  const wish = typeof progress.wish === "string" ? progress.wish : "";
  const name = typeof progress.name === "string" ? progress.name.trim() : "";
  return {
    phase: !progress.started
      ? "home"
      : futureMessage && progress.wishSubmitted
        ? name
          ? "certificate"
          : "name"
        : futureMessage
          ? "future-wish"
        : completeQuiz
          ? "future-message"
          : selectedKeywords.length >= 2
            ? "quiz"
            : "keywords",
    totalQuestions: PUBLIC_ACTIVITY_DATA.questions.length,
    answeredCount: answers.length,
    selectedKeywords,
    keywordOptions: PUBLIC_ACTIVITY_DATA.keywords,
    wishPresets: PUBLIC_ACTIVITY_DATA.wishPresets,
    currentQuestion:
      !completeQuiz && selectedKeywords.length >= 2
        ? PUBLIC_ACTIVITY_DATA.questions[answers.length]
        : null,
    futureMessage,
    wish,
    name,
    nickname: "中汽青年",
  };
}

function hasCorrectOptions(question, selectedOptions) {
  const selected = [...new Set(selectedOptions)].sort();
  return (
    selected.length === question.correctOptions.length &&
    selected.every((option, index) => option === question.correctOptions[index])
  );
}

export default function FifteenthFiveICanProject({ routeParams }) {
  const activityKey =
    routeParams?.activityKey || FIFTEENTH_FIVE_I_CAN_ACTIVITY_KEY;
  const [publicConfig, setPublicConfig] = useState(null);
  const [state, setState] = useState(null);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [futureMessage, setFutureMessage] = useState("");
  const [wish, setWish] = useState("");
  const [name, setName] = useState("");
  const [futureStep, setFutureStep] = useState("message");
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [poster, setPoster] = useState("");
  const [shareHint, setShareHint] = useState(false);
  const timer = useRef(null);
  const posterGeneration = useRef(false);
  const publicProgress = useRef({});
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig]);
  const assetsBaseUrl = config.assetsBaseUrl;
  const isPublicActivity = publicConfig?.accessMode === "public";

  useWechatShare(activityKey, publicConfig);
  const { authReady, blockedMessage, reauth } = useWechatAuth(
    activityKey,
    publicConfig,
  );
  const notify = (message, correct = false, onDismiss, duration = 1500) => {
    window.clearTimeout(timer.current);
    setToast({ message, correct });
    timer.current = window.setTimeout(() => {
      setToast(null);
      onDismiss?.();
    }, duration);
  };
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setState(await getState(activityKey));
    } catch (requestError) {
      if (requestError?.status === 401 && reauth("fifteenth-five-state"))
        return;
      setError(requestError.message || "活动状态加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  };
  const updatePublicState = (patch) => {
    const nextProgress = { ...publicProgress.current, ...patch };
    publicProgress.current = nextProgress;
    const nextState = publicState(nextProgress);
    setState(nextState);
    return nextState;
  };

  useEffect(() => {
    getPublicConfig(activityKey)
      .then(setPublicConfig)
      .catch(() => {});
    return () => window.clearTimeout(timer.current);
  }, [activityKey]);
  useEffect(() => {
    if (!authReady) return;
    if (isPublicActivity) {
      publicProgress.current = {};
      setError("");
      setState(publicState());
      setLoading(false);
      return;
    }
    load();
  }, [activityKey, authReady, isPublicActivity]);
  useEffect(() => {
    if (blockedMessage) {
      setLoading(false);
      setError(blockedMessage);
    }
  }, [blockedMessage]);
  useEffect(() => {
    setSelectedKeywords(state?.selectedKeywords || []);
  }, [state?.selectedKeywords?.join("|")]);
  useEffect(() => {
    setSelectedOptions([]);
  }, [state?.currentQuestion?.no]);
  useEffect(() => {
    setFutureMessage(state?.futureMessage || "");
    setWish(state?.wish || "");
  }, [state?.phase]);
  useEffect(() => {
    setName(state?.name || "");
  }, [state?.name]);
  useEffect(() => {
    if (state?.phase === "future-message") setFutureStep("message");
    if (state?.phase === "future-wish") setFutureStep("wish");
  }, [state?.phase]);
  useEffect(() => {
    document.title = publicConfig?.title || "十五五，我看行！";
  }, [publicConfig]);
  useEffect(() => () => document.body.classList.remove("ffic-no-scroll"), []);
  useEffect(() => {
    document.body.classList.add("ffic-no-scroll");
    return () => document.body.classList.remove("ffic-no-scroll");
  }, []);

  async function run(action) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      return await action();
    } catch (requestError) {
      if (requestError?.status === 401 && reauth("fifteenth-five-request"))
        return null;
      setError(requestError.message || "操作失败，请稍后重试");
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function begin() {
    if (isPublicActivity) {
      updatePublicState({ started: true });
      return;
    }
    const next = await run(() => start(activityKey));
    if (next) setState(next);
  }
  function toggleKeyword(keyword) {
    setSelectedKeywords((current) =>
      current.includes(keyword)
        ? current.filter((item) => item !== keyword)
        : [...current, keyword],
    );
  }
  async function continueQuiz() {
    if (selectedKeywords.length < 2) {
      notify("请至少选择2个青春关键词", false, undefined, 1000);
      return;
    }
    if (selectedKeywords.length > 3) {
      notify("最多选择3个青春关键词", false, undefined, 1000);
      return;
    }
    if (isPublicActivity) {
      updatePublicState({ started: true, selectedKeywords });
      return;
    }
    const next = await run(() => saveKeywords(activityKey, selectedKeywords));
    if (next) setState(next);
  }
  function toggleOption(option) {
    if (state.currentQuestion.type === "single") {
      setSelectedOptions([option]);
      return;
    }
    setSelectedOptions((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    );
  }
  async function answer() {
    if (isPublicActivity) {
      const question = PUBLIC_ACTIVITY_DATA.questions[state.answeredCount];
      if (!question || !hasCorrectOptions(question, selectedOptions)) {
        notify("回答错误，请重新作答");
        return;
      }
      const progress = publicProgress.current;
      notify("回答正确，继续加油！", true, () => {
        updatePublicState({
          started: true,
          answers: [
            ...(Array.isArray(progress.answers) ? progress.answers : []),
            { questionNo: question.no, selectedOptions: [...selectedOptions].sort() },
          ],
        });
        setSelectedOptions([]);
      });
      return;
    }
    const next = await run(() =>
      submitAnswer(activityKey, {
        questionNo: state.currentQuestion.no,
        selectedOptions,
      }),
    );
    if (!next) return;
    const correct = Boolean(next.feedback?.correct);
    notify(
      next.feedback?.message || "回答正确，继续加油！",
      correct,
      correct
        ? () => {
          setState(next);
          setSelectedOptions([]);
        }
        : undefined,
    );
  }
  async function saveFutureMessage() {
    const normalizedMessage = futureMessage.trim();
    if (!normalizedMessage) {
      setError("请写下给2030年的一句话");
      return;
    }
    if (isPublicActivity) {
      updatePublicState({ futureMessage: normalizedMessage });
      return;
    }
    setFutureStep("wish");
  }
  async function saveWish() {
    const normalizedMessage = futureMessage.trim();
    const normalizedWish = wish.trim();
    if (!normalizedMessage) return;
    if (isPublicActivity) {
      updatePublicState({
        futureMessage: normalizedMessage,
        wish: normalizedWish,
        wishSubmitted: true,
      });
      return;
    }
    const next = await run(() =>
      submitFutureMessage(activityKey, {
        futureMessage: normalizedMessage,
        wish: normalizedWish,
      }),
    );
    if (next) setState(next);
  }
  async function saveName() {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("请填写姓名");
      return;
    }
    if (isPublicActivity) {
      updatePublicState({ name: normalizedName });
      return;
    }
    const next = await run(() => submitName(activityKey, normalizedName));
    if (next) setState(next);
  }
  async function makePoster() {
    const image = await run(() =>
      renderCertificatePoster({
        nickname: state.name || state.nickname,
        selectedKeywords: state.selectedKeywords.map(keywordLabel),
        futureMessage: state.futureMessage,
        wish: state.wish,
        assetsBaseUrl,
      }),
    );
    if (image) setPoster(image);
  }
  useEffect(() => {
    if (state?.phase !== "certificate") {
      posterGeneration.current = false;
      return;
    }
    if (posterGeneration.current) return;
    posterGeneration.current = true;
    makePoster();
  }, [state?.phase]);
  function replay() {
    setPoster("");
    setShareHint(false);
    if (!isPublicActivity) {
      window.location.reload();
      return;
    }
    publicProgress.current = {};
    setSelectedKeywords([]);
    setSelectedOptions([]);
    setFutureMessage("");
    setWish("");
    setName("");
    setState(publicState());
  }
  function shareCertificate() {
    setShareHint(true);
  }
  const homeBackground = assetUrl(ASSETS.homeBackground, assetsBaseUrl);
  const pageBackground = assetUrl(ASSETS.pageBackground, assetsBaseUrl);
  return (
    <main
      className="ffic-app"
      style={{
        "--ffic-home-bg": `url("${homeBackground}")`,
        "--ffic-page-bg": `url("${pageBackground}")`,
      }}
    >
      <div className={`ffic-stage ffic-stage--${state?.phase || "home"}`}>
        {loading ? <CenterState loading /> : null}
        {!loading && error && !state ? <CenterState error={error} /> : null}
        {!loading && state?.phase === "home" ? (
          <Home assetsBaseUrl={assetsBaseUrl} onStart={begin} busy={busy} />
        ) : null}
        {!loading && state?.phase === "keywords" ? (
          <Keywords
            state={state}
            selected={selectedKeywords}
            onToggle={toggleKeyword}
            onNext={continueQuiz}
            busy={busy}
            assetsBaseUrl={assetsBaseUrl}
          />
        ) : null}
        {!loading && state?.phase === "quiz" ? (
          <Quiz
            key={`quiz-${state.currentQuestion?.no || "start"}`}
            state={state}
            selected={selectedOptions}
            onToggle={toggleOption}
            onAnswer={answer}
            busy={busy}
            assetsBaseUrl={assetsBaseUrl}
          />
        ) : null}
        {!loading && ["future-message", "future-wish"].includes(state?.phase) ? (
          <FutureMessage
            key={`form-${state.phase}-${futureStep}`}
            state={state}
            step={futureStep}
            message={futureMessage}
            wish={wish}
            onMessage={setFutureMessage}
            onWish={setWish}
            onMessageNext={saveFutureMessage}
            onWishSave={saveWish}
            busy={busy}
            assetsBaseUrl={assetsBaseUrl}
          />
        ) : null}
        {!loading && state?.phase === "name" ? (
          <NameForm
            key="name-form"
            name={name}
            onChange={setName}
            onSubmit={saveName}
            busy={busy}
            assetsBaseUrl={assetsBaseUrl}
          />
        ) : null}
        {!loading && state?.phase === "certificate" ? (
          <Certificate
            state={state}
            poster={poster}
            onReplay={replay}
            onShare={shareCertificate}
            assetsBaseUrl={assetsBaseUrl}
          />
        ) : null}
        {toast ? (
          <div
            className="ffic-toast-layer"
            aria-live="polite"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <div
              className={`ffic-toast ${toast.correct ? "is-correct" : "is-wrong"}`}
              role="status"
            >
              {toast.message}
            </div>
          </div>
        ) : null}
        {shareHint ? (
          <button
            className="ffic-share-hint"
            type="button"
            onClick={() => setShareHint(false)}
            aria-label="关闭分享提示"
          >
            <span aria-hidden="true">↗</span>
            <strong>点击右上角<br />分享到朋友圈</strong>
          </button>
        ) : null}
        {error && state ? (
          <p className="ffic-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function Home({ assetsBaseUrl, onStart, busy }) {
  return (
    <section className="ffic-home">
      <img
        className="ffic-home__title"
        src={assetUrl(ASSETS.homeTitle, assetsBaseUrl)}
        alt="十五五，我看行！"
      />
      <img
        className="ffic-home__hero"
        src={assetUrl(ASSETS.homeHero, assetsBaseUrl)}
        alt="青春奔赴未来"
      />
      <img
        className="ffic-home__subtitle"
        src={assetUrl(ASSETS.homeSubtitle, assetsBaseUrl)}
        alt="青年学习答题"
      />
      <button
        className="ffic-home__button"
        type="button"
        onClick={onStart}
        disabled={busy}
      >
        <img src={assetUrl(ASSETS.homeButton, assetsBaseUrl)} alt="" />
      </button>
    </section>
  );
}

function Keywords({ state, selected, onToggle, onNext, busy, assetsBaseUrl }) {
  return (
    <section className="ffic-keywords">
      <div className="ffic-barrage" aria-label="关键词弹幕">
        {KEYWORD_LAYOUT.map((layout, index) => {
          const lane = index % 3;
          const sequence = Math.floor(index / 3);
          const laneTop = [2, 39, 76][lane];
          const verticalOffset = [-1.2, 0.8, -0.5, 1.4, -0.8, 0.5][index % 6];
          const laneDuration = [66, 70, 74][lane];
          const laneItemCount = lane === 0 ? 12 : 11;
          return (
            <span
              key={layout.id}
              className={`ffic-barrage__item ${selected.includes(layout.id) ? "is-selected" : ""}`}
              style={{
                "--top": `${laneTop + verticalOffset}%`,
                "--delay": `${-(sequence * (laneDuration / laneItemCount) + lane * 1.7)}s`,
                "--duration": `${laneDuration}s`,
                "--rise": "0cqw",
                "--w": `${layout.width / 7.5}%`,
              }}
            >
              <span>{layout.label}</span>
            </span>
          );
        })}
      </div>
      <img className="ffic-keywords__heading" src={assetUrl(ASSETS.keywordHeading, assetsBaseUrl)} alt="选择关键词" />
      <div className="ffic-keyword-cloud">
        {state.keywordOptions.map((keyword, index) => {
          const layout = KEYWORD_LAYOUT[index];
          const active = selected.includes(keyword);
          return (
            <button
              key={`${keyword}-${index}`}
              type="button"
              className={`ffic-keyword ${active ? "is-selected" : ""}`}
              style={{
                "--left": `${layout.x / 7.5}%`,
                "--top": `${layout.y / 16.24}%`,
                "--width": `${layout.width / 7.5}%`,
                "--height": `${layout.height / 16.24}%`,
              }}
              onClick={() => onToggle(keyword)}
              aria-pressed={active}
              aria-label={layout.label}
            >
              <span>{layout.label}</span>
            </button>
          );
        })}
      </div>
      <img className="ffic-keywords__caption" src={assetUrl(ASSETS.keywordCaption, assetsBaseUrl)} alt="" />
      <button
        className="ffic-image-button ffic-keywords__next"
        type="button"
        disabled={busy}
        onClick={onNext}
      >
        <img src={assetUrl(ASSETS.keywordAction, assetsBaseUrl)} alt="去答题" />
      </button>
    </section>
  );
}

function Quiz({ state, selected, onToggle, onAnswer, busy, assetsBaseUrl }) {
  const question = state.currentQuestion;
  return (
    <section className="ffic-quiz">
      <img className="ffic-quiz__title" src={assetUrl(ASSETS.quizTitle, assetsBaseUrl)} alt="答题挑战" />
      <img className="ffic-quiz__card" src={assetUrl(ASSETS.quizCard, assetsBaseUrl)} alt="" />
      <div className="ffic-quiz__content">
          <h1>{question.no}、{question.title}</h1>
          <div className={`ffic-options ffic-options--${question.type}`}>
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={selected.includes(option.id) ? "is-selected" : ""}
                onClick={() => onToggle(option.id)}
                aria-pressed={selected.includes(option.id)}
              >
                <span className="ffic-option__key" aria-hidden="true">{option.id}</span>
                <span className="ffic-option__text">{option.text}</span>
              </button>
            ))}
          </div>
      </div>
      <button
        className="ffic-image-button ffic-quiz__submit"
        type="button"
        disabled={!selected.length || busy}
        onClick={onAnswer}
      >
        <img src={assetUrl(ASSETS.quizHeading, assetsBaseUrl)} alt="确认答案" />
      </button>
    </section>
  );
}

function FutureMessage({
  state,
  step,
  message,
  wish,
  onMessage,
  onWish,
  onMessageNext,
  onWishSave,
  busy,
  assetsBaseUrl,
}) {
  const isWishStep = step === "wish";
  return (
    <section className={`ffic-form ${isWishStep ? "ffic-form--wish" : "ffic-form--message"}`}>
      <img
        className="ffic-form__title"
        src={assetUrl(isWishStep ? ASSETS.wishTitle : ASSETS.quizTitle, assetsBaseUrl)}
        alt=""
      />
      <img className="ffic-form__card" src={assetUrl(ASSETS.quizCard, assetsBaseUrl)} alt="" />
      <img
        className="ffic-form__caption"
        src={assetUrl(isWishStep ? ASSETS.wishCaption : ASSETS.formCaption, assetsBaseUrl)}
        alt=""
      />
      <div className="ffic-form__content">
        {!isWishStep ? (
          <label>
            15、【填空题-时空胶囊】请你为2030年的自己写一句话？（限30字）
            <textarea
              value={message}
              maxLength="30"
              onChange={(event) => onMessage(event.target.value)}
              placeholder="请输入"
            />
            <em>{[...message].length}/30</em>
          </label>
        ) : (
          <div className="ffic-wishes">
            <span>选择或输入一句简短期盼（可选，限制15字内），这句话将会同步带到最终海报</span>
            <div>
              {state.wishPresets.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={wish === item ? "is-selected" : ""}
                  onClick={() => onWish(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <textarea
              value={wish}
              maxLength="15"
              onChange={(event) => onWish(event.target.value)}
              placeholder="输入你的期盼"
            />
          </div>
        )}
      </div>
      <button
        className="ffic-image-button ffic-form__submit"
        type="button"
        disabled={(!isWishStep && !message.trim()) || busy}
        onClick={isWishStep ? onWishSave : onMessageNext}
      >
        <img
          src={assetUrl(isWishStep ? ASSETS.wishAction : ASSETS.formAction, assetsBaseUrl)}
          alt={isWishStep ? "生成我的证书海报" : "下一步"}
        />
      </button>
    </section>
  );
}

function NameForm({ name, onChange, onSubmit, busy, assetsBaseUrl }) {
  return (
    <section className="ffic-form ffic-name">
      <h1 className="ffic-name__title">填写姓名</h1>
      <img className="ffic-form__card" src={assetUrl(ASSETS.quizCard, assetsBaseUrl)} alt="" />
      <div className="ffic-form__content">
        <label>
          请填写您的姓名，生成专属青年学习证书
          <input
            value={name}
            maxLength="20"
            onChange={(event) => onChange(event.target.value)}
            placeholder="请输入姓名"
            autoComplete="name"
          />
          <em>{[...name].length}/20</em>
        </label>
      </div>
      <p className="ffic-name__caption">姓名将展示在专属证书与海报中</p>
      <button
        className="ffic-image-button ffic-name__submit"
        type="button"
        disabled={!name.trim() || busy}
        onClick={onSubmit}
      >
        <img src={assetUrl(ASSETS.wishAction, assetsBaseUrl)} alt="生成我的专属学习证书" />
      </button>
    </section>
  );
}

function Certificate({ state, poster, onReplay, onShare, assetsBaseUrl }) {
  return (
    <section className="ffic-certificate">
      <img className="ffic-certificate__heading" src={assetUrl(ASSETS.certificateHeading, assetsBaseUrl)} alt="" />
      <img className="ffic-certificate__template" src={assetUrl(ASSETS.certificate, assetsBaseUrl)} alt="十五五，我看行！青年学习证书" />
      <div className="ffic-certificate__copy">
        <p className="ffic-certificate__salutation"><span>{state.name || state.nickname || "中汽青年"}</span>同学：</p>
        <p className="ffic-certificate__body">
          <span>已完成中汽中心“十五五”发展纲要线上学习，</span>
          <span>读懂集团战略，锚定青春方向，</span>
          <span>以青春之力建功世界一流汽车全价值链技术服务机构建设。</span>
        </p>
        <p className="ffic-certificate__keywords">你的青春关键词：{state.selectedKeywords.map(keywordLabel).join(" · ")}</p>
        {state.wish ? <p className="ffic-certificate__wish">青春期盼：{state.wish}</p> : null}
        <p className="ffic-certificate__issuer">中汽中心团委</p>
      </div>
      <div className="ffic-certificate__actions">
        {poster ? (
          <a
            className="ffic-image-button"
            href={poster}
            download="十五五我看行青年学习证书.png"
            aria-label="保存海报"
          >
            <img src={assetUrl(ASSETS.certificateSave, assetsBaseUrl)} alt="保存海报" />
          </a>
        ) : (
          <button
            className="ffic-image-button"
            type="button"
            disabled
          >
            <img src={assetUrl(ASSETS.certificateSave, assetsBaseUrl)} alt="保存海报" />
          </button>
        )}
        <button className="ffic-image-button" type="button" onClick={onReplay}>
          <img src={assetUrl(ASSETS.certificateReplay, assetsBaseUrl)} alt="再玩一次" />
        </button>
        <button className="ffic-image-button" type="button" onClick={onShare}>
          <img src={assetUrl(ASSETS.certificateShare, assetsBaseUrl)} alt="分享到朋友圈" />
        </button>
      </div>
      {poster ? (
        <img
          className="ffic-certificate__poster"
          src={poster}
          alt="我的十五五青年学习证书海报，长按可保存"
        />
      ) : null}
    </section>
  );
}
function CenterState({ loading, error }) {
  return (
    <div className="ffic-center-state">
      {loading ? <LoadingOutlined spin /> : null}
      <strong>{loading ? "正在加载活动…" : "暂时无法进入活动"}</strong>
      {error ? <span>{error}</span> : null}
    </div>
  );
}
