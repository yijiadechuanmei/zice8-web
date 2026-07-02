export function setDocumentTitle(title) {
  const nextTitle = typeof title === 'string' ? title.trim() : ''
  if (!nextTitle || typeof document === 'undefined') return

  document.title = nextTitle

  if (typeof navigator === 'undefined' || !/MicroMessenger/i.test(navigator.userAgent || '')) {
    return
  }

  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = '/favicon.svg'

  const removeIframe = () => {
    window.setTimeout(() => {
      iframe.remove()
    }, 0)
  }

  iframe.addEventListener('load', removeIframe, { once: true })
  document.body.appendChild(iframe)
  window.setTimeout(() => {
    iframe.remove()
  }, 1000)
}
