import { request } from "../../shared/api/request";

const base = (activityKey) =>
  `/rider-safety-survey/activities/${encodeURIComponent(activityKey)}`;

export const getPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, {
    skipAuth: true,
  });
export const getBootstrap = (activityKey) =>
  request(`${base(activityKey)}/bootstrap`);
export const submitParticipantProfile = (activityKey, payload) =>
  request(`${base(activityKey)}/profile`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const submitSurvey = (activityKey, answers, q7Consent) =>
  request(`${base(activityKey)}/submissions`, {
    method: "POST",
    body: JSON.stringify({ answers, q7Consent }),
  });
export const createAuthorization = (activityKey, renew = false) =>
  request(
    `${base(activityKey)}/transfer-authorization${renew ? "?renew=1" : ""}`,
    { method: "POST" },
  );
export const syncAuthorization = (activityKey) =>
  request(`${base(activityKey)}/transfer-authorization/sync`, {
    method: "POST",
  });
export const drawPrize = (activityKey, requestId) =>
  request(`${base(activityKey)}/draw`, {
    method: "POST",
    body: JSON.stringify({ requestId }),
  });
export const syncPayout = (activityKey, payoutNo) =>
  request(`${base(activityKey)}/payouts/${encodeURIComponent(payoutNo)}/sync`, {
    method: "POST",
  });
export const claimPrize = (activityKey, payload) =>
  request(`${base(activityKey)}/prize/claim`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
