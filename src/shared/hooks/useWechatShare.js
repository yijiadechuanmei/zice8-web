import { useEffect } from 'react'
import { getJsSdkSignature } from '../../projects/video-rank/api'
import { removeUrlHashAndToken } from '../utils/url'

const SHARE_IMAGE_URL = 'https://web.zice8.com/share/default-share.jpg'

export function useWechatShare(activityKey, activity, onStatusChange) {
  useEffect(() => {
    if (!activityKey || !activity) return
    const url = removeUrlHashAndToken(window.location.href)
    onStatusChange?.({ signingUrl: url, signatureStatus: 'loading', wxExists: Boolean(window.wx) })

    getJsSdkSignature(activityKey, url)
      .then((signature) => {
        onStatusChange?.({ signatureStatus: 'success', signingUrl: signature.url, wxExists: Boolean(window.wx) })
        if (!window.wx) {
          onStatusChange?.({ wxConfigStatus: 'failed', wxConfigError: 'window.wx 不存在，请确认已引入微信 JS-SDK', shareConfigured: false })
          return
        }

        window.wx.config({
          debug: false,
          appId: signature.appId,
          timestamp: signature.timestamp,
          nonceStr: signature.nonceStr,
          signature: signature.signature,
          jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData'],
        })
        window.wx.ready(() => {
          const data = {
            title: activity.title,
            desc: '观看视频，参与留言排名',
            link: url,
            imgUrl: SHARE_IMAGE_URL,
          }
          window.wx.updateAppMessageShareData(data)
          window.wx.updateTimelineShareData(data)
          onStatusChange?.({ wxConfigStatus: 'success', shareConfigured: true, shareTitle: data.title, shareImage: data.imgUrl })
        })
        window.wx.error((error) => {
          onStatusChange?.({ wxConfigStatus: 'failed', wxConfigError: JSON.stringify(error), shareConfigured: false })
        })
      })
      .catch((error) => {
        onStatusChange?.({ signatureStatus: 'failed', signatureError: error.message, wxExists: Boolean(window.wx), shareConfigured: false })
      })
  }, [activityKey, activity, onStatusChange])
}
