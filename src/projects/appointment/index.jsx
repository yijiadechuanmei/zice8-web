/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react'
import { setToken } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import { createAppointmentBooking, getBootstrap, getPublicConfig, verifyAppointment } from './api'
import {
  APPOINTMENT_FALLBACK_ASSETS_BASE_URL,
  APPOINTMENT_LAYOUT,
  APPOINTMENT_STAGE_HEIGHT,
  APPOINTMENT_STAGE_WIDTH,
  APPOINTMENT_SUCCESS_STAGE_HEIGHT,
} from './appointmentLayout'
import './appointment.css'

const STEPS = {
  INTRO: 'intro',
  RULE: 'rule',
  VERIFY: 'verify',
  BOOKING: 'booking',
  SUCCESS: 'success',
}

const PICKERS = {
  DATE: 'appointmentDate',
  SLOT: 'appointmentSlot',
}

export default function AppointmentApp({ routeParams }) {
  const tokenFromUrl = getTokenFromUrl()
  if (tokenFromUrl) {
    setToken(tokenFromUrl)
    window.location.replace(sanitizeUrlForWechat(window.location.href))
    return null
  }

  return <AppointmentMain routeParams={routeParams} />
}

function AppointmentMain({ routeParams }) {
  const activityKey = routeParams?.activityKey || getQueryParam('activity_key') || ''
  const [publicConfig, setPublicConfig] = useState(null)
  const [bootstrap, setBootstrap] = useState(null)
  const [config, setConfig] = useState(null)
  const [step, setStep] = useState(STEPS.INTRO)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [verifyForm, setVerifyForm] = useState({
    building: '',
    room: '',
    name: '',
    idTail: '',
  })
  const [verifyResult, setVerifyResult] = useState(null)
  const [bookingForm, setBookingForm] = useState({
    appointmentDate: '',
    appointmentSlot: '',
    phone: '',
  })
  const [activePicker, setActivePicker] = useState('')
  const [pickerDraftValue, setPickerDraftValue] = useState('')
  const toastTimerRef = useRef(0)
  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, publicConfig)

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current)
  }, [])

  useEffect(() => {
    if (!activityKey) {
      setError('缺少活动路径参数')
      setLoading(false)
      return
    }
    getPublicConfig(activityKey)
      .then((data) => {
        setPublicConfig(data)
        setError('')
      })
      .catch((err) => {
        setError(err.message || '活动配置加载失败')
        setLoading(false)
      })
  }, [activityKey])

  useEffect(() => {
    if (!publicConfig || !authReady) return
    setLoading(true)
    getBootstrap(activityKey)
      .then((data) => {
        setBootstrap(data)
        setConfig(data?.config || null)
        document.title = data?.activity?.title || '预约到访'
        setStep(data?.hasBooking ? STEPS.SUCCESS : STEPS.INTRO)
        setError('')
      })
      .catch((err) => {
        if (isUnauthorizedError(err)) {
          reauth('appointment-bootstrap')
          return
        }
        setError(err.message || '活动加载失败')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [activityKey, authReady, publicConfig, reauth])

  const bookingDateOptions = useMemo(() => {
    const configDates = config?.dateRange?.dates || config?.allowedDates || []
    const allowedDates = verifyResult?.allowedDates || []
    if (!allowedDates.length) return configDates
    return configDates.filter((date) => allowedDates.includes(date))
  }, [config?.allowedDates, config?.dateRange?.dates, verifyResult?.allowedDates])

  const bookingSlotOptions = useMemo(() => {
    const configSlots = config?.timeSlots || []
    const allowedSlots = verifyResult?.allowedSlots || []
    if (!allowedSlots.length) return configSlots
    return configSlots.filter((slot) => allowedSlots.includes(slot))
  }, [config?.timeSlots, verifyResult?.allowedSlots])

  useEffect(() => {
    if (!bookingDateOptions.length) return
    setBookingForm((current) => ({
      ...current,
      appointmentDate: bookingDateOptions.includes(current.appointmentDate)
        ? current.appointmentDate
        : bookingDateOptions[0],
    }))
  }, [bookingDateOptions])

  useEffect(() => {
    if (!bookingSlotOptions.length) return
    setBookingForm((current) => ({
      ...current,
      appointmentSlot: bookingSlotOptions.includes(current.appointmentSlot)
        ? current.appointmentSlot
        : bookingSlotOptions[0],
    }))
  }, [bookingSlotOptions])

  const assetsBaseUrl = config?.assetsBaseUrl || APPOINTMENT_FALLBACK_ASSETS_BASE_URL
  const backgroundUrl = getAssetUrl(assetsBaseUrl, APPOINTMENT_LAYOUT.common.background)
  const stageHeight = step === STEPS.SUCCESS ? APPOINTMENT_SUCCESS_STAGE_HEIGHT : APPOINTMENT_STAGE_HEIGHT
  const stageScale = useStageScale()
  const booking = bootstrap?.booking
  const displayedNameHouse = [booking?.name || verifyForm.name, booking?.houseKey || verifyHouseKey(verifyForm)].filter(Boolean).join('   ')
  const displayedDateSlot = [booking?.appointmentDate || bookingForm.appointmentDate, booking?.appointmentSlot || bookingForm.appointmentSlot].filter(Boolean).join('   ')
  const displayedPhone = maskPhone(booking?.phone || bookingForm.phone)

  function showToast(message) {
    window.clearTimeout(toastTimerRef.current)
    setToast(message || '')
    if (!message) return
    toastTimerRef.current = window.setTimeout(() => setToast(''), 1800)
  }

  async function handleVerifySubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await verifyAppointment(activityKey, verifyForm)
      setVerifyResult(result)
      setBookingForm((current) => ({
        ...current,
        appointmentDate: result.allowedDates?.[0] || '',
        appointmentSlot: result.allowedSlots?.[0] || '',
      }))
      setStep(STEPS.BOOKING)
    } catch (err) {
      if (isUnauthorizedError(err)) {
        reauth('appointment-verify')
        return
      }
      showToast(err.message || '身份校验失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBookingSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const result = await createAppointmentBooking(activityKey, {
        verifyToken: verifyResult?.verifyToken || '',
        appointmentDate: bookingForm.appointmentDate,
        appointmentSlot: bookingForm.appointmentSlot,
        phone: bookingForm.phone.trim(),
      })
      setBootstrap((current) => ({
        ...(current || {}),
        hasBooking: true,
        booking: result.booking,
      }))
      setStep(STEPS.SUCCESS)
      setActivePicker('')
    } catch (err) {
      if (isUnauthorizedError(err)) {
        reauth('appointment-booking')
        return
      }
      showToast(err.message || '预约提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  function openPicker(fieldKey) {
    const options = fieldKey === PICKERS.DATE ? bookingDateOptions : bookingSlotOptions
    if (!options.length) return
    setPickerDraftValue(bookingForm[fieldKey] || options[0])
    setActivePicker(fieldKey)
  }

  function confirmPicker() {
    if (!activePicker) return
    setBookingForm((current) => ({
      ...current,
      [activePicker]: pickerDraftValue,
    }))
    setActivePicker('')
  }

  if (loading) return <StateMessage message="活动加载中..." />
  if (blockedMessage) return <StateMessage message={blockedMessage} />
  if (error) return <StateMessage message={error} />
  if (!config) return <StateMessage message="活动配置缺失" />

  return (
    <div className="appointment-page">
      <div className="appointment-page__center">
        <div
          className="appointment-stage-shell"
          style={{
            width: APPOINTMENT_STAGE_WIDTH * stageScale,
            height: stageHeight * stageScale,
          }}
        >
          <div
            className={`appointment-stage ${step === STEPS.INTRO ? 'appointment-stage--intro' : ''}`}
            style={{
              width: APPOINTMENT_STAGE_WIDTH,
              height: stageHeight,
              transform: `scale(${stageScale})`,
              backgroundImage: `url(${backgroundUrl})`,
            }}
            onClick={step === STEPS.INTRO ? () => setStep(STEPS.RULE) : undefined}
            role={step === STEPS.INTRO ? 'button' : undefined}
            tabIndex={step === STEPS.INTRO ? 0 : undefined}
            onKeyDown={step === STEPS.INTRO ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') setStep(STEPS.RULE)
            } : undefined}
          >
            <LayerImage
              className="appointment-stage__banner"
              src={getAssetUrl(assetsBaseUrl, APPOINTMENT_LAYOUT.common.topBanner.filename)}
              box={APPOINTMENT_LAYOUT.common.topBanner}
              alt=""
            />

            {step === STEPS.INTRO ? (
              <IntroStage assetsBaseUrl={assetsBaseUrl} />
            ) : null}

            {step === STEPS.RULE ? (
              <RuleStage assetsBaseUrl={assetsBaseUrl} onNext={() => setStep(STEPS.VERIFY)} />
            ) : null}

            {step === STEPS.VERIFY ? (
              <VerifyStage
                assetsBaseUrl={assetsBaseUrl}
                verifyForm={verifyForm}
                setVerifyForm={setVerifyForm}
                submitting={submitting}
                onSubmit={handleVerifySubmit}
                onPrev={() => setStep(STEPS.RULE)}
              />
            ) : null}

            {step === STEPS.BOOKING ? (
              <BookingStage
                assetsBaseUrl={assetsBaseUrl}
                bookingForm={bookingForm}
                setBookingForm={setBookingForm}
                bookingDateOptions={bookingDateOptions}
                bookingSlotOptions={bookingSlotOptions}
                submitting={submitting}
                onSubmit={handleBookingSubmit}
                onPrev={() => setStep(STEPS.VERIFY)}
                onOpenDatePicker={() => openPicker(PICKERS.DATE)}
                onOpenSlotPicker={() => openPicker(PICKERS.SLOT)}
              />
            ) : null}

            {step === STEPS.SUCCESS ? (
              <SuccessStage
                assetsBaseUrl={assetsBaseUrl}
                nameHouse={displayedNameHouse || '预约信息'}
                dateSlot={displayedDateSlot || '请以现场安排为准'}
                phoneText={displayedPhone ? `联系电话：${displayedPhone}` : ''}
                onConfirm={() => window.location.reload()}
              />
            ) : null}
          </div>
        </div>
      </div>

      {toast ? <div className="appointment-toast">{toast}</div> : null}

      {activePicker ? (
        <PickerSheet
          title={activePicker === PICKERS.DATE ? '预约日期' : '预约时间'}
          options={activePicker === PICKERS.DATE ? bookingDateOptions : bookingSlotOptions}
          value={pickerDraftValue}
          onSelect={setPickerDraftValue}
          onCancel={() => setActivePicker('')}
          onConfirm={confirmPicker}
        />
      ) : null}
    </div>
  )
}

function IntroStage({ assetsBaseUrl }) {
  return (
    <>
      {APPOINTMENT_LAYOUT.intro.images.map((image) => (
        <LayerImage
          key={image.filename}
          src={getAssetUrl(assetsBaseUrl, image.filename)}
          box={image}
          alt=""
        />
      ))}
      {APPOINTMENT_LAYOUT.intro.texts.map((text) => (
        <div
          key={text.key}
          className={text.className}
          style={toAbsoluteStyle(text)}
        >
          {text.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ))}
      <div className="appointment-qrcode-box" style={toAbsoluteStyle(APPOINTMENT_LAYOUT.intro.qrcodeBox)}>
        <span>二维码占位</span>
      </div>
    </>
  )
}

function RuleStage({ assetsBaseUrl, onNext }) {
  return (
    <>
      {APPOINTMENT_LAYOUT.rule.images.map((image) => {
        if (image.filename === '4d08ba00e32fac92c7dd171992244add_1754_221_58.png') {
          return (
            <ImageButton
              key={image.filename}
              src={getAssetUrl(assetsBaseUrl, image.filename)}
              box={image}
              alt="下一步"
              onClick={onNext}
            />
          )
        }
        return (
          <LayerImage
            key={image.filename}
            src={getAssetUrl(assetsBaseUrl, image.filename)}
            box={image}
            alt=""
          />
        )
      })}
    </>
  )
}

function VerifyStage({
  assetsBaseUrl,
  verifyForm,
  setVerifyForm,
  submitting,
  onSubmit,
  onPrev,
}) {
  const layout = APPOINTMENT_LAYOUT.verify

  return (
    <form onSubmit={onSubmit}>
      <div className="appointment-stage-title" style={toAbsoluteStyle(layout.title)}>
        {layout.title.text}
      </div>

      {layout.labels.map((item) => (
        <div key={item.text} className="appointment-stage-label" style={toAbsoluteStyle(item)}>
          {item.text}
        </div>
      ))}

      {layout.hints.map((item) => (
        <div key={item.text} className="appointment-stage-hint" style={toAbsoluteStyle(item)}>
          {item.text}
        </div>
      ))}

      {layout.fieldImages.map((image) => (
        <LayerImage
          key={image.filename}
          src={getAssetUrl(assetsBaseUrl, image.filename)}
          box={image}
          alt=""
        />
      ))}

      <input
        className="appointment-stage-input"
        style={toAbsoluteStyle(layout.inputs.building)}
        value={verifyForm.building}
        onChange={(event) => setVerifyForm((current) => ({ ...current, building: event.target.value.replace(/[^\d-]/g, '') }))}
        maxLength={layout.inputs.building.maxLength}
        inputMode={layout.inputs.building.inputMode}
      />
      <input
        className="appointment-stage-input"
        style={toAbsoluteStyle(layout.inputs.room)}
        value={verifyForm.room}
        onChange={(event) => setVerifyForm((current) => ({ ...current, room: event.target.value.replace(/[^\d-]/g, '') }))}
        maxLength={layout.inputs.room.maxLength}
        inputMode={layout.inputs.room.inputMode}
      />
      <input
        className="appointment-stage-input"
        style={toAbsoluteStyle(layout.inputs.name)}
        value={verifyForm.name}
        onChange={(event) => setVerifyForm((current) => ({ ...current, name: event.target.value.trimStart() }))}
        maxLength={layout.inputs.name.maxLength}
      />
      <input
        className="appointment-stage-input"
        style={toAbsoluteStyle(layout.inputs.idTail)}
        value={verifyForm.idTail}
        onChange={(event) => setVerifyForm((current) => ({ ...current, idTail: event.target.value.replace(/\D/g, '') }))}
        maxLength={layout.inputs.idTail.maxLength}
        inputMode={layout.inputs.idTail.inputMode}
      />

      <ImageButton
        src={getAssetUrl(assetsBaseUrl, APPOINTMENT_LAYOUT.common.prevButton.filename)}
        box={APPOINTMENT_LAYOUT.common.prevButton}
        alt="上一步"
        onClick={onPrev}
      />
      <ImageSubmitButton
        src={getAssetUrl(assetsBaseUrl, APPOINTMENT_LAYOUT.common.nextButton.filename)}
        box={APPOINTMENT_LAYOUT.common.nextButton}
        alt={submitting ? '校验中' : '下一步'}
        disabled={submitting}
      />
    </form>
  )
}

function BookingStage({
  assetsBaseUrl,
  bookingForm,
  setBookingForm,
  bookingDateOptions,
  bookingSlotOptions,
  submitting,
  onSubmit,
  onPrev,
  onOpenDatePicker,
  onOpenSlotPicker,
}) {
  const layout = APPOINTMENT_LAYOUT.booking

  return (
    <form onSubmit={onSubmit}>
      <div className="appointment-stage-title" style={toAbsoluteStyle(layout.title)}>
        {layout.title.text}
      </div>

      {layout.labels.map((item) => (
        <div key={item.text} className="appointment-stage-label" style={toAbsoluteStyle(item)}>
          {item.text}
        </div>
      ))}

      {layout.fieldImages.map((image) => (
        <LayerImage
          key={image.filename}
          src={getAssetUrl(assetsBaseUrl, image.filename)}
          box={image}
          alt=""
        />
      ))}

      <button
        type="button"
        className={`appointment-picker-trigger ${bookingForm.appointmentDate ? '' : 'is-placeholder'} ${bookingDateOptions.length ? '' : 'is-disabled'}`}
        style={toAbsoluteStyle(layout.controls.appointmentDate)}
        onClick={onOpenDatePicker}
        disabled={!bookingDateOptions.length}
      >
        {bookingForm.appointmentDate || '请选择日期'}
      </button>

      <button
        type="button"
        className={`appointment-picker-trigger ${bookingForm.appointmentSlot ? '' : 'is-placeholder'} ${bookingSlotOptions.length ? '' : 'is-disabled'}`}
        style={toAbsoluteStyle(layout.controls.appointmentSlot)}
        onClick={onOpenSlotPicker}
        disabled={!bookingSlotOptions.length}
      >
        {bookingForm.appointmentSlot || '请选择时间段'}
      </button>

      <input
        className="appointment-stage-input"
        style={toAbsoluteStyle(layout.controls.phone)}
        value={bookingForm.phone}
        onChange={(event) => setBookingForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '') }))}
        maxLength={layout.controls.phone.maxLength}
        inputMode={layout.controls.phone.inputMode}
      />

      <ImageButton
        src={getAssetUrl(assetsBaseUrl, APPOINTMENT_LAYOUT.common.prevButton.filename)}
        box={APPOINTMENT_LAYOUT.common.prevButton}
        alt="上一步"
        onClick={onPrev}
      />
      <ImageSubmitButton
        src={getAssetUrl(assetsBaseUrl, APPOINTMENT_LAYOUT.common.nextButton.filename)}
        box={APPOINTMENT_LAYOUT.common.nextButton}
        alt={submitting ? '提交中' : '下一步'}
        disabled={submitting || !bookingDateOptions.length || !bookingSlotOptions.length}
      />
    </form>
  )
}

function SuccessStage({ assetsBaseUrl, nameHouse, dateSlot, phoneText, onConfirm }) {
  return (
    <>
      {APPOINTMENT_LAYOUT.success.images.map((image) => {
        if (image.filename === 'ca5e06af6fe546199c1ce1eac1a4e4b0_6478.webp') {
          return (
            <ImageButton
              key={image.filename}
              src={getAssetUrl(assetsBaseUrl, image.filename)}
              box={image}
              alt="确认"
              onClick={onConfirm}
            />
          )
        }
        return (
          <LayerImage
            key={image.filename}
            src={getAssetUrl(assetsBaseUrl, image.filename)}
            box={image}
            alt=""
          />
        )
      })}

      <div className="appointment-success-primary" style={toAbsoluteStyle(APPOINTMENT_LAYOUT.success.textBlocks[0])}>
        {nameHouse || '预约成功'}
      </div>
      <div className="appointment-success-secondary" style={toAbsoluteStyle(APPOINTMENT_LAYOUT.success.textBlocks[1])}>
        {APPOINTMENT_LAYOUT.success.textBlocks[1].lines[0]}
      </div>
      <div className="appointment-success-secondary" style={toAbsoluteStyle(APPOINTMENT_LAYOUT.success.textBlocks[2])}>
        {dateSlot || '请以现场安排为准'}
      </div>
      {phoneText ? (
        <div className="appointment-success-tertiary" style={toAbsoluteStyle(APPOINTMENT_LAYOUT.success.textBlocks[3])}>
          {phoneText}
        </div>
      ) : null}
    </>
  )
}

function LayerImage({ src, box, alt, className = '' }) {
  return (
    <img
      className={`appointment-layer-image ${className}`.trim()}
      src={src}
      alt={alt}
      style={toAbsoluteStyle(box)}
    />
  )
}

function ImageButton({ src, box, alt, onClick }) {
  return (
    <button
      type="button"
      className="appointment-stage-button"
      style={toAbsoluteStyle(box)}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
    >
      <img src={src} alt={alt} />
    </button>
  )
}

function ImageSubmitButton({ src, box, alt, disabled }) {
  return (
    <button
      type="submit"
      className="appointment-stage-button"
      style={{
        ...toAbsoluteStyle(box),
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <img src={src} alt={alt} />
    </button>
  )
}

function PickerSheet({ title, options, value, onSelect, onCancel, onConfirm }) {
  return (
    <div className="appointment-picker-overlay" onClick={onCancel}>
      <div className="appointment-picker-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="appointment-picker-actions">
          <button type="button" className="appointment-picker-action" onClick={onCancel}>取消</button>
          <div className="appointment-picker-title">{title}</div>
          <button type="button" className="appointment-picker-action appointment-picker-action--confirm" onClick={onConfirm}>确定</button>
        </div>
        <div className="appointment-picker-options">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`appointment-picker-option ${option === value ? 'is-active' : ''}`}
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StateMessage({ message }) {
  return <div className="appointment-state">{message}</div>
}

function useStageScale() {
  const [scale, setScale] = useState(() => getStageScale())

  useEffect(() => {
    const sync = () => setScale(getStageScale())
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  return scale
}

function getStageScale() {
  if (typeof window === 'undefined') return 1
  const width = Math.max(window.innerWidth - 24, 320)
  return Math.min(width / APPOINTMENT_STAGE_WIDTH, 1)
}

function toAbsoluteStyle(box) {
  return {
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: box.height !== undefined ? `${box.height}px` : undefined,
  }
}

function verifyHouseKey(form) {
  const building = String(form?.building || '').trim()
  const room = String(form?.room || '').trim()
  if (!building || !room) return ''
  return `${building}-${room}`
}

function getAssetUrl(baseUrl, filename) {
  if (!baseUrl || !filename) return ''
  return `${String(baseUrl).replace(/\/$/, '')}/${String(filename).replace(/^\//, '')}`
}

function isUnauthorizedError(err) {
  return err?.response?.code === 401
}

function maskPhone(phone) {
  const text = String(phone || '').trim()
  if (!/^1\d{10}$/.test(text)) return text
  return text.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')
}
