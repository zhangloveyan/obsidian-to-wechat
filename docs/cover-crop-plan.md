# 封面裁剪

## 已确认范围

保留公众号插件现有的文章图片、本地图片两个选择入口。选图后点击确认进入独立裁剪弹窗，固定 2.35:1（47:20），支持拖动图片、缩放滑块和缩放图标。应用后沿用现有微信素材上传接口，成功才更新发布窗口封面。

返回保留选图状态；取消保留原封面。失败保留裁剪位置和结果，可重试。关闭窗口后的异步结果不再更新封面。原图和正文均不修改，裁剪结果仅保存在当前弹窗会话内。

## 实现

- `src/features/publish/cover-crop-modal.ts`：裁剪交互、生命周期、应用及重试状态。
- `src/features/publish/cover-crop-image.ts`：图片读取、静态首帧解码、PNG 导出和尺寸检查。
- `src/features/publish/cover-image-modal.ts`：连接原有选择入口、裁剪弹窗与微信上传。
- `src/styles/index.css`、`esbuild.config.mjs`：裁剪弹窗样式及本地 Cropper.js CSS 打包。
- `package.json`、`package-lock.json`：本地 Cropper.js 1.6.2 依赖，与参考项目一致。
- `scripts/test-cover-crop.mjs`：用 Playwright 和真实 Cropper.js 检查像素、交互及上传边界；仅替换 Obsidian 宿主与微信上传传输。通过 `npm run test:cover` 执行，默认使用本机 Chrome，可通过 `PLAYWRIGHT_CHANNEL` 选择已安装浏览器。

输出独立 PNG，最大 2350 x 1000，按 47:20 整数尺寸输出，不放大裁剪区域。沿用 10MB 文件限制。解码动图使用静态首帧，渲染和上传使用同一份裁剪字节。库代码、样式随插件分发，不依赖 CDN。

## 验证与交付

验证文章和本地图片、横竖图、拖动缩放及边界、返回取消、上传失败重试、关闭后的异步操作；核对输出像素、比例及上传和预览一致。检查浅色、深色和窄窗口布局。构建后复制 `main.js`、`styles.css`、`manifest.json` 到现有 `markdown-wechat-publisher` 插件目录，创建本地提交。本次不发布 GitHub Release。

## 验证记录

2026-10-12：构建通过，9 项真实 Chrome 浏览器检查通过。覆盖 PNG/JPEG 横竖图、2350 x 1000 输出上限、GIF 静态首帧、拖动缩放、窗口调整、390px 深色窄窗口、文章与本地选图、返回保留选择、上传失败后复用同一份裁剪字节、关闭后丢弃迟到结果，以及空文件/10MB 限制/无效尺寸。截图已人工检查。测试替换了 Obsidian 宿主和微信上传传输，未实际向微信发布文章。
