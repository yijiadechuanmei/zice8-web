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
  return {
    phase: !progress.started
      ? "home"
      : futureMessage && progress.wishSubmitted
        ? "certificate"
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
  const [futureStep, setFutureStep] = useState("message");
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [poster, setPoster] = useState("");
  const timer = useRef(null);
  const publicProgress = useRef({});
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig]);
  const assetsBaseUrl = config.assetsBaseUrl;
  const isPublicActivity = publicConfig?.accessMode === "public";

  useWechatShare(activityKey, publicConfig);
  const { authReady, blockedMessage, reauth } = useWechatAuth(
    activityKey,
    publicConfig,
  );
  const notify = (message, correct = false) => {
    window.clearTimeout(timer.current);
    setToast({ message, correct });
    timer.current = window.setTimeout(() => setToast(null), 1500);
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
        : current.length >= 3
          ? current
          : [...current, keyword],
    );
  }
  async function continueQuiz() {
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
      updatePublicState({
        started: true,
        answers: [
          ...(Array.isArray(progress.answers) ? progress.answers : []),
          { questionNo: question.no, selectedOptions: [...selectedOptions].sort() },
        ],
      });
      notify("回答正确，继续加油！", true);
      return;
    }
    const next = await run(() =>
      submitAnswer(activityKey, {
        questionNo: state.currentQuestion.no,
        selectedOptions,
      }),
    );
    if (!next) return;
    notify(
      next.feedback?.message || "回答正确，继续加油！",
      Boolean(next.feedback?.correct),
    );
    setState(next);
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
  async function makePoster() {
    const image = await run(() =>
      renderCertificatePoster({
        nickname: state.nickname,
        selectedKeywords: state.selectedKeywords.map(keywordLabel),
        futureMessage: state.futureMessage,
        wish: state.wish,
        assetsBaseUrl,
      }),
    );
    if (image) setPoster(image);
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
        {!loading && state?.phase === "certificate" ? (
          <Certificate
            state={state}
            poster={poster}
            onPoster={makePoster}
            busy={busy}
            assetsBaseUrl={assetsBaseUrl}
          />
        ) : null}
        {toast ? (
          <div
            className={`ffic-toast ${toast.correct ? "is-correct" : "is-wrong"}`}
            role="status"
          >
            {toast.message}
          </div>
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
            <img
              key={layout.id}
              src={assetUrl(layout.image, assetsBaseUrl)}
              alt={layout.label}
              style={{
                "--top": `${laneTop + verticalOffset}%`,
                "--delay": `${-(sequence * (laneDuration / laneItemCount) + lane * 1.7)}s`,
                "--duration": `${laneDuration}s`,
                "--rise": "0cqw",
                "--w": `${layout.width / 7.5}%`,
              }}
            />
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
              <img src={assetUrl(layout.image, assetsBaseUrl)} alt="" />
            </button>
          );
        })}
      </div>
      <img className="ffic-keywords__caption" src={assetUrl(ASSETS.keywordCaption, assetsBaseUrl)} alt="" />
      <button
        className="ffic-image-button ffic-keywords__next"
        type="button"
        disabled={selected.length < 2 || busy}
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
          <p className="ffic-quiz__progress">{question.no} / {state.totalQuestions}</p>
          <h1>{question.no}、{question.title}</h1>
          <div className="ffic-options">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={selected.includes(option.id) ? "is-selected" : ""}
                onClick={() => onToggle(option.id)}
                aria-pressed={selected.includes(option.id)}
              >
                {option.id}．{option.text}
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

function Certificate({ state, poster, onPoster, busy, assetsBaseUrl }) {
  return (
    <section className="ffic-certificate">
      <img className="ffic-certificate__heading" src={assetUrl(ASSETS.certificateHeading, assetsBaseUrl)} alt="" />
      <img className="ffic-certificate__template" src={assetUrl(ASSETS.certificate, assetsBaseUrl)} alt="十五五，我看行！青年学习证书" />
      <div className="ffic-certificate__copy">
        <p className="ffic-certificate__salutation">{state.nickname || "中汽青年"}同学：</p>
        <p className="ffic-certificate__body">
          已完成中汽中心“十五五”发展纲要线上学习，<br />
          读懂集团战略，锚定青春方向，<br />
          以青春之力建功世界一流汽车全价值链技术服务机构建设。
        </p>
        <p className="ffic-certificate__keywords">你的青春关键词：{state.selectedKeywords.map(keywordLabel).join(" · ")}</p>
        {state.wish ? <p className="ffic-certificate__wish">青春期盼：{state.wish}</p> : null}
        <p className="ffic-certificate__issuer">中汽中心团委</p>
      </div>
      <button
        className="ffic-image-button ffic-certificate__action"
        type="button"
        onClick={onPoster}
        disabled={busy}
      >
        <img src={assetUrl(ASSETS.certificateAction, assetsBaseUrl)} alt="合成证书海报" />
      </button>
      {poster ? (
        <a
          className="ffic-poster"
          href={poster}
          download="十五五我看行青年学习证书.png"
        >
          保存海报
        </a>
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
