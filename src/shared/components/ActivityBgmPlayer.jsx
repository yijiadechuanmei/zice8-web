import { useEffect, useState } from 'react'
import { activityAudioService } from '../audio/activityAudioService'

const controlStyle = {
  position: 'fixed',
  top: '18px',
  right: '18px',
  zIndex: 60,
  width: '48px',
  height: '48px',
  borderRadius: '9999px',
  border: '1px solid rgba(255, 255, 255, 0.42)',
  background: 'rgba(8, 36, 24, 0.58)',
  boxShadow: '0 10px 24px rgba(0, 0, 0, 0.18)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
}

const iconWrapBaseStyle = {
  width: '34px',
  height: '34px',
  borderRadius: '9999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transformOrigin: 'center',
}

const iconStyle = {
  width: '25px',
  height: '25px',
  display: 'block',
  transformBox: 'fill-box',
  transformOrigin: 'center',
}

const spinAnimationName = 'activity-bgm-spin'
const pulseAnimationName = 'activity-bgm-pulse'

function MusicNoteIcon({ spinning }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{
        ...iconStyle,
        animation: spinning ? `${spinAnimationName} 3s linear infinite` : 'none',
      }}
    >
      <g transform="translate(4 0)">
        <path
          d="M15 3.6v10.2a3.4 3.4 0 1 1-1.6-2.9V7.1l-5.8 1.4v7a3.4 3.4 0 1 1-1.6-2.9V6.1c0-.73.5-1.36 1.22-1.54l6.2-1.5A1.6 1.6 0 0 1 15 3.6Z"
          fill="currentColor"
        />
      </g>
    </svg>
  )
}

export default function ActivityBgmPlayer({ bgm, activityKey }) {
  const [state, setState] = useState(() => activityAudioService.getState())

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const styleElement = document.createElement('style')
    styleElement.setAttribute('data-activity-bgm-player', 'true')
    styleElement.textContent = `
      @keyframes ${spinAnimationName} {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes ${pulseAnimationName} {
        0% { transform: scale(1); opacity: 0.94; }
        50% { transform: scale(1.08); opacity: 1; }
        100% { transform: scale(1); opacity: 0.94; }
      }
    `
    document.head.appendChild(styleElement)

    return () => {
      styleElement.remove()
    }
  }, [])

  useEffect(() => activityAudioService.subscribe(setState), [])

  useEffect(() => {
    activityAudioService.setConfig(bgm, { activityKey })
  }, [activityKey, bgm])

  const enabled = Boolean(bgm?.enabled)
  const url = String(bgm?.url || '').trim()
  const showControl = bgm?.showControl !== false
  if (!enabled || !url || !showControl) {
    return null
  }

  const waitingGesture = state.blocked && !state.userPaused && !state.playing
  const iconWrapStyle = {
    ...iconWrapBaseStyle,
    animation: waitingGesture ? `${pulseAnimationName} 1.8s ease-in-out infinite` : 'none',
    opacity: state.ready ? 1 : 0.82,
  }

  return (
    <button
      type="button"
      style={controlStyle}
      onClick={() => activityAudioService.toggle('manual')}
      aria-label={state.playing ? '暂停背景音乐' : '播放背景音乐'}
    >
      <span style={iconWrapStyle}>
        <MusicNoteIcon spinning={state.playing} />
      </span>
    </button>
  )
}
