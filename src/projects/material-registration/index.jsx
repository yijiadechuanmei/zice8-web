import { useCallback, useEffect, useMemo, useState } from 'react'
import { setToken } from '../../shared/api/request'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import {
  createMaterialRegistrationSubmission,
  getMaterialRegistrationBootstrap,
  getMaterialRegistrationPublicConfig,
  isUnauthorizedError,
  MATERIAL_REGISTRATION_FALLBACK_ASSETS_BASE_URL,
} from './api'
import { findMaterialDocument, MATERIAL_REGISTRATION_DOCUMENTS } from './documents'
import {
  assetUrl,
  MATERIAL_REGISTRATION_ACTIVITY_KEY,
  MATERIAL_REGISTRATION_ACTIVITY_TYPE,
  MATERIAL_REGISTRATION_ASSETS,
} from './materialRegistrationLayout'
import './materialRegistration.css'

const PAGES = {
  HOME: 'home',
  DOCUMENT: 'document',
  FORM: 'form',
  SUCCESS: 'success',
}

const LEGACY_MATERIAL_REGISTRATION_ACTIVITY_KEYS = new Set([
  'material_community_registration_20260630',
])

const MATERIAL_REGISTRATION_SHARE_DEFAULTS = {
  title: '“真材实料筑基强国”育人共同体成立大会',
}

const MATERIAL_REGISTRATION_HOTEL = {
  name: '武汉雄楚国际大酒店',
  latitude: 30.510226,
  longitude: 114.361409,
  address: '湖北省武汉市洪山区雄楚大道335号',
}

const DEFAULT_FORM_OPTIONS = {
  accommodationDates: [
    { label: '6月29日', value: '2026-06-29' },
    { label: '6月30日', value: '2026-06-30' },
  ],
  hotels: ['武汉雄楚国际大酒店'],
  halalMeal: ['是', '否'],
}

const initialForm = {
  unitName: '',
  attendees: [{ name: '', position: '', phone: '' }],
  contactUnitName: '',
  needAccommodation: '',
  accommodationDates: [],
  hotel: '武汉雄楚国际大酒店',
  halalMeal: '',
  materialOpinion: '',
}

export default function MaterialRegistrationApp({ routeParams }) {
  const requestedActivityKey = routeParams?.activityKey || getQueryParam('activity_key')
  const shouldRedirectToCanonical =
    LEGACY_MATERIAL_REGISTRATION_ACTIVITY_KEYS.has(requestedActivityKey) ||
    window.location.pathname.startsWith('/material-registration/')
  const tokenFromUrl = getTokenFromUrl()
  if (tokenFromUrl) {
    setToken(tokenFromUrl)
  }

  if (shouldRedirectToCanonical) {
    const canonicalUrl = new URL(window.location.href)
    canonicalUrl.pathname = `/${MATERIAL_REGISTRATION_ACTIVITY_TYPE}/${MATERIAL_REGISTRATION_ACTIVITY_KEY}`
    canonicalUrl.searchParams.delete('activity_key')
    canonicalUrl.searchParams.delete('token')
    canonicalUrl.searchParams.delete('code')
    canonicalUrl.searchParams.delete('state')
    window.location.replace(canonicalUrl.toString())
    return null
  }

  if (tokenFromUrl) {
    window.location.replace(sanitizeUrlForWechat(window.location.href))
    return null
  }

  return <MaterialRegistrationMain routeParams={routeParams} />
}

function MaterialRegistrationMain({ routeParams }) {
  const activityKey =
    routeParams?.activityKey ||
    getQueryParam('activity_key') ||
    MATERIAL_REGISTRATION_ACTIVITY_KEY
  const [page, setPage] = useState(PAGES.HOME)
  const [activeDocumentId, setActiveDocumentId] = useState('')
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [agreeChecked, setAgreeChecked] = useState(false)
  const [disagreeChecked, setDisagreeChecked] = useState(false)
  const [form, setForm] = useState(initialForm)
  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, publicConfig)
  const activityKeyMissing = !activityKey

  const assetsBaseUrl = bootstrap?.assetsBaseUrl || MATERIAL_REGISTRATION_FALLBACK_ASSETS_BASE_URL
  const apiDocuments = Array.isArray(bootstrap?.documents) ? bootstrap.documents : []
  const documents = apiDocuments.length
    ? MATERIAL_REGISTRATION_DOCUMENTS.map((document) => {
        const matched = apiDocuments.find((item) => item.id === document.id)
        return matched ? { ...document, title: matched.title || document.title } : document
      })
    : MATERIAL_REGISTRATION_DOCUMENTS
  const formOptions = bootstrap?.formOptions || DEFAULT_FORM_OPTIONS
  const activeDocument = findMaterialDocument(activeDocumentId)
  const showBlockedState = Boolean(blockedMessage)
  const shareActivity = useMemo(() => {
    if (!publicConfig) return null
    const shareAssetsBaseUrl =
      publicConfig?.mobileConfig?.assetsBaseUrl ||
      bootstrap?.assetsBaseUrl ||
      MATERIAL_REGISTRATION_FALLBACK_ASSETS_BASE_URL

    return {
      ...publicConfig,
      shareTitle:
        publicConfig.shareTitle ||
        publicConfig.title ||
        MATERIAL_REGISTRATION_SHARE_DEFAULTS.title,
      shareDesc: publicConfig.shareDesc ?? '',
      shareImage:
        publicConfig.shareImage ||
        assetUrl(shareAssetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.homeTitle),
    }
  }, [bootstrap?.assetsBaseUrl, publicConfig])

  const handleWechatShareStatus = useCallback((status) => {
    if (
      status?.wxConfigStatus === 'failed' ||
      status?.signatureStatus === 'failed' ||
      status?.wxScriptLoadStatus === 'failed'
    ) {
      console.warn('[material-registration-share] setup failed', status)
    }
  }, [])

  useWechatShare(activityKey, shareActivity, handleWechatShareStatus)

  useEffect(() => {
    if (!activityKey) return

    let cancelled = false
    getMaterialRegistrationPublicConfig(activityKey)
      .then((data) => {
        if (cancelled) return
        setPublicConfig(data)
        document.title = data?.title || '参会信息提交'
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || '活动加载失败')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activityKey])

  useEffect(() => {
    if (!publicConfig || !authReady) return

    let cancelled = false
    getMaterialRegistrationBootstrap(activityKey)
      .then((data) => {
        if (cancelled) return
        setBootstrap(data)
        document.title = data?.activityName || publicConfig?.title || '参会信息提交'
        setPage(data?.hasSubmitted ? PAGES.SUCCESS : PAGES.HOME)
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        if (isUnauthorizedError(err)) {
          if (reauth('material-registration-bootstrap')) return
          setError(err?.message || '活动加载失败')
          return
        }
        setError(err?.message || '活动加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activityKey, authReady, publicConfig, reauth])

  useEffect(() => {
    if (!activityKey) return
    trackPageView(activityKey, '/material-registration', {
      activityType: MATERIAL_REGISTRATION_ACTIVITY_TYPE,
      pageKey: page,
    })
  }, [activityKey, page])

  function showMessage(text) {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 2200)
  }

  function openDocument(documentId) {
    setActiveDocumentId(documentId)
    setPage(PAGES.DOCUMENT)
    trackEvent({
      activityKey,
      eventType: 'material_document_open',
      page: '/material-registration',
      extra: { activityType: MATERIAL_REGISTRATION_ACTIVITY_TYPE, documentId },
    })
  }

  function handleAgree() {
    setAgreeChecked(true)
    setDisagreeChecked(false)
    setPage(PAGES.FORM)
  }

  function handleDisagree() {
    setAgreeChecked(false)
    setDisagreeChecked(true)
  }

  function updateForm(field, value) {
    setForm((current) => {
      if (field === 'unitName') {
        return { ...current, unitName: value, contactUnitName: value }
      }
      return { ...current, [field]: value }
    })
  }

  function updateAttendee(index, field, value) {
    setForm((current) => ({
      ...current,
      attendees: current.attendees.map((attendee, attendeeIndex) =>
        attendeeIndex === index ? { ...attendee, [field]: value } : attendee,
      ),
    }))
  }

  function addAttendee() {
    setForm((current) => ({
      ...current,
      attendees: [...current.attendees, { name: '', position: '', phone: '' }],
    }))
  }

  function removeAttendee(index) {
    setForm((current) => {
      if (current.attendees.length <= 1) return current
      return {
        ...current,
        attendees: current.attendees.filter((_, attendeeIndex) => attendeeIndex !== index),
      }
    })
  }

  function toggleAccommodationDate(value) {
    setForm((current) => {
      const selected = new Set(current.accommodationDates)
      if (selected.has(value)) selected.delete(value)
      else selected.add(value)
      return { ...current, accommodationDates: Array.from(selected) }
    })
  }

  function openHotelLocation() {
    const openTencentMap = () => {
      const { latitude, longitude, name, address } = MATERIAL_REGISTRATION_HOTEL
      const marker = [
        `coord:${latitude},${longitude}`,
        `title:${encodeURIComponent(name)}`,
        `addr:${encodeURIComponent(address)}`,
        'zoom:18',
      ].join(';')
      window.location.href = `https://apis.map.qq.com/uri/v1/marker?marker=${marker}&referer=zice8`
    }

    const wx = window.wx
    if (wx && typeof wx.ready === 'function' && typeof wx.openLocation === 'function') {
      let handledByWechat = false
      const fallbackTimer = window.setTimeout(() => {
        if (!handledByWechat) openTencentMap()
      }, 1200)
      wx.ready(() => {
        handledByWechat = true
        window.clearTimeout(fallbackTimer)
        try {
          wx.openLocation({
            latitude: MATERIAL_REGISTRATION_HOTEL.latitude,
            longitude: MATERIAL_REGISTRATION_HOTEL.longitude,
            name: MATERIAL_REGISTRATION_HOTEL.name,
            address: MATERIAL_REGISTRATION_HOTEL.address,
            scale: 28,
          })
        } catch {
          openTencentMap()
        }
      })
      return
    }

    openTencentMap()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const validationMessage = validateForm(form)
    if (validationMessage) {
      showMessage(validationMessage)
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        contactUnitName: form.contactUnitName || form.unitName,
        needAccommodation: form.needAccommodation === '是',
        accommodationDates: form.needAccommodation === '是' ? form.accommodationDates : [],
        hotel: form.needAccommodation === '是' ? '武汉雄楚国际大酒店' : '',
        attendees: form.attendees
          .map((attendee) => ({
            name: attendee.name.trim(),
            position: attendee.position.trim(),
            phone: attendee.phone.trim(),
          }))
          .filter((attendee) => attendee.name || attendee.position || attendee.phone),
        materialOpinion: form.materialOpinion.trim(),
      }
      const result = await createMaterialRegistrationSubmission(activityKey, payload)
      setBootstrap((current) => ({
        ...(current || {}),
        hasSubmitted: true,
        submission: result?.submission || null,
      }))
      setPage(PAGES.SUCCESS)
      trackEvent({
        activityKey,
        eventType: 'material_registration_submit',
        page: '/material-registration',
        extra: { activityType: MATERIAL_REGISTRATION_ACTIVITY_TYPE, result: 'success' },
      })
    } catch (err) {
      showMessage(err?.message || '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const pageClass = `material-registration-app material-registration-page-${page}`
  const showEntryLoading = loading && !bootstrap && !error && !showBlockedState
  const showTopLoading = loading && !showEntryLoading && !showBlockedState

  if (showBlockedState) {
    return <MaterialRegistrationBlocked message={blockedMessage} />
  }

  return (
    <main
      className={pageClass}
      style={{
        '--material-registration-bg': `url("${assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.background)}")`,
        backgroundImage: `url("${assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.background)}")`,
      }}
    >
      <div className="material-registration-stage">
        {showEntryLoading && (
          <div className="material-registration-entry-loading" aria-label="加载中">
            <div className="material-registration-loading-panel">
              <div className="material-registration-loading-track">
                <span className="material-registration-loading-bar" />
              </div>
            </div>
          </div>
        )}
        {showTopLoading && (
          <div className="material-registration-loading" aria-label="加载中">
            <span className="material-registration-loading-spinner" />
          </div>
        )}
        {(activityKeyMissing || error || blockedMessage) && <div className="material-registration-error">{activityKeyMissing ? '缺少活动路径参数' : (error || blockedMessage)}</div>}
        {message && <div className="material-registration-toast">{message}</div>}

        {page === PAGES.HOME && (
          <HomePage
            assetsBaseUrl={assetsBaseUrl}
            documents={documents}
            agreeChecked={agreeChecked}
            disagreeChecked={disagreeChecked}
            onOpenDocument={openDocument}
            onAgree={handleAgree}
            onDisagree={handleDisagree}
          />
        )}
        {page === PAGES.DOCUMENT && (
          <DocumentPage
            document={activeDocument}
            onBack={() => setPage(PAGES.HOME)}
          />
        )}
        {page === PAGES.FORM && (
          <FormPage
            assetsBaseUrl={assetsBaseUrl}
            form={form}
            formOptions={formOptions}
            submitting={submitting}
            onBack={() => setPage(PAGES.HOME)}
            onUpdate={updateForm}
            onUpdateAttendee={updateAttendee}
            onAddAttendee={addAttendee}
            onRemoveAttendee={removeAttendee}
            onToggleAccommodationDate={toggleAccommodationDate}
            onOpenHotelLocation={openHotelLocation}
            onSubmit={handleSubmit}
          />
        )}
        {page === PAGES.SUCCESS && <SuccessPage assetsBaseUrl={assetsBaseUrl} />}
      </div>
    </main>
  )
}

function MaterialRegistrationBlocked({ message }) {
  return (
    <main className="material-registration-blocked" aria-label={message || '访问受限'}>
      <div className="material-registration-blocked-card">
        <h1>{message || '访问受限'}</h1>
      </div>
    </main>
  )
}

function HomePage({
  assetsBaseUrl,
  documents,
  agreeChecked,
  disagreeChecked,
  onOpenDocument,
  onAgree,
  onDisagree,
}) {
  return (
    <>
      <img
        className="material-registration-home-logo"
        src={assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.homeLogo)}
        alt=""
        aria-hidden="true"
      />
      <img
        className="material-registration-home-title"
        src={assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.homeTitle)}
        alt="真材实料 筑基强国"
      />
      <section className="material-registration-document-list" aria-label="会议材料">
        {documents.map((document, index) => (
          <button
            key={document.id}
            type="button"
            className="material-registration-document-button"
            onClick={() => onOpenDocument(document.id)}
          >
            <span className="material-registration-document-icon">
              <img
                className="material-registration-svg-icon material-registration-svg-icon-white"
                src={assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.documentIcons[index])}
                alt=""
                aria-hidden="true"
              />
            </span>
            <span className="material-registration-document-title">{document.title}</span>
            <img
              className="material-registration-arrow-icon"
              src={assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.checkIcon)}
              alt=""
              aria-hidden="true"
            />
          </button>
        ))}
        <AgreementButton checked={agreeChecked} label="同意，并提交参会人员信息" onClick={onAgree} />
        <AgreementButton checked={disagreeChecked} label="不同意" onClick={onDisagree} />
      </section>
    </>
  )
}

function AgreementButton({ checked, label, onClick }) {
  return (
    <button type="button" className="material-registration-agreement" onClick={onClick}>
      <span className={`material-registration-checkbox${checked ? ' is-checked' : ''}`}>
        {checked ? '✓' : ''}
      </span>
      <span>{label}</span>
    </button>
  )
}

function DocumentPage({ document, onBack }) {
  return (
    <>
      <h1 className="material-registration-page-title material-registration-document-heading">
        {document?.title || '会议材料'}
      </h1>
      <article className="material-registration-card material-registration-rich-card">
        <section
          className="material-registration-rich-text"
          dangerouslySetInnerHTML={{ __html: document?.html || '' }}
        />
      </article>
      <button type="button" className="material-registration-document-back-button" onClick={onBack}>
        返回
      </button>
    </>
  )
}

function FormPage({
  assetsBaseUrl,
  form,
  formOptions,
  submitting,
  onBack,
  onUpdate,
  onUpdateAttendee,
  onAddAttendee,
  onRemoveAttendee,
  onToggleAccommodationDate,
  onOpenHotelLocation,
  onSubmit,
}) {
  return (
    <>
      <BackButton assetsBaseUrl={assetsBaseUrl} onClick={onBack} />
      <h1 className="material-registration-page-title material-registration-form-heading">
        参会信息
      </h1>
      <form className="material-registration-card material-registration-form-card" onSubmit={onSubmit}>
        <Field label="单位名称">
          <input value={form.unitName} onChange={(event) => onUpdate('unitName', event.target.value)} />
        </Field>
        <div className="material-registration-field">
          <label>参会人</label>
          <div className="material-registration-attendees">
            {form.attendees.map((attendee, index) => (
              <div className="material-registration-attendee-row" key={`attendee-${index}`}>
                <div className="material-registration-attendee-fields">
                  <input
                    value={attendee.name}
                    onChange={(event) => onUpdateAttendee(index, 'name', event.target.value)}
                    placeholder={`参会人 ${index + 1} 姓名`}
                  />
                  <input
                    value={attendee.position}
                    onChange={(event) => onUpdateAttendee(index, 'position', event.target.value)}
                    placeholder="职务"
                  />
                  <input
                    type="tel"
                    value={attendee.phone}
                    onChange={(event) => onUpdateAttendee(index, 'phone', event.target.value)}
                    inputMode="tel"
                    placeholder="联系方式"
                  />
                </div>
                <button
                  type="button"
                  className="material-registration-icon-button"
                  onClick={() => onRemoveAttendee(index)}
                  disabled={form.attendees.length <= 1}
                  aria-label="删除参会人"
                >
                  -
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="material-registration-add-button" onClick={onAddAttendee}>
            + 添加参会人
          </button>
        </div>
        <RadioGroup
          label="是否需要安排住宿"
          value={form.needAccommodation}
          options={['是', '否']}
          onChange={(value) => onUpdate('needAccommodation', value)}
        />
        {form.needAccommodation === '是' && (
          <div className="material-registration-field">
            <label>住宿时间</label>
            <div className="material-registration-choice-row">
              {formOptions.accommodationDates.map((item) => (
                <label className="material-registration-choice" key={item.value}>
                  <input
                    type="checkbox"
                    checked={form.accommodationDates.includes(item.value)}
                    onChange={() => onToggleAccommodationDate(item.value)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="material-registration-hotel-button"
              onClick={onOpenHotelLocation}
              aria-label={`${MATERIAL_REGISTRATION_HOTEL.name}导航`}
            >
              <span>{MATERIAL_REGISTRATION_HOTEL.name}</span>
              <NavigationIcon />
            </button>
          </div>
        )}
        <RadioGroup
          label="清真餐"
          value={form.halalMeal}
          options={formOptions.halalMeal}
          onChange={(value) => onUpdate('halalMeal', value)}
        />
        <Field label="对上述会议材料的相关意见（选填）">
          <textarea
            value={form.materialOpinion}
            onChange={(event) => onUpdate('materialOpinion', event.target.value)}
            rows={4}
            placeholder="如有意见或建议，请填写"
          />
        </Field>
        <button type="submit" className="material-registration-submit-button" disabled={submitting}>
          {submitting ? '提交中...' : '提交报名'}
        </button>
      </form>
    </>
  )
}

function Field({ label, children }) {
  return (
    <div className="material-registration-field">
      <label>{label}</label>
      {children}
    </div>
  )
}

function RadioGroup({ label, value, options, onChange }) {
  return (
    <div className="material-registration-field">
      <label>{label}</label>
      <div className="material-registration-choice-row">
        {options.map((option) => (
          <label className="material-registration-choice" key={option}>
            <input
              type="radio"
              checked={value === option}
              onChange={() => onChange(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function BackButton({ assetsBaseUrl, onClick }) {
  return (
    <button type="button" className="material-registration-back-button" onClick={onClick} aria-label="返回">
      <img
        className="material-registration-svg-icon material-registration-svg-icon-white"
        src={assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.backIcon)}
        alt=""
        aria-hidden="true"
      />
    </button>
  )
}

function SuccessPage({ assetsBaseUrl }) {
  return (
    <img
      className="material-registration-success-image"
      src={assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.successTitle)}
      alt="报名成功"
    />
  )
}

function NavigationIcon() {
  return (
    <svg
      className="material-registration-navigation-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12.6 21.2c-.8 0-1.2-.6-1.3-1.2l-1.1-6.3-6.1-2.1c-.6-.2-1-.7-1-1.4s.4-1.2 1-1.4L19.4 3c.6-.2 1.2-.1 1.6.4.4.4.5 1 .3 1.6l-5.8 15.3c-.2.6-.7.9-1.3.9-.5 0-.9-.2-1.2-.6l-2.8-3.3-3.1 2.7c-.1.1-.3.2-.5.2Zm-6.3-11 5.3 1.8c.5.2.8.6.9 1.1l.9 5 4.9-13-12 5.1Z" />
    </svg>
  )
}

function validateForm(form) {
  if (!form.unitName.trim()) return '请填写单位名称'
  const attendees = form.attendees.map((attendee) => ({
    name: attendee.name.trim(),
    position: attendee.position.trim(),
    phone: attendee.phone.trim(),
  }))
  const filledAttendees = attendees.filter((attendee) => attendee.name || attendee.position || attendee.phone)
  if (!filledAttendees.length) return '请至少填写一位参会人的姓名、职务、联系方式'
  const incompleteIndex = attendees.findIndex((attendee) => {
    if (!attendee.name && !attendee.position && !attendee.phone) return false
    return !attendee.name || !attendee.position || !attendee.phone
  })
  if (incompleteIndex >= 0) return `请完整填写第 ${incompleteIndex + 1} 位参会人的姓名、职务、联系方式`
  const invalidPhoneIndex = filledAttendees.findIndex((attendee) => (
    !/^1\d{10}$/.test(attendee.phone) &&
    !/^0\d{2,3}-?\d{7,8}(-\d{1,6})?$/.test(attendee.phone)
  ))
  if (invalidPhoneIndex >= 0) {
    return `第 ${invalidPhoneIndex + 1} 位参会人的联系方式格式不合法`
  }
  if (!form.needAccommodation) return '请选择是否需要安排住宿'
  if (form.needAccommodation === '是' && !form.accommodationDates.length) return '请选择住宿时间'
  if (!form.halalMeal) return '请选择清真餐是/否'
  return ''
}
