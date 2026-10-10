import { request } from '../../shared/api/request'

const base = (key) => `/photo-screen/activities/${encodeURIComponent(key)}`
async function timedRequest(path, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await request(path, { ...options, signal: controller.signal })
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('请求超时，请重试', { cause: error })
    throw error
  } finally {
    clearTimeout(timer)
  }
}
export const getScreen = (key, signal) => request(`${base(key)}/screen`, { skipAuth: true, cache: 'no-store', signal })
export const castPhoto = (key, uploadToken) => timedRequest(`${base(key)}/cast`, {
  method: 'POST', body: JSON.stringify({ uploadToken }),
}, 20000)

export async function uploadPhoto(key, file, onProgress) {
  const policy = await timedRequest(`${base(key)}/upload-policy`, {
    method: 'POST', body: JSON.stringify({ contentType: file.type, size: file.size }),
  }, 15000)
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', policy.uploadUrl)
    xhr.timeout = 120000
    Object.entries(policy.headers).forEach(([name, value]) => xhr.setRequestHeader(name, value))
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100))
    }
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('图片上传失败，请重新上传'))
    xhr.onerror = () => reject(new Error('网络异常，请重新上传'))
    xhr.ontimeout = () => reject(new Error('上传超时，请重新上传'))
    xhr.onabort = () => reject(new Error('上传已取消'))
    xhr.send(file)
  })
  return { imageUrl: policy.fileUrl, uploadToken: policy.uploadToken }
}
