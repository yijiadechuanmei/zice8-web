import { request } from "../../shared/api/request";
const base = (key) => `/traffic-quiz/activities/${encodeURIComponent(key)}`;
export const getPublicConfig = (key) =>
  request(`/activities/${encodeURIComponent(key)}/public-config`, {
    skipAuth: true,
  });
export const getState = (key) => request(`${base(key)}/state`);
export const startChallenge = (key) =>
  request(`${base(key)}/start`, { method: "POST" });
export const submitAnswer = (key, body) =>
  request(`${base(key)}/answer`, {
    method: "POST",
    body: JSON.stringify(body),
  });
export const getRank = (key, page = 1) =>
  request(`${base(key)}/rank?page=${page}`);
export const getAward = (key) => request(`${base(key)}/award`);
