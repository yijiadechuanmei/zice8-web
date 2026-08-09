const COVER_MAX_WIDTH = 1280
const COVER_MAX_HEIGHT = 1280

export function captureVideoFirstFrame(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    let settled = false

    function cleanup() {
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(objectUrl)
    }

    function fail() {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('无法读取该视频的第一帧，请上传可在手机浏览器预览的 MP4 视频'))
    }

    function drawFrame() {
      if (settled || !video.videoWidth || !video.videoHeight) return fail()
      const scale = Math.min(
        COVER_MAX_WIDTH / video.videoWidth,
        COVER_MAX_HEIGHT / video.videoHeight,
        1,
      )
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale))
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale))
      const context = canvas.getContext('2d')
      if (!context) return fail()
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) return fail()
        settled = true
        cleanup()
        resolve(blob)
      }, 'image/jpeg', 0.88)
    }

    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.onerror = fail
    video.onloadedmetadata = () => {
      const target = Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(0.01, video.duration / 2)
        : 0
      if (target > 0) {
        video.onseeked = drawFrame
        video.currentTime = target
      } else {
        video.onloadeddata = drawFrame
      }
    }
    video.src = objectUrl
    video.load()
  })
}
