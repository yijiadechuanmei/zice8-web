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
  mergeConfig,
} from "./config";
import { renderCertificatePoster } from "./poster";
import "./styles.css";

const PUBLIC_PROGRESS_STORAGE_PREFIX = "fifteenth_five_i_can_progress";

function publicProgressKey(activityKey) {
  return `${PUBLIC_PROGRESS_STORAGE_PREFIX}:${activityKey}`;
}

function readPublicProgress(activityKey) {
  try {
    const value = JSON.parse(localStorage.getItem(publicProgressKey(activityKey)) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function writePublicProgress(activityKey, progress) {
  try {
    localStorage.setItem(publicProgressKey(activityKey), JSON.stringify(progress));
  } catch {
    // Private browsing can disable storage; the activity remains usable for this visit.
  }
}

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
      : futureMessage
        ? "certificate"
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
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [poster, setPoster] = useState("");
  const timer = useRef(null);
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
    const nextProgress = { ...readPublicProgress(activityKey), ...patch };
    writePublicProgress(activityKey, nextProgress);
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
      setError("");
      setState(publicState(readPublicProgress(activityKey)));
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
      const progress = readPublicProgress(activityKey);
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
  async function saveMessage() {
    if (isPublicActivity) {
      const normalizedMessage = futureMessage.trim();
      const normalizedWish = wish.trim();
      if (!normalizedMessage) {
        setError("请写下给2030年的一句话");
        return;
      }
      updatePublicState({
        futureMessage: normalizedMessage,
        wish: normalizedWish,
      });
      return;
    }
    const next = await run(() =>
      submitFutureMessage(activityKey, { futureMessage, wish }),
    );
    if (next) setState(next);
  }
  async function makePoster() {
    const image = await run(() =>
      renderCertificatePoster({
        nickname: state.nickname,
        selectedKeywords: state.selectedKeywords,
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
          />
        ) : null}
        {!loading && state?.phase === "quiz" ? (
          <Quiz
            state={state}
            selected={selectedOptions}
            onToggle={toggleOption}
            onAnswer={answer}
            busy={busy}
          />
        ) : null}
        {!loading && state?.phase === "future-message" ? (
          <FutureMessage
            state={state}
            message={futureMessage}
            wish={wish}
            onMessage={setFutureMessage}
            onWish={setWish}
            onSave={saveMessage}
            busy={busy}
          />
        ) : null}
        {!loading && state?.phase === "certificate" ? (
          <Certificate
            state={state}
            poster={poster}
            onPoster={makePoster}
            busy={busy}
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
        <span>{busy ? "正在进入…" : "开启我的十五五之旅"}</span>
      </button>
    </section>
  );
}

function Keywords({ state, selected, onToggle, onNext, busy }) {
  return (
    <section className="ffic-keywords">
      <div className="ffic-barrage" aria-label="已选择关键词">
        {selected.length ? (
          selected.map((word, index) => (
            <span key={word} style={{ "--i": index }}>
              {word}
            </span>
          ))
        ) : (
          <p>
            选择 2～3 个关键词
            <br />
            让它们飘向你的十五五
          </p>
        )}
      </div>
      <h1>选择关键词</h1>
      <p className="ffic-keywords__tip">每选中一个，顶部都会出现一条专属弹幕</p>
      <div className="ffic-keyword-cloud">
        {state.keywordOptions.map((keyword, index) => {
          const layout = KEYWORD_LAYOUT[index];
          const active = selected.includes(keyword);
          return (
            <button
              key={keyword}
              type="button"
              className={`ffic-keyword ${active ? "is-selected" : ""}`}
              style={{
                left: `${layout.x / 7.5}%`,
                top: `${layout.y / 16.24}%`,
                backgroundImage: `url("${assetUrl(layout.image)}")`,
              }}
              onClick={() => onToggle(keyword)}
              aria-pressed={active}
            >
              <span>{keyword}</span>
            </button>
          );
        })}
      </div>
      <button
        className="ffic-primary ffic-keywords__next"
        type="button"
        disabled={selected.length < 2 || busy}
        onClick={onNext}
      >
        {busy ? "正在进入…" : `去答题（已选 ${selected.length}/3）`}
      </button>
    </section>
  );
}

function Quiz({ state, selected, onToggle, onAnswer, busy }) {
  const question = state.currentQuestion;
  return (
    <section className="ffic-quiz">
      <div className="ffic-quiz__top">
        <span>十五五 · 青年学习答题</span>
        <strong>
          {question.no} / {state.totalQuestions}
        </strong>
      </div>
      <img
        className="ffic-quiz__heading"
        src={assetUrl(ASSETS.quizHeading)}
        alt="答题挑战"
      />
      <div className="ffic-quiz__card">
        <img src={assetUrl(ASSETS.quizCard)} alt="" />
        <div className="ffic-quiz__content">
          <p className="ffic-quiz__kind">
            {question.type === "multiple"
              ? "多选题 · 请选择全部正确项"
              : "单选题 · 请选择一项"}
          </p>
          <h1>
            {question.no}、{question.title}
          </h1>
          <div className="ffic-options">
            {question.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={selected.includes(option.id) ? "is-selected" : ""}
                onClick={() => onToggle(option.id)}
                aria-pressed={selected.includes(option.id)}
              >
                <b>{option.id}</b>
                <span>{option.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        className="ffic-primary ffic-quiz__submit"
        type="button"
        disabled={!selected.length || busy}
        onClick={onAnswer}
      >
        {busy ? "提交中…" : "确认答案"}
      </button>
    </section>
  );
}

function FutureMessage({
  state,
  message,
  wish,
  onMessage,
  onWish,
  onSave,
  busy,
}) {
  return (
    <section className="ffic-form">
      <h1>写给 2030 年的自己</h1>
      <p>完成全部 {state.totalQuestions} 道题，留下你的未来期许</p>
      <label>
        请你为2030年的自己写一句话？
        <textarea
          value={message}
          maxLength="30"
          onChange={(event) => onMessage(event.target.value)}
          placeholder="限30字"
        />
        <em>{[...message].length}/30</em>
      </label>
      <div className="ffic-wishes">
        <span>选择或输入一句简短期盼（可选，限15字内）</span>
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
        <input
          value={wish}
          maxLength="15"
          onChange={(event) => onWish(event.target.value)}
          placeholder="输入你的期盼"
        />
      </div>
      <button
        className="ffic-primary"
        type="button"
        disabled={!message.trim() || busy}
        onClick={onSave}
      >
        {busy ? "正在生成…" : "生成我的证书海报"}
      </button>
    </section>
  );
}

function Certificate({ state, poster, onPoster, busy }) {
  return (
    <section className="ffic-certificate">
      <img
        src={assetUrl(ASSETS.certificate)}
        alt="十五五，我看行！青年学习证书"
      />
      <div className="ffic-certificate__copy">
        <p>{state.nickname || "中汽青年"}同学：</p>
        <p>你已完成《十五五，我看行！》青年学习答题</p>
        <strong>「{state.futureMessage}」</strong>
        {state.wish ? <em>期盼：{state.wish}</em> : null}
        <small>{state.selectedKeywords.join(" · ")}</small>
      </div>
      <button
        className="ffic-primary"
        type="button"
        onClick={onPoster}
        disabled={busy}
      >
        {busy ? "合成中…" : "合成证书海报"}
      </button>
      {poster ? (
        <a
          className="ffic-poster"
          href={poster}
          download="十五五我看行青年学习证书.png"
        >
          <img src={poster} alt="已合成证书海报，点击保存" />
          <span>长按图片保存海报</span>
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
