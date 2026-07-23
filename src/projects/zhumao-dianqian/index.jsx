import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getZhumaoDianqianPublicConfig } from './api'
import {
  assetUrl,
  mergeConfig,
  ZHUMAO_DIANQIAN_ACTIVITY_KEY,
  ZHUMAO_DIANQIAN_ACTIVITY_TYPE,
} from './config'
import './styles.css'

const SWIPE_DISTANCE = 36
const SWITCH_COOLDOWN = 360

function clampPageIndex(index, pageCount) {
  return Math.min(Math.max(index, 0), Math.max(pageCount - 1, 0))
}

export default function ZhumaoDianqianProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || ZHUMAO_DIANQIAN_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const touchStartY = useRef(null)
  const lastSwitchAt = useRef(0)
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig])
  const pageCount = Math.max(Number(config.pageCount) || 1, 1)
  const pageImages = useMemo(
    () => Array.from({ length: pageCount }, (_, index) =>
      assetUrl(config.assetsBaseUrl, `${index + 1}.${config.pageFileExt || 'png'}`),
    ),
    [config.assetsBaseUrl, config.pageFileExt, pageCount],
  )
  const shareActivity = useMemo(() => ({
    ...publicConfig,
    title: publicConfig?.title || '竹茂滇黔 聚力同行',
    shareTitle: publicConfig?.shareTitle || publicConfig?.title || '竹茂滇黔 聚力同行',
    shareImage: publicConfig?.shareImage || pageImages[0],
  }), [pageImages, publicConfig])

  useWechatShare(activityKey, shareActivity)

  useEffect(() => {
    let cancelled = false
    getZhumaoDianqianPublicConfig(activityKey)
      .then((data) => {
        if (!cancelled) setPublicConfig(data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [activityKey])

  useEffect(() => {
    document.title = publicConfig?.title || '竹茂滇黔 聚力同行'
    trackPageView(activityKey, '/zhumao-dianqian', {
      activityType: publicConfig?.type || ZHUMAO_DIANQIAN_ACTIVITY_TYPE,
    })
  }, [activityKey, publicConfig])

  useEffect(() => {
    const nextImage = pageImages[currentIndex + 1]
    if (!nextImage) return
    const image = new Image()
    image.src = nextImage
  }, [currentIndex, pageImages])

  const goToPage = useCallback((nextIndex, source) => {
    const normalizedIndex = clampPageIndex(nextIndex, pageCount)
    if (normalizedIndex === currentIndex) return

    const now = Date.now()
    if (now - lastSwitchAt.current < SWITCH_COOLDOWN) return
    lastSwitchAt.current = now
    setCurrentIndex(normalizedIndex)
    trackEvent({
      activityKey,
      eventType: 'page_change',
      page: '/zhumao-dianqian',
      extra: {
        activityType: ZHUMAO_DIANQIAN_ACTIVITY_TYPE,
        pageNo: normalizedIndex + 1,
        source,
      },
    })
  }, [activityKey, currentIndex, pageCount])

  const switchByDirection = useCallback((direction, source) => {
    goToPage(currentIndex + direction, source)
  }, [currentIndex, goToPage])

  const handleTouchStart = (event) => {
    touchStartY.current = event.touches[0]?.clientY ?? null
  }

  const handleTouchEnd = (event) => {
    if (touchStartY.current === null) return
    const distance = (event.changedTouches[0]?.clientY ?? touchStartY.current) - touchStartY.current
    touchStartY.current = null
    if (Math.abs(distance) < SWIPE_DISTANCE) return
    switchByDirection(distance < 0 ? 1 : -1, 'swipe')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'PageDown') {
      event.preventDefault()
      switchByDirection(1, 'keyboard')
    }
    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault()
      switchByDirection(-1, 'keyboard')
    }
  }

  return (
    <main
      className="zhumao-dianqian-app"
      tabIndex="0"
      aria-label="竹茂滇黔 聚力同行图片画册"
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => { touchStartY.current = null }}
      onWheel={(event) => {
        if (Math.abs(event.deltaY) < SWIPE_DISTANCE) return
        switchByDirection(event.deltaY > 0 ? 1 : -1, 'wheel')
      }}
    >
      <div
        className="zhumao-dianqian-track"
        style={{ transform: `translate3d(0, -${currentIndex * 100}%, 0)` }}
      >
        {pageImages.map((imageUrl, index) => (
          <section className="zhumao-dianqian-slide" key={imageUrl} aria-hidden={index !== currentIndex}>
            <img
              className="zhumao-dianqian-image"
              src={imageUrl}
              alt={`竹茂滇黔 聚力同行，第 ${index + 1} 页`}
              draggable="false"
              fetchPriority={index === 0 ? 'high' : 'auto'}
            />
          </section>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">第 {currentIndex + 1} 页，共 {pageCount} 页</p>
    </main>
  )
}
