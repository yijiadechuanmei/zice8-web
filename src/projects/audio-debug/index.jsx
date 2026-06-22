import { useEffect, useMemo, useRef, useState } from 'react'
import { request } from '../../shared/api/request'
import { activityAudioService } from '../../shared/audio/activityAudioService'
import { enableMobileDebug } from '../../shared/debug/mobileDebug'
import { getQueryParam } from '../../shared/utils/url'

const DEFAULT_ACTIVITY_KEY = 'tjrcb_pension_manual_20260622'

const pageStyle = {
  minHeight: '100vh',
  padding: '16px',
  background: '#07111f',
  color: '#e5eefc',
  fontFamily: 'Menlo, Consolas, monospace',
  fontSize: '13px',
  lineHeight: 1.55,
}

const cardStyle = {
  marginBottom: '12px',
  padding: '12px',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: '12px',
  background: 'rgba(15, 23, 42, 0.86)',
}

const titleStyle = {
  margin: '0 0 10px',
  color: '#93c5fd',
  fontSize: '15px',
}

const buttonRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
}

const buttonStyle = {
  minHeight: '36px',
  padding: '0 10px',
  border: '1px solid rgba(147, 197, 253, 0.5)',
  borderRadius: '9px',
  background: '#1d4ed8',
  color: '#ffffff',
  fontSize: '13px',
}

const dangerButtonStyle = {
  ...buttonStyle,
  borderColor: 'rgba(248, 113, 113, 0.5)',
  background: '#991b1b',
}

const preStyle = {
  margin: 0,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

function isWechatBrowser() {
  if (typeof navigator === 'undefined') return false
  return /MicroMessenger/i.test(navigator.userAgent || '')
}

function getAudioSnapshot() {
  const audio = document.querySelector('audio[data-zice8-activity-bgm="true"]')
  if (!audio) return { found: false }
  return {
    found: true,
    src: audio.currentSrc || audio.src || '',
    paused: audio.paused,
    muted: audio.muted,
    defaultMuted: audio.defaultMuted,
    volume: audio.volume,
    loop: audio.loop,
    autoplay: audio.autoplay,
    readyState: audio.readyState,
    networkState: audio.networkState,
    currentTime: Number(audio.currentTime || 0),
    duration: Number.isFinite(audio.duration) ? audio.duration : String(audio.duration),
    parentNode: audio.parentNode?.tagName || '',
    error: audio.error
      ? {
          code: audio.error.code,
          message: audio.error.message,
        }
      : null,
  }
}

function readEnvironment() {
  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    isWechat: isWechatBrowser(),
    visibilityState: document.visibilityState,
    hasWeixinJSBridge: Boolean(window.WeixinJSBridge),
    hasWeixinInvoke: Boolean(window.WeixinJSBridge?.invoke),
    hasWx: Boolean(window.wx),
    hasWxReady: Boolean(window.wx?.ready),
    isSecureContext: window.isSecureContext,
  }
}

function JsonBlock({ value }) {
  return <pre style={preStyle}>{JSON.stringify(value, null, 2)}</pre>
}

function appendLog(setLogs, message, payload) {
  const time = new Date().toLocaleTimeString()
  setLogs((current) => [
    { time, message, payload },
    ...current,
  ].slice(0, 80))
}

export default function AudioDebugPage({ routeParams }) {
  const activityKey =
    routeParams?.activityKey ||
    getQueryParam('activity_key') ||
    DEFAULT_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [configError, setConfigError] = useState('')
  const [serviceState, setServiceState] = useState(() => activityAudioService.getState())
  const [environment, setEnvironment] = useState(() => readEnvironment())
  const [audioSnapshot, setAudioSnapshot] = useState(() => getAudioSnapshot())
  const [logs, setLogs] = useState([])
  const rawAudioRef = useRef(null)

  const bgmConfig = useMemo(
    () => publicConfig?.bgmConfig || publicConfig?.mobileConfig?.bgm || null,
    [publicConfig],
  )

  useEffect(() => {
    document.title = 'BGM Debug'
    enableMobileDebug()
  }, [])

  useEffect(() => activityAudioService.subscribe(setServiceState), [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setEnvironment(readEnvironment())
      setAudioSnapshot(getAudioSnapshot())
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let cancelled = false
    request(`/activities/${activityKey}/public-config`, { skipAuth: true })
      .then((data) => {
        if (cancelled) return
        setPublicConfig(data)
        setConfigError('')
        appendLog(setLogs, 'public-config loaded', data?.bgmConfig || data?.mobileConfig?.bgm || null)
      })
      .catch((error) => {
        if (cancelled) return
        setConfigError(error?.message || 'public-config 加载失败')
        appendLog(setLogs, 'public-config failed', error?.message || error)
      })
    return () => {
      cancelled = true
    }
  }, [activityKey])

  useEffect(() => {
    if (!bgmConfig) return
    activityAudioService.setConfig(bgmConfig, { activityKey })
    appendLog(setLogs, 'service setConfig', bgmConfig)
  }, [activityKey, bgmConfig])

  function refreshState(label = 'refresh') {
    setEnvironment(readEnvironment())
    setAudioSnapshot(getAudioSnapshot())
    setServiceState(activityAudioService.getState())
    appendLog(setLogs, label, {
      service: activityAudioService.getState(),
      audio: getAudioSnapshot(),
    })
  }

  async function runAction(label, action) {
    appendLog(setLogs, `${label} start`)
    try {
      const result = await action()
      appendLog(setLogs, `${label} result`, result)
    } catch (error) {
      appendLog(setLogs, `${label} error`, {
        name: error?.name,
        message: error?.message || String(error),
      })
    } finally {
      window.setTimeout(() => refreshState(`${label} snapshot`), 300)
    }
  }

  const bgmUrl = String(bgmConfig?.url || '')

  return (
    <main style={pageStyle}>
      <h1 style={{ margin: '0 0 14px', fontSize: '20px' }}>BGM Debug</h1>

      <section style={cardStyle}>
        <h2 style={titleStyle}>Activity</h2>
        <JsonBlock value={{ activityKey, configError, bgmConfig }} />
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>Actions</h2>
        <div style={buttonRowStyle}>
          <button type="button" style={buttonStyle} onClick={() => refreshState()}>
            刷新状态
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => runAction('setConfig', () => activityAudioService.setConfig(bgmConfig, { activityKey }))}
            disabled={!bgmConfig}
          >
            setConfig
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => runAction('bridge', () => activityAudioService.runBridgeUnlock('debug-bridge-manual'))}
          >
            微信桥接播放
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => runAction('wechatAudible', () => activityAudioService.playWechatAudible('debug-wechat-audible', { forcePrepare: true }))}
          >
            直接微信播放
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => runAction('normalPlay', () => activityAudioService.play('debug-normal-manual', { manual: true, forcePrepare: true, ignoreThrottle: true }))}
          >
            普通播放
          </button>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => runAction('rawAudio', async () => {
              const audio = rawAudioRef.current
              if (!audio) return false
              audio.src = bgmUrl
              audio.muted = false
              audio.volume = Number(bgmConfig?.volume ?? 0.6)
              audio.loop = Boolean(bgmConfig?.loop ?? true)
              await audio.play()
              return {
                paused: audio.paused,
                readyState: audio.readyState,
                networkState: audio.networkState,
              }
            })}
            disabled={!bgmUrl}
          >
            原生 audio 播放
          </button>
          <button
            type="button"
            style={dangerButtonStyle}
            onClick={() => runAction('pause', () => activityAudioService.pause('debug'))}
          >
            停止服务音乐
          </button>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>Environment</h2>
        <JsonBlock value={environment} />
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>Service State</h2>
        <JsonBlock value={serviceState} />
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>BGM Audio Element</h2>
        <JsonBlock value={audioSnapshot} />
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>Raw Test Audio</h2>
        <audio
          ref={rawAudioRef}
          controls
          playsInline
          webkit-playsinline="true"
          src={bgmUrl}
          style={{ width: '100%' }}
          onPlay={() => appendLog(setLogs, 'raw audio play')}
          onPause={() => appendLog(setLogs, 'raw audio pause')}
          onError={(event) => appendLog(setLogs, 'raw audio error', event.currentTarget.error)}
        />
      </section>

      <section style={cardStyle}>
        <h2 style={titleStyle}>Logs</h2>
        <JsonBlock value={logs} />
      </section>
    </main>
  )
}
