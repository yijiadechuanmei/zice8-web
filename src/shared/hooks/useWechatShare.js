import { useEffect } from 'react'
import { getJsSdkSignature } from '../../projects/video-rank/api'
import { getQueryParam, removeUrlHashAndToken } from '../utils/url'
import { loadWechatJsSdk } from '../utils/wechat'

const SHARE_IMAGE_URL = 'https://web.zice8.com/share/default-share.jpg'

function getShareData(activity, url) {
  return {
    title: activity.title,
    desc: '观看视频，参与留言排名',
    link: url,
    imgUrl: SHARE_IMAGE_URL,
  }
}

function configureShare(wx, data) {
  if (typeof wx.updateAppMessageShareData === 'function') {
    wx.updateAppMessageShareData(data)
  }
  if (typeof wx.updateTimelineShareData === 'function') {
    wx.updateTimelineShareData(data)
  }
  if (typeof wx.onMenuShareAppMessage === 'function') {
    wx.onMenuShareAppMessage(data)
  }
  if (typeof wx.onMenuShareTimeline === 'function') {
    wx.onMenuShareTimeline(data)
  }
}

export function useWechatShare(activityKey, activity, onStatusChange) {
  useEffect(() => {
    if (!activityKey || !activity) return

    let cancelled = false
    const url = removeUrlHashAndToken(window.location.href)
    const wxDebug = getQueryParam('debug') === '1'

    async function initWechatShare() {
      try {
        onStatusChange?.({
          signingUrl: url,
          signatureStatus: 'loading',
          wxScriptLoadStatus: window.wx ? 'success' : 'idle',
          wxExists: Boolean(window.wx),
          wxConfigStatus: 'idle',
          shareConfigured: false,
        })

        const signature = await getJsSdkSignature(activityKey, url)
        if (cancelled) return
        onStatusChange?.({ signatureStatus: 'success', signingUrl: signature.url })

        onStatusChange?.({ wxScriptLoadStatus: window.wx ? 'success' : 'loading', wxExists: Boolean(window.wx) })
        const wx = await loadWechatJsSdk()
        if (cancelled) return
        onStatusChange?.({ wxScriptLoadStatus: 'success', wxExists: Boolean(wx || window.wx), wxConfigStatus: 'loading' })

        wx.config({
          debug: wxDebug,
          appId: signature.appId,
          timestamp: signature.timestamp,
          nonceStr: signature.nonceStr,
          signature: signature.signature,
          jsApiList: [
            'updateAppMessageShareData',
            'updateTimelineShareData',
            'onMenuShareAppMessage',
            'onMenuShareTimeline',
          ],
        })

        wx.ready(() => {
          if (cancelled) return
          const data = getShareData(activity, url)
          configureShare(wx, data)
          onStatusChange?.({
            wxConfigStatus: 'success',
            wxConfigError: '',
            shareConfigured: true,
            shareTitle: data.title,
            shareImage: data.imgUrl,
            wxExists: true,
          })
        })

        wx.error((error) => {
          if (cancelled) return
          onStatusChange?.({
            wxConfigStatus: 'failed',
            wxConfigError: JSON.stringify(error),
            shareConfigured: false,
            wxExists: Boolean(window.wx),
          })
        })
      } catch (error) {
        if (cancelled) return
        const isScriptError = error.message?.includes('微信 JS-SDK 脚本加载')
        onStatusChange?.({
          signatureStatus: isScriptError ? 'success' : 'failed',
          signatureError: isScriptError ? '' : error.message,
          wxScriptLoadStatus: isScriptError ? 'failed' : window.wx ? 'success' : 'idle',
          wxConfigStatus: 'failed',
          wxConfigError: isScriptError ? '微信 JS-SDK 脚本加载失败' : error.message,
          wxExists: Boolean(window.wx),
          shareConfigured: false,
        })
      }
    }

    initWechatShare()

    return () => {
      cancelled = true
    }
  }, [activityKey, activity, onStatusChange])
}
