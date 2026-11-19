import { useState } from "react";
import { trafficActivity, trafficAssets } from "./config";
import { Rank } from "./index";

const names = [
  "文明骑行", "一路平安", "斑马线守护者", "安全小达人", "礼让先行",
  "路口观察员", "头盔守护者", "绿色出行", "车距保持者", "交通小卫士",
];
const colors = ["#6aa87a", "#5a9dc7", "#d6a946", "#87a85b", "#d0795f"];
const avatar = (label, color) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${color}"/><text x="48" y="62" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif">${label}</text></svg>`,
  )}`;
const demoUsers = Array.from({ length: 50 }, (_, index) => {
  const rank = index + 1;
  const score = 10 - Math.floor(index / 6);
  return {
    rank,
    nickname: `${names[index % names.length]}${String(rank).padStart(2, "0")}`,
    avatar: avatar(names[index % names.length][0], colors[index % colors.length]),
    score,
    timeMs: 82000 + Math.floor(index / 6) * 14000 + (index % 6) * 2600,
    prize: rank <= 10 ? "蜀黍家骑行熊" : "蜀黍家因公致秃便签纸",
  };
});

export default function RankPreview({ routeParams }) {
  const [page, setPage] = useState(1);
  const activityKey = routeParams?.activityKey || trafficActivity.key;
  return (
    <main
      className="jtqa-app"
      style={{
        "--jtqa-quiz-scene": `url("${trafficAssets.quizScene}")`,
        "--jtqa-result-scene": `url("${trafficAssets.resultScene}")`,
      }}
    >
      <Rank
        data={{
          preview: true,
          locked: false,
          page,
          total: demoUsers.length,
          mine: demoUsers[17],
          list: demoUsers.slice(0, page * 20),
        }}
        loading={false}
        error=""
        onMore={() => setPage((current) => current + 1)}
        onRetry={() => undefined}
        onBack={() =>
          window.location.assign(`/jtqa/${encodeURIComponent(activityKey)}`)
        }
      />
    </main>
  );
}
