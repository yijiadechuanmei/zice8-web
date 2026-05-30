export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name)
}

export function getTokenFromUrl(inputUrl = window.location.href) {
  return new URL(inputUrl).searchParams.get('token')
}

export function removeQueryParam(name) {
  const url = new URL(window.location.href)
  url.searchParams.delete(name)
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
}

export function removeUrlHashAndToken(url) {
  return sanitizeUrlForWechat(url)
}

export function sanitizeUrlForWechat(inputUrl) {
  const parsed = new URL(inputUrl)
  parsed.hash = ''
  parsed.searchParams.delete('token')
  parsed.searchParams.delete('code')
  parsed.searchParams.delete('state')
  return parsed.toString()
}

export function isWechatBrowser() {
  return /MicroMessenger/i.test(window.navigator.userAgent)
}
