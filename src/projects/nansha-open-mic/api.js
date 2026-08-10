import { request } from '../../shared/api/request'

const base = (activityKey) => `/nansha-open-mic/activities/${encodeURIComponent(activityKey)}`

export const getPublicConfig = (activityKey) =>
  request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })

export const getBootstrap = (activityKey) => request(`${base(activityKey)}/bootstrap`)

export const getEntries = (activityKey, page = 1, pageSize = 20) =>
  request(`${base(activityKey)}/entries?page=${page}&pageSize=${pageSize}`)

export const getEntry = (activityKey, entryId) =>
  request(`${base(activityKey)}/entries/${encodeURIComponent(entryId)}`)

export const getMyVotes = (activityKey) => request(`${base(activityKey)}/my-votes`)

export const createUploadPolicy = (activityKey, payload) =>
  request(`${base(activityKey)}/upload-policy`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export async function uploadFileToOss(policy, file) {
  const response = await fetch(policy.uploadUrl, {
    method: 'PUT',
    headers: policy.headers || { 'Content-Type': file.type },
    body: file,
  })
  if (!response.ok) throw new Error(`文件上传失败（${response.status}）`)
  return policy.fileUrl
}

export const createEntry = (activityKey, payload) =>
  request(`${base(activityKey)}/entries`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const castVote = (activityKey, entryId, payload) =>
  request(`${base(activityKey)}/entries/${encodeURIComponent(entryId)}/votes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
