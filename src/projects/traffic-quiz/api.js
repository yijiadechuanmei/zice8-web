import { request } from "../../shared/api/request";
const base = (key) => `/traffic-quiz/activities/${encodeURIComponent(key)}`;
export const getPublicConfig = (key) =>
  request(`/activities/${encodeURIComponent(key)}/public-config`, {
    skipAuth: true,
  });
export const getState = (key) => request(`${base(key)}/state`);
export const saveProfile = (key, profile) =>
  request(`${base(key)}/profile`, {
    method: "POST",
    body: JSON.stringify(profile),
  });
export const startChallenge = (key, debug = false) =>
  request(`${base(key)}/start${debug ? "?debug" : ""}`, { method: "POST" });
export const submitAnswer = (key, body) =>
  request(`${base(key)}/answer`, {
    method: "POST",
    body: JSON.stringify(body),
  });
export const abandonChallenge = (key, keepalive = false) =>
  request(`${base(key)}/abandon`, { method: "POST", keepalive });
export const getRank = (key, page = 1) =>
  request(`${base(key)}/rank?page=${page}`);
export const getAward = (key) => request(`${base(key)}/award`);
export const resetMyTrafficQuizData = (key) =>
  request(`${base(key)}/reset-me`, { method: "POST" });
