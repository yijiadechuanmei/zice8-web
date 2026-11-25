import { useEffect, useState } from 'react'
import { request } from '../../shared/api/request'
import { useWechatAuth } from '../../shared/hooks/useWechatAuth'
import { useWechatShare } from '../../shared/hooks/useWechatShare'
import './style.css'

const TYPE = 'equipment_visit'
const DEFAULT_KEY = 'zhqb26'
const ASSET_FILES = {
  background: 'background-main.png',
  logo: 'brand-logo.png',
  title: 'title-and-subtitle.png',
  badge: 'main-badge.png',
  orbit: 'golden-orbit-rings.png',
  soldier: 'soldier-silhouette.png',
  leftBird: 'bird-left.png',
  rightBirds: 'birds-right.png',
}

export default function EquipmentVisit({ routeParams }) {
  const activityKey = routeParams?.activityKey || DEFAULT_KEY
  const [config, setConfig] = useState(null)
  const [visitNumber, setVisitNumber] = useState(null)
  const [error, setError] = useState('')
  const { authReady, blockedMessage } = useWechatAuth(activityKey, config)
  const assetsBase = config?.mobileConfig?.assetsBaseUrl
    || `https://assets.zice8.com/${TYPE}/${activityKey}`
  const asset = (name) => `${assetsBase}/${ASSET_FILES[name]}`

  useWechatShare(activityKey, config)

  useEffect(() => {
    let active = true
    request(`/activities/${encodeURIComponent(activityKey)}/public-config`, { skipAuth: true })
      .then((data) => { if (active) setConfig(data) })
      .catch(() => { if (active) setError('活动暂时无法打开') })
    return () => { active = false }
  }, [activityKey])

  useEffect(() => {
    if (!authReady || !config) return undefined
    let active = true
    request(`/equipment-visit/activities/${encodeURIComponent(activityKey)}/enter`, { method: 'POST' })
      .then((data) => { if (active) setVisitNumber(data.visitNumber) })
      .catch(() => { if (active) setError('到访序号获取失败，请刷新重试') })
    return () => { active = false }
  }, [activityKey, authReady, config])

  return (
    <main className="equipment-visit" aria-label="铸魂强基 装备报国">
      <div className="equipment-visit__canvas">
        <img className="equipment-visit__background" src={asset('background')} alt="" />
        <img className="equipment-visit__orbit" src={asset('orbit')} alt="" />
        <img className="equipment-visit__logo" src={asset('logo')} alt="中国电气装备" />
        <img className="equipment-visit__title" src={asset('title')} alt="铸魂强基 装备报国，中国电气装备党委2026年思想政治教育主题日" />
        <div className="equipment-visit__badge">
          <div className="equipment-visit__badge-float">
            <img src={asset('badge')} alt="铸魂强基 装备报国主题徽章" />
            <span className="equipment-visit__badge-sheen" aria-hidden="true" />
          </div>
        </div>
        <img className="equipment-visit__left-bird" src={asset('leftBird')} alt="" />
        <img className="equipment-visit__right-birds" src={asset('rightBirds')} alt="" />
        <img className="equipment-visit__soldier" src={asset('soldier')} alt="" />
        <div className="equipment-visit__footer" aria-live="polite">
          {error || blockedMessage ? (
            <span className="equipment-visit__status">{error || blockedMessage}</span>
          ) : (
            <>
              <div>您是第 <strong>{visitNumber === null ? '····' : visitNumber}</strong> 位到访</div>
              <div>中国电气装备思想政治教育基地的人员</div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
