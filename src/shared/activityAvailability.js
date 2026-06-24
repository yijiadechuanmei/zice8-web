let unavailableActivity = null
const listeners = new Set()

const PUBLIC_CONFIG_PATH = /^\/activities\/([^/]+)\/public-config(?:\?|$)/

export function markActivityUnavailable(path) {
  const match = String(path || '').match(PUBLIC_CONFIG_PATH)
  if (!match) return
  const activityKey = decodeURIComponent(match[1])
  if (unavailableActivity?.activityKey === activityKey) return
  unavailableActivity = { activityKey }
  listeners.forEach((listener) => listener())
}

export function getUnavailableActivity() {
  return unavailableActivity
}

export function subscribeActivityAvailability(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
