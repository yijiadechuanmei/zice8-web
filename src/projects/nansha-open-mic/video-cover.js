const COVER_MAX_WIDTH = 1280
const COVER_MAX_HEIGHT = 1280

export function captureVideoFirstFrame(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    let settled = false
    const timeoutId = window.setTimeout(fail, 8000)

    function cleanup() {
      window.clearTimeout(timeoutId)
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
      if (settled || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return
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
    // Draw at time 0 as soon as a decodable frame is available. Seeking to a
    // later timestamp stalls on several mobile browser codecs, while the
    // loaded-data/can-play events are reliable for a true first-frame cover.
    video.onloadedmetadata = drawFrame
    video.onloadeddata = drawFrame
    video.oncanplay = drawFrame
    video.src = objectUrl
    video.load()
  })
}
