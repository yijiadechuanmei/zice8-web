import { trackEvent, trackPageView } from '../../shared/analytics'

const ACTIVITY_KEY = 'tianfu_new_district_reading_20260927'

export function trackReadingEvent(eventType, extra = {}) {
  trackEvent({ activityKey: ACTIVITY_KEY, eventType, page: '/tianfu-reading', extra })
}

export function trackReadingVisit() {
  // One outer-page PV, not one PV for every scene inside the activity.
  trackPageView(ACTIVITY_KEY, '/tianfu-reading')
}

export function readingSceneEvent(stage, point, book, region) {
  if (stage === 'catalog') return { eventType: 'tianfu_catalog_view', extra: {} }
  if (['map', 'xinglong-lake', 'haichuang-park'].includes(stage)) {
    return { eventType: 'tianfu_map_view', extra: { region: stage } }
  }
  if (stage === 'review') return { eventType: 'tianfu_review_view', extra: { region } }
  const extra = { region, pointId: point.id, pointTitle: point.name }
  if (stage === 'detail') return { eventType: 'tianfu_point_view', extra }
  if (stage === 'book-reason') return { eventType: 'tianfu_book_view', extra: { ...extra, bookTitle: book.title } }
  return null
}
