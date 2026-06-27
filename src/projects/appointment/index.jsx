/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Picker } from 'antd-mobile'
import 'antd-mobile/es/global'
import { QRCodeSVG } from 'qrcode.react'
import { setToken } from '../../shared/api/request'
import { trackEvent, trackPageView } from '../../shared/analytics'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import { createAppointmentBooking, getBootstrap, getPublicConfig, resetAppointmentDebugData, verifyAppointment } from './api'
import {
  APPOINTMENT_FALLBACK_ASSETS_BASE_URL,
} from './appointmentLayout'
import { normalizeAppointmentActivityKey, resolveAppointmentSkin } from './appointmentSkins'
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

const APPOINTMENT_DEBUG_RESET_TOKEN = 'RESET_APPOINTMENT_2026'

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
  const activityKey = normalizeAppointmentActivityKey(routeParams?.activityKey || getQueryParam('activity_key') || '')
  const [pageUrl, setPageUrl] = useState('')
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
  const [debugMessage, setDebugMessage] = useState('')
  const [activePicker, setActivePicker] = useState('')
  const [pickerDraftValue, setPickerDraftValue] = useState('')
  const [capacityConfirmMessage, setCapacityConfirmMessage] = useState('')
  const toastTimerRef = useRef(0)
  const introTouchRef = useRef({ x: 0, y: 0 })
  const hasTrackedInitialViewRef = useRef(false)
  const lastSuccessTrackKeyRef = useRef('')
  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, publicConfig)
  const appointmentSkin = useMemo(() => resolveAppointmentSkin(activityKey), [activityKey])
  const appointmentLayout = appointmentSkin.layout
  const isDebugMode = useMemo(() => getQueryParam('debug') === '1', [])

  useEffect(() => {
    return () => window.clearTimeout(toastTimerRef.current)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setPageUrl(window.location.href)
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

  useEffect(() => {
    if (!activityKey || !bootstrap || hasTrackedInitialViewRef.current) return
    hasTrackedInitialViewRef.current = true
    trackPageView(activityKey, '/appointment', {
      activityType: 'appointment_visit',
      pageKey: 'appointment',
    })
    trackAppointmentEvent(activityKey, 'appointment_page_view', {
      pageKey: 'appointment',
    })
  }, [activityKey, bootstrap])

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
    if (!bookingDateOptions.length) {
      setBookingForm((current) => ({
        ...current,
        appointmentDate: '',
      }))
      return
    }
    setBookingForm((current) => ({
      ...current,
      appointmentDate: bookingDateOptions.includes(current.appointmentDate)
        ? current.appointmentDate
        : '',
    }))
  }, [bookingDateOptions])

  useEffect(() => {
    if (!bookingSlotOptions.length) {
      setBookingForm((current) => ({
        ...current,
        appointmentSlot: '',
      }))
      return
    }
    setBookingForm((current) => ({
      ...current,
      appointmentSlot: bookingSlotOptions.includes(current.appointmentSlot)
        ? current.appointmentSlot
        : '',
    }))
  }, [bookingSlotOptions])

  useEffect(() => {
    if (step !== STEPS.SUCCESS || !activityKey) return
    const booking = normalizeSuccessBooking(bootstrap?.booking)
    const trackKey = [
      booking?.houseKey || verifyHouseKey(verifyForm),
      booking?.appointmentDate || bookingForm.appointmentDate,
      booking?.appointmentSlot || bookingForm.appointmentSlot,
    ].join('|')
    if (lastSuccessTrackKeyRef.current === trackKey) return
    lastSuccessTrackKeyRef.current = trackKey
    trackAppointmentEvent(activityKey, 'appointment_success_view', {
      pageKey: 'success',
      date: booking?.appointmentDate || bookingForm.appointmentDate || '',
      slot: booking?.appointmentSlot || bookingForm.appointmentSlot || '',
      result: 'success',
    })
  }, [activityKey, bookingForm.appointmentDate, bookingForm.appointmentSlot, bootstrap?.booking, step, verifyForm])

  const configuredAssetsBaseUrl =
    config?.assetsBaseUrl && config.assetsBaseUrl !== APPOINTMENT_FALLBACK_ASSETS_BASE_URL
      ? config.assetsBaseUrl
      : ''
  const assetsBaseUrl = configuredAssetsBaseUrl || appointmentSkin.assetsBaseUrl || APPOINTMENT_FALLBACK_ASSETS_BASE_URL
  const stepBackground = appointmentLayout?.[step]?.background || appointmentLayout.common.background
  const backgroundUrl = getAssetUrl(assetsBaseUrl, stepBackground)
  const stageWidth = appointmentSkin.stageWidth
  const stageHeight = appointmentLayout?.[step]?.height || appointmentSkin.stageHeight
  const stageMetrics = useStageMetrics(stageWidth)
  const shareActivity = useMemo(() => {
    const activity = bootstrap?.activity || publicConfig
    if (!activity) return null
    return {
      ...activity,
      shareTitle: activity.shareTitle || activity.title || '保利·东方瑧悦集中交付活动',
      shareDesc: activity.shareDesc ?? '',
      shareImage: activity.shareImage || getAssetUrl(assetsBaseUrl, appointmentLayout.common.background),
    }
  }, [appointmentLayout.common.background, assetsBaseUrl, bootstrap?.activity, publicConfig])
  const handleWechatShareStatus = useCallback((status) => {
    if (status?.wxConfigStatus === 'failed' || status?.signatureStatus === 'failed' || status?.wxScriptLoadStatus === 'failed') {
      console.warn('[appointment-share] setup failed', status)
    }
  }, [])
  useWechatShare(activityKey, shareActivity, handleWechatShareStatus)

  const successBooking = useMemo(
    () => normalizeSuccessBooking(bootstrap?.booking),
    [bootstrap?.booking],
  )
  const pickerColumns = activePicker === PICKERS.DATE
    ? [bookingDateOptions.map((date) => ({ label: date, value: date }))]
    : [bookingSlotOptions.map((slot) => ({ label: slot, value: slot }))]

  function showToast(message) {
    window.clearTimeout(toastTimerRef.current)
    setToastMessage(message || '')
    if (!message) return
    toastTimerRef.current = window.setTimeout(() => setToastMessage(''), 2000)
  }

  async function handleDebugReset() {
    if (!window.confirm('将删除该活动的所有预约和参与数据，仅恢复预约名额，不修改活动配置。确认继续吗？')) {
      return
    }
    try {
      await resetAppointmentDebugData({
        activityKey,
        confirmToken: APPOINTMENT_DEBUG_RESET_TOKEN,
      })
      setDebugMessage('已重置预约数据')
      window.location.reload()
    } catch (err) {
      setDebugMessage(getFriendlyAppointmentMessage(err, 'booking') || err?.message || '重置失败')
    }
  }

  async function handleVerifySubmit(event) {
    event.preventDefault()
    const validationMessage = validateVerifyForm(verifyForm)
    if (validationMessage) {
      showToast(validationMessage)
      return
    }
    setSubmitting(true)
    try {
      const result = await verifyAppointment(activityKey, {
        ...verifyForm,
        idTail: normalizeIdTailInput(verifyForm.idTail),
      })
      trackAppointmentEvent(activityKey, 'appointment_verify_success', {
        pageKey: 'verify',
        result: result.alreadyBooked ? 'already_booked' : 'success',
      })
      setVerifyResult(result)
      if (result.alreadyBooked && result.booking) {
        setBootstrap((current) => ({
          ...(current || {}),
          hasBooking: true,
          booking: result.booking,
        }))
        setStep(STEPS.SUCCESS)
        return
      }
      setBookingForm((current) => ({
        ...current,
        appointmentDate: '',
        appointmentSlot: '',
      }))
      setStep(STEPS.BOOKING)
    } catch (err) {
      if (isUnauthorizedError(err)) {
        reauth('appointment-verify')
        return
      }
      trackAppointmentEvent(activityKey, 'appointment_verify_failed', {
        pageKey: 'verify',
        result: 'failed',
        reason: classifyAppointmentAnalyticsReason(err, 'verify'),
      })
      showToast(getFriendlyAppointmentMessage(err, 'verify'))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitBooking(capacityConfirmed = false) {
    const validationMessage = validateBookingForm(bookingForm)
    if (validationMessage) {
      showToast(validationMessage)
      return
    }
    setSubmitting(true)
    try {
      setCapacityConfirmMessage('')
      const result = await createAppointmentBooking(activityKey, {
        verifyToken: verifyResult?.verifyToken || '',
        appointmentDate: bookingForm.appointmentDate,
        appointmentSlot: bookingForm.appointmentSlot,
        phone: bookingForm.phone.trim(),
        capacityConfirmed,
      })
      trackAppointmentEvent(activityKey, 'appointment_booking_success', {
        pageKey: 'booking',
        date: bookingForm.appointmentDate,
        slot: bookingForm.appointmentSlot,
        result: result.alreadyBooked ? 'already_booked' : 'success',
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
      if (isSlotSoftConfirmRequired(err)) {
        setCapacityConfirmMessage(getFriendlyAppointmentMessage(err, 'booking'))
        return
      }
      trackAppointmentEvent(activityKey, 'appointment_booking_failed', {
        pageKey: 'booking',
        date: bookingForm.appointmentDate,
        slot: bookingForm.appointmentSlot,
        result: 'failed',
        reason: classifyAppointmentAnalyticsReason(err, 'booking'),
      })
      showToast(getFriendlyAppointmentMessage(err, 'booking'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBookingSubmit(event) {
    event.preventDefault()
    await submitBooking(false)
  }

  function openPicker(fieldKey) {
    const options = fieldKey === PICKERS.DATE ? bookingDateOptions : bookingSlotOptions
    if (!options.length) return
    setPickerDraftValue(bookingForm[fieldKey] || options[0])
    setActivePicker(fieldKey)
  }

  function goToRule() {
    if (step !== STEPS.INTRO || toastMessage || activePicker || submitting) return
    setStep(STEPS.RULE)
  }

  function handleRuleNext() {
    const activityWindowState = getAppointmentActivityWindowState(bootstrap?.activity || publicConfig)
    if (activityWindowState === 'not_started') {
      showToast('活动未开始')
      return
    }
    if (activityWindowState === 'ended') {
      showToast('活动已结束')
      return
    }
    setStep(STEPS.VERIFY)
  }

  function handleIntroTouchStart(event) {
    if (step !== STEPS.INTRO || toastMessage || activePicker || submitting) return
    const touch = event.touches?.[0]
    if (!touch) return
    introTouchRef.current = { x: touch.clientX, y: touch.clientY }
  }

  function handleIntroTouchEnd(event) {
    if (step !== STEPS.INTRO || toastMessage || activePicker || submitting) return
    const touch = event.changedTouches?.[0]
    if (!touch) return
    const deltaX = touch.clientX - introTouchRef.current.x
    const deltaY = touch.clientY - introTouchRef.current.y
    if (Math.abs(deltaX) > 36) return
    if (deltaY <= -45) {
      goToRule()
    }
  }

  if (loading) return <LoadingScreen backgroundUrl={backgroundUrl} />
  if (blockedMessage) return <StateMessage message={blockedMessage} backgroundUrl={backgroundUrl} />
  if (error) return <StateMessage message={error} backgroundUrl={backgroundUrl} />
  if (!config) return <StateMessage message="活动配置缺失" backgroundUrl={backgroundUrl} />

  return (
    <div
      className={`appointment-page ${appointmentSkin.className || ''}`.trim()}
      style={{
        backgroundImage: `url(${backgroundUrl})`,
      }}
    >
      <div className="appointment-stage-shell">
        <div
          className="appointment-stage"
          style={{
            width: stageWidth,
            height: stageHeight,
            transform: `translate(-50%, -50%) scale(${stageMetrics.scale})`,
            backgroundImage: `url(${backgroundUrl})`,
          }}
          onClick={step === STEPS.INTRO ? goToRule : undefined}
          role={step === STEPS.INTRO ? 'button' : undefined}
          tabIndex={step === STEPS.INTRO ? 0 : undefined}
          onKeyDown={step === STEPS.INTRO ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') goToRule()
          } : undefined}
          onTouchStart={step === STEPS.INTRO ? handleIntroTouchStart : undefined}
          onTouchEnd={step === STEPS.INTRO ? handleIntroTouchEnd : undefined}
        >
          <div key={step} className="appointment-step-fade">
            <LayerImage
              className="appointment-stage__banner"
              src={getAssetUrl(assetsBaseUrl, appointmentLayout.common.topBanner.filename)}
              box={appointmentLayout.common.topBanner}
              alt=""
            />

            {step === STEPS.INTRO ? (
              <IntroStage layout={appointmentLayout} assetsBaseUrl={assetsBaseUrl} pageUrl={pageUrl} />
            ) : null}

            {step === STEPS.RULE ? (
              <RuleStage layout={appointmentLayout} assetsBaseUrl={assetsBaseUrl} onNext={handleRuleNext} />
            ) : null}

            {step === STEPS.VERIFY ? (
              <VerifyStage
                layout={appointmentLayout}
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
                layout={appointmentLayout}
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
                layout={appointmentLayout}
                assetsBaseUrl={assetsBaseUrl}
                name={successBooking?.name || verifyForm.name || ''}
                houseKey={successBooking?.houseKey || verifyHouseKey(verifyForm) || '请以现场安排为准'}
                appointmentDate={successBooking?.appointmentDate || bookingForm.appointmentDate || '请以现场安排为准'}
                appointmentSlot={successBooking?.appointmentSlot || bookingForm.appointmentSlot || '请以现场安排为准'}
                onConfirm={() => window.location.reload()}
              />
            ) : null}
          </div>
        </div>
      </div>

      {toastMessage ? (
        <div className="appointment-toast-mask" onClick={(event) => event.stopPropagation()}>
          <div className="appointment-toast rounded-xl px-6 py-4 text-[17px] font-medium leading-[1.45] tracking-[0.02em]">
            {toastMessage}
          </div>
        </div>
      ) : null}

      {capacityConfirmMessage ? (
        <div className="appointment-confirm-mask" onClick={() => setCapacityConfirmMessage('')}>
          <div className="appointment-confirm" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <p>{capacityConfirmMessage}</p>
            <div className="appointment-confirm__actions">
              <button
                type="button"
                className="appointment-confirm__secondary"
                onClick={() => setCapacityConfirmMessage('')}
                disabled={submitting}
              >
                选择其他时段
              </button>
              <button
                type="button"
                className="appointment-confirm__primary"
                onClick={() => submitBooking(true)}
                disabled={submitting}
              >
                {submitting ? '提交中' : '继续预约本时段'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isDebugMode ? (
        <div className="appointment-debug-panel">
          <div className="appointment-debug-panel__title">调试</div>
          <div className="appointment-debug-panel__row">
            <span>活动</span>
            <span>{activityKey || '-'}</span>
          </div>
          <button
            type="button"
            className="appointment-debug-panel__danger"
            onClick={handleDebugReset}
            disabled={loading || submitting}
          >
            重置所有数据
          </button>
          {debugMessage ? <div className="appointment-debug-panel__message">{debugMessage}</div> : null}
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

function IntroStage({ layout, assetsBaseUrl, pageUrl }) {
  return (
    <>
      {layout.intro.images.map((image) => (
        <LayerImage
          key={image.filename}
          src={getAssetUrl(assetsBaseUrl, image.filename)}
          box={image}
          alt=""
        />
      ))}
      {pageUrl ? (
        <div className="appointment-qrcode-box" style={toAbsoluteStyle(layout.intro.qrcodeBox)}>
          <QRCodeSVG
            value={pageUrl}
            size={120}
            bgColor="#ffffff"
            fgColor="#000000"
            includeMargin={false}
            level="M"
          />
        </div>
      ) : null}
    </>
  )
}

function RuleStage({ layout, assetsBaseUrl, onNext }) {
  return (
    <>
      {layout.rule.images.map((image) => {
        if (image.action === 'next' || image.filename === '4d08ba00e32fac92c7dd171992244add_1754_221_58.png') {
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
  layout,
  assetsBaseUrl,
  verifyForm,
  setVerifyForm,
  submitting,
  onSubmit,
  onPrev,
}) {
  const verifyLayout = layout.verify

  return (
    <form onSubmit={onSubmit}>
      <LayerImage
        src={getAssetUrl(assetsBaseUrl, verifyLayout.titleImage.filename)}
        box={verifyLayout.titleImage}
        alt=""
      />

      {verifyLayout.fieldImages.map((image) => (
        <LayerImage
          key={image.filename}
          src={getAssetUrl(assetsBaseUrl, image.filename)}
          box={image}
          alt=""
        />
      ))}

      <input
        className="appointment-stage-input"
        style={toAbsoluteStyle(verifyLayout.inputs.building)}
        value={verifyForm.building}
        onChange={(event) => setVerifyForm((current) => ({ ...current, building: event.target.value.replace(/[^\d-]/g, '') }))}
        maxLength={verifyLayout.inputs.building.maxLength}
        inputMode={verifyLayout.inputs.building.inputMode}
      />
      <input
        className="appointment-stage-input"
        style={toAbsoluteStyle(verifyLayout.inputs.room)}
        value={verifyForm.room}
        onChange={(event) => setVerifyForm((current) => ({ ...current, room: event.target.value.replace(/[^\d-]/g, '') }))}
        maxLength={verifyLayout.inputs.room.maxLength}
        inputMode={verifyLayout.inputs.room.inputMode}
      />
      <input
        className="appointment-stage-input"
        style={toAbsoluteStyle(verifyLayout.inputs.name)}
        value={verifyForm.name}
        onChange={(event) => setVerifyForm((current) => ({ ...current, name: event.target.value.trimStart() }))}
        maxLength={verifyLayout.inputs.name.maxLength}
      />
      <input
        className="appointment-stage-input"
        style={toAbsoluteStyle(verifyLayout.inputs.idTail)}
        value={verifyForm.idTail}
        onChange={(event) => setVerifyForm((current) => ({ ...current, idTail: normalizeIdTailInput(event.target.value) }))}
        maxLength={verifyLayout.inputs.idTail.maxLength}
        inputMode={verifyLayout.inputs.idTail.inputMode}
        type="text"
        autoCapitalize="characters"
      />

      <ImageButton
        src={getAssetUrl(assetsBaseUrl, layout.common.prevButton.filename)}
        box={layout.common.prevButton}
        alt="上一步"
        onClick={onPrev}
      />
      <ImageSubmitButton
        src={getAssetUrl(assetsBaseUrl, layout.common.nextButton.filename)}
        box={layout.common.nextButton}
        alt={submitting ? '校验中' : '下一步'}
        disabled={submitting}
      />
    </form>
  )
}

function BookingStage({
  layout,
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
  const bookingLayout = layout.booking

  return (
    <form onSubmit={onSubmit}>
      <LayerImage
        src={getAssetUrl(assetsBaseUrl, bookingLayout.titleImage.filename)}
        box={bookingLayout.titleImage}
        alt=""
      />

      {bookingLayout.fieldImages.map((image) => (
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
        style={toAbsoluteStyle(bookingLayout.controls.appointmentDate)}
        onClick={onOpenDatePicker}
        disabled={!bookingDateOptions.length}
      >
        {bookingForm.appointmentDate || '请选择日期'}
      </button>

      <button
        type="button"
        className={`appointment-picker-trigger flex items-center justify-center ${bookingForm.appointmentSlot ? '' : 'is-placeholder'} ${bookingSlotOptions.length ? '' : 'is-disabled'}`}
        style={toAbsoluteStyle(bookingLayout.controls.appointmentSlot)}
        onClick={onOpenSlotPicker}
        disabled={!bookingSlotOptions.length}
      >
        {bookingForm.appointmentSlot || '请选择时间段'}
      </button>

      <input
        className="appointment-stage-input"
        style={toAbsoluteStyle(bookingLayout.controls.phone)}
        value={bookingForm.phone}
        onChange={(event) => setBookingForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '') }))}
        maxLength={bookingLayout.controls.phone.maxLength}
        inputMode={bookingLayout.controls.phone.inputMode}
      />

      <ImageButton
        src={getAssetUrl(assetsBaseUrl, layout.common.prevButton.filename)}
        box={layout.common.prevButton}
        alt="上一步"
        onClick={onPrev}
      />
      <ImageSubmitButton
        src={getAssetUrl(assetsBaseUrl, layout.common.nextButton.filename)}
        box={layout.common.nextButton}
        alt={submitting ? '提交中' : '下一步'}
        disabled={submitting || !bookingDateOptions.length || !bookingSlotOptions.length}
      />
    </form>
  )
}

function SuccessStage({ layout, assetsBaseUrl, name, houseKey, appointmentDate, appointmentSlot, onConfirm }) {
  const dateSlotText = [appointmentDate, appointmentSlot].filter(Boolean).join('\n')
  const successTitleLine = [name, houseKey].filter(Boolean).join('    ')
  const successLayout = layout.success

  return (
    <>
      {successLayout.images.map((image) => {
        if (image.action === 'confirm' || image.filename === 'ca5e06af6fe546199c1ce1eac1a4e4b0_6478.webp') {
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

      <div className="appointment-success-primary" style={toAbsoluteStyle(successLayout.textBlocks[0])}>
        {successTitleLine || houseKey || '请以现场安排为准'}
      </div>
      <div className="appointment-success-secondary" style={toAbsoluteStyle(successLayout.textBlocks[1])}>
        {successLayout.textBlocks[1].lines?.[0] || '您的预约时间为'}
      </div>
      <div className="appointment-success-tertiary" style={toAbsoluteStyle(successLayout.textBlocks[2])}>
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

function StateMessage({ message, backgroundUrl }) {
  return (
    <div
      className="appointment-state"
      style={{
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
      }}
    >
      <div className="max-w-xs rounded-[28px] bg-black/20 px-6 py-5 text-center text-lg font-medium tracking-[0.02em] text-white shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        {message}
      </div>
    </div>
  )
}

function LoadingScreen({ backgroundUrl }) {
  return (
    <div
      className="appointment-state"
      style={{
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
      }}
    >
      <div className="appointment-loading-bar" aria-hidden="true">
        <div className="appointment-loading-bar__fill" />
      </div>
    </div>
  )
}

function useStageMetrics(stageWidth) {
  const [metrics, setMetrics] = useState(() => getStageMetrics(stageWidth))

  useEffect(() => {
    const sync = () => setMetrics(getStageMetrics(stageWidth))
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [stageWidth])

  return metrics
}

function getStageMetrics(stageWidth) {
  if (typeof window === 'undefined') {
    return {
      scale: 1,
    }
  }
  return {
    scale: Math.max(window.innerWidth, 320) / stageWidth,
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

function normalizeIdTailInput(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^0-9X]/g, '')
    .slice(0, 4)
}

function normalizeSuccessBooking(booking) {
  if (!booking) return null
  return {
    name: String(booking.name || '').trim(),
    houseKey: String(booking.houseKey || '').trim(),
    appointmentDate: String(booking.appointmentDate || '').trim(),
    appointmentSlot: String(booking.appointmentSlot || '').trim(),
  }
}

function getAssetUrl(baseUrl, filename) {
  if (!filename) return ''
  const normalizedFilename = String(filename)
  if (/^(https?:)?\/\//.test(normalizedFilename)) return normalizedFilename
  if (!baseUrl) return ''
  return `${String(baseUrl).replace(/\/$/, '')}/${normalizedFilename.replace(/^\//, '')}`
}

function isUnauthorizedError(err) {
  return err?.response?.code === 401
}

function isSlotSoftConfirmRequired(err) {
  return err?.response?.code === 'slot_soft_confirm_required'
}

function validateVerifyForm(form) {
  if (!String(form?.building || '').trim()) return '请填写楼号'
  if (!String(form?.room || '').trim()) return '请填写房号'
  if (!String(form?.name || '').trim()) return '请填写姓名'
  const idTail = normalizeIdTailInput(form?.idTail || '')
  if (!idTail) return '请填写身份证后4位'
  if (!/^[0-9X]{4}$/.test(idTail)) return '身份证后4位必须为4位数字或X'
  return ''
}

function validateBookingForm(form) {
  if (!String(form?.appointmentDate || '').trim()) return '请选择预约日期'
  if (!String(form?.appointmentSlot || '').trim()) return '请选择预约时间段'
  const phone = String(form?.phone || '').trim()
  if (!phone) return '请填写手机号'
  if (!/^1\d{10}$/.test(phone)) return '请填写正确手机号'
  return ''
}

function getFriendlyAppointmentMessage(err, scene) {
  const rawMessage = String(err?.response?.message || err?.message || '').trim()
  const responseCode = err?.response?.code

  if (responseCode === 'slot_soft_confirm_required') {
    return rawMessage || '本时段已有较多人预约交付，此时段交付会等待较长时间，如需继续预约本时段，请您点击继续预约进行报名'
  }
  if (responseCode === 'slot_full' || rawMessage.includes('时段报名人数已满') || rawMessage.includes('预约时段人数已满')) {
    return '本时段预约人数已满，请选择其他时段报名预约'
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
    rawMessage.includes('请填写楼号') ||
    rawMessage.includes('请填写房号') ||
    rawMessage.includes('请填写姓名') ||
    rawMessage.includes('身份证后四位不能为空') ||
    rawMessage.includes('身份证后4位必须为4位数字或X') ||
    rawMessage.includes('身份证后四位必须是4位数字')
  ) {
    return rawMessage
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

function getAppointmentActivityWindowState(activity) {
  const serverStatus = activity?.activityWindow?.status
  if (serverStatus === 'not_started' || serverStatus === 'ended' || serverStatus === 'active') {
    return serverStatus
  }

  const now = Date.now()
  const startTime = parseOptionalTimestamp(activity?.startTime)
  const endTime = parseOptionalTimestamp(activity?.endTime)
  if (startTime !== null && now < startTime) return 'not_started'
  if (endTime !== null && now > endTime) return 'ended'
  return 'active'
}

function parseOptionalTimestamp(value) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

function trackAppointmentEvent(activityKey, eventType, extra = {}) {
  if (!activityKey || !eventType) return
  trackEvent({
    activityKey,
    eventType,
    page: '/appointment',
    extra: {
      activityKey,
      activityType: 'appointment_visit',
      eventName: eventType,
      ...sanitizeAppointmentAnalyticsExtra(extra),
    },
  })
}

function sanitizeAppointmentAnalyticsExtra(extra = {}) {
  const next = {}
  ;['pageKey', 'date', 'slot', 'result', 'reason'].forEach((key) => {
    const value = extra?.[key]
    if (value !== undefined && value !== null && value !== '') next[key] = value
  })
  return next
}

function classifyAppointmentAnalyticsReason(err, scene) {
  const rawMessage = String(err?.response?.message || err?.message || '').trim()
  const responseCode = String(err?.response?.code || '')

  if (responseCode === 'slot_full' || rawMessage.includes('时段报名人数已满') || rawMessage.includes('预约时段人数已满')) return 'slot_full'
  if (rawMessage.includes('手机号格式不正确')) return 'invalid_phone'
  if (rawMessage.includes('预约时间段不合法') || rawMessage.includes('预约日期格式不正确') || rawMessage.includes('请选择')) {
    return scene === 'booking' ? 'invalid_schedule' : 'invalid_input'
  }
  if (rawMessage.includes('该房号已预约')) return 'already_booked'
  if (rawMessage.includes('白名单') || rawMessage.includes('信息不匹配') || rawMessage.includes('身份校验失败')) return 'verify_failed'
  if (rawMessage.includes('活动未开始')) return 'activity_not_started'
  if (rawMessage.includes('活动已截止')) return 'activity_ended'
  if (rawMessage.includes('Failed to fetch') || rawMessage.includes('NetworkError')) return 'network_error'
  return scene === 'verify' ? 'verify_error' : 'booking_error'
}
