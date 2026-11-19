import { useCallback, useEffect, useRef, useState } from "react";
import { useWechatAuth } from "../../shared/hooks/useWechatAuth";
import { useWechatShare } from "../../shared/hooks/useWechatShare";
import { trafficActivity, trafficAssets } from "./config";
import {
  getAward,
  getPublicConfig,
  getRank,
  getState,
  startChallenge,
  submitAnswer,
} from "./api";
import "./styles.css";

const RULES = [
  "每天最多 2 次挑战，每次最多 5 道题；开始挑战即消耗一次机会，北京时间 00:00 重置。",
  "每题限时 30 秒，答对积 1 分；答错或超时不得分。每次累计错 3 题，挑战立即结束。",
  "累计积分越高排名越靠前；同分按累计答题用时从少到多排序，再按较早达到当前积分的时间排序。",
  "最终排名前 1—10 名获蜀黍家骑行熊，第 11—50 名获蜀黍家因公致秃便签纸。",
  "2026 年 12 月 2 日 19:00—20:30，在蕉城夜市签到兑换区凭兑奖凭证领取。",
  "活动当天现场还有更多精美礼品，欢迎前往参与。",
];
const formatTime = (ms = 0) => `${(ms / 1000).toFixed(1)} 秒`;
const encouragement = (correct) =>
  correct >= 4
    ? "文明出行，你是安全“答”人！"
    : correct >= 2
      ? "安全知识再加油，继续向前！"
      : "每一次学习，都是更安全的出发。";
const isWechat = () => /MicroMessenger/i.test(navigator.userAgent);

function Modal({ title, children, onClose }) {
  return (
    <div className="jtqa-shade" role="presentation" onClick={onClose}>
      <div
        className="jtqa-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="jtqa-close"
          type="button"
          onClick={onClose}
          aria-label="关闭"
        >
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}
function Button({ children, onClick, secondary = false, disabled = false }) {
  return (
    <button
      className={`jtqa-button ${secondary ? "jtqa-button-secondary" : ""}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function Image({ name, className = "", alt = "" }) {
  return <img src={trafficAssets[name]} className={className} alt={alt} />;
}

function Home({ onStart, onMenu }) {
  return (
    <section className="jtqa-home">
      <div className="jtqa-home-art">
        <Image
          name="home"
          alt="文明交通知识问答活动首页，卡通交警与道路交通安全插画"
        />
        <button
          className="jtqa-home-start"
          type="button"
          onClick={onStart}
          aria-label="开始答题"
        />
      </div>
      <button
        className="jtqa-home-menu"
        type="button"
        onClick={onMenu}
        aria-label="活动规则、排行榜和领奖信息"
      >
        ☰
      </button>
    </section>
  );
}
function Quiz({ state, seconds, busy, onAnswer, onExit }) {
  const attempt = state?.attempt;
  if (!attempt?.question) return null;
  const danger = seconds <= 5;
  return (
    <section className="jtqa-quiz jtqa-inner">
      <header className="jtqa-top">
        <button type="button" onClick={onExit}>
          ‹ 返回
        </button>
        <span>安全“答”人</span>
        <span>第 {attempt.attemptNo} 次挑战</span>
      </header>
      <div className="jtqa-quiz-head">
        <div>
          <small>当前进度</small>
          <strong>
            {attempt.questionNo}
            <em>/5</em>
          </strong>
        </div>
        <div
          className={`jtqa-timer ${danger ? "jtqa-timer-danger" : seconds <= 10 ? "jtqa-timer-warning" : ""}`}
          aria-live="polite"
        >
          <small>答题倒计时</small>
          <strong>
            {seconds}
            <em> 秒</em>
          </strong>
        </div>
      </div>
      <div className="jtqa-track">
        <span style={{ width: `${((attempt.questionNo || 1) - 1) * 20}%` }} />
      </div>
      <div className="jtqa-question">
        <p className="jtqa-kicker">交通安全知识 · 单选题</p>
        <h1>{attempt.question.title}</h1>
      </div>
      <div className="jtqa-options">
        {attempt.question.options.map((option) => (
          <button
            type="button"
            key={option.key}
            disabled={busy || seconds <= 0}
            onClick={() => onAnswer(option.key)}
          >
            <span>{option.key}</span>
            {option.text}
          </button>
        ))}
      </div>
      <div className="jtqa-quiz-foot">
        <span>
          本次得分 <b>{attempt.score}</b>
        </span>
        <span>
          错误 <b>{attempt.wrong}/3</b>
        </span>
      </div>
      <div className="jtqa-road" aria-hidden="true" />
    </section>
  );
}
export function Rank({ data, loading, error, onMore, onRetry, onBack }) {
  const list = data?.list || [];
  const top = list.filter((item) => item.rank <= 3);
  const rest = list.filter((item) => item.rank > 3);
  return (
    <section className="jtqa-inner jtqa-rank">
      <header className="jtqa-top">
        <button type="button" onClick={onBack}>
          ‹ 返回
        </button>
        <span>积分排行榜</span>
        <span>
          {data?.preview ? "50 人演示" : data?.locked ? "最终排名" : "实时更新"}
        </span>
      </header>
      {data?.preview && (
        <p className="jtqa-preview-banner">
          预览模式：50 位虚拟用户，仅用于查看布局，不计入正式排名或兑奖。
        </p>
      )}
      <div className="jtqa-rank-hero">
        <p>文明交通知识问答</p>
        <h1>安全“答”人榜</h1>
        <div className="jtqa-podium">
          {top.length ? (
            [top[1], top[0], top[2]].filter(Boolean).map((item) => (
              <div
                className={`jtqa-podium-person jtqa-place-${item.rank}`}
                key={item.rank}
              >
                <div className="jtqa-avatar">
                  {item.avatar ? <img src={item.avatar} alt="" /> : "🚦"}
                </div>
                <strong>
                  {item.rank === 1 ? "🥇" : item.rank === 2 ? "🥈" : "🥉"}{" "}
                  {item.nickname}
                </strong>
                <span>{item.score} 分</span>
                <small>{formatTime(item.timeMs)}</small>
              </div>
            ))
          ) : (
            <p>还没有参与者，快来争取第一名！</p>
          )}
        </div>
      </div>
      <div className="jtqa-mine">
        {data?.preview ? "模拟用户排名" : "我的排名"}{" "}
        <b>{data?.mine?.rank || "暂未上榜"}</b>
        <span>
          累计 {data?.mine?.score || 0} 分 · {formatTime(data?.mine?.timeMs)}
        </span>
      </div>
      <div className="jtqa-rank-list">
        {rest.map((item) => (
          <div className="jtqa-rank-row" key={item.rank}>
            <b>{item.rank}</b>
            <div className="jtqa-avatar">
              {item.avatar ? <img src={item.avatar} alt="" /> : "🚦"}
            </div>
            <div className="jtqa-rank-name">
              <strong>{item.nickname}</strong>
              <small>{item.prize || "继续加油"}</small>
            </div>
            <div>
              <strong>{item.score} 分</strong>
              <small>{formatTime(item.timeMs)}</small>
            </div>
          </div>
        ))}
      </div>
      {loading && <p className="jtqa-status">加载中…</p>}
      {error && (
        <p className="jtqa-status">
          {error}
          <br />
          <button type="button" onClick={onRetry}>
            重新加载
          </button>
        </p>
      )}
      {!loading && !error && data?.total > list.length && (
        <Button onClick={onMore} secondary>
          加载更多
        </Button>
      )}
      {!loading && !error && !data?.total && (
        <p className="jtqa-status">暂无榜单数据</p>
      )}
      <p className="jtqa-footnote">
        前 10 名：骑行熊 · 第 11—50 名：因公致秃便签纸
      </p>
    </section>
  );
}
function Award({ data, loading, error, onRetry, onBack }) {
  return (
    <section className="jtqa-inner jtqa-award">
      <header className="jtqa-top">
        <button type="button" onClick={onBack}>
          ‹ 返回
        </button>
        <span>领奖信息</span>
        <span>12.02</span>
      </header>
      <div className="jtqa-award-hero">
        <h1>把安全带到现场</h1>
        <p>蕉城夜市签到兑换区</p>
        <Image name="officer" alt="卡通交警" />
      </div>
      {loading ? (
        <p className="jtqa-status">加载中…</p>
      ) : error ? (
        <p className="jtqa-status">
          {error}
          <br />
          <button type="button" onClick={onRetry}>
            重试
          </button>
        </p>
      ) : !data?.locked ? (
        <div className="jtqa-award-content">
          <h2>活动排名尚未锁定</h2>
          <p>活动截止且所有有效挑战结算后，可在此查看兑奖资格。</p>
        </div>
      ) : data.award ? (
        <div className="jtqa-award-content">
          <p>
            最终排名 第 <b>{data.award.rank}</b> 名
          </p>
          <h2>{data.award.prize}</h2>
          <Image
            name={data.award.rank <= 10 ? "cyclingBear" : "stickyNotes"}
            alt={data.award.prize}
          />
          <small>唯一兑奖凭证</small>
          <code>{data.award.code}</code>
          <p className={data.award.redeemedAt ? "jtqa-redeemed" : ""}>
            {data.award.redeemedAt
              ? "已领取"
              : "未领取 · 请向现场工作人员出示凭证"}
          </p>
        </div>
      ) : (
        <div className="jtqa-award-content">
          <h2>感谢参与文明交通知识问答</h2>
          <p>
            本次未进入前 50 名。活动当天现场还有更多精美礼品，欢迎前往参与。
          </p>
        </div>
      )}
      <div className="jtqa-claim-info">
        <strong>领奖时间</strong>
        <span>
          {trafficActivity.claimDate} {trafficActivity.claimTime}
        </span>
        <strong>领奖地点</strong>
        <span>{trafficActivity.claimPlace}</span>
      </div>
    </section>
  );
}
async function createPoster(state) {
  const canvas = document.createElement("canvas");
  canvas.width = 750;
  canvas.height = 1334;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("当前浏览器无法生成海报");
  ctx.fillStyle = "#fbf8e8";
  ctx.fillRect(0, 0, 750, 1334);
  const scene = new window.Image();
  scene.crossOrigin = "anonymous";
  scene.src = trafficAssets.roadScene;
  await new Promise((resolve, reject) => {
    scene.onload = resolve;
    scene.onerror = reject;
  });
  ctx.drawImage(scene, 0, 800, 750, 370);
  ctx.fillStyle = "#365d37";
  ctx.fillRect(0, 1170, 750, 164);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 1140, 750, 32);
  for (let x = 20; x < 750; x += 95) ctx.fillRect(x, 1153, 52, 5);
  ctx.textAlign = "center";
  ctx.fillStyle = "#468d5c";
  ctx.font = "bold 50px sans-serif";
  ctx.fillText("文明交通", 375, 130);
  ctx.fillStyle = "#2194ce";
  ctx.font = "bold 74px sans-serif";
  ctx.fillText("知识问答", 375, 218);
  ctx.fillStyle = "#3c503f";
  ctx.font = "34px sans-serif";
  ctx.fillText("安全“答”人 · 成绩海报", 375, 280);
  const image = new window.Image();
  image.crossOrigin = "anonymous";
  image.src = trafficAssets.officer;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });
  ctx.drawImage(image, 252, 315, 246, 369);
  ctx.fillStyle = "#fffdf2";
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(70, 670, 610, 390, 42);
  else ctx.rect(70, 670, 610, 390);
  ctx.fill();
  ctx.fillStyle = "#2f673e";
  ctx.font = "bold 46px sans-serif";
  ctx.fillText(`本次得分 ${state.attempt.score} 分`, 375, 745);
  ctx.font = "30px sans-serif";
  ctx.fillText(
    `回答 ${state.attempt.answered} 题 · 答对 ${state.attempt.correct} 题`,
    375,
    812,
  );
  ctx.fillText(
    `累计 ${state.rank?.score || 0} 分 · 排名 ${state.rank?.rank || "—"}`,
    375,
    870,
  );
  ctx.fillStyle = "#258ec7";
  ctx.font = "27px sans-serif";
  ctx.fillText(encouragement(state.attempt.correct), 375, 950);
  ctx.fillStyle = "#fff";
  ctx.font = "24px sans-serif";
  ctx.fillText("2026 全国交通安全日 · 文明出行", 375, 1265);
  return canvas.toDataURL("image/png");
}
function Result({
  state,
  poster,
  posterError,
  onSave,
  onRank,
  onAgain,
  onHome,
}) {
  return (
    <section className="jtqa-inner jtqa-result">
      <h1>本次挑战完成</h1>
      <p>{encouragement(state.attempt.correct)}</p>
      {poster ? (
        <img className="jtqa-poster" src={poster} alt="本次挑战成绩海报" />
      ) : (
        <div className="jtqa-poster-loading">
          {posterError || "正在生成成绩海报…"}
        </div>
      )}
      <div className="jtqa-result-actions">
        <Button disabled={!poster} onClick={onSave}>
          保存海报
        </Button>
        <Button secondary onClick={onRank}>
          查看排行榜
        </Button>
        <Button secondary onClick={onAgain}>
          {state.remainingToday > 0 && state.phase === "active"
            ? "再次挑战"
            : "明日再来"}
        </Button>
        <button type="button" className="jtqa-text-link" onClick={onHome}>
          返回首页
        </button>
      </div>
    </section>
  );
}

export default function TrafficQuizProject({ routeParams }) {
  const key = routeParams?.activityKey || trafficActivity.key;
  const [publicConfig, setPublicConfig] = useState(null);
  const [state, setState] = useState(null);
  const [page, setPage] = useState("home");
  const [modal, setModal] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(() => Date.now());
  const [offset, setOffset] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [rank, setRank] = useState(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [rankError, setRankError] = useState("");
  const [award, setAward] = useState(null);
  const [awardLoading, setAwardLoading] = useState(false);
  const [awardError, setAwardError] = useState("");
  const [poster, setPoster] = useState("");
  const [posterError, setPosterError] = useState("");
  const [showPosterImage, setShowPosterImage] = useState(false);
  const timeoutBusy = useRef(false);
  const actionBusy = useRef(false);
  const { authReady, blockedMessage } = useWechatAuth(key, publicConfig);
  useWechatShare(key, publicConfig);
  const applyState = useCallback((next, move = true) => {
    setState(next);
    setOffset(Date.now() - Date.parse(next.serverNow));
    if (move)
      setPage(
        next.attempt?.status === "in_progress"
          ? "quiz"
          : next.attempt?.status === "completed"
            ? "result"
            : "home",
      );
  }, []);
  const refresh = useCallback(
    async (move = true) => {
      try {
        setError("");
        applyState(await getState(key), move);
      } catch (err) {
        setError(err.message || "网络异常，请重试");
      }
    },
    [applyState, key],
  );
  useEffect(() => {
    document.title = trafficActivity.title;
    getPublicConfig(key)
      .then(setPublicConfig)
      .catch((err) => setError(err.message || "活动加载失败"));
  }, [key]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);
  useEffect(() => {
    if (!authReady) return;
    let alive = true;
    getState(key)
      .then((next) => {
        if (alive) applyState(next);
      })
      .catch((err) => {
        if (alive) setError(err.message || "网络异常，请重试");
      });
    return () => {
      alive = false;
    };
  }, [authReady, key, applyState]);
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  const seconds = Math.max(
    0,
    Math.ceil(
      (Date.parse(state?.attempt?.deadlineAt || 0) - (tick - offset)) / 1000,
    ),
  );
  useEffect(() => {
    if (
      page !== "quiz" ||
      !state?.attempt?.question ||
      seconds > 0 ||
      timeoutBusy.current
    )
      return;
    timeoutBusy.current = true;
    getState(key)
      .then((next) => {
        applyState(next);
        if (next.feedback) {
          setFeedback(next.feedback);
          window.setTimeout(() => setFeedback(null), 900);
        }
      })
      .catch(() => setModal("网络异常，倒计时状态同步失败，请重试"))
      .finally(() => {
        timeoutBusy.current = false;
      });
  }, [seconds, page, state?.attempt?.question, key, applyState]);
  useEffect(() => {
    if (
      page !== "result" ||
      !state?.attempt ||
      state.attempt.status !== "completed"
    )
      return;
    createPoster(state)
      .then((value) => {
        setPoster(value);
        setPosterError("");
      })
      .catch((err) => setPosterError(err.message || "海报生成失败"));
  }, [page, state]);
  const start = async () => {
    if (actionBusy.current) return;
    if (!authReady) {
      setModal(blockedMessage || "正在确认微信身份，请稍后重试");
      return;
    }
    const resuming = state?.attempt?.status === "in_progress";
    if (!resuming && state?.phase === "not_started") {
      setModal("活动尚未开始，敬请期待");
      return;
    }
    if (!resuming && state?.phase !== "active") {
      setModal("活动已经结束，可查看最终排行榜和领奖信息");
      return;
    }
    if (
      state?.remainingToday <= 0 &&
      state?.attempt?.status !== "in_progress"
    ) {
      setModal("今日 2 次答题机会已用完，请明日再来");
      return;
    }
    actionBusy.current = true;
    setBusy(true);
    try {
      applyState(await startChallenge(key));
      setPoster("");
    } catch (err) {
      setModal(err.message || "开始失败，请重试");
    } finally {
      actionBusy.current = false;
      setBusy(false);
    }
  };
  const answer = async (option) => {
    if (actionBusy.current || !state?.attempt?.question) return;
    actionBusy.current = true;
    setBusy(true);
    try {
      const next = await submitAnswer(key, {
        attemptId: state.attempt.id,
        questionId: state.attempt.question.id,
        option,
      });
      setFeedback(next.feedback);
      window.setTimeout(() => {
        applyState(next);
        setFeedback(null);
        actionBusy.current = false;
        setBusy(false);
      }, 1000);
    } catch (err) {
      setModal(err.message || "提交失败，请重试");
      await refresh();
      actionBusy.current = false;
      setBusy(false);
    }
  };
  const openRank = async (pageNo = 1) => {
    setPage("rank");
    setRankLoading(true);
    setRankError("");
    try {
      const data = await getRank(key, pageNo);
      setRank((old) =>
        pageNo === 1
          ? data
          : { ...data, list: [...(old?.list || []), ...data.list] },
      );
    } catch (err) {
      setRankError(err.message || "排行榜加载失败");
    } finally {
      setRankLoading(false);
    }
  };
  const openAward = async () => {
    setPage("award");
    setAwardLoading(true);
    setAwardError("");
    try {
      setAward(await getAward(key));
    } catch (err) {
      setAwardError(err.message || "领奖信息加载失败");
    } finally {
      setAwardLoading(false);
    }
  };
  const savePoster = async () => {
    if (!poster) return;
    if (isWechat()) {
      setShowPosterImage(true);
      return;
    }
    try {
      const blob = await (await fetch(poster)).blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "文明交通知识问答-成绩海报.png";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setModal("保存失败，请长按海报图片保存");
    }
  };
  return (
    <main
      className={`jtqa-app ${page === "home" ? "jtqa-app-home" : ""}`}
      style={{ "--jtqa-road-scene": `url("${trafficAssets.roadScene}")` }}
    >
      {page === "home" && (
        <Home
          onStart={start}
          onMenu={() => setModal("menu")}
        />
      )}
      {page === "quiz" && (
        <Quiz
          state={state}
          seconds={seconds}
          busy={busy}
          onAnswer={answer}
          onExit={() => setPage("home")}
        />
      )}
      {page === "result" && state?.attempt && (
        <Result
          state={state}
          poster={poster}
          posterError={posterError}
          onSave={savePoster}
          onRank={() => openRank()}
          onAgain={start}
          onHome={() => setPage("home")}
        />
      )}
      {page === "rank" && (
        <Rank
          data={rank}
          loading={rankLoading}
          error={rankError}
          onMore={() => openRank((rank?.page || 1) + 1)}
          onRetry={() => openRank()}
          onBack={() => setPage("home")}
        />
      )}
      {page === "award" && (
        <Award
          data={award}
          loading={awardLoading}
          error={awardError}
          onRetry={openAward}
          onBack={() => setPage("home")}
        />
      )}
      {error && (
        <div className="jtqa-error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => refresh(false)}>
            重试
          </button>
        </div>
      )}
      {feedback && (
        <div
          className={`jtqa-feedback ${feedback.correct ? "jtqa-feedback-right" : ""}`}
          role="status"
        >
          {feedback.correct
            ? "回答正确 +1 分"
            : feedback.timeout
              ? "答题超时"
              : "回答错误"}
          {!feedback.correct && (
            <small>正确答案：{feedback.correctAnswer}</small>
          )}
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === "rules"
              ? "活动规则"
              : modal === "menu"
                ? "活动导航"
                : "温馨提示"
          }
          onClose={() => setModal("")}
        >
          {modal === "rules" ? (
            <ol className="jtqa-rules">
              {RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          ) : modal === "menu" ? (
            <div className="jtqa-menu-actions">
              <Button onClick={() => setModal("rules")}>活动规则</Button>
              <Button
                secondary
                onClick={() => {
                  setModal("");
                  openRank();
                }}
              >
                查看排行榜
              </Button>
              <Button
                secondary
                onClick={() => {
                  setModal("");
                  openAward();
                }}
              >
                领奖信息
              </Button>
            </div>
          ) : (
            <p>{modal}</p>
          )}
          {modal !== "menu" && (
            <Button onClick={() => setModal("")}>知道了</Button>
          )}
        </Modal>
      )}
      {showPosterImage && (
        <div
          className="jtqa-image-view"
          role="dialog"
          aria-label="长按保存海报"
          onClick={() => setShowPosterImage(false)}
        >
          <p>长按图片保存到手机 · 点击空白处关闭</p>
          <img src={poster} alt="可长按保存的成绩海报" />
        </div>
      )}
    </main>
  );
}
