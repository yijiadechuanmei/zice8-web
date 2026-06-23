import { useEffect, useMemo, useRef, useState } from 'react'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { getTufeCampusOpenDayPublicConfig } from './api'
import {
  assetUrl,
  BACKGROUND_LAYERS,
  CONTENT_LAYERS,
  mergeConfig,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  TUFE_CAMPUS_OPEN_DAY_ACTIVITY_KEY,
  TUFE_CAMPUS_OPEN_DAY_QR_IMAGE,
} from './config'
import './styles.css'

function layerStyle(x, y, width, height) {
  return {
    left: `${(x / STAGE_WIDTH) * 100}%`,
    top: `${(y / STAGE_HEIGHT) * 100}%`,
    width: `${(width / STAGE_WIDTH) * 100}%`,
    height: `${(height / STAGE_HEIGHT) * 100}%`,
  }
}

function ImageLayer({ layer, baseUrl, activityKey }) {
  const [filename, x, y, width, height, action] = layer
  const isQrLayer = filename === TUFE_CAMPUS_OPEN_DAY_QR_IMAGE
  const layerClassName = `tufe-open-day-layer${isQrLayer ? ' tufe-open-day-qr-layer' : ''}`
  const image = (
    <img
      src={assetUrl(baseUrl, filename)}
      alt={isQrLayer ? '天津财经大学2026校园开放日二维码' : ''}
      draggable={isQrLayer ? 'true' : 'false'}
    />
  )
  const style = layerStyle(x, y, width, height)

  if (!action) {
    return <div className={layerClassName} style={style}>{image}</div>
  }

  return (
    <a
      className={`${layerClassName} tufe-open-day-link`}
      style={style}
      href={action.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={action.label}
      onClick={() => trackEvent({
        activityKey,
        eventType: 'external_link_click',
        page: '/tufe-campus-open-day',
        extra: { label: action.label, url: action.url },
      })}
    >
      {image}
    </a>
  )
}

export default function TufeCampusOpenDayProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || TUFE_CAMPUS_OPEN_DAY_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [hasVideoStarted, setHasVideoStarted] = useState(false)
  const videoRef = useRef(null)
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig])

  const toggleVideoPlayback = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()?.catch(() => {})
      return
    }

    video.pause()
  }

  const handleVideoClick = (event) => {
    if (event.detail === 0) return

    const bounds = event.currentTarget.getBoundingClientRect()
    const controlsHeight = Math.min(48, bounds.height * 0.25)
    if (event.clientY >= bounds.bottom - controlsHeight) return

    toggleVideoPlayback()
  }

  useEffect(() => {
    let cancelled = false
    getTufeCampusOpenDayPublicConfig(activityKey)
      .then((data) => {
        if (!cancelled) setPublicConfig(data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [activityKey])

  useEffect(() => {
    document.title = publicConfig?.title || '天津财经大学2026校园开放日'
    trackPageView(activityKey, '/tufe-campus-open-day', {
      activityType: publicConfig?.type || 'tufe_campus_open_day',
    })
  }, [activityKey, publicConfig])

  return (
    <main className="tufe-open-day-app">
      <div className="tufe-open-day-stage" aria-label="天津财经大学2026校园开放日">
        {BACKGROUND_LAYERS.map((layer) => (
          <ImageLayer key={layer[0]} layer={layer} baseUrl={config.assetsBaseUrl} activityKey={activityKey} />
        ))}
        {CONTENT_LAYERS.map((layer, index) => (
          <ImageLayer key={`${layer[0]}-${index}`} layer={layer} baseUrl={config.assetsBaseUrl} activityKey={activityKey} />
        ))}
        <video
          ref={videoRef}
          className="tufe-open-day-video"
          style={layerStyle(48, 614, 653, 374)}
          controls
          controlsList="nodownload"
          playsInline
          webkit-playsinline="true"
          x5-video-player-fullscreen="true"
          x5-video-player-type="h5"
          preload="metadata"
          poster={assetUrl(config.assetsBaseUrl, config.posterImage)}
          src={assetUrl(config.assetsBaseUrl, config.videoFile)}
          aria-label="天津财经大学校园开放日视频"
          onClick={handleVideoClick}
          onPlay={() => setHasVideoStarted(true)}
        />
        {!hasVideoStarted && (
          <button
            type="button"
            className="tufe-open-day-video-play-area"
            style={layerStyle(48, 614, 653, 374)}
            aria-label="播放天津财经大学校园开放日视频"
            onClick={toggleVideoPlayback}
          />
        )}
      </div>
      <div className="tufe-open-day-floating">
        <img src={assetUrl(config.assetsBaseUrl, config.floatingImage)} alt="" />
        <a
          className="tufe-open-day-handbook"
          href="https://book.zjzw.cn/books/xiic/mobile/index.html#p=1"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="打开招生手册"
          onClick={() => trackEvent({
            activityKey,
            eventType: 'external_link_click',
            page: '/tufe-campus-open-day',
            extra: { label: '招生手册', url: 'https://book.zjzw.cn/books/xiic/mobile/index.html#p=1' },
          })}
        />
        <button
          type="button"
          className="tufe-open-day-backtop"
          aria-label="返回页面顶部"
          onClick={() => window.scrollTo({
            top: 0,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          })}
        />
      </div>
    </main>
  )
}
