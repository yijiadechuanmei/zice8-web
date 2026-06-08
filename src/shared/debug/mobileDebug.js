const VCONSOLE_CDN_URL = 'https://cdn.jsdelivr.net/npm/vconsole@latest/dist/vconsole.min.js'

export function enableMobileDebug() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (window.__zice8MobileDebugLoaded) return

  window.__zice8MobileDebugLoaded = true

  const script = document.createElement('script')
  script.src = VCONSOLE_CDN_URL
  script.async = true
  script.onload = () => {
    if (window.VConsole && !window.__zice8VConsole) {
      window.__zice8VConsole = new window.VConsole({ theme: 'dark' })
      console.log('[MobileDebug] vConsole enabled')
    }
  }
  script.onerror = () => {
    console.warn('[MobileDebug] failed to load vConsole')
  }
  document.head.appendChild(script)
}
