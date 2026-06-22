import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { activityAudioService } from '../../shared/audio/activityAudioService'
import ActivityBgmPlayer from '../../shared/components/ActivityBgmPlayer'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam } from '../../shared/utils/url'
import { getTjrcbPensionManualPublicConfig } from './api'
import {
  buildIndexedAssetUrl,
  manualAssetUrl,
  mergeManualConfig,
  TJRCB_PENSION_MANUAL_ACTIVITY_KEY,
  TJRCB_PENSION_MANUAL_ACTIVITY_TYPE,
} from './config'
import './styles.css'

function ChevronIcon({ direction }) {
  const points = direction === 'prev' ? '15.5 4.5 8 12 15.5 19.5' : '8.5 4.5 16 12 8.5 19.5'

  return (
    <svg className="tjrcb-pension-manual-chevron" viewBox="0 0 24 24" aria-hidden="true">
      <polyline points={points} />
    </svg>
  )
}

function clampPageIndex(index, pageCount) {
  return Math.min(Math.max(Number(index) || 0, 0), Math.max(pageCount - 1, 0))
}

function normalizePageNumber(page, pageCount) {
  return clampPageIndex((Number(page) || 1) - 1, pageCount)
}

export default function TjrcbPensionManualApp({ routeParams }) {
  const activityKey =
    routeParams?.activityKey ||
    getQueryParam('activity_key') ||
    TJRCB_PENSION_MANUAL_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef(null)
  const { authReady, blockedMessage } = useWechatAuth(activityKey, publicConfig)

  const manualConfig = useMemo(() => mergeManualConfig(publicConfig), [publicConfig])
  const pageCount = Math.max(Number(manualConfig.pageCount) || 1, 1)
  const safeCurrentIndex = clampPageIndex(currentIndex, pageCount)
  const pageImages = useMemo(
    () =>
      Array.from({ length: pageCount }, (_, index) =>
        manualConfig.pageImages?.[index] ||
        buildIndexedAssetUrl(
          manualConfig.pagesBaseUrl,
          index,
          manualConfig.pageFilePadding,
          manualConfig.pageFileExt,
        ),
      ),
    [manualConfig, pageCount],
  )
  const audioUrls = useMemo(
    () =>
      Array.from({ length: pageCount }, (_, index) =>
        manualConfig.audioUrls?.[index] ||
        buildIndexedAssetUrl(
          manualConfig.audiosBaseUrl,
          index,
          manualConfig.audioFilePadding,
          manualConfig.audioFileExt,
        ),
      ),
    [manualConfig, pageCount],
  )
  const shareActivity = useMemo(() => {
    if (!publicConfig) return null
    return {
      ...publicConfig,
      shareTitle: publicConfig.shareTitle || publicConfig.title,
      shareImage:
        publicConfig.shareImage ||
        manualAssetUrl(manualConfig.assetsBaseUrl, manualConfig.logoImage),
    }
  }, [manualConfig, publicConfig])
  const bgmConfig = publicConfig?.bgmConfig || publicConfig?.mobileConfig?.bgm

  useWechatShare(activityKey, shareActivity)

  useEffect(() => {
    if (!activityKey) return

    let cancelled = false
    getTjrcbPensionManualPublicConfig(activityKey)
      .then((data) => {
        if (cancelled) return
        setPublicConfig(data)
        document.title = data?.title || '天津农商银行养老金融服务手册'
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || '项目加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activityKey])

  useEffect(() => {
    if (!activityKey) return
    trackPageView(activityKey, '/tjrcb-pension-manual', {
      activityType: TJRCB_PENSION_MANUAL_ACTIVITY_TYPE,
    })
  }, [activityKey])

  useEffect(() => {
    if (!bgmConfig?.enabled || !bgmConfig?.url) return
    activityAudioService.setConfig(bgmConfig, { activityKey })
  }, [activityKey, bgmConfig])

  const playAudioAt = useCallback(
    async (index) => {
      const audio = audioRef.current
      const src = audioUrls[index]
      if (!audio || !src) return

      if (audio.src !== src) {
        audio.src = src
      }
      audio.currentTime = 0

      try {
        await audio.play()
        setAudioPlaying(true)
      } catch {
        setAudioPlaying(false)
      }
    },
    [audioUrls],
  )

  function goToIndex(nextIndex, source) {
    const normalized = clampPageIndex(nextIndex, pageCount)
    setCurrentIndex(normalized)
    playAudioAt(normalized)
    trackEvent({
      activityKey,
      eventType: 'manual_page_change',
      page: '/tjrcb-pension-manual',
      extra: {
        activityType: TJRCB_PENSION_MANUAL_ACTIVITY_TYPE,
        pageNo: normalized + 1,
        source,
      },
    })
  }

  function toggleAudio() {
    const audio = audioRef.current
    if (!audio) return

    if (audioPlaying) {
      audio.pause()
      setAudioPlaying(false)
      return
    }

    playAudioAt(safeCurrentIndex)
  }

  const backgroundUrl = manualAssetUrl(manualConfig.assetsBaseUrl, manualConfig.backgroundImage)
  const logoUrl = manualAssetUrl(manualConfig.assetsBaseUrl, manualConfig.logoImage)
  const titleUrl = manualAssetUrl(manualConfig.assetsBaseUrl, manualConfig.titleImage)
  const showLoading = loading || (publicConfig && !authReady && !blockedMessage)

  if (blockedMessage) {
    return (
      <main className="tjrcb-pension-manual-state">
        <div className="tjrcb-pension-manual-state__card">{blockedMessage}</div>
      </main>
    )
  }

  return (
    <main
      className="tjrcb-pension-manual-app"
      style={{ '--tjrcb-manual-bg': `url("${backgroundUrl}")` }}
    >
      <div className="tjrcb-pension-manual-stage" aria-label="天津农商银行养老金融服务手册">
        {showLoading ? <div className="tjrcb-pension-manual-loading" aria-label="加载中" /> : null}
        {error ? <div className="tjrcb-pension-manual-error">{error}</div> : null}

        <img className="tjrcb-pension-manual-logo" src={logoUrl} alt="天津农商银行" />
        <img
          className="tjrcb-pension-manual-title"
          src={titleUrl}
          alt="天津农商银行养老金融服务手册"
        />

        <section className="tjrcb-pension-manual-carousel" aria-label="电子画册">
          <div
            className="tjrcb-pension-manual-carousel__track"
            style={{ transform: `translate3d(-${safeCurrentIndex * 100}%, 0, 0)` }}
          >
            {pageImages.map((src, index) => (
              <div className="tjrcb-pension-manual-carousel__item" key={src || index}>
                <img src={src} alt={`养老金融服务手册第 ${index + 1} 页`} />
              </div>
            ))}
          </div>
        </section>

        <button
          type="button"
          className="tjrcb-pension-manual-audio-button"
          onClick={toggleAudio}
        >
          {manualConfig.audioLabel || '语音讲解'}
        </button>
        <button
          type="button"
          className="tjrcb-pension-manual-icon-button tjrcb-pension-manual-icon-button--prev"
          onClick={() => goToIndex(safeCurrentIndex - 1, 'prev')}
          aria-label="上一页"
        >
          <ChevronIcon direction="prev" />
        </button>
        <button
          type="button"
          className="tjrcb-pension-manual-icon-button tjrcb-pension-manual-icon-button--next"
          onClick={() => goToIndex(safeCurrentIndex + 1, 'next')}
          aria-label="下一页"
        >
          <ChevronIcon direction="next" />
        </button>

        <nav className="tjrcb-pension-manual-category-row" aria-label="画册分类">
          {(manualConfig.categories || []).map((category) => (
            <button
              type="button"
              key={category.label}
              onClick={() => goToIndex(normalizePageNumber(category.page, pageCount), category.label)}
            >
              {category.label}
            </button>
          ))}
        </nav>

        <audio
          ref={audioRef}
          preload="none"
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
          onEnded={() => setAudioPlaying(false)}
        />
      </div>
      {bgmConfig?.showControl !== false ? (
        <ActivityBgmPlayer bgm={bgmConfig} activityKey={activityKey} />
      ) : null}
    </main>
  )
}
