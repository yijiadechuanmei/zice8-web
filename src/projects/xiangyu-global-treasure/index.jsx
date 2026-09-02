import { useEffect, useMemo, useRef, useState } from 'react'
import { LoadingOutlined } from '@ant-design/icons'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import {
  drawXiangyuGlobalTreasure,
  getXiangyuGlobalTreasurePublicConfig,
  getXiangyuGlobalTreasureState,
  redeemXiangyuGlobalTreasure,
} from './api'
import {
  assetUrl,
  mergeConfig,
  XIANGYU_GLOBAL_TREASURE_ACTIVITY_KEY,
} from './config'
import './styles.css'

export default function XiangyuGlobalTreasureProject({ routeParams }) {
  const activityKey = routeParams?.activityKey || XIANGYU_GLOBAL_TREASURE_ACTIVITY_KEY
  const [publicConfig, setPublicConfig] = useState(null)
  const [state, setState] = useState(null)
  const [organizationName, setOrganizationName] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [redeemOpen, setRedeemOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const verifyInputRef = useRef(null)
  const config = useMemo(() => mergeConfig(publicConfig), [publicConfig])
  const { authReady, blockedMessage } = useWechatAuth(activityKey, publicConfig)

  useWechatShare(activityKey, publicConfig)

  useEffect(() => {
    document.body.classList.add('xygt-lock-scroll')
    return () => document.body.classList.remove('xygt-lock-scroll')
  }, [])

  useEffect(() => {
    let active = true
    getXiangyuGlobalTreasurePublicConfig(activityKey)
      .then((data) => { if (active) setPublicConfig(data) })
      .catch((error) => { if (active) setMessage(error.message || '活动配置加载失败') })
    return () => { active = false }
  }, [activityKey])

  useEffect(() => {
    if (!authReady) return undefined
    let active = true
    setLoading(true)
    getXiangyuGlobalTreasureState(activityKey)
      .then((data) => { if (active) setState(data) })
      .catch((error) => { if (active) setMessage(error.message || '活动状态加载失败，请刷新重试') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activityKey, authReady])

  useEffect(() => {
    if (!blockedMessage) return
    setLoading(false)
    setMessage(blockedMessage)
  }, [blockedMessage])

  useEffect(() => {
    document.title = publicConfig?.title || '象屿股份 寻宝全球'
  }, [publicConfig])

  useEffect(() => {
    if (!redeemOpen) return undefined
    const timer = window.setTimeout(() => verifyInputRef.current?.focus(), 80)
    return () => window.clearTimeout(timer)
  }, [redeemOpen])

  async function draw() {
    if (submitting) return
    const name = organizationName.trim()
    if (!name) {
      setMessage('请输入单位名称')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      setState(await drawXiangyuGlobalTreasure(activityKey, name))
    } catch (error) {
      setMessage(error.message || '寻宝失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  async function redeem(event) {
    event.preventDefault()
    const code = verificationCode.trim()
    if (!code || submitting) return
    setSubmitting(true)
    setMessage('')
    try {
      setState(await redeemXiangyuGlobalTreasure(activityKey, code))
      setVerificationCode('')
      setRedeemOpen(false)
    } catch (error) {
      setMessage(error.message || '核销失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const background = assetUrl(config.assetsBaseUrl, config.backgroundImage)
  return (
    <main className="xygt-app" aria-label="象屿股份寻宝全球">
      <section className="xygt-stage" style={{ '--xygt-bg': `url("${background}")` }}>
        <div className="xygt-canvas">
          <ImageAsset className="xygt-background" src={background} alt="" />
          <ImageAsset className="xygt-brand" src={assetUrl(config.assetsBaseUrl, config.brandImage)} alt="象屿股份" />
          {!loading && state?.page === 'home' ? (
            <HomePage
              config={config}
              organizationName={organizationName}
              onOrganizationNameChange={setOrganizationName}
              onDraw={draw}
              submitting={submitting}
            />
          ) : null}
          {!loading && state?.page === 'won' ? <WonPage config={config} onOpen={() => { setMessage(''); setRedeemOpen(true) }} /> : null}
          {!loading && state?.page === 'redeemed' ? <RedeemedPage config={config} /> : null}
          {!loading && state?.page === 'not_won' ? <NotWonPage config={config} onNotice={() => setMessage('今日寻宝机会已使用，请明天再来')} /> : null}
          {loading ? <LoadingState /> : null}
          {!loading && message && !redeemOpen ? <MessageToast message={message} onClose={() => setMessage('')} /> : null}
          {redeemOpen ? (
            <RedeemDialog
              config={config}
              code={verificationCode}
              error={message}
              submitting={submitting}
              inputRef={verifyInputRef}
              onCodeChange={setVerificationCode}
              onClose={() => { setMessage(''); setRedeemOpen(false) }}
              onSubmit={redeem}
            />
          ) : null}
        </div>
      </section>
    </main>
  )
}

function HomePage({ config, organizationName, onOrganizationNameChange, onDraw, submitting }) {
  return (
    <div className="xygt-page xygt-page--home">
      <ImageAsset className="xygt-home-title" src={assetUrl(config.assetsBaseUrl, config.homeTitleImage)} alt="象屿股份 寻宝全球" />
      <ImageAsset className="xygt-home-mascot" src={assetUrl(config.assetsBaseUrl, config.homeMascotImage)} alt="寻宝象" />
      <ImageAsset className="xygt-home-field-label" src={assetUrl(config.assetsBaseUrl, config.homeFieldLabelImage)} alt="出发地（单位名称）" />
      <div className="xygt-home-input-wrap">
        <ImageAsset src={assetUrl(config.assetsBaseUrl, config.inputBackgroundImage)} alt="" />
        <input
          aria-label="单位名称"
          value={organizationName}
          maxLength={100}
          onChange={(event) => onOrganizationNameChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') onDraw() }}
          placeholder="请输入单位名称"
          autoComplete="organization"
        />
      </div>
      <button className="xygt-image-button xygt-home-start" type="button" disabled={submitting} onClick={onDraw}>
        <ImageAsset src={assetUrl(config.assetsBaseUrl, config.homeButtonImage)} alt="出发寻宝" />
      </button>
    </div>
  )
}

function WonPage({ config, onOpen }) {
  return (
    <div className="xygt-page xygt-page--won xygt-page-enter">
      <ImageAsset className="xygt-won-title" src={assetUrl(config.assetsBaseUrl, config.wonTitleImage)} alt="寻宝成功" />
      <ImageAsset className="xygt-locked-chest" src={assetUrl(config.assetsBaseUrl, config.lockedChestImage)} alt="待开启的宝箱" />
      <button className="xygt-image-button xygt-open-button" type="button" onClick={onOpen}>
        <ImageAsset src={assetUrl(config.assetsBaseUrl, config.openChestButtonImage)} alt="打开宝箱" />
      </button>
    </div>
  )
}

function RedeemedPage({ config }) {
  return (
    <div className="xygt-page xygt-page--redeemed xygt-page-enter">
      <ImageAsset className="xygt-won-title" src={assetUrl(config.assetsBaseUrl, config.wonTitleImage)} alt="寻宝成功" />
      <ImageAsset className="xygt-opened-title" src={assetUrl(config.assetsBaseUrl, config.openedTitleImage)} alt="宝箱已打开" />
      <ImageAsset className="xygt-opened-chest" src={assetUrl(config.assetsBaseUrl, config.openedChestImage)} alt="已打开的宝箱" />
    </div>
  )
}

function NotWonPage({ config, onNotice }) {
  return (
    <div className="xygt-page xygt-page--not-won xygt-page-enter">
      <ImageAsset className="xygt-lost-title" src={assetUrl(config.assetsBaseUrl, config.lostTitleImage)} alt="寻宝失败" />
      <ImageAsset className="xygt-daily-limit" src={assetUrl(config.assetsBaseUrl, config.dailyLimitImage)} alt="每人每天只限1次寻宝机会" />
      <ImageAsset className="xygt-lost-mascot" src={assetUrl(config.assetsBaseUrl, config.lostMascotImage)} alt="寻宝象" />
      <button className="xygt-image-button xygt-try-again" type="button" onClick={onNotice}>
        <ImageAsset src={assetUrl(config.assetsBaseUrl, config.tryAgainImage)} alt="再接再厉" />
      </button>
      <button className="xygt-image-button xygt-tomorrow" type="button" onClick={onNotice}>
        <ImageAsset src={assetUrl(config.assetsBaseUrl, config.tomorrowImage)} alt="明天再来" />
      </button>
    </div>
  )
}

function RedeemDialog({ config, code, error, submitting, inputRef, onCodeChange, onClose, onSubmit }) {
  return (
    <div className="xygt-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="xygt-redeem-dialog" role="dialog" aria-modal="true" aria-label="输入财富密码" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <ImageAsset src={assetUrl(config.assetsBaseUrl, config.redeemPanelImage)} alt="输入财富密码" />
        <input
          ref={inputRef}
          aria-label="财富密码"
          value={code}
          maxLength={32}
          onChange={(event) => onCodeChange(event.target.value)}
          placeholder="请输入财富密码"
          autoComplete="off"
        />
        <button className="xygt-image-button xygt-redeem-submit" type="submit" disabled={!code.trim() || submitting}>
          <ImageAsset src={assetUrl(config.assetsBaseUrl, config.openChestButtonImage)} alt="打开宝箱" />
        </button>
        {error ? <p className="xygt-dialog-error" role="alert">{error}</p> : null}
      </form>
    </div>
  )
}

function MessageToast({ message, onClose }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 1500)
    return () => window.clearTimeout(timer)
  }, [message, onClose])

  const preventBackgroundAction = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <div
      className="xygt-message-layer"
      role="presentation"
      onPointerDown={preventBackgroundAction}
      onClick={preventBackgroundAction}
    >
      <p className="xygt-message" role="alert">{message}</p>
    </div>
  )
}

function LoadingState() {
  return <div className="xygt-center-state"><LoadingOutlined spin /><span>正在准备寻宝...</span></div>
}

function ImageAsset({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />
}
