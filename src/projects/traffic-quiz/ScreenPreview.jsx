import { useEffect, useState } from "react";
import { trafficAssets } from "./config";
import { Award, Quiz, Rank, Result } from "./index";
import { createPoster } from "./poster";

const screen = new URLSearchParams(window.location.search).get("screen") || "quiz";
const state = {
  phase: "active",
  remainingToday: 1,
  rank: { score: 8, rank: 12 },
  attempt: {
    id: "preview",
    status: "completed",
    attemptNo: 1,
    questionNo: 3,
    answered: 5,
    correct: 4,
    wrong: 1,
    score: 4,
    question: {
      title: "驾驶电动自行车时，以下哪种做法更安全？",
      options: [
        { key: "A", text: "佩戴符合标准的安全头盔" },
        { key: "B", text: "边骑车边查看手机消息" },
        { key: "C", text: "在机动车道内并排行驶" },
        { key: "D", text: "夜间不开启车灯行驶" },
      ],
    },
  },
};

export default function ScreenPreview() {
  const [poster, setPoster] = useState("");
  const [posterOpen, setPosterOpen] = useState(screen === "result");
  useEffect(() => {
    if (screen !== "result") return;
    createPoster("头盔戴稳，平安随行").then(setPoster);
  }, []);
  const home = () => window.location.assign("?screen=quiz");
  return (
    <main className="jtqa-app" style={{
      "--jtqa-quiz-scene": `url("${trafficAssets.quizScene}")`,
      "--jtqa-result-scene": `url("${trafficAssets.resultScene}")`,
    }}>
      {screen === "quiz" && <Quiz state={state} seconds={23} busy={false} onAnswer={() => undefined} onExit={home} />}
      {screen === "result" && <Result state={state} onRank={() => window.location.assign("?screen=rank")} onAgain={home} onHome={home} />}
      {screen === "rank" && <Rank data={{ total: 1, list: [{ rank: 1, nickname: "韩宇（H5&小程序）", score: 9, timeMs: 18200 }] }} loading={false} error="" onMore={() => undefined} onRetry={() => undefined} onBack={home} />}
      {screen === "award" && <Award data={{locked:true,award:{rank:8,prize:"蜀黍家骑行熊",code:"JTQA-2026-EXAMPLE",redeemedAt:null}}} loading={false} error="" onRetry={() => undefined} onBack={home} />}
      {screen === "pending" && <Award data={{locked:false}} loading={false} error="" onRetry={() => undefined} onBack={home} />}
      {posterOpen && poster && <div className="jtqa-poster-shade" role="presentation" onClick={() => setPosterOpen(false)}><div className="jtqa-poster-dialog" role="dialog" aria-modal="true" aria-label="成绩海报" onClick={(event) => event.stopPropagation()}><button className="jtqa-poster-close" type="button" onClick={() => setPosterOpen(false)} aria-label="关闭成绩海报">×</button><img src={poster} alt="成绩海报" /></div></div>}
    </main>
  );
}
