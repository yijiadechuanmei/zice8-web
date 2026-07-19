import { useEffect, useMemo, useState } from "react";
import { trackEvent, trackPageView } from "../../shared/analytics";
import { useWechatShare } from "../../shared/hooks/useWechatShare";
import { getFeatureChallengePublicConfig } from "./api";
import {
  assetUrl,
  FEATURE_CHALLENGE_ACTIVITY_KEY,
  FEATURE_CHALLENGE_ACTIVITY_TYPE,
  mergeConfig,
} from "./config";
import "./styles.css";

const OPTIONS = {
  first: [
    {
      id: "A",
      text: "向量 u 是矩阵 A 对应的特征向量，向量 v 不是矩阵 A 对应的特征向量；",
    },
    {
      id: "B",
      text: "向量 u 不是矩阵 A 对应的特征向量，向量 v 是矩阵 A 对应的特征向量；",
    },
    { id: "C", text: "向量 u 和向量 v 都是矩阵 A 对应的特征向量；" },
    { id: "D", text: "向量 u 和向量 v 都不是矩阵 A 对应的特征向量。" },
  ],
  second: [
    { id: "A", text: "7 是矩阵 A 的特征值，对应特征向量 (1, 1)。" },
    { id: "B", text: "7 是矩阵 A 的特征值，对应特征向量 (1, −1)。" },
    { id: "C", text: "7 不是矩阵 A 的特征值。" },
    { id: "D", text: "7 是矩阵 A 的特征值，没有特征向量。" },
  ],
};

const DEMO_CHALLENGE = {
  matrix: [
    [1, 6],
    [5, 2],
  ],
  u: [6, -5],
  v: [3, -2],
};

const USER_CHALLENGES = [
  {
    matrix: [
      [5, 2],
      [1, 6],
    ],
    u: [-2, 1],
    v: [2, -2],
  },
  {
    matrix: [
      [6, 1],
      [3, 4],
    ],
    u: [1, -3],
    v: [1, -2],
  },
  {
    matrix: [
      [0, 7],
      [7, 0],
    ],
    u: [1, -1],
    v: [1, -2],
  },
];

function resolveChallengeMode() {
  if (typeof window === "undefined") return "user";
  const params = new URLSearchParams(window.location.search);
  return params.get("challenge_mode") === "demo" ? "demo" : "user";
}

function resolveLayoutMode() {
  if (typeof window === "undefined") return "portrait";
  const params = new URLSearchParams(window.location.search);
  return params.get("layout") === "landscape" ? "landscape" : "portrait";
}

function copyChallenge(challenge) {
  return {
    matrix: challenge.matrix.map((row) => [...row]),
    u: [...challenge.u],
    v: [...challenge.v],
  };
}

function buildChallenge(mode) {
  if (mode === "demo") return copyChallenge(DEMO_CHALLENGE);
  const index = Math.floor(Math.random() * USER_CHALLENGES.length);
  return copyChallenge(USER_CHALLENGES[index]);
}

export default function FeatureChallengeProject({ routeParams }) {
  const activityKey =
    routeParams?.activityKey || FEATURE_CHALLENGE_ACTIVITY_KEY;
  const [publicConfig, setPublicConfig] = useState(null);
  const [challengeMode] = useState(resolveChallengeMode);
  const [layoutMode] = useState(resolveLayoutMode);
  const [page, setPage] = useState("home");
  const [phase, setPhase] = useState(1);
  const [challenge, setChallenge] = useState(() =>
    buildChallenge(challengeMode),
  );
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState({});
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig]);

  useWechatShare(activityKey, publicConfig);

  useEffect(() => {
    let cancelled = false;
    getFeatureChallengePublicConfig(activityKey)
      .then((data) => {
        if (!cancelled) setPublicConfig(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activityKey]);

  useEffect(() => {
    document.title = publicConfig?.title || "特征闯关 双关挑战";
    trackPageView(activityKey, "/feature-challenge", {
      activityType: publicConfig?.type || FEATURE_CHALLENGE_ACTIVITY_TYPE,
      pageKey:
        page === "quiz" ? `phase_${phase}${revealed ? "_reveal" : ""}` : page,
      layoutMode,
    });
  }, [activityKey, layoutMode, page, phase, publicConfig, revealed]);

  function startChallenge() {
    setChallenge(buildChallenge(challengeMode));
    setPage("quiz");
    setPhase(1);
    setSelectedAnswer("");
    setRevealed(false);
    setAnswers({});
    trackEvent({
      activityKey,
      eventType: "enter_activity",
      page: "/feature-challenge",
      extra: {
        activityType: FEATURE_CHALLENGE_ACTIVITY_TYPE,
        challengeMode,
        layoutMode,
        pageKey: "home",
        eventName: "start_challenge",
      },
    });
  }

  function restartQuiz() {
    setChallenge(buildChallenge(challengeMode));
    setPage("quiz");
    setPhase(1);
    setSelectedAnswer("");
    setRevealed(false);
    setAnswers({});
  }

  function submitAnswer() {
    if (!selectedAnswer || revealed) return;
    setAnswers((current) => ({ ...current, [phase]: selectedAnswer }));
    setRevealed(true);
    trackEvent({
      activityKey,
      eventType: "submit_profile",
      page: "/feature-challenge",
      extra: {
        activityType: FEATURE_CHALLENGE_ACTIVITY_TYPE,
        pageKey: `phase_${phase}`,
        optionId: selectedAnswer,
      },
    });
  }

  function continueChallenge() {
    if (phase === 1) {
      setPhase(2);
      setSelectedAnswer("");
      setRevealed(false);
      return;
    }
    setPage("result");
  }

  function goHome() {
    setPage("home");
    setRevealed(false);
    setSelectedAnswer("");
  }

  const backgroundImage = assetUrl(
    config.assetsBaseUrl,
    config.homeBackgroundImage,
  );
  const landscapeBackgroundImage = assetUrl(
    config.assetsBaseUrl,
    config.landscapeBackgroundImage,
  );
  const correctCount = Object.values(answers).filter(
    (answer) => answer === "A",
  ).length;

  if (page === "home") {
    return layoutMode === "landscape" ? (
      <LandscapeHome
        config={config}
        backgroundImage={landscapeBackgroundImage}
        onStart={startChallenge}
      />
    ) : (
      <HomePage config={config} onStart={startChallenge} />
    );
  }
  if (page === "result") {
    return (
      <ResultPage
        backgroundImage={backgroundImage}
        landscapeBackgroundImage={landscapeBackgroundImage}
        layoutMode={layoutMode}
        correctCount={correctCount}
        onRestart={restartQuiz}
        onHome={goHome}
      />
    );
  }

  return (
    <QuizPage
      backgroundImage={backgroundImage}
      landscapeBackgroundImage={landscapeBackgroundImage}
      layoutMode={layoutMode}
      challenge={challenge}
      challengeMode={challengeMode}
      phase={phase}
      selectedAnswer={selectedAnswer}
      revealed={revealed}
      onSelect={setSelectedAnswer}
      onSubmit={submitAnswer}
      onContinue={continueChallenge}
    />
  );
}

function LandscapeHome({ config, backgroundImage, onStart }) {
  const assets = {
    title: assetUrl(config.assetsBaseUrl, config.homeTitleImage),
    illustration: assetUrl(config.assetsBaseUrl, config.homeIllustrationImage),
    divider: assetUrl(config.assetsBaseUrl, config.homeDividerImage),
    button: assetUrl(config.assetsBaseUrl, config.homeButtonImage),
  };

  return (
    <main
      className="feature-challenge-landscape-app"
      style={{ "--feature-landscape-background": `url("${backgroundImage}")` }}
    >
      <LandscapeOrientationHint />
      <section
        className="feature-challenge-landscape-home"
        aria-label="特征闯关 双关挑战横版首页"
      >
        <div className="feature-challenge-landscape-home-copy">
          <img
            className="feature-challenge-landscape-home-title"
            src={assets.title}
            alt="特征闯关 双关挑战"
          />
          <img
            className="feature-challenge-landscape-home-divider"
            src={assets.divider}
            alt=""
          />
          <button
            className="feature-challenge-landscape-start"
            type="button"
            onClick={onStart}
            aria-label="开始闯关"
          >
            <img src={assets.button} alt="开始闯关" />
          </button>
        </div>
        <div className="feature-challenge-landscape-home-visual">
          <img
            className="feature-challenge-landscape-home-illustration"
            src={assets.illustration}
            alt=""
          />
          <div className="feature-challenge-landscape-orbit" aria-hidden="true">
            <span className="feature-challenge-landscape-orbit-core" />
            <span className="feature-challenge-landscape-orbit-line is-first" />
            <span className="feature-challenge-landscape-orbit-line is-second" />
            <span className="feature-challenge-landscape-orbit-line is-third" />
            <p>λ</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function HomePage({ config, onStart }) {
  const assets = {
    background: assetUrl(config.assetsBaseUrl, config.homeBackgroundImage),
    divider: assetUrl(config.assetsBaseUrl, config.homeDividerImage),
    button: assetUrl(config.assetsBaseUrl, config.homeButtonImage),
    title: assetUrl(config.assetsBaseUrl, config.homeTitleImage),
    illustration: assetUrl(config.assetsBaseUrl, config.homeIllustrationImage),
  };

  return (
    <main className="feature-challenge-app">
      <section
        className="feature-challenge-home"
        aria-label="特征闯关 双关挑战首页"
      >
        <div className="feature-challenge-stage">
          <StageImage
            className="feature-challenge-background"
            src={assets.background}
            alt=""
          />
          <StageImage
            className="feature-challenge-title"
            src={assets.title}
            alt="特征闯关 双关挑战"
          />
          <StageImage
            className="feature-challenge-illustration"
            src={assets.illustration}
            alt=""
          />
          <StageImage
            className="feature-challenge-divider"
            src={assets.divider}
            alt=""
          />
          <button
            className="feature-challenge-start"
            type="button"
            onClick={onStart}
            aria-label="开始闯关"
          >
            <img src={assets.button} alt="开始闯关" />
          </button>
        </div>
      </section>
    </main>
  );
}

function QuizPage({
  backgroundImage,
  landscapeBackgroundImage,
  layoutMode,
  challenge,
  challengeMode,
  phase,
  selectedAnswer,
  revealed,
  onSelect,
  onSubmit,
  onContinue,
}) {
  const firstPhase = phase === 1;
  const options = firstPhase ? OPTIONS.first : OPTIONS.second;
  const matrixLabel = `矩阵 A，第一行 ${challenge.matrix[0].join("，")}，第二行 ${challenge.matrix[1].join("，")}`;

  return (
    <main
      className={`feature-challenge-quiz-app${layoutMode === "landscape" ? " is-landscape" : ""}`}
      style={{
        "--feature-quiz-background": `url("${layoutMode === "landscape" ? landscapeBackgroundImage : backgroundImage}")`,
      }}
    >
      {layoutMode === "landscape" ? <LandscapeOrientationHint /> : null}
      <section
        className="feature-challenge-quiz-page"
        aria-label={`第 ${phase} 关答题页`}
      >
        <PhaseProgress phase={phase} />
        {revealed ? (
          <AnswerReveal
            challenge={challenge}
            challengeMode={challengeMode}
            phase={phase}
            onContinue={onContinue}
          />
        ) : (
          <>
            <QuestionPanel
              challenge={challenge}
              phase={phase}
              matrixLabel={matrixLabel}
            />
            <div
              className="feature-challenge-options"
              role="radiogroup"
              aria-label="答案选项"
            >
              {options.map((option) => (
                <button
                  className={`feature-challenge-option${selectedAnswer === option.id ? " is-selected" : ""}`}
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedAnswer === option.id}
                  onClick={() => onSelect(option.id)}
                >
                  <span className="feature-challenge-option-key">
                    {option.id}
                  </span>
                  <span>{option.text}</span>
                </button>
              ))}
            </div>
            <button
              className="feature-challenge-submit"
              type="button"
              disabled={!selectedAnswer}
              onClick={onSubmit}
            >
              <span>提交答案</span>
              <ArrowIcon />
            </button>
          </>
        )}
      </section>
    </main>
  );
}

function PhaseProgress({ phase }) {
  return (
    <div
      className={`feature-challenge-phase-progress${phase === 2 ? " is-second-active" : ""}`}
      aria-label={`当前第 ${phase} 关`}
    >
      <div
        className={`feature-challenge-phase-chip${phase === 1 ? " is-active" : " is-done"}`}
      >
        <strong>第一关</strong>
        <small>{phase === 1 ? "进行中" : "已完成"}</small>
      </div>
      <div className="feature-challenge-phase-line" aria-hidden="true">
        <i />
      </div>
      <div
        className={`feature-challenge-phase-chip${phase === 2 ? " is-active" : ""}`}
      >
        <strong>第二关</strong>
        {phase === 2 ? <small>进行中</small> : null}
      </div>
    </div>
  );
}

function QuestionPanel({ challenge, phase, matrixLabel }) {
  const firstPhase = phase === 1;
  return (
    <article className="feature-challenge-question-panel">
      <header className="feature-challenge-question-heading">
        <QuestionIcon />
        <strong>题目</strong>
      </header>
      {firstPhase ? (
        <div className="feature-challenge-question-copy">
          <p>
            变换矩阵 A ={" "}
            <Matrix values={challenge.matrix} label={matrixLabel} />，
          </p>
          <p>判断两个可疑方向的碎片数据：</p>
          <p>
            u = {formatVector(challenge.u)} 和 v = {formatVector(challenge.v)}。
          </p>
          <p className="feature-challenge-question-emphasis">
            问题：谁才是真正的“忠诚者”？
          </p>
        </div>
      ) : (
        <div className="feature-challenge-question-copy">
          <p>工程师深入调查，发现这个矩阵</p>
          <p>
            A = <Matrix values={challenge.matrix} label={matrixLabel} />{" "}
            还隐藏着另一个“忠诚者”方向。
          </p>
          <p className="feature-challenge-question-emphasis">
            问题：证明 7 是矩阵 A
            的特征值，并且找出对应的“忠诚者”方向（特征向量）。
          </p>
        </div>
      )}
    </article>
  );
}

function AnswerReveal({ challenge, challengeMode, phase, onContinue }) {
  const firstPhase = phase === 1;
  const answer = (firstPhase ? OPTIONS.first : OPTIONS.second)[0];
  const isDemoMode = challengeMode === "demo";
  return (
    <section className="feature-challenge-reveal" aria-live="polite">
      <div className="feature-challenge-reveal-title">
        <RevealIcon />
        <p>揭秘答案</p>
        <h1>正确答案：A</h1>
      </div>
      <article className="feature-challenge-reveal-card">
        <p className="feature-challenge-reveal-option">
          <span>A</span>
          <strong>{answer.text}</strong>
        </p>
        {isDemoMode ? (
          <DemoAnalysis challenge={challenge} phase={phase} />
        ) : null}
      </article>
      <button
        className="feature-challenge-submit feature-challenge-reveal-next"
        type="button"
        onClick={onContinue}
      >
        <span>{firstPhase ? "进入第二关" : "查看挑战结果"}</span>
        <ArrowIcon />
      </button>
    </section>
  );
}

function DemoAnalysis({ challenge, phase }) {
  if (phase === 1) {
    return (
      <div className="feature-challenge-analysis">
        <h2>解析</h2>
        <p className="feature-challenge-equation">
          Au = <Matrix values={challenge.matrix} label="演示矩阵 A" />
          <ColumnVector values={[6, -5]} /> ={" "}
          <ColumnVector values={[-24, 20]} />
          = −4
          <ColumnVector values={[6, -5]} />
        </p>
        <p className="feature-challenge-equation">
          Av = <Matrix values={challenge.matrix} label="演示矩阵 A" />
          <ColumnVector values={[3, -2]} /> = <ColumnVector values={[-9, 11]} />
          ≠ λ<ColumnVector values={[3, -2]} />
        </p>
      </div>
    );
  }

  return (
    <div className="feature-challenge-analysis">
      <h2>解析</h2>
      <p>7 是 A 的特征值，当且仅当方程 Ax = 7x 有非零解。</p>
      <p>等价于 (A − 7I)x = 0。</p>
      <p>考虑增广矩阵：</p>
      <p className="feature-challenge-equation">
        <AugmentedMatrix
          values={[
            [-6, 6, 0],
            [5, -5, 0],
          ]}
        />
        ∼{" "}
        <AugmentedMatrix
          values={[
            [1, -1, 0],
            [0, 0, 0],
          ]}
        />
      </p>
      <p>⟹ x₁ − x₂ = 0</p>
      <p>⟹ 取 x₁ = x₂ = 1</p>
      <p className="feature-challenge-equation">
        故有非零解 <ColumnVector values={[1, 1]} />。
      </p>
    </div>
  );
}

function ResultPage({
  backgroundImage,
  landscapeBackgroundImage,
  layoutMode,
  correctCount,
  onRestart,
  onHome,
}) {
  return (
    <main
      className={`feature-challenge-quiz-app${layoutMode === "landscape" ? " is-landscape" : ""}`}
      style={{
        "--feature-quiz-background": `url("${layoutMode === "landscape" ? landscapeBackgroundImage : backgroundImage}")`,
      }}
    >
      {layoutMode === "landscape" ? <LandscapeOrientationHint /> : null}
      <section className="feature-challenge-result-page" aria-label="挑战结果">
        <div className="feature-challenge-result-halo" />
        <p className="feature-challenge-result-eyebrow">双关挑战完成</p>
        <h1>特征闯关结果</h1>
        <div className="feature-challenge-result-score">
          <strong>{correctCount}</strong>
          <span>/ 2</span>
          <p>答对题数</p>
        </div>
        <p className="feature-challenge-result-copy">
          {correctCount === 2
            ? "两位“忠诚者”都被你准确识别。"
            : "再来一次，重新寻找矩阵里的“忠诚者”。"}
        </p>
        <div className="feature-challenge-result-actions">
          <button
            className="feature-challenge-submit"
            type="button"
            onClick={onRestart}
          >
            <span>重新答题</span>
            <RefreshIcon />
          </button>
          <button
            className="feature-challenge-home-button"
            type="button"
            onClick={onHome}
          >
            <HomeIcon />
            <span>回到首页</span>
          </button>
        </div>
      </section>
    </main>
  );
}

function LandscapeOrientationHint() {
  return (
    <div className="feature-challenge-landscape-orientation-hint" role="status">
      <span
        className="feature-challenge-landscape-phone-icon"
        aria-hidden="true"
      />
      <strong>请横向旋转手机体验</strong>
    </div>
  );
}

function formatVector(vector) {
  return `(${vector.map((value) => String(value).replace("-", "−")).join(", ")})`;
}

function ColumnVector({ values }) {
  return (
    <span
      className="feature-challenge-column-vector"
      aria-label={`列向量 ${values.join("，")}`}
    >
      <i>(</i>
      <span>
        {values.map((value, index) => (
          <b key={`${value}-${index}`}>{String(value).replace("-", "−")}</b>
        ))}
      </span>
      <i>)</i>
    </span>
  );
}

function AugmentedMatrix({ values }) {
  return (
    <span className="feature-challenge-augmented-matrix" aria-label="增广矩阵">
      <i>(</i>
      <span>
        {values.flat().map((value, index) => (
          <b key={`${value}-${index}`}>{String(value).replace("-", "−")}</b>
        ))}
      </span>
      <i>)</i>
    </span>
  );
}

function Matrix({ values, label }) {
  return (
    <span className="feature-challenge-matrix" role="img" aria-label={label}>
      <i>(</i>
      <span>
        <b>{values[0][0]}</b>
        <b>{values[0][1]}</b>
        <b>{values[1][0]}</b>
        <b>{values[1][1]}</b>
      </span>
      <i>)</i>
    </span>
  );
}

function StageImage({ className, src, alt }) {
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={(event) => {
        event.currentTarget.style.display = "none";
      }}
    />
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 3 9 9-9 9" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 48 54" aria-hidden="true">
      <path d="m24 2 21 12v26L24 52 3 40V14z" />
      <path d="M19 20a5.8 5.8 0 1 1 9.7 4.3c-3.2 2.7-4.7 3.5-4.7 7.1" />
      <path d="M24 40h.1" />
    </svg>
  );
}

function RevealIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="m16 2 3.1 8.2L28 13l-6.9 5.8 2.1 8.9-7.2-4.6-7.2 4.6 2.1-8.9L4 13l8.9-2.8z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11a8 8 0 1 0 1.2 4.2" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 10 9-7 9 7v10H3z" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
