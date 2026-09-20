import { request } from "../../shared/api/request";

const base = (activityKey) =>
  `/fifteenth-five-i-can/activities/${encodeURIComponent(activityKey)}`;
export const getPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, {
    skipAuth: true,
  });
export const getCurrentUser = () => request("/auth/me");
export const getState = (activityKey) => request(`${base(activityKey)}/state`);
export const start = (activityKey) =>
  request(`${base(activityKey)}/start`, { method: "POST" });
export const saveKeywords = (activityKey, keywords) =>
  request(`${base(activityKey)}/keywords`, {
    method: "POST",
    body: JSON.stringify({ keywords }),
  });
export const submitAnswer = (activityKey, payload) =>
  request(`${base(activityKey)}/answer`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const submitFutureMessage = (activityKey, payload) =>
  request(`${base(activityKey)}/future-message`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const submitName = (activityKey, name) =>
  request(`${base(activityKey)}/name`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const submitCompletion = (activityKey, payload) =>
  request(`${base(activityKey)}/completion`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
