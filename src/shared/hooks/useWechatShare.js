import { useEffect } from 'react'
import { getJsSdkSignature } from '../../projects/video-rank/api'
import { getQueryParam, sanitizeUrlForWechat } from '../utils/url'
import { loadWechatJsSdk } from '../utils/wechat'

const SHARE_IMAGE_URL = 'https://web.zice8.com/share/default-share.jpg'
const INITIAL_PAGE_URL = typeof window !== 'undefined' ? window.location.href : ''

function removeHash(inputUrl) {
  const parsed = new URL(inputUrl)
  parsed.hash = ''
  return parsed.toString()
}

function isIosWechat() {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  return /MicroMessenger/i.test(ua) && /iP(?:hone|ad|od)/i.test(ua)
}

function uniqueUrls(urls) {
  return urls.filter((url, index) => url && urls.indexOf(url) === index)
}

function getWechatSignatureUrls() {
  const currentUrl = sanitizeUrlForWechat(window.location.href)
  const initialUrl = removeHash(INITIAL_PAGE_URL || window.location.href)
  return isIosWechat()
    ? uniqueUrls([initialUrl, currentUrl])
    : uniqueUrls([currentUrl, initialUrl])
}

function getShareData(activity, url) {
  return {
    title: activity.shareTitle || activity.title,
    desc: activity.shareDesc ?? '',
    link: activity.shareLink || url,
    imgUrl: activity.shareImage || SHARE_IMAGE_URL,
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

export function useWechatShare(activityKey, activity, onStatusChange, options = {}) {
  const openTagListKey = (options?.openTagList || []).join(',')

  useEffect(() => {
    if (!activityKey || !activity) return

    let cancelled = false
    const signatureUrls = getWechatSignatureUrls()
    const shareUrl = sanitizeUrlForWechat(window.location.href)
    const wxDebug = getQueryParam('debug') === 'wx'
    const openTagList = openTagListKey ? openTagListKey.split(',') : []

    function configureWechat(wx, signature, signingUrl, attemptIndex) {
      return new Promise((resolve, reject) => {
        let settled = false
        const timeout = window.setTimeout(() => {
          if (settled) return
          settled = true
          reject(new Error('微信 JS-SDK 初始化超时'))
        }, 8000)

        const settle = (fn, payload) => {
          if (settled) return
          settled = true
          window.clearTimeout(timeout)
          fn(payload)
        }

        wx.ready(() => {
          if (cancelled || settled) return
          const data = getShareData(activity, shareUrl)
          configureShare(wx, data)
          onStatusChange?.({
            wxConfigStatus: 'success',
            wxConfigError: '',
            wxConfigUrl: signingUrl,
            wxConfigAttempt: attemptIndex + 1,
            shareConfigured: true,
            shareTitle: data.title,
            shareImage: data.imgUrl,
            wxExists: true,
          })
          settle(resolve)
        })

        wx.error((error) => {
          settle(reject, error)
        })

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
            'openLocation',
            'startRecord',
            'stopRecord',
            'onVoiceRecordEnd',
            'playVoice',
            'pauseVoice',
            'stopVoice',
            'onVoicePlayEnd',
            'uploadVoice',
          ],
          ...(openTagList.length ? { openTagList } : {}),
        })
      })
    }

    async function initWechatShare() {
      try {
        onStatusChange?.({
          signingUrl: signatureUrls[0],
          signatureStatus: 'loading',
          wxScriptLoadStatus: window.wx ? 'success' : 'idle',
          wxExists: Boolean(window.wx),
          wxConfigStatus: 'idle',
          shareConfigured: false,
        })

        onStatusChange?.({ wxScriptLoadStatus: window.wx ? 'success' : 'loading', wxExists: Boolean(window.wx) })
        const wx = await loadWechatJsSdk()
        if (cancelled) return
        onStatusChange?.({ wxScriptLoadStatus: 'success', wxExists: Boolean(wx || window.wx), wxConfigStatus: 'loading' })

        let lastError = null
        for (let index = 0; index < signatureUrls.length; index += 1) {
          const signingUrl = signatureUrls[index]
          try {
            onStatusChange?.({ signatureStatus: 'loading', signingUrl })
            const signature = await getJsSdkSignature(activityKey, signingUrl)
            if (cancelled) return
            onStatusChange?.({ signatureStatus: 'success', signingUrl: signature.url })
            await configureWechat(wx, signature, signature.url, index)
            return
          } catch (error) {
            lastError = error
            if (cancelled) return
          }
        }

        throw lastError || new Error('微信 JS-SDK 初始化失败')
      } catch (error) {
        if (cancelled) return
        const isScriptError = error.message?.includes('微信 JS-SDK 脚本加载')
        onStatusChange?.({
          signatureStatus: isScriptError ? 'success' : 'failed',
          signatureError: isScriptError ? '' : error.message,
          wxScriptLoadStatus: isScriptError ? 'failed' : window.wx ? 'success' : 'idle',
          wxConfigStatus: 'failed',
          wxConfigError: isScriptError ? '微信 JS-SDK 脚本加载失败' : (error.errMsg || error.message || JSON.stringify(error)),
          wxExists: Boolean(window.wx),
          shareConfigured: false,
        })
      }
    }

    initWechatShare()

    return () => {
      cancelled = true
    }
  }, [activityKey, activity, onStatusChange, openTagListKey])
}
