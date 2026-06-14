/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import { setToken } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { getQueryParam, getTokenFromUrl, sanitizeUrlForWechat } from '../../shared/utils/url'
import { createAppointmentBooking, getBootstrap, getPublicConfig, verifyAppointment } from './api'

const STEPS = {
  INTRO: 'intro',
  RULE: 'rule',
  VERIFY: 'verify',
  BOOKING: 'booking',
  SUCCESS: 'success',
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
  const { authReady, blockedMessage, reauth } = useWechatAuth(activityKey, publicConfig)

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
        if (data?.hasBooking) {
          setStep(STEPS.SUCCESS)
        } else {
          setStep(STEPS.INTRO)
        }
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
    const configDates = config?.dateRange?.dates || []
    const allowedDates = verifyResult?.allowedDates || []
    if (!allowedDates.length) return configDates
    return configDates.filter((date) => allowedDates.includes(date))
  }, [config?.dateRange?.dates, verifyResult?.allowedDates])

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
      appointmentDate: bookingDateOptions.includes(current.appointmentDate) ? current.appointmentDate : bookingDateOptions[0],
    }))
  }, [bookingDateOptions])

  useEffect(() => {
    if (!bookingSlotOptions.length) return
    setBookingForm((current) => ({
      ...current,
      appointmentSlot: bookingSlotOptions.includes(current.appointmentSlot) ? current.appointmentSlot : bookingSlotOptions[0],
    }))
  }, [bookingSlotOptions])

  function showToast(message) {
    setToast(message || '')
    if (!message) return
    window.setTimeout(() => setToast(''), 1800)
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

  if (loading) return <CenteredMessage message="活动加载中..." />
  if (blockedMessage) return <CenteredMessage message={blockedMessage} />
  if (error) return <CenteredMessage message={error} />
  if (!config) return <CenteredMessage message="活动配置缺失" />

  const booking = bootstrap?.booking
  const headingImage = getAssetUrl(config.assetsBaseUrl, config.assets.topBanner)
  const backgroundImage = getAssetUrl(config.assetsBaseUrl, config.assets.background)
  const rulePanelImage = getAssetUrl(config.assetsBaseUrl, config.assets.rulePanel)
  const successBannerImage = getAssetUrl(config.assetsBaseUrl, config.assets.successBanner)

  return (
    <main
      className="min-h-screen bg-[linear-gradient(180deg,#f6f0e2_0%,#fff7ef_45%,#fff_100%)] px-3 py-4 text-slate-900"
      style={{
        backgroundImage: backgroundImage ? `linear-gradient(180deg,rgba(246,240,226,0.92),rgba(255,255,255,0.96)), url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'top center',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[750px] flex-col rounded-[32px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_60px_rgba(139,69,19,0.12)] backdrop-blur">
        {headingImage ? (
          <img
            className="mx-auto mb-5 w-full max-w-[640px] rounded-[24px] object-cover"
            src={headingImage}
            alt={bootstrap?.activity?.title || '预约到访'}
          />
        ) : (
          <div className="mb-5 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-700">Appointment Visit</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold text-slate-900">{bootstrap?.activity?.title || '预约到访'}</h1>
          </div>
        )}

        <StepIndicator step={step} />

        {step === STEPS.INTRO && (
          <StepCard
            eyebrow="Step 1"
            title={bootstrap?.activity?.title || '预约到访活动'}
            description="先完成身份核验，再选择允许预约的日期和时间段。"
            imageUrl={headingImage}
            primaryText="查看规则"
            onPrimaryClick={() => setStep(STEPS.RULE)}
          />
        )}

        {step === STEPS.RULE && (
          <StepCard
            eyebrow="Step 2"
            title="预约规则"
            description="每个 openid 在同一活动下仅可预约一次；同一房号默认也只可预约一次。预约日期必须命中白名单允许日期。"
            imageUrl={rulePanelImage}
            primaryText="开始校验身份"
            secondaryText="返回首页"
            onPrimaryClick={() => setStep(STEPS.VERIFY)}
            onSecondaryClick={() => setStep(STEPS.INTRO)}
          />
        )}

        {step === STEPS.VERIFY && (
          <section className="flex-1 rounded-[28px] bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <SectionTitle eyebrow="Step 3" title="身份校验" description="请输入楼号、房号、姓名和身份证后 4 位，后端会按 house_key = 楼号-房号 做白名单校验。" />
            <form className="mt-5 grid gap-4" onSubmit={handleVerifySubmit}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="楼号">
                  <input className={inputClassName} value={verifyForm.building} onChange={(event) => setVerifyForm({ ...verifyForm, building: event.target.value })} placeholder="例如 1" />
                </Field>
                <Field label="房号">
                  <input className={inputClassName} value={verifyForm.room} onChange={(event) => setVerifyForm({ ...verifyForm, room: event.target.value })} placeholder="例如 101" />
                </Field>
              </div>
              <Field label="姓名">
                <input className={inputClassName} value={verifyForm.name} onChange={(event) => setVerifyForm({ ...verifyForm, name: event.target.value })} placeholder="请输入姓名" />
              </Field>
              <Field label="身份证后 4 位">
                <input className={inputClassName} value={verifyForm.idTail} maxLength={4} onChange={(event) => setVerifyForm({ ...verifyForm, idTail: event.target.value.replace(/\D/g, '') })} placeholder="4 位数字" />
              </Field>
              <ActionRow
                primaryText={submitting ? '校验中...' : '校验并进入预约'}
                secondaryText="返回规则"
                onSecondaryClick={() => setStep(STEPS.RULE)}
                disabled={submitting}
              />
            </form>
          </section>
        )}

        {step === STEPS.BOOKING && (
          <section className="flex-1 rounded-[28px] bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <SectionTitle eyebrow="Step 4" title="选择预约时间" description={`当前房号 ${verifyResult?.houseKey || ''} 已通过白名单校验。`} />
            <form className="mt-5 grid gap-4" onSubmit={handleBookingSubmit}>
              <Field label="预约日期">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {bookingDateOptions.map((date) => (
                    <button
                      key={date}
                      type="button"
                      className={bookingForm.appointmentDate === date ? selectedChipClassName : chipClassName}
                      onClick={() => setBookingForm({ ...bookingForm, appointmentDate: date })}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="预约时段">
                <div className="grid grid-cols-2 gap-2">
                  {bookingSlotOptions.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={bookingForm.appointmentSlot === slot ? selectedChipClassName : chipClassName}
                      onClick={() => setBookingForm({ ...bookingForm, appointmentSlot: slot })}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="手机号">
                <input
                  className={inputClassName}
                  value={bookingForm.phone}
                  maxLength={11}
                  onChange={(event) => setBookingForm({ ...bookingForm, phone: event.target.value.replace(/\D/g, '') })}
                  placeholder="请输入 11 位手机号"
                />
              </Field>
              <ActionRow
                primaryText={submitting ? '提交中...' : '确认预约'}
                secondaryText="返回修改"
                onSecondaryClick={() => setStep(STEPS.VERIFY)}
                disabled={submitting || !bookingDateOptions.length || !bookingSlotOptions.length}
              />
            </form>
          </section>
        )}

        {step === STEPS.SUCCESS && (
          <section className="flex-1 rounded-[28px] bg-white/92 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <SectionTitle eyebrow="Step 5" title="预约成功" description="再次进入活动时，如果后端根据 openid 查到预约记录，会直接落到这里。" />
            {successBannerImage ? (
              <img className="mt-4 w-full rounded-[24px] object-cover" src={successBannerImage} alt="预约成功" />
            ) : null}
            <dl className="mt-5 grid gap-3 rounded-[22px] bg-amber-50 p-4 text-sm text-slate-700">
              <InfoRow label="房号" value={booking?.houseKey || verifyResult?.houseKey || '-'} />
              <InfoRow label="姓名" value={booking?.name || verifyForm.name || '-'} />
              <InfoRow label="预约日期" value={booking?.appointmentDate || bookingForm.appointmentDate || '-'} />
              <InfoRow label="预约时段" value={booking?.appointmentSlot || bookingForm.appointmentSlot || '-'} />
              <InfoRow label="手机号" value={booking?.phone || bookingForm.phone || '-'} />
            </dl>
            <div className="mt-5">
              <button className={primaryButtonClassName} type="button" onClick={() => window.location.reload()}>
                重新加载活动
              </button>
            </div>
          </section>
        )}
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </main>
  )
}

function CenteredMessage({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-center text-slate-600">
      {message}
    </div>
  )
}

function StepIndicator({ step }) {
  const labels = [
    ['intro', '首页'],
    ['rule', '规则'],
    ['verify', '校验'],
    ['booking', '预约'],
    ['success', '成功'],
  ]

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {labels.map(([key, label]) => (
        <span
          key={key}
          className={step === key ? 'rounded-full bg-amber-700 px-3 py-1 text-xs font-medium text-white' : 'rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700'}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function StepCard({ eyebrow, title, description, imageUrl, primaryText, secondaryText, onPrimaryClick, onSecondaryClick }) {
  return (
    <section className="flex flex-1 flex-col rounded-[28px] bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <SectionTitle eyebrow={eyebrow} title={title} description={description} />
      {imageUrl ? <img className="mt-5 flex-1 rounded-[24px] object-cover" src={imageUrl} alt="" aria-hidden="true" /> : null}
      <div className="mt-5 flex flex-col gap-3">
        <button className={primaryButtonClassName} type="button" onClick={onPrimaryClick}>{primaryText}</button>
        {secondaryText ? <button className={secondaryButtonClassName} type="button" onClick={onSecondaryClick}>{secondaryText}</button> : null}
      </div>
    </section>
  )
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <header>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </header>
  )
}

function Field({ label, children }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function ActionRow({ primaryText, secondaryText, onSecondaryClick, disabled }) {
  return (
    <div className="mt-2 flex flex-col gap-3">
      <button className={primaryButtonClassName} type="submit" disabled={disabled}>
        {primaryText}
      </button>
      <button className={secondaryButtonClassName} type="button" onClick={onSecondaryClick}>
        {secondaryText}
      </button>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}

function getAssetUrl(baseUrl, filename) {
  if (!baseUrl || !filename) return ''
  return `${String(baseUrl).replace(/\/$/, '')}/${String(filename).replace(/^\//, '')}`
}

function isUnauthorizedError(err) {
  return err?.response?.code === 401
}

const inputClassName =
  'w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-amber-500'

const chipClassName =
  'rounded-2xl border border-amber-200 bg-white px-3 py-3 text-sm text-slate-700 transition hover:border-amber-400'

const selectedChipClassName =
  'rounded-2xl border border-amber-700 bg-amber-700 px-3 py-3 text-sm font-medium text-white shadow'

const primaryButtonClassName =
  'w-full rounded-full bg-amber-700 px-5 py-3 text-base font-medium text-white shadow-[0_12px_24px_rgba(180,83,9,0.22)] transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60'

const secondaryButtonClassName =
  'w-full rounded-full border border-amber-300 bg-white px-5 py-3 text-base font-medium text-amber-800 transition hover:border-amber-500 hover:bg-amber-50'
