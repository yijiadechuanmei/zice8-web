import { useEffect, useMemo, useState } from 'react'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getXiwuqi99RoadNightPublicConfig } from './api'
import {
  assetUrl,
  mergeConfig,
  XIWUQI_99_ROAD_NIGHT_ACTIVITY_KEY,
  XIWUQI_99_ROAD_NIGHT_ACTIVITY_TYPE,
} from './config'
import './styles.css'

const AD_PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'source',
  'campaign',
  'creative_id',
]

function collectAdAttribution() {
  const params = new URLSearchParams(window.location.search)
  const attribution = {}
  AD_PARAM_KEYS.forEach((key) => {
    const value = params.get(key)?.trim()
    if (value) attribution[key] = value.slice(0, 100)
  })
  if (params.get('utm_source') || params.get('source')) {
    attribution.adSource = (params.get('utm_source') || params.get('source')).trim().slice(0, 100)
  }
  return attribution
}

export default function Xiwuqi99RoadNightProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || XIWUQI_99_ROAD_NIGHT_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig])
  const imageUrl = assetUrl(config.assetsBaseUrl, config.imageFile)
  const adAttribution = useMemo(() => collectAdAttribution(), [])

  useWechatShare(activityKey, publicConfig)

  useEffect(() => {
    let cancelled = false
    getXiwuqi99RoadNightPublicConfig(activityKey)
      .then((data) => {
        if (!cancelled) setPublicConfig(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activityKey])

  useEffect(() => {
    document.title = publicConfig?.title || '西乌旗99号公路之夜'
    trackPageView(activityKey, '/xiwuqi-99-road-night', {
      activityType: publicConfig?.type || XIWUQI_99_ROAD_NIGHT_ACTIVITY_TYPE,
      ...adAttribution,
    })
  }, [activityKey, adAttribution, publicConfig])

  return (
    <main className="xiwuqi-road-night-app">
      <a
        className="xiwuqi-road-night-link"
        href={config.targetUrl}
        aria-label="打开西乌旗99号公路之夜抖音视频"
        onClick={() => {
          trackEvent({
            activityKey,
            eventType: 'external_link_click',
            page: '/xiwuqi-99-road-night',
            extra: { label: '抖音视频', url: config.targetUrl, ...adAttribution },
          })
        }}
      >
        <img
          className="xiwuqi-road-night-image"
          src={imageUrl}
          alt={config.imageAlt}
          draggable="false"
        />
      </a>
    </main>
  )
}
