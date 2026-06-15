/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Picker } from 'antd-mobile'
import 'antd-mobile/es/global'
import { setToken } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import { createAppointmentBooking, getBootstrap, getPublicConfig, verifyAppointment } from './api'
import {
  APPOINTMENT_FALLBACK_ASSETS_BASE_URL,
  APPOINTMENT_LAYOUT,
  APPOINTMENT_STAGE_WIDTH,
  APPOINTMENT_STAGE_HEIGHT,
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
  const [toastMessage, setToastMessage] = useState('')
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
  const stageHeight = APPOINTMENT_STAGE_HEIGHT
  const stageMetrics = useStageMetrics()
  const booking = bootstrap?.booking
  const displayedHouseKey = booking?.houseKey || verifyHouseKey(verifyForm)
  const displayedDate = booking?.appointmentDate || bookingForm.appointmentDate
  const displayedSlot = booking?.appointmentSlot || bookingForm.appointmentSlot
  const pickerColumns = activePicker === PICKERS.DATE
    ? [bookingDateOptions.map((date) => ({ label: date, value: date }))]
    : [bookingSlotOptions.map((slot) => ({ label: slot, value: slot }))]

  function showToast(message) {
    window.clearTimeout(toastTimerRef.current)
    setToastMessage(message || '')
    if (!message) return
    toastTimerRef.current = window.setTimeout(() => setToastMessage(''), 2000)
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
      showToast(getFriendlyAppointmentMessage(err, 'verify'))
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
      showToast(getFriendlyAppointmentMessage(err, 'booking'))
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

  if (loading) return <StateMessage message="活动加载中..." />
  if (blockedMessage) return <StateMessage message={blockedMessage} />
  if (error) return <StateMessage message={error} />
  if (!config) return <StateMessage message="活动配置缺失" />

  return (
    <div className="appointment-page">
      <div className="appointment-stage-shell">
        <div
          className="appointment-stage"
          style={{
            width: APPOINTMENT_STAGE_WIDTH,
            height: stageHeight,
            transform: `translate(-50%, -50%) scale(${stageMetrics.scale})`,
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
              houseKey={displayedHouseKey || '请以现场安排为准'}
              appointmentDate={displayedDate || '请以现场安排为准'}
              appointmentSlot={displayedSlot || '请以现场安排为准'}
              onConfirm={() => window.location.reload()}
            />
          ) : null}
        </div>
      </div>

      {toastMessage ? (
        <div className="appointment-toast-mask" onClick={(event) => event.stopPropagation()}>
          <div className="appointment-toast rounded-xl px-6 py-4 text-[17px] font-medium leading-[1.45] tracking-[0.02em]">
            {toastMessage}
          </div>
        </div>
      ) : null}

      {activePicker ? (
        <Picker
          columns={pickerColumns}
          visible
          value={[pickerDraftValue]}
          title={activePicker === PICKERS.DATE ? '预约日期' : '预约时间段'}
          cancelText="取消"
          confirmText="确定"
          popupClassName="appointment-mobile-picker"
          onClose={() => setActivePicker('')}
          onCancel={() => setActivePicker('')}
          onConfirm={(value) => {
            const nextValue = String(value?.[0] || '')
            setBookingForm((current) => ({
              ...current,
              [activePicker]: nextValue,
            }))
            setPickerDraftValue(nextValue)
            setActivePicker('')
          }}
          onSelect={(value) => {
            setPickerDraftValue(String(value?.[0] || ''))
          }}
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
      <LayerImage
        src={getAssetUrl(assetsBaseUrl, layout.titleImage.filename)}
        box={layout.titleImage}
        alt=""
      />

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
      <LayerImage
        src={getAssetUrl(assetsBaseUrl, layout.titleImage.filename)}
        box={layout.titleImage}
        alt=""
      />

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
        className={`appointment-picker-trigger flex items-center justify-center ${bookingForm.appointmentDate ? '' : 'is-placeholder'} ${bookingDateOptions.length ? '' : 'is-disabled'}`}
        style={toAbsoluteStyle(layout.controls.appointmentDate)}
        onClick={onOpenDatePicker}
        disabled={!bookingDateOptions.length}
      >
        {bookingForm.appointmentDate || '请选择日期'}
      </button>

      <button
        type="button"
        className={`appointment-picker-trigger flex items-center justify-center ${bookingForm.appointmentSlot ? '' : 'is-placeholder'} ${bookingSlotOptions.length ? '' : 'is-disabled'}`}
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

function SuccessStage({ assetsBaseUrl, houseKey, appointmentDate, appointmentSlot, onConfirm }) {
  const dateSlotText = [appointmentDate, appointmentSlot].filter(Boolean).join('\n')

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
        {houseKey || '请以现场安排为准'}
      </div>
      <div className="appointment-success-secondary" style={toAbsoluteStyle(APPOINTMENT_LAYOUT.success.textBlocks[1])}>
        {APPOINTMENT_LAYOUT.success.textBlocks[1].lines?.[0] || '您的预约时间为'}
      </div>
      <div className="appointment-success-tertiary" style={toAbsoluteStyle(APPOINTMENT_LAYOUT.success.textBlocks[2])}>
        {dateSlotText || '请以现场安排为准'}
      </div>
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

function StateMessage({ message }) {
  return (
    <div className="appointment-state">
      <div className="max-w-xs rounded-[28px] bg-black/20 px-6 py-5 text-center text-lg font-medium tracking-[0.02em] text-white shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        {message}
      </div>
    </div>
  )
}

function useStageMetrics() {
  const [metrics, setMetrics] = useState(() => getStageMetrics())

  useEffect(() => {
    const sync = () => setMetrics(getStageMetrics())
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  return metrics
}

function getStageMetrics() {
  if (typeof window === 'undefined') {
    return {
      scale: 1,
    }
  }
  return {
    scale: Math.max(window.innerWidth, 320) / APPOINTMENT_STAGE_WIDTH,
  }
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

function getFriendlyAppointmentMessage(err, scene) {
  const rawMessage = String(err?.response?.message || err?.message || '').trim()
  const responseCode = err?.response?.code

  if (responseCode === 'slot_full' || rawMessage.includes('时段报名人数已满')) {
    return '该时段报名人数已满\n请选择另外时段报名'
  }
  if (rawMessage.includes('手机号格式不正确')) {
    return '请填写正确手机号'
  }
  if (rawMessage.includes('预约时间段不合法') || rawMessage.includes('预约日期格式不正确') || rawMessage.includes('请选择')) {
    return '请选择预约日期和时间段'
  }
  if (rawMessage.includes('该房号已预约')) {
    return '该房号已被预约'
  }
  if (
    rawMessage.includes('楼号、房号、姓名不能为空') ||
    rawMessage.includes('身份证后四位不能为空') ||
    rawMessage.includes('身份证后四位必须是4位数字')
  ) {
    return '请填写完整信息'
  }
  if (
    rawMessage.includes('身份校验失败') ||
    rawMessage.includes('白名单') ||
    rawMessage.includes('信息不匹配')
  ) {
    return '身份验证失败\n请核对信息后重试'
  }
  if (rawMessage.includes('活动未开始')) {
    return '活动未开始'
  }
  if (rawMessage.includes('活动已截止')) {
    return '活动已截止'
  }
  if (rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError')) {
    return '网络异常，请稍后重试'
  }
  if (scene === 'verify') {
    return '身份验证失败\n请核对信息后重试'
  }
  if (scene === 'booking') {
    return '预约失败，请重试'
  }
  return '网络异常，请稍后重试'
}
