import { request } from '../../shared/api/request'
const base = (key) => `/winter-meet/activities/${encodeURIComponent(key)}`
export const getGallery = (key) => request(`${base(key)}/gallery`, { skipAuth: true, cache: 'no-store' })
export const getMine = (key) => request(`${base(key)}/mine`)
export const submitProfile = (key, data) => request(`${base(key)}/submit`, { method: 'POST', body: JSON.stringify(data) })
export async function uploadPhoto(key, file, onProgress) {
  const policy = await request(`${base(key)}/upload-policy`, { method: 'POST', body: JSON.stringify({ contentType: file.type, size: file.size }) })
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', policy.uploadUrl)
    xhr.timeout = 120000
    Object.entries(policy.headers).forEach(([name, value]) => xhr.setRequestHeader(name, value))
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)) }
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('图片上传失败，请重试'))
    xhr.onerror = () => reject(new Error('网络异常，请重试'))
    xhr.ontimeout = () => reject(new Error('上传超时，请重试'))
    xhr.send(file)
  })
  return policy
}
