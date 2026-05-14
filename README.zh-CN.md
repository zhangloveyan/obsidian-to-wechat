# Markdown WeChat Publisher

Markdown WeChat Publisher 是一个用于在 Obsidian 中预览、排版、复制并发布 Markdown 到微信公众号的插件。

## 功能

- 预览适合微信公众号的 Markdown 排版效果。
- 使用可视化主题编辑器调整文章样式。
- 复制渲染后的内容到微信公众号编辑器。
- 发布文章到微信公众号草稿箱。
- 管理多个微信公众号账号。
- 上传本地图片和远程图片到微信素材库。
- 渲染 GitHub 风格代码高亮、Mac 风格代码块和行号。

## 安装

1. 从最新 Release 下载以下文件：
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. 在 Obsidian 仓库中创建插件目录：

   ```text
   .obsidian/plugins/markdown-wechat-publisher
   ```

3. 将三个文件放入该目录。
4. 重启 Obsidian。
5. 在 `设置 > 第三方插件` 中启用 `Markdown WeChat Publisher`。

## 配置

打开 `设置 > Markdown WeChat Publisher`，添加微信公众号账号。

每个账号需要填写：

- 账号名称
- App ID
- App secret

填写后可以测试连接是否正常。

## 使用

1. 打开一篇 Markdown 文档。
2. 通过侧边栏图标打开插件预览，或按 `Ctrl+P` 打开命令面板，搜索 `Markdown WeChat Publisher` 打开预览。
3. 选择主题并检查预览效果。
4. 将渲染后的内容复制到微信公众号编辑器，或发布到微信公众号草稿箱。

## 隐私

账号凭据和插件设置保存在当前 Obsidian 仓库中。

发布时，插件会连接已配置的微信公众号 API，用于获取 access token、上传图片和创建草稿。

插件不会将文章内容发送到其他第三方服务。

## 开发

```bash
npm install
npm run build
```

## 许可证

AGPL-3.0
