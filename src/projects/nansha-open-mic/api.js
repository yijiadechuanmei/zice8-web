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

export function uploadFileToOss(policy, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', policy.uploadUrl, true)
    Object.entries(policy.headers || { 'Content-Type': file.type }).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value)
    })
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve(policy.fileUrl)
        return
      }
      reject(new Error(`文件上传失败（${xhr.status || '网络异常'}）`))
    }
    xhr.onerror = () => reject(new Error('文件上传失败，请检查网络后重试'))
    xhr.onabort = () => reject(new Error('文件上传已取消'))
    xhr.send(file)
  })
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
