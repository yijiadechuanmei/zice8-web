const DEFAULT_STATE = {
  enabled: false,
  url: '',
  playing: false,
  paused: true,
  blocked: false,
  ready: false,
  loading: false,
  userPaused: false,
  bridgeReady: false,
  audioContextState: 'unsupported',
  lastError: '',
}

const reasonAttemptLimit = 3
const attemptIntervalMs = 200

function normalizeVolume(value) {
  const volume = Number(value)
  if (!Number.isFinite(volume)) return 0.6
  if (volume < 0) return 0
  if (volume > 1) return 1
  return volume
}

function normalizeConfig(config = {}) {
  return {
    enabled: Boolean(config.enabled),
    url: String(config.url || '').trim(),
    loop: config.loop !== false,
    autoplay: config.autoplay !== false,
    showControl: config.showControl !== false,
    volume: normalizeVolume(config.volume),
    preload: config.preload !== false,
  }
}

function getCacheKey(activityKey) {
  return activityKey ? `zice8:last_bgm_url:${activityKey}` : ''
}

function safeLoadAudio(audio) {
  try {
    audio.load()
  } catch {
    return false
  }
  return true
}

class ActivityAudioService {
  constructor() {
    this.audio = null
    this.audioContext = null
    this.mediaSource = null
    this.config = normalizeConfig()
    this.context = {}
    this.state = { ...DEFAULT_STATE }
    this.listeners = new Set()
    this.initialized = false
    this.lastPreparedUrl = ''
    this.lastAttemptAt = 0
    this.reasonAttempts = {}
    this.timers = []
    this.firstGestureBound = false
    this.cachedPrepared = false
  }

  init(options = {}) {
    this.context = { ...this.context, ...options }
    if (this.initialized) {
      this.prepareCachedUrl()
      return
    }

    this.initialized = true
    this.createAudio()
    this.createAudioContext()
    this.bindAudioEvents()
    this.bindUnlockEvents()
    this.prepareCachedUrl()
    this.emit()
  }

  setConfig(bgmConfig = {}, context = {}) {
    this.init(context)
    this.context = { ...this.context, ...context }
    const nextConfig = normalizeConfig(bgmConfig)
    const previousUrl = this.config.url
    this.config = nextConfig
    this.reasonAttempts = {}

    if (nextConfig.enabled && nextConfig.url && this.context.activityKey) {
      try {
        localStorage.setItem(getCacheKey(this.context.activityKey), nextConfig.url)
      } catch {
        // localStorage can be unavailable; audio should still work.
      }
    }

    this.patchState({
      enabled: nextConfig.enabled,
      url: nextConfig.url,
      blocked: false,
      lastError: '',
    })

    if (!nextConfig.enabled || !nextConfig.url) {
      this.pause('disabled')
      this.clearAudioSource()
      return
    }

    this.prepareAudio('set-config', { force: previousUrl !== nextConfig.url })
    if (nextConfig.autoplay && !this.state.userPaused) {
      this.play('set-config')
    }
  }

  async play(reason = 'play', options = {}) {
    const { manual = false, forcePrepare = false } = options

    if (!this.config.enabled || !this.config.url) return false
    if (this.state.userPaused && !manual) return false
    if (!manual && !this.canAttempt(reason)) return false

    const audio = this.prepareAudio(reason, { force: forcePrepare })
    if (!audio) return false

    this.reasonAttempts[reason] = (this.reasonAttempts[reason] || 0) + 1
    this.lastAttemptAt = Date.now()

    await this.resumeAudioContext(reason)

    try {
      await audio.play()
      this.patchState({
        playing: true,
        paused: false,
        blocked: false,
        userPaused: manual ? false : this.state.userPaused,
        lastError: '',
      })
      this.clearFirstGestureListeners()
      return true
    } catch (error) {
      const message = error?.message || 'unknown'
      console.warn(`[ActivityAudioService] play blocked reason=${reason} error=${message}`)
      this.patchState({
        playing: false,
        paused: true,
        blocked: !this.state.userPaused,
        lastError: message,
      })
      return false
    }
  }

  pause(reason = 'pause') {
    if (this.audio) this.audio.pause()
    this.patchState({
      playing: false,
      paused: true,
      userPaused: reason === 'manual' ? true : this.state.userPaused,
      blocked: false,
    })
  }

  toggle(reason = 'manual') {
    if (this.state.playing) {
      this.pause('manual')
      return false
    }
    this.patchState({ userPaused: false })
    return this.play(reason, { manual: true, forcePrepare: true })
  }

  destroy() {
    this.clearTimers()
    this.clearFirstGestureListeners()
    document.removeEventListener('WeixinJSBridgeReady', this.handleBridgeReady, false)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('pageshow', this.handlePageShow)

    if (this.audio) {
      this.audio.removeEventListener('play', this.handleAudioPlay)
      this.audio.removeEventListener('pause', this.handleAudioPause)
      this.audio.removeEventListener('ended', this.handleAudioEnded)
      this.audio.removeEventListener('canplay', this.handleAudioReady)
      this.audio.removeEventListener('loadeddata', this.handleAudioReady)
      this.audio.pause()
      this.clearAudioSource()
      this.audio = null
    }

    if (this.audioContext?.close) {
      this.audioContext.close().catch(() => {})
    }

    this.audioContext = null
    this.mediaSource = null
    this.initialized = false
    this.lastPreparedUrl = ''
    this.cachedPrepared = false
    this.patchState({ ...DEFAULT_STATE })
  }

  subscribe(listener) {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  getState() {
    return { ...this.state }
  }

  patchState(patch) {
    this.state = { ...this.state, ...patch }
    this.emit()
  }

  emit() {
    const snapshot = this.getState()
    this.listeners.forEach((listener) => listener(snapshot))
  }

  createAudio() {
    if (this.audio) return this.audio

    this.audio = document.createElement('audio')
    this.audio.preload = 'auto'
    this.audio.setAttribute('playsinline', 'true')
    this.audio.setAttribute('webkit-playsinline', 'true')
    this.audio.setAttribute('x5-playsinline', 'true')
    this.audio.setAttribute('x5-video-player-type', 'h5')
    return this.audio
  }

  createAudioContext() {
    if (this.audioContext || typeof window === 'undefined') return

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      this.patchState({ audioContextState: 'unsupported' })
      return
    }

    try {
      this.audioContext = new AudioContextClass()
      this.patchState({ audioContextState: this.audioContext.state || 'created' })
    } catch (error) {
      this.patchState({ audioContextState: 'failed', lastError: error?.message || 'AudioContext failed' })
    }
  }

  connectAudioContext() {
    if (!this.audio || !this.audioContext || this.mediaSource) return

    try {
      this.mediaSource = this.audioContext.createMediaElementSource(this.audio)
      this.mediaSource.connect(this.audioContext.destination)
    } catch (error) {
      this.patchState({ lastError: error?.message || 'AudioContext source failed' })
    }
  }

  async resumeAudioContext(reason) {
    if (!this.audioContext) return false

    try {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }
      this.patchState({ audioContextState: this.audioContext.state || 'running' })
      this.connectAudioContext()
      return true
    } catch (error) {
      console.warn(`[ActivityAudioService] audioContext resume failed reason=${reason} error=${error?.message || 'unknown'}`)
      this.patchState({ audioContextState: this.audioContext.state || 'failed', lastError: error?.message || '' })
      return false
    }
  }

  prepareAudio(reason, options = {}) {
    const { force = false, url = this.config.url } = options
    if (!url) return null

    const audio = this.createAudio()
    const shouldReset = force || this.lastPreparedUrl !== url

    if (shouldReset) {
      if (!audio.paused) audio.pause()
      audio.src = url
      this.lastPreparedUrl = url
    }

    audio.preload = 'auto'
    audio.loop = this.config.loop
    audio.volume = this.config.volume
    audio.setAttribute('playsinline', 'true')
    audio.setAttribute('webkit-playsinline', 'true')
    audio.setAttribute('x5-playsinline', 'true')
    audio.setAttribute('x5-video-player-type', 'h5')

    if (shouldReset || force || this.config.preload) {
      this.patchState({ loading: true })
      safeLoadAudio(audio)
    }

    this.connectAudioContext()
    return audio
  }

  clearAudioSource() {
    if (!this.audio) return
    this.audio.removeAttribute('src')
    safeLoadAudio(this.audio)
    this.lastPreparedUrl = ''
    this.patchState({ ready: false, loading: false })
  }

  bindAudioEvents() {
    if (!this.audio) return

    this.handleAudioPlay = () => this.patchState({ playing: true, paused: false, blocked: false })
    this.handleAudioPause = () => this.patchState({ playing: false, paused: true })
    this.handleAudioEnded = () => this.patchState({ playing: false, paused: true })
    this.handleAudioReady = () => this.patchState({ ready: true, loading: false })

    this.audio.addEventListener('play', this.handleAudioPlay)
    this.audio.addEventListener('pause', this.handleAudioPause)
    this.audio.addEventListener('ended', this.handleAudioEnded)
    this.audio.addEventListener('canplay', this.handleAudioReady)
    this.audio.addEventListener('loadeddata', this.handleAudioReady)
  }

  bindUnlockEvents() {
    this.handleBridgeReady = () => {
      this.patchState({ bridgeReady: true })
      this.runBridgeUnlock('wechat-bridge')
    }

    this.handleFirstGesture = () => {
      this.resumeAudioContext('first-gesture')
      if (this.config.autoplay && this.config.url && !this.state.userPaused) {
        this.play('first-gesture')
      }
    }

    this.handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (!this.config.autoplay || this.state.userPaused) return
      this.play('visible')
    }

    this.handlePageShow = () => {
      if (!this.config.autoplay || this.state.userPaused) return
      this.play('pageshow')
    }

    document.addEventListener('WeixinJSBridgeReady', this.handleBridgeReady, false)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('pageshow', this.handlePageShow)
    this.bindFirstGestureListeners()

    if (window.WeixinJSBridge) {
      this.scheduleTask(() => this.runBridgeUnlock('wechat-bridge-existing'), 0)
    }

    if (window.wx && typeof window.wx.ready === 'function') {
      window.wx.ready(() => {
        if (this.config.autoplay && !this.state.userPaused) this.play('wx-ready', { forcePrepare: true })
      })
    }
  }

  bindFirstGestureListeners() {
    if (this.firstGestureBound) return
    this.firstGestureBound = true
    window.addEventListener('touchstart', this.handleFirstGesture, { capture: true, passive: true })
    window.addEventListener('pointerdown', this.handleFirstGesture, { capture: true })
    window.addEventListener('click', this.handleFirstGesture, { capture: true })
  }

  clearFirstGestureListeners() {
    if (!this.firstGestureBound) return
    this.firstGestureBound = false
    window.removeEventListener('touchstart', this.handleFirstGesture, { capture: true, passive: true })
    window.removeEventListener('pointerdown', this.handleFirstGesture, { capture: true })
    window.removeEventListener('click', this.handleFirstGesture, { capture: true })
  }

  runBridgeUnlock(reason) {
    this.resumeAudioContext(reason)

    const invokeAndPlay = () => {
      this.resumeAudioContext(`${reason}-invoke`)
      this.prepareAudio(reason, { force: true })
      if (this.config.autoplay && this.config.url && !this.state.userPaused) {
        this.play(`${reason}-invoke`, { forcePrepare: true })
      }
    }

    if (window.WeixinJSBridge?.invoke) {
      try {
        window.WeixinJSBridge.invoke('getNetworkType', {}, invokeAndPlay)
      } catch {
        invokeAndPlay()
      }
    } else {
      invokeAndPlay()
    }

    this.scheduleTask(() => {
      if (this.config.autoplay) this.play(`${reason}-retry-300`, { forcePrepare: true })
    }, 300)
    this.scheduleTask(() => {
      if (this.config.autoplay) this.play(`${reason}-retry-800`, { forcePrepare: true })
    }, 800)
  }

  prepareCachedUrl() {
    if (!this.context.activityKey || this.cachedPrepared) return
    this.cachedPrepared = true

    let cachedUrl = ''
    try {
      cachedUrl = localStorage.getItem(getCacheKey(this.context.activityKey)) || ''
    } catch {
      cachedUrl = ''
    }

    if (!cachedUrl) return

    const previousConfig = this.config
    this.config = {
      ...previousConfig,
      enabled: true,
      url: cachedUrl,
      autoplay: true,
    }
    this.prepareAudio('cached-url', { force: true, url: cachedUrl })
    this.config = previousConfig

    if (this.state.bridgeReady && !this.state.userPaused) {
      this.play('cached-url-bridge')
    }
  }

  canAttempt(reason) {
    const now = Date.now()
    if (now - this.lastAttemptAt < attemptIntervalMs) return false
    return (this.reasonAttempts[reason] || 0) < reasonAttemptLimit
  }

  scheduleTask(callback, delay) {
    const timerId = window.setTimeout(() => {
      this.timers = this.timers.filter((id) => id !== timerId)
      callback()
    }, delay)
    this.timers.push(timerId)
  }

  clearTimers() {
    this.timers.forEach((timerId) => window.clearTimeout(timerId))
    this.timers = []
  }
}

export const activityAudioService = new ActivityAudioService()
