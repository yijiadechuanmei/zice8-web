# 文明交通知识问答 H5

访问路径：`/jtqa/jc122`。现场核销页面：`/jtqa/jc122/redeem`，沿用现有 Admin 登录状态；后台核销接口会再检查活动授权。

首页 `assets/home-original.jpg` 是活动提供的原图。其余四张图片是临时插画，位于本目录的 `assets/`。全部图片 URL 在 [`config.js`](./config.js) 的 `trafficAssets` 中集中配置。上传 OSS 后，只需把对象 URL 填入这五个字段；保留本地文件便于预览。海报生成会将交警和道路插画画入 Canvas，OSS 必须允许 `https://web.zice8.com` 跨域读取这两张图片，否则保存海报会失败。

线上开始、结束时间由后端 `activity.start_time`、`activity.end_time` 管理。未配置时首页可预览，答题入口显示尚未开始。

开发环境可通过 `/jtqa/jc122/rank-preview` 查看 50 位虚拟用户的排行榜与分页效果。该页面只生成浏览器内的演示数据，不请求排行榜接口、不写入数据库，也不进入正式构建的路由。
