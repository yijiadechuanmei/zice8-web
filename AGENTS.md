# AGENTS.md — zice8-web

## 项目定位

本项目是 `zice8-web`，用于开发和部署微信 H5 前端页面。

对应线上域名：

```text
https://web.zice8.com
```

后端统一 API 项目为：

```text
../zice8-api
```

后端线上域名：

```text
https://api.zice8.com
```

本项目主要用于：

```text
1. 纯展示类 H5
2. 视频观看排名 H5
3. 投票 H5
4. 答题 H5
5. 抽奖 H5
6. 表单收集 H5
7. 其他微信活动页
```

## 技术栈

```text
React
Vite
JavaScript
Tailwind CSS
Framer Motion
```

不要随意引入大型 UI 框架，除非明确要求。

## 工作规则

1. 本次修改如果只涉及前端，不要修改 `../zice8-api`。
2. 可以读取 `../zice8-api` 作为接口参考。
3. 不要重构无关代码。
4. 不要删除已有功能。
5. 不要修改已有接口调用格式，除非任务明确要求。
6. 不要随意改变页面视觉风格。
7. 修改前先理解当前项目结构。
8. 新增功能优先放到对应项目目录或 `src/shared`。
9. 通用能力放 `src/shared`，具体项目能力放 `src/projects/项目名`。
10. 代码要适合微信内置浏览器。

## 推荐目录结构

```text
src
├── projects
│   ├── display-demo
│   ├── video-rank
│   ├── vote
│   ├── quiz
│   └── lottery
│
├── shared
│   ├── api
│   │   └── request.js
│   ├── components
│   │   ├── DesignStage.jsx
│   │   ├── AnimatedImage.jsx
│   │   ├── PageTransition.jsx
│   │   ├── Loading.jsx
│   │   └── Modal.jsx
│   ├── hooks
│   │   ├── useScaleStage.js
│   │   ├── useWechatAuth.js
│   │   ├── useWechatShare.js
│   │   ├── useWechatLocation.js
│   │   └── usePage.js
│   └── utils
│       ├── url.js
│       ├── time.js
│       └── storage.js
│
├── App.jsx
├── main.jsx
└── index.css
```

## 项目目录规则

具体 H5 项目放在：

```text
src/projects
```

例如：

```text
src/projects/video-rank
src/projects/vote
src/projects/quiz
src/projects/display-demo
```

每个项目建议结构：

```text
项目名
├── assets
├── pages
├── components
├── config.js
├── api.js
└── index.jsx
```

## 通用组件规则

通用组件放在：

```text
src/shared/components
```

例如：

```text
DesignStage.jsx       750px 设计稿缩放容器
AnimatedImage.jsx     图片素材动画组件
PageTransition.jsx    页面切换动画组件
Loading.jsx           加载组件
Modal.jsx             弹窗组件
```

不要在某个项目里重复写通用组件。

## H5 适配规则

默认设计稿宽度为：

```text
750px
```

展示型页面优先使用：

```text
750px 固定画布 + transform scale 整体缩放
```

适合：

```text
纯展示页
邀请函
品牌宣传
素材分层动画页
长图展示页
```

功能型页面优先使用：

```text
max-width: 750px + 响应式布局
```

适合：

```text
报名页
表单页
视频页
排行榜页
列表页
```

不要把视频播放器放在整体 `transform: scale()` 容器里，避免影响微信内置浏览器中的播放控件和点击区域。

## 页面切换规则

普通 H5 活动不强制使用 React Router。

优先用 React state 控制页面：

```js
const [page, setPage] = useState('home')
```

页面切换动画优先使用 Framer Motion。

常用动画类型：

```text
fade
slideLeft
slideRight
slideUp
slideDown
scale
```

页面组件命名：

```text
HomePage.jsx
JoinPage.jsx
VideoListPage.jsx
VideoPlayPage.jsx
RankPage.jsx
ResultPage.jsx
```

## 微信能力规则

微信相关前端逻辑放在：

```text
src/shared/hooks/useWechatAuth.js
src/shared/hooks/useWechatShare.js
src/shared/hooks/useWechatLocation.js
```

不要在页面组件里直接堆微信授权和 JS-SDK 初始化逻辑。

微信 JS-SDK 签名必须调用后端接口：

```text
POST https://api.zice8.com/api/wechat/js-sdk-signature
```

前端不允许保存或使用：

```text
WECHAT_APP_SECRET
微信 AppSecret
任何服务端密钥
```

## API 请求规则

统一请求封装放在：

```text
src/shared/api/request.js
```

API Base URL 从环境变量读取：

```text
VITE_API_BASE_URL
```

示例：

```text
VITE_API_BASE_URL=https://api.zice8.com/api
```

本地开发可以使用：

```text
VITE_API_BASE_URL=http://localhost:3001/api
```

接口返回格式统一认为是：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

前端应统一处理：

```text
200 成功
206 业务未完成
400 参数错误
401 未登录/token失效
403 无权限
404 不存在
500 服务异常
```

## activity_key 规则

前端对外使用：

```text
activity_key
```

不要直接暴露数据库自增 `activity_id`。

推荐 URL：

```text
https://web.zice8.com/video-rank?activity_key=xxxxxx
```

前端读取：

```js
const activityKey = new URLSearchParams(window.location.search).get('activity_key')
```

后端内部会根据 `activity_key` 查询真实活动 ID。

## Token 规则

微信授权完成后，后端会跳回前端并携带：

```text
?token=xxx
```

前端拿到 token 后保存到 localStorage。

后续请求统一带：

```text
Authorization: Bearer token
```

不要把 openid 暴露在前端 URL。

## 命名规范

React 组件：

```text
PascalCase.jsx
```

例如：

```text
HomePage.jsx
VideoPlayer.jsx
PageTransition.jsx
```

Hooks：

```text
useXxx.js
```

例如：

```text
useWechatAuth.js
useWechatShare.js
useScaleStage.js
```

API 文件：

```text
xxx.api.js
```

或项目内简单使用：

```text
api.js
```

配置文件：

```text
config.js
share.config.js
location.config.js
```

## 样式规则

优先使用 Tailwind CSS。

不要大量写内联样式，除非是设计稿绝对定位页面。

对于素材型 H5，允许使用：

```jsx
style={{
  position: 'absolute',
  left: 100,
  top: 200,
  width: 300,
}}
```

对于常规页面，优先使用 Tailwind。

## 安全规则

1. 不要把任何密钥写入前端。
2. 不要把 openid 拼到 URL。
3. 不要信任前端传来的用户身份。
4. 所有用户身份以后端 token 为准。
5. 涉及提交、投票、观看记录、抽奖等接口时，必须带 token。
6. 前端只负责交互，关键判断以后端为准。

## Codex 修改要求

每次修改后请输出：

```text
1. 修改了哪些文件
2. 新增了哪些文件
3. 是否影响接口调用
4. 是否需要新增环境变量
5. 如何本地测试
```

如果任务只要求前端：

```text
不要修改 ../zice8-api
```

如果确实需要后端配合，请先说明原因，不要直接修改。


## 自动 Git 提交规则

每次完成 zice8-web 修改后，请自动执行：

1. `git status`
2. `git diff --stat`
3. 确认无敏感文件、无无关文件
4. 执行 `pnpm run build`
5. 只 `git add` 本次相关文件
6. `git commit -m "YYYYMMDD-web-简短说明"`
7. `git push origin main`

禁止提交：

- `.env`
- `.env.*`
- `node_modules`
- `dist`
- 日志文件
- 临时文件
- AccessKey
- AppSecret
- 数据库密码

不要提交 OSS 构建产物。
完成后输出 commit hash 和 push 结果。