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
import { createPoster } from "./poster";
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
export function Quiz({ state, seconds, busy, onAnswer, onExit }) {
  const attempt = state?.attempt;
  if (!attempt?.question) return null;
  const danger = seconds <= 5;
  return (
    <section className="jtqa-inner jtqa-stage jtqa-quiz">
      <header className="jtqa-top">
        <button type="button" onClick={onExit}>
          ‹ 返回
        </button>
        <span>文明交通知识问答</span>
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
    </section>
  );
}
export function Rank({ data, loading, error, onMore, onRetry, onBack }) {
  const [displayPage, setDisplayPage] = useState(1);
  const rowsPerPage = 5;
  const list = data?.list || [];
  const top = list.filter((item) => item.rank <= 3);
  const rest = list.filter((item) => item.rank > 3);
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(0, (data?.total || 0) - 3) / rowsPerPage),
  );
  const visibleRows = rest.slice(
    (displayPage - 1) * rowsPerPage,
    displayPage * rowsPerPage,
  );
  const nextPage = () => {
    if (loading || displayPage >= totalPages) return;
    const next = displayPage + 1;
    setDisplayPage(next);
    if (next * rowsPerPage + 3 > list.length && data.total > list.length)
      onMore();
  };
  return (
    <section className="jtqa-inner jtqa-stage jtqa-rank">
      <header className="jtqa-top">
        <button type="button" onClick={onBack}>
          ‹ 返回
        </button>
        <span>积分排行榜</span>
        <span>
          {data?.preview ? "50 人演示" : data?.locked ? "最终排名" : "实时更新"}
        </span>
      </header>
      <div className="jtqa-rank-hero">
        <p>文明交通知识问答 · 安全“答”人</p>
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
        {visibleRows.map((item) => (
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
      {loading && <p className="jtqa-rank-state">加载中…</p>}
      {error && (
        <p className="jtqa-rank-state">
          {error}{" "}
          <button type="button" onClick={() => { setDisplayPage(1); onRetry(); }}>重试</button>
        </p>
      )}
      {!loading && !error && !data?.total && (
        <p className="jtqa-rank-state">暂无榜单数据</p>
      )}
      <div className="jtqa-rank-pager">
        <button
          type="button"
          disabled={displayPage <= 1 || loading}
          onClick={() => setDisplayPage((current) => current - 1)}
        >
          ‹ 上一页
        </button>
        <span>{displayPage} / {totalPages}</span>
        <button
          type="button"
          disabled={displayPage >= totalPages || loading}
          onClick={nextPage}
        >
          下一页 ›
        </button>
      </div>
    </section>
  );
}
export function Award({ data, loading, error, onRetry, onBack }) {
  return (
    <section className="jtqa-inner jtqa-stage jtqa-award">
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
export function Result({
  state,
  poster,
  posterError,
  onPoster,
  onRank,
  onAgain,
  onHome,
}) {
  return (
    <section className="jtqa-inner jtqa-stage jtqa-result">
      <header className="jtqa-top">
        <button type="button" onClick={onHome}>‹ 首页</button>
        <span>答题完成</span>
        <span>第 {state.attempt.attemptNo} 次</span>
      </header>
      <div className="jtqa-result-main">
        <p className="jtqa-result-kicker">本次得分</p>
        <h1><strong>{state.attempt.score}</strong><span>分</span></h1>
        <div className="jtqa-result-stats">
          <span><b>{state.attempt.correct}</b><small>答对</small></span>
          <span><b>{state.attempt.answered}</b><small>答题</small></span>
          <span><b>{state.rank?.rank || "—"}</b><small>当前排名</small></span>
        </div>
        <p className="jtqa-result-rank">累计积分 <b>{state.rank?.score || 0}</b></p>
      </div>
      <div className="jtqa-result-actions">
        <Button disabled={!poster} onClick={onPoster}>
          {posterError ? "海报暂不可用" : poster ? "生成我的成绩海报" : "成绩海报生成中…"}
        </Button>
        <div>
          <button type="button" onClick={onRank}>排行榜</button>
          <button type="button" onClick={onAgain}>
            {state.remainingToday > 0 && state.phase === "active"
              ? "再次挑战"
              : "明日再来"}
          </button>
          <button type="button" onClick={onHome}>活动首页</button>
        </div>
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
  const [showPosterModal, setShowPosterModal] = useState(false);
  const posterOpenedFor = useRef(null);
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
    let active = true;
    createPoster(state)
      .then((value) => {
        if (!active) return;
        setPoster(value);
        setPosterError("");
        if (posterOpenedFor.current !== state.attempt.id) {
          posterOpenedFor.current = state.attempt.id;
          setShowPosterModal(true);
        }
      })
      .catch((err) => {
        if (active) setPosterError(err.message || "海报生成失败");
      });
    return () => { active = false; };
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
      setShowPosterModal(true);
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
      style={{
        "--jtqa-quiz-scene": `url("${trafficAssets.quizScene}")`,
        "--jtqa-result-scene": `url("${trafficAssets.resultScene}")`,
      }}
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
          onPoster={() => setShowPosterModal(true)}
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
      {showPosterModal && poster && (
        <div className="jtqa-poster-shade" role="presentation" onClick={() => setShowPosterModal(false)}>
          <div className="jtqa-poster-dialog" role="dialog" aria-modal="true" aria-label="成绩海报" onClick={(event) => event.stopPropagation()}>
            <button className="jtqa-poster-close" type="button" aria-label="关闭成绩海报" onClick={() => setShowPosterModal(false)}>×</button>
            <img src={poster} alt="文明交通知识问答成绩海报" />
            <p>{isWechat() ? "长按海报保存到手机" : "保存海报，分享文明出行"}</p>
            {!isWechat() && <Button onClick={savePoster}>保存海报</Button>}
          </div>
        </div>
      )}
    </main>
  );
}
