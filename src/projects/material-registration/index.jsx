import { useEffect, useState } from 'react'
import { setToken } from '../../shared/api/request'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import {
  createMaterialRegistrationSubmission,
  getMaterialRegistrationBootstrap,
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

const DEFAULT_FORM_OPTIONS = {
  unitTypes: ['高等学校', '中小学校', '科研院所', '行业企业', '行业协会', '地方政府', '其他'],
  genders: ['男', '女'],
  accommodationDates: [
    { label: '6月29日', value: '2026-06-29' },
    { label: '6月30日', value: '2026-06-30' },
  ],
  hotels: ['雄楚国际大酒店'],
  halalMeal: ['是', '否'],
}

const initialForm = {
  unitName: '',
  unitType: '',
  attendees: [{ name: '' }],
  contactUnitName: '',
  position: '',
  phone: '',
  gender: '',
  needAccommodation: '',
  accommodationDates: [],
  hotel: '雄楚国际大酒店',
  halalMeal: '',
}

export default function MaterialRegistrationApp({ routeParams }) {
  const tokenFromUrl = getTokenFromUrl()
  if (tokenFromUrl) {
    setToken(tokenFromUrl)
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
  const [bootstrap, setBootstrap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [agreeChecked, setAgreeChecked] = useState(false)
  const [disagreeChecked, setDisagreeChecked] = useState(false)
  const [form, setForm] = useState(initialForm)

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

  useEffect(() => {
    let cancelled = false
    getMaterialRegistrationBootstrap(activityKey)
      .then((data) => {
        if (cancelled) return
        setBootstrap(data)
        document.title = data?.activityName || '参会信息提交'
        setPage(data?.hasSubmitted ? PAGES.SUCCESS : PAGES.HOME)
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err?.message || '活动加载失败')
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
      if (field === 'unitName' && !current.contactUnitName) {
        return { ...current, unitName: value, contactUnitName: value }
      }
      return { ...current, [field]: value }
    })
  }

  function updateAttendee(index, value) {
    setForm((current) => ({
      ...current,
      attendees: current.attendees.map((attendee, attendeeIndex) =>
        attendeeIndex === index ? { ...attendee, name: value } : attendee,
      ),
    }))
  }

  function addAttendee() {
    setForm((current) => ({
      ...current,
      attendees: [...current.attendees, { name: '' }],
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
        needAccommodation: form.needAccommodation === '是',
        accommodationDates: form.needAccommodation === '是' ? form.accommodationDates : [],
        hotel: form.needAccommodation === '是' ? '雄楚国际大酒店' : '',
        attendees: form.attendees
          .map((attendee) => ({ name: attendee.name.trim() }))
          .filter((attendee) => attendee.name),
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

  return (
    <main
      className={pageClass}
      style={{ backgroundImage: `url("${assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.background)}")` }}
    >
      <div className="material-registration-stage">
        {loading && <div className="material-registration-loading">加载中...</div>}
        {error && <div className="material-registration-error">{error}</div>}
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
            assetsBaseUrl={assetsBaseUrl}
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
            onSubmit={handleSubmit}
          />
        )}
        {page === PAGES.SUCCESS && <SuccessPage assetsBaseUrl={assetsBaseUrl} />}
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
              <span
                className="material-registration-mask-icon material-registration-mask-icon-white"
                style={maskStyle(assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.documentIcons[index]))}
              />
            </span>
            <span className="material-registration-document-title">{document.title}</span>
            <span
              className="material-registration-arrow-icon"
              style={maskStyle(assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.checkIcon))}
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

function DocumentPage({ assetsBaseUrl, document, onBack }) {
  return (
    <>
      <BackButton assetsBaseUrl={assetsBaseUrl} onClick={onBack} />
      <h1 className="material-registration-page-title material-registration-document-heading">
        {document?.title || '会议材料'}
      </h1>
      <article className="material-registration-card material-registration-rich-card">
        <section
          className="material-registration-rich-text"
          dangerouslySetInnerHTML={{ __html: document?.html || '' }}
        />
      </article>
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
  onSubmit,
}) {
  return (
    <>
      <BackButton assetsBaseUrl={assetsBaseUrl} onClick={onBack} />
      <h1 className="material-registration-page-title material-registration-form-heading">
        填写参会信息
      </h1>
      <form className="material-registration-card material-registration-form-card" onSubmit={onSubmit}>
        <Field label="单位名称">
          <input value={form.unitName} onChange={(event) => onUpdate('unitName', event.target.value)} />
        </Field>
        <Field label="类型">
          <select value={form.unitType} onChange={(event) => onUpdate('unitType', event.target.value)}>
            <option value="">请选择</option>
            {formOptions.unitTypes.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
        <div className="material-registration-field">
          <label>参会人姓名</label>
          <div className="material-registration-attendees">
            {form.attendees.map((attendee, index) => (
              <div className="material-registration-attendee-row" key={`attendee-${index}`}>
                <input
                  value={attendee.name}
                  onChange={(event) => onUpdateAttendee(index, event.target.value)}
                  placeholder={`参会人 ${index + 1}`}
                />
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
        <Field label="报名单位名称">
          <input value={form.contactUnitName} onChange={(event) => onUpdate('contactUnitName', event.target.value)} />
        </Field>
        <Field label="职务">
          <input value={form.position} onChange={(event) => onUpdate('position', event.target.value)} />
        </Field>
        <Field label="联系方式">
          <input
            value={form.phone}
            onChange={(event) => onUpdate('phone', event.target.value)}
            inputMode="tel"
          />
        </Field>
        <Field label="性别">
          <select value={form.gender} onChange={(event) => onUpdate('gender', event.target.value)}>
            <option value="">请选择</option>
            {formOptions.genders.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
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
            <div className="material-registration-hotel">酒店：雄楚国际大酒店</div>
          </div>
        )}
        <RadioGroup
          label="清真餐"
          value={form.halalMeal}
          options={formOptions.halalMeal}
          onChange={(value) => onUpdate('halalMeal', value)}
        />
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
      <span
        className="material-registration-mask-icon material-registration-mask-icon-white"
        style={maskStyle(assetUrl(assetsBaseUrl, MATERIAL_REGISTRATION_ASSETS.backIcon))}
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

function validateForm(form) {
  if (!form.unitName.trim()) return '请填写单位名称'
  if (!form.unitType) return '请选择类型'
  if (!form.attendees.some((attendee) => attendee.name.trim())) return '请至少填写一位参会人姓名'
  if (!form.phone.trim()) return '请填写联系方式'
  if (!/^1\d{10}$/.test(form.phone.trim()) && !/^0\d{2,3}-?\d{7,8}(-\d{1,6})?$/.test(form.phone.trim())) {
    return '联系方式格式不合法'
  }
  if (!form.gender) return '请选择性别'
  if (!form.needAccommodation) return '请选择是否需要安排住宿'
  if (form.needAccommodation === '是' && !form.accommodationDates.length) return '请选择住宿时间'
  if (!form.halalMeal) return '请选择清真餐是/否'
  return ''
}

function maskStyle(url) {
  return {
    WebkitMask: `url("${url}") center center / contain no-repeat`,
    mask: `url("${url}") center center / contain no-repeat`,
  }
}
