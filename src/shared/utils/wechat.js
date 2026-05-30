const WECHAT_JS_SDK_SRC = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'
let wechatJsSdkPromise = null

export function loadWechatJsSdk() {
  if (window.wx) {
    return Promise.resolve(window.wx)
  }

  if (wechatJsSdkPromise) {
    return wechatJsSdkPromise
  }

  wechatJsSdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${WECHAT_JS_SDK_SRC}"]`)
    const script = existingScript || document.createElement('script')

    script.async = true
    script.src = WECHAT_JS_SDK_SRC
    script.onload = () => {
      if (window.wx) {
        resolve(window.wx)
      } else {
        wechatJsSdkPromise = null
        reject(new Error('微信 JS-SDK 脚本加载后 window.wx 不存在'))
      }
    }
    script.onerror = () => {
      wechatJsSdkPromise = null
      reject(new Error('微信 JS-SDK 脚本加载失败'))
    }

    if (!existingScript) {
      document.head.appendChild(script)
    }
  })

  return wechatJsSdkPromise
}
