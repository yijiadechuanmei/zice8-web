const DEFAULT_STATE = {
  initialized: false,
  enabled: false,
  url: '',
  hasAudio: false,
  audioSrc: '',
  playing: false,
  paused: true,
  blocked: false,
  ready: false,
  loading: false,
  userPaused: false,
  bridgeReady: false,
  audioContextState: 'unsupported',
  lastError: '',
  audioPaused: true,
  audioCurrentTime: 0,
  audioReadyState: 0,
  audioNetworkState: 0,
  volume: 0.6,
  loop: true,
  mediaElementSourceEnabled: false,
  activityKey: '',
  mutedAutoplay: false,
  playbackVerified: false,
  playbackRecoveries: 0,
}

const ENABLE_MEDIA_ELEMENT_SOURCE = false
const reasonAttemptLimit = 3
const attemptIntervalMs = 200

function isAudioDebugEnabled() {
  if (typeof window === 'undefined') return false
  const search = new URLSearchParams(window.location.search)
  return search.get('debug_auth') === '1' || search.get('debug') === '1'
}

function debugLog(message, payload) {
  if (!isAudioDebugEnabled()) return
  if (payload === undefined) {
    console.log(message)
    return
  }
  console.log(message, payload)
}

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

function isAudioActivelyPlaying(audio) {
  return Boolean(audio && !audio.paused && !audio.ended)
}

function isAutoplayBlockedError(error) {
  const name = String(error?.name || '')
  const message = String(error?.message || '')
  return name === 'NotAllowedError' || /user didn't interact|play\(\) failed|not allowed|gesture/i.test(message)
}

function isWechatBrowser() {
  if (typeof navigator === 'undefined') return false
  return /MicroMessenger/i.test(navigator.userAgent || '')
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
    this.playbackCheckTimers = []
    this.firstGestureBound = false
    this.cachedPrepared = false
    this.wechatRecoveryCount = 0
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
    this.patchState({
      initialized: true,
      activityKey: this.context.activityKey || '',
      mediaElementSourceEnabled: ENABLE_MEDIA_ELEMENT_SOURCE,
    })
    debugLog('[ActivityAudio] init', {
      activityKey: this.context.activityKey || '',
      mediaElementSourceEnabled: ENABLE_MEDIA_ELEMENT_SOURCE,
    })
    this.emit()
  }

  setConfig(bgmConfig = {}, context = {}) {
    this.init(context)
    this.context = { ...this.context, ...context }
    const nextConfig = normalizeConfig(bgmConfig)
    const previousUrl = this.config.url
    const hasExplicitConfig = Boolean(nextConfig.url)
    this.config = hasExplicitConfig ? nextConfig : this.config
    this.reasonAttempts = {}

    if (nextConfig.enabled && nextConfig.url && this.context.activityKey) {
      try {
        localStorage.setItem(getCacheKey(this.context.activityKey), nextConfig.url)
      } catch {
        // localStorage can be unavailable; audio should still work.
      }
    }

    this.patchState({
      enabled: hasExplicitConfig ? nextConfig.enabled : this.config.enabled,
      url: hasExplicitConfig ? nextConfig.url : this.config.url,
      blocked: false,
      lastError: '',
      volume: hasExplicitConfig ? nextConfig.volume : this.config.volume,
      loop: hasExplicitConfig ? nextConfig.loop : this.config.loop,
      activityKey: this.context.activityKey || '',
    })
    debugLog('[ActivityAudio] setConfig', {
      activityKey: this.context.activityKey || '',
      enabled: nextConfig.enabled,
      url: nextConfig.url,
      loop: nextConfig.loop,
      volume: nextConfig.volume,
    })

    if (hasExplicitConfig && (!nextConfig.enabled || !nextConfig.url)) {
      this.pause('disabled')
      this.clearAudioSource()
      return
    }

    const targetUrl = hasExplicitConfig ? nextConfig.url : this.config.url
    this.prepareAudio('set-config', { force: previousUrl !== targetUrl, url: targetUrl })
    if ((hasExplicitConfig ? nextConfig.autoplay : this.config.autoplay) && !this.state.userPaused) {
      if (isWechatBrowser()) {
        if (window.WeixinJSBridge?.invoke) {
          this.runBridgeUnlock('set-config-wechat-bridge')
        }
        return
      }
      this.play('set-config')
    }
  }

  async play(reason = 'play', options = {}) {
    const impliedManual = /manual/i.test(String(reason || ''))
    const { manual = false, forcePrepare = false, ignoreThrottle = false } = options
    const isManual = manual || impliedManual

    if (!this.config.enabled || !this.config.url) return false
    if (this.state.userPaused && !isManual) return false
    if (!isManual && isAudioActivelyPlaying(this.audio) && this.lastPreparedUrl === this.config.url) {
      if (this.state.mutedAutoplay) {
        return this.restoreAudibleElementState(`${reason}-active-restore`)
      }
      this.patchState({
        playing: true,
        paused: false,
        blocked: false,
        lastError: '',
      })
      return true
    }
    if (!isManual && !ignoreThrottle && !this.canAttempt(reason)) return false

    const audio = this.prepareAudio(reason, { force: forcePrepare })
    if (!audio) return false

    this.reasonAttempts[reason] = (this.reasonAttempts[reason] || 0) + 1
    this.lastAttemptAt = Date.now()
    if (isManual) {
      this.patchState({ userPaused: false })
    }
    debugLog('[ActivityAudio] play start', {
      reason,
      manual: isManual,
      forcePrepare,
    })

    await this.resumeAudioContext(reason).catch(() => undefined)
    audio.muted = false
    audio.volume = this.config.volume

    try {
      await audio.play()
      this.patchState({
        playing: true,
        paused: false,
        blocked: false,
        mutedAutoplay: false,
        userPaused: isManual ? false : this.state.userPaused,
        lastError: '',
      })
      this.clearFirstGestureListeners()
      debugLog('[ActivityAudio] play success', {
        reason,
        src: audio.currentSrc || audio.src || '',
      })
      return true
    } catch (error) {
      const message = error?.message || 'unknown'
      console.warn(`[ActivityAudio] play failed reason=${reason} error=${message}`)
      if (!isManual && this.config.autoplay && !isWechatBrowser() && isAutoplayBlockedError(error)) {
        const mutedPlayed = await this.playMutedAutoplay(`${reason}-muted-fallback`, audio, message)
        if (mutedPlayed) return true
      }
      this.patchState({
        playing: false,
        paused: true,
        blocked: !this.state.userPaused,
        lastError: message,
      })
      debugLog('[ActivityAudio] play failed', {
        reason,
        error: message,
      })
      return false
    }
  }

  async playMutedAutoplay(reason, audio, originalError = '') {
    if (isWechatBrowser()) return false
    if (!audio || this.state.userPaused || !this.config.enabled || !this.config.url) return false

    try {
      audio.muted = true
      audio.volume = this.config.volume
      await audio.play()
      this.patchState({
        playing: true,
        paused: false,
        blocked: true,
        mutedAutoplay: true,
        lastError: originalError,
      })
      debugLog('[ActivityAudio] muted autoplay success', {
        reason,
        src: audio.currentSrc || audio.src || '',
      })
      return true
    } catch (error) {
      debugLog('[ActivityAudio] muted autoplay failed', {
        reason,
        error: error?.message || 'unknown',
      })
      return false
    }
  }

  playNativeImmediately(reason, options = {}) {
    const { forcePrepare = false } = options
    if (!this.config.enabled || !this.config.url || this.state.userPaused) return false

    const audio = this.prepareAudio(reason, { force: forcePrepare })
    if (!audio) return false

    audio.muted = false
    audio.volume = this.config.volume
    audio.loop = this.config.loop

    let playPromise
    try {
      playPromise = audio.play()
    } catch (error) {
      const message = error?.message || 'unknown'
      this.patchState({
        playing: false,
        paused: true,
        blocked: true,
        lastError: message,
      })
      debugLog('[ActivityAudio] native immediate play threw', {
        reason,
        error: message,
      })
      return false
    }

    if (playPromise?.then) {
      playPromise
        .then(() => {
          this.patchState({
            playing: true,
            paused: false,
            blocked: false,
            mutedAutoplay: false,
            lastError: '',
          })
          this.clearFirstGestureListeners()
          debugLog('[ActivityAudio] native immediate play success', {
            reason,
            src: audio.currentSrc || audio.src || '',
          })
        })
        .catch((error) => {
          const message = error?.message || 'unknown'
          this.patchState({
            playing: false,
            paused: true,
            blocked: true,
            lastError: message,
          })
          debugLog('[ActivityAudio] native immediate play failed', {
            reason,
            error: message,
          })
        })
    } else {
      this.patchState({
        playing: true,
        paused: false,
        blocked: false,
        mutedAutoplay: false,
        lastError: '',
      })
      this.clearFirstGestureListeners()
      debugLog('[ActivityAudio] native immediate play called', {
        reason,
        src: audio.currentSrc || audio.src || '',
      })
    }

    return true
  }

  playWechatAudible(reason, options = {}) {
    const { forcePrepare = false } = options
    if (!this.config.enabled || !this.config.url || this.state.userPaused) return false

    const audio = this.prepareAudio(reason, { force: forcePrepare })
    if (!audio) return false

    audio.muted = false
    audio.defaultMuted = false
    audio.volume = this.config.volume
    audio.loop = this.config.loop
    audio.removeAttribute('muted')

    const invokeAndPlay = () => {
      let playPromise
      try {
        playPromise = audio.play()
      } catch (error) {
        this.patchState({
          playing: false,
          paused: true,
          blocked: true,
          mutedAutoplay: false,
          lastError: error?.message || 'unknown',
        })
        debugLog('[ActivityAudio] wechat audible play threw', {
          reason,
          error: error?.message || 'unknown',
        })
        return
      }

      if (playPromise?.then) {
        playPromise
          .then(() => {
            this.patchState({
              playing: true,
              paused: false,
              blocked: false,
              mutedAutoplay: false,
              playbackVerified: false,
              lastError: '',
            })
            this.scheduleWechatPlaybackVerification(reason)
            this.clearFirstGestureListeners()
            debugLog('[ActivityAudio] wechat audible play success', {
              reason,
              src: audio.currentSrc || audio.src || '',
            })
          })
          .catch((error) => {
            this.patchState({
              playing: false,
              paused: true,
              blocked: true,
              mutedAutoplay: false,
              lastError: error?.message || 'unknown',
            })
            debugLog('[ActivityAudio] wechat audible play failed', {
              reason,
              error: error?.message || 'unknown',
            })
          })
        return
      }

      this.patchState({
        playing: true,
        paused: false,
        blocked: false,
        mutedAutoplay: false,
        playbackVerified: false,
        lastError: '',
      })
      this.scheduleWechatPlaybackVerification(reason)
      this.clearFirstGestureListeners()
      debugLog('[ActivityAudio] wechat audible play called', {
        reason,
        src: audio.currentSrc || audio.src || '',
      })
    }

    if (window.WeixinJSBridge?.invoke) {
      this.patchState({ bridgeReady: true })
      try {
        window.WeixinJSBridge.invoke('getNetworkType', {}, invokeAndPlay)
      } catch {
        invokeAndPlay()
      }
      return true
    }

    invokeAndPlay()
    return true
  }

  async restoreAudibleElementState(reason = 'restore-audible') {
    const audio = this.audio
    if (!audio || this.state.userPaused || !this.config.enabled) return false

    try {
      audio.muted = false
      audio.volume = this.config.volume
      await audio.play()
      this.patchState({
        blocked: false,
        mutedAutoplay: false,
        playing: true,
        paused: false,
        lastError: '',
      })
      debugLog('[ActivityAudio] restore audible element state', {
        reason,
        playing: !audio.paused,
        muted: audio.muted,
      })
      return true
    } catch (error) {
      debugLog('[ActivityAudio] restore audible failed', {
        reason,
        error: error?.message || 'unknown',
      })
      if (this.state.mutedAutoplay && this.config.autoplay) {
        audio.muted = true
        await audio.play().catch(() => undefined)
        this.patchState({
          blocked: true,
          mutedAutoplay: true,
          playing: !audio.paused,
          paused: audio.paused,
          lastError: error?.message || '',
        })
      }
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
    debugLog('[ActivityAudio] pause', { reason })
  }

  toggle(reason = 'manual') {
    if (this.state.playing) {
      this.pause('manual')
      return false
    }
    this.patchState({ userPaused: false })
    if (isWechatBrowser()) {
      return this.runBridgeUnlock(`${reason}-wechat-manual`)
    }
    return this.play(reason, { manual: true, forcePrepare: true })
  }

  destroy() {
    this.clearTimers()
    this.clearPlaybackCheckTimers()
    this.clearFirstGestureListeners()
    document.removeEventListener('WeixinJSBridgeReady', this.handleBridgeReady, false)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('pageshow', this.handlePageShow)
    window.removeEventListener('focus', this.handleWindowFocus)

    if (this.audio) {
      this.audio.removeEventListener('play', this.handleAudioPlay)
      this.audio.removeEventListener('pause', this.handleAudioPause)
      this.audio.removeEventListener('ended', this.handleAudioEnded)
      this.audio.removeEventListener('canplay', this.handleAudioReady)
      this.audio.removeEventListener('loadeddata', this.handleAudioReady)
      this.audio.pause()
      this.clearAudioSource()
      this.audio.remove()
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
    this.wechatRecoveryCount = 0
    this.patchState({ ...DEFAULT_STATE })
  }

  subscribe(listener) {
    this.listeners.add(listener)
    listener(this.getState())
    return () => this.listeners.delete(listener)
  }

  getState() {
    const audio = this.audio
    return {
      ...this.state,
      initialized: this.initialized,
      hasAudio: Boolean(audio),
      audioSrc: audio?.currentSrc || audio?.src || '',
      audioPaused: audio ? audio.paused : true,
      audioCurrentTime: audio ? Number(audio.currentTime || 0) : 0,
      audioReadyState: audio ? Number(audio.readyState || 0) : 0,
      audioNetworkState: audio ? Number(audio.networkState || 0) : 0,
      volume: this.config.volume,
      loop: this.config.loop,
      mediaElementSourceEnabled: ENABLE_MEDIA_ELEMENT_SOURCE,
      activityKey: this.context.activityKey || '',
    }
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
    this.audio.autoplay = !isWechatBrowser()
    this.audio.muted = false
    this.audio.preload = 'auto'
    this.audio.setAttribute('playsinline', 'true')
    this.audio.setAttribute('webkit-playsinline', 'true')
    this.audio.setAttribute('x5-playsinline', 'true')
    this.audio.setAttribute('x5-video-player-type', 'h5')
    this.audio.setAttribute('aria-hidden', 'true')
    this.audio.setAttribute('data-zice8-activity-bgm', 'true')
    this.audio.style.position = 'fixed'
    this.audio.style.left = '-9999px'
    this.audio.style.top = '-9999px'
    this.audio.style.width = '1px'
    this.audio.style.height = '1px'
    this.audio.style.opacity = '0'
    this.audio.style.pointerEvents = 'none'
    if (document.body && !this.audio.parentNode) {
      document.body.appendChild(this.audio)
    }
    this.patchState({
      hasAudio: true,
      audioSrc: '',
    })
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
    if (!ENABLE_MEDIA_ELEMENT_SOURCE) return
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
    const preparedSrc = audio.currentSrc || audio.src || ''
    const hasPreparedSameUrl = this.lastPreparedUrl === url && Boolean(preparedSrc)
    const shouldReset = this.lastPreparedUrl !== url || (force && !hasPreparedSameUrl)

    if (shouldReset) {
      if (!audio.paused) audio.pause()
      audio.src = url
      this.lastPreparedUrl = url
    }

    audio.preload = 'auto'
    audio.autoplay = !isWechatBrowser()
    audio.loop = this.config.loop
    audio.volume = this.config.volume
    audio.setAttribute('playsinline', 'true')
    audio.setAttribute('webkit-playsinline', 'true')
    audio.setAttribute('x5-playsinline', 'true')
    audio.setAttribute('x5-video-player-type', 'h5')

    if (shouldReset || (!preparedSrc && this.config.preload)) {
      this.patchState({ loading: true })
      safeLoadAudio(audio)
    }

    debugLog('[ActivityAudio] prepare', {
      reason,
      force,
      url,
      src: audio.currentSrc || audio.src || '',
    })
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

    this.handleAudioPlay = () => {
      this.patchState({ playing: true, paused: false, blocked: false })
      this.scheduleWechatPlaybackVerification('audio-play-event')
    }
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
      this.resumeAudioContext('first-gesture').catch(() => undefined)
      if (this.config.autoplay && this.config.url && !this.state.userPaused) {
        if (isWechatBrowser()) {
          this.runBridgeUnlock('first-gesture-wechat')
          return
        }
        this.restoreAudibleElementState('first-gesture')
        this.play('first-gesture', { forcePrepare: true, ignoreThrottle: true })
      }
    }

    this.handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (!this.config.autoplay || this.state.userPaused) return
      if (isWechatBrowser()) {
        this.runBridgeUnlock('visible-wechat')
        return
      }
      this.restoreAudibleElementState('visible')
      this.play('visible')
    }

    this.handlePageShow = () => {
      if (!this.config.autoplay || this.state.userPaused) return
      if (isWechatBrowser()) {
        this.runBridgeUnlock('pageshow-wechat')
        return
      }
      this.restoreAudibleElementState('pageshow')
      this.play('pageshow')
    }

    this.handleWindowFocus = () => {
      if (!this.config.autoplay || this.state.userPaused || !this.state.mutedAutoplay) return
      this.restoreAudibleElementState('focus')
    }

    document.addEventListener('WeixinJSBridgeReady', this.handleBridgeReady, false)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('pageshow', this.handlePageShow)
    window.addEventListener('focus', this.handleWindowFocus)
    this.bindFirstGestureListeners()

    if (window.WeixinJSBridge) {
      this.patchState({ bridgeReady: true })
      debugLog('[ActivityAudio] bridge existing detected')
      this.scheduleTask(() => this.runBridgeUnlock('wechat-bridge-existing'), 0)
    }

    if (window.wx && typeof window.wx.ready === 'function') {
      window.wx.ready(() => {
        if (this.config.autoplay && !this.state.userPaused) {
          if (isWechatBrowser()) {
            this.runBridgeUnlock('wx-ready-wechat')
            return
          }
          this.playNativeImmediately('wx-ready-native', { forcePrepare: true })
        }
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
    if (reason.includes('bridge')) {
      this.patchState({ bridgeReady: true })
    }
    debugLog('[ActivityAudio] bridge unlock', { reason })
    this.resumeAudioContext(reason).catch(() => undefined)

    const shouldPlay = (this.config.autoplay || /manual/i.test(reason)) && this.config.url && !this.state.userPaused

    if (shouldPlay) {
      if (reason.includes('cached-url')) {
        debugLog('[ActivityAudio] cached url weixin invoke')
      }
      this.playWechatAudible(`${reason}-invoke`, { forcePrepare: true })
      this.resumeAudioContext(`${reason}-invoke`).catch(() => undefined)
    }

    this.scheduleTask(() => {
      if (shouldPlay) this.playWechatAudible(`${reason}-retry-300`)
    }, 300)
    this.scheduleTask(() => {
      if (shouldPlay) this.playWechatAudible(`${reason}-retry-800`)
    }, 800)
    this.scheduleTask(() => {
      if (shouldPlay) this.playWechatAudible(`${reason}-retry-1500`)
    }, 1500)
    return true
  }

  prepareCachedUrl() {
    if (!this.context.activityKey || this.cachedPrepared) return
    this.cachedPrepared = true

    let cachedUrl
    try {
      cachedUrl = localStorage.getItem(getCacheKey(this.context.activityKey)) || ''
    } catch {
      return
    }

    if (!cachedUrl) return

    this.config = {
      ...this.config,
      enabled: true,
      url: cachedUrl,
      autoplay: true,
      loop: true,
      showControl: true,
      volume: 0.6,
      preload: true,
    }
    this.patchState({
      enabled: true,
      url: cachedUrl,
      volume: this.config.volume,
      loop: this.config.loop,
      activityKey: this.context.activityKey || '',
    })
    debugLog('[ActivityAudio] cached url loaded', {
      activityKey: this.context.activityKey || '',
      url: cachedUrl,
    })
    this.prepareAudio('cached-url', { force: true, url: cachedUrl })

    if (window.WeixinJSBridge?.invoke && !this.state.userPaused) {
      this.patchState({ bridgeReady: true })
      this.runBridgeUnlock('cached-url-wechat-bridge')
      return
    }

    if (isWechatBrowser() && this.state.bridgeReady && !this.state.userPaused) {
      this.runBridgeUnlock('cached-url-bridge-ready')
      return
    }

    if (this.state.bridgeReady && !this.state.userPaused) {
      this.play('cached-url-bridge', { ignoreThrottle: true })
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

  scheduleWechatPlaybackVerification(reason) {
    if (!isWechatBrowser() || !this.audio || this.state.userPaused) return

    this.clearPlaybackCheckTimers()
    const audio = this.audio
    const startTime = Number(audio.currentTime || 0)
    const verify = (delay) => {
      if (!this.audio || this.audio !== audio || this.state.userPaused || !this.config.enabled) return

      const currentTime = Number(audio.currentTime || 0)
      const advanced = !audio.paused && currentTime > startTime + 0.05
      if (advanced) {
        this.wechatRecoveryCount = 0
        this.patchState({
          playbackVerified: true,
          playbackRecoveries: this.wechatRecoveryCount,
          lastError: '',
        })
        debugLog('[ActivityAudio] wechat playback verified', {
          reason,
          delay,
          startTime,
          currentTime,
          readyState: audio.readyState,
          networkState: audio.networkState,
        })
        return
      }

      if (this.wechatRecoveryCount >= 3) {
        this.patchState({
          playbackVerified: false,
          playbackRecoveries: this.wechatRecoveryCount,
          lastError: `微信播放未推进 currentTime delay=${delay}`,
        })
        return
      }

      this.wechatRecoveryCount += 1
      this.patchState({
        playbackVerified: false,
        playbackRecoveries: this.wechatRecoveryCount,
      })
      debugLog('[ActivityAudio] wechat playback stalled, rebuilding audio', {
        reason,
        delay,
        startTime,
        currentTime,
        readyState: audio.readyState,
        networkState: audio.networkState,
        recovery: this.wechatRecoveryCount,
      })
      this.rebuildAudioForWechat(`${reason}-recover-${this.wechatRecoveryCount}`)
      this.runBridgeUnlock(`${reason}-recover-${this.wechatRecoveryCount}`)
    }

    ;[700, 1800].forEach((delay) => {
      const timerId = window.setTimeout(() => {
        this.playbackCheckTimers = this.playbackCheckTimers.filter((id) => id !== timerId)
        verify(delay)
      }, delay)
      this.playbackCheckTimers.push(timerId)
    })
  }

  rebuildAudioForWechat(reason) {
    if (!isWechatBrowser() || !this.audio) return

    const previousAudio = this.audio
    previousAudio.removeEventListener('play', this.handleAudioPlay)
    previousAudio.removeEventListener('pause', this.handleAudioPause)
    previousAudio.removeEventListener('ended', this.handleAudioEnded)
    previousAudio.removeEventListener('canplay', this.handleAudioReady)
    previousAudio.removeEventListener('loadeddata', this.handleAudioReady)
    try {
      previousAudio.pause()
      previousAudio.removeAttribute('src')
      safeLoadAudio(previousAudio)
      previousAudio.remove()
    } catch {
      // Rebuild is best effort; the next bridge attempt will report state.
    }
    this.audio = null
    this.lastPreparedUrl = ''
    this.createAudio()
    this.bindAudioEvents()
    this.prepareAudio(reason, { force: true })
  }

  clearPlaybackCheckTimers() {
    this.playbackCheckTimers.forEach((timerId) => window.clearTimeout(timerId))
    this.playbackCheckTimers = []
  }
}

export const activityAudioService = new ActivityAudioService()

if (typeof window !== 'undefined') {
  window.__activityAudioService = activityAudioService
  debugLog('[ActivityAudio] exposed')
}
