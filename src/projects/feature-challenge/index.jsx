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

const EIGENVALUES = [-4, -3, -2, 1, 2, 3, 4, 5];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom(list) {
  return list[randomInt(0, list.length - 1)];
}

function divisors(value) {
  const result = [];
  for (let divisor = 1; divisor <= Math.abs(value); divisor += 1) {
    if (value % divisor === 0) result.push(divisor);
  }
  return result;
}

function buildChallenge() {
  const secondaryEigenvalue = pickRandom(EIGENVALUES);
  const gap = 7 - secondaryEigenvalue;
  const suitableDivisors = divisors(gap).filter(
    (divisor) => gap / divisor <= 3,
  );
  const difference =
    pickRandom(suitableDivisors) * (Math.random() > 0.5 ? 1 : -1);
  const multiplier = gap / difference;
  let uX = randomInt(-6, 6);
  while (uX === 0 || uX + difference === 0) uX = randomInt(-6, 6);
  const uY = uX + difference;
  const matrix = [
    [7 + uX * multiplier, -uX * multiplier],
    [uY * multiplier, secondaryEigenvalue - uX * multiplier],
  ];

  let vX = 0;
  let vY = 0;
  while (vX === 0 || vY === 0 || vX === vY || vX * uY === vY * uX) {
    vX = randomInt(-6, 6);
    vY = randomInt(-6, 6);
  }

  return { matrix, u: [uX, uY], v: [vX, vY] };
}

export default function FeatureChallengeProject({ routeParams }) {
  const activityKey =
    routeParams?.activityKey || FEATURE_CHALLENGE_ACTIVITY_KEY;
  const [publicConfig, setPublicConfig] = useState(null);
  const [page, setPage] = useState("home");
  const [phase, setPhase] = useState(1);
  const [challenge, setChallenge] = useState(buildChallenge);
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
    });
  }, [activityKey, page, phase, publicConfig, revealed]);

  function startChallenge() {
    setChallenge(buildChallenge());
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
        pageKey: "home",
        eventName: "start_challenge",
      },
    });
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
    config.quizBackgroundImage,
  );
  const correctCount = Object.values(answers).filter(
    (answer) => answer === "A",
  ).length;

  if (page === "home")
    return <HomePage config={config} onStart={startChallenge} />;
  if (page === "result") {
    return (
      <ResultPage
        backgroundImage={backgroundImage}
        correctCount={correctCount}
        onRestart={startChallenge}
        onHome={goHome}
      />
    );
  }

  return (
    <QuizPage
      backgroundImage={backgroundImage}
      challenge={challenge}
      phase={phase}
      selectedAnswer={selectedAnswer}
      revealed={revealed}
      onSelect={setSelectedAnswer}
      onSubmit={submitAnswer}
      onContinue={continueChallenge}
    />
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
  challenge,
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
      className="feature-challenge-quiz-app"
      style={{ "--feature-quiz-background": `url("${backgroundImage}")` }}
    >
      <section
        className="feature-challenge-quiz-page"
        aria-label={`第 ${phase} 关答题页`}
      >
        <PhaseProgress phase={phase} />
        {revealed ? (
          <AnswerReveal
            challenge={challenge}
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

function AnswerReveal({ challenge, phase, onContinue }) {
  const firstPhase = phase === 1;
  return (
    <section className="feature-challenge-reveal" aria-live="polite">
      <div className="feature-challenge-reveal-title">
        <RevealIcon />
        <p>揭秘答案</p>
        <h1>正确答案：A</h1>
      </div>
      <article className="feature-challenge-reveal-card">
        {firstPhase ? (
          <>
            <h2>向量 u 才是矩阵 A 的“忠诚者”</h2>
            <p>
              将 u = {formatVector(challenge.u)} 代入，可得 A·u ={" "}
              {formatVector(
                scaleVector(challenge.u, getSecondaryEigenvalue(challenge)),
              )}
              ，它是 u 的倍数。
            </p>
            <p>
              而 v = {formatVector(challenge.v)} 不能满足 A·v =
              λv，因此不是特征向量。
            </p>
          </>
        ) : (
          <>
            <h2>7 的“忠诚者”方向是 (1, 1)</h2>
            <p>A·(1, 1) = (7, 7) = 7·(1, 1)。</p>
            <p>因此 7 确实是矩阵 A 的特征值，对应特征向量为 (1, 1)。</p>
          </>
        )}
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

function ResultPage({ backgroundImage, correctCount, onRestart, onHome }) {
  return (
    <main
      className="feature-challenge-quiz-app"
      style={{ "--feature-quiz-background": `url("${backgroundImage}")` }}
    >
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
            <span>重新闯关</span>
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

function getSecondaryEigenvalue(challenge) {
  const [firstRow] = challenge.matrix;
  const [, secondValue] = firstRow;
  const [uX] = challenge.u;
  if (!uX) return 0;
  return (firstRow[0] * uX + secondValue * challenge.u[1]) / uX;
}

function scaleVector(vector, scale) {
  return vector.map((value) => value * scale);
}

function formatVector(vector) {
  return `(${vector.map((value) => String(value).replace("-", "−")).join(", ")})`;
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
