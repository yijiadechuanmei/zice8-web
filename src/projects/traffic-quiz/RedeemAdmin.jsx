import { useState } from "react";
import { adminRequest, getAdminToken } from "../admin/api";
import { trafficActivity } from "./config";
import "./styles.css";

export default function RedeemAdmin({ routeParams }) {
  const activityKey = routeParams?.activityKey || trafficActivity.key;
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `/admin/traffic-quiz/activities/${encodeURIComponent(activityKey)}`;
  const lookup = async () => {
    setBusy(true);
    setMessage("");
    setPreview(null);
    try {
      setPreview(
        await adminRequest(
          `${base}/lookup?code=${encodeURIComponent(code.trim())}`,
        ),
      );
    } catch (error) {
      setMessage(error.message || "查询失败");
    } finally {
      setBusy(false);
    }
  };
  const redeem = async () => {
    if (!preview || preview.redeemedAt || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await adminRequest(`${base}/redeem`, {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setPreview(result);
      setMessage("核销成功，奖品已标记为领取");
    } catch (error) {
      setMessage(error.message || "核销失败，请重新查询");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="jtqa-app">
      <section className="jtqa-inner jtqa-admin-redeem">
        <header className="jtqa-top">
          <a href="/admin">‹ 管理后台</a>
          <span>现场兑奖核销</span>
          <span>122</span>
        </header>
        <h1>文明交通知识问答</h1>
        <p>输入用户出示的 32 位兑奖凭证，先核对名次和奖品，再确认领取。</p>
        {!getAdminToken() && (
          <p className="jtqa-status">
            请先到 <a href="/admin">管理后台登录</a>，再返回此页。
          </p>
        )}
        <label htmlFor="jtqa-redeem-code">兑奖凭证</label>
        <input
          id="jtqa-redeem-code"
          value={code}
          onChange={(event) => {
            setCode(event.target.value);
            setPreview(null);
            setMessage("");
          }}
          maxLength={32}
          placeholder="输入 32 位凭证"
          autoComplete="off"
          spellCheck="false"
        />
        <button
          className="jtqa-button"
          type="button"
          onClick={lookup}
          disabled={busy || !/^[a-fA-F0-9]{32}$/.test(code.trim())}
        >
          查询凭证
        </button>
        {preview && (
          <div className="jtqa-redeem-preview">
            <p>
              最终排名 <b>第 {preview.rank} 名</b>
            </p>
            <h2>{preview.prize}</h2>
            <p>{preview.redeemedAt ? "已领取，不能重复核销" : "尚未领取"}</p>
            {!preview.redeemedAt && (
              <button
                className="jtqa-button"
                type="button"
                disabled={busy}
                onClick={redeem}
              >
                确认已发放奖品
              </button>
            )}
          </div>
        )}
        {message && (
          <p className="jtqa-status" role="status">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
