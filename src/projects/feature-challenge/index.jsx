import { useEffect, useMemo, useState } from 'react'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getFeatureChallengePublicConfig } from './api'
import {
  assetUrl,
  FEATURE_CHALLENGE_ACTIVITY_KEY,
  FEATURE_CHALLENGE_ACTIVITY_TYPE,
  mergeConfig,
} from './config'
import './styles.css'

export default function FeatureChallengeProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || FEATURE_CHALLENGE_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig])

  useWechatShare(activityKey, publicConfig)

  useEffect(() => {
    let cancelled = false
    getFeatureChallengePublicConfig(activityKey)
      .then((data) => {
        if (!cancelled) setPublicConfig(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activityKey])

  useEffect(() => {
    document.title = publicConfig?.title || '特征闯关 双关挑战'
    trackPageView(activityKey, '/feature-challenge', {
      activityType: publicConfig?.type || FEATURE_CHALLENGE_ACTIVITY_TYPE,
      pageKey: 'home',
    })
  }, [activityKey, publicConfig])

  function handleStart() {
    trackEvent({
      activityKey,
      eventType: 'enter_activity',
      page: '/feature-challenge',
      extra: {
        activityType: publicConfig?.type || FEATURE_CHALLENGE_ACTIVITY_TYPE,
        pageKey: 'home',
        eventName: 'start_challenge',
      },
    })
  }

  return <HomePage config={config} onStart={handleStart} />
}

function HomePage({ config, onStart }) {
  const assets = {
    background: assetUrl(config.assetsBaseUrl, config.homeBackgroundImage),
    divider: assetUrl(config.assetsBaseUrl, config.homeDividerImage),
    button: assetUrl(config.assetsBaseUrl, config.homeButtonImage),
    title: assetUrl(config.assetsBaseUrl, config.homeTitleImage),
    illustration: assetUrl(config.assetsBaseUrl, config.homeIllustrationImage),
  }

  return (
    <main className="feature-challenge-app">
      <section className="feature-challenge-home" aria-label="特征闯关 双关挑战首页">
        <div className="feature-challenge-stage">
          <StageImage className="feature-challenge-background" src={assets.background} alt="" />
          <StageImage className="feature-challenge-title" src={assets.title} alt="特征闯关 双关挑战" />
          <StageImage className="feature-challenge-illustration" src={assets.illustration} alt="" />
          <StageImage className="feature-challenge-divider" src={assets.divider} alt="" />
          <button className="feature-challenge-start" type="button" onClick={onStart} aria-label="开始闯关">
            <img src={assets.button} alt="开始闯关" />
          </button>
        </div>
      </section>
    </main>
  )
}

function StageImage({ className, src, alt }) {
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      onError={(event) => {
        event.currentTarget.style.display = 'none'
      }}
    />
  )
}
