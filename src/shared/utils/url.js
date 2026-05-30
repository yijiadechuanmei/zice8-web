export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name)
}

export function removeQueryParam(name) {
  const url = new URL(window.location.href)
  url.searchParams.delete(name)
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
}

export function removeUrlHashAndToken(url) {
  const parsed = new URL(url)
  parsed.hash = ''
  parsed.searchParams.delete('token')
  return parsed.toString()
}

export function isWechatBrowser() {
  return /MicroMessenger/i.test(window.navigator.userAgent)
}
