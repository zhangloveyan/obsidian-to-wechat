# Markdown WeChat Publisher

Markdown WeChat Publisher 是一个用于在 Obsidian 中预览、排版、复制并推送 Markdown 到微信公众号草稿箱的插件，支持自定义主题、多公众号管理和 AI 配图。

Preview and style Markdown notes, generate images, and publish drafts to WeChat Official Accounts from Obsidian.

[English](README.en.md)

## 功能

- 本地文档推送公众号：预览 Markdown 排版，一键复制到公众号编辑器，或连同本地、网络图片推送到草稿箱。封面支持选图后按 2.35:1 拖动、缩放裁剪，不修改原图。
- 可视化样式编辑：内置多套主题，支持创建自定义主题，实时调整标题、段落、引用、代码块、图片和表格等样式。代码块采用 GitHub 风格高亮、Mac 风格外观，并显示行号。
- 多公众号管理：集中配置多个账号，支持连接测试和默认账号设置。发布前选择目标公众号，无需反复填写 App ID 和 App secret。
- APIMart 图片生成：通过 `image-prompt` 注释描述配图，支持编辑提示词、单张或批量生成、查看进度及重新生成。图片保存到本地并插入文章，提示词保留供后续修改。

![文章预览与样式选择](pic/README/image-20260624125418855.png)

## 安装

### 从插件市场安装

1. 打开 Obsidian `设置 > 第三方插件`，按提示启用第三方插件。
2. 点击 `浏览`，搜索 `Markdown WeChat Publisher`。
3. 安装并启用插件。

插件市场页面：
[Markdown WeChat Publisher](https://community.obsidian.md/plugins/markdown-wechat-publisher)

![Obsidian 插件市场](pic/README/image-20260624125109700.png)

### 手动安装

从 [最新 Release](https://github.com/zhangloveyan/obsidian-to-wechat/releases/latest) 下载 `main.js`、`manifest.json`、`styles.css`，放到仓库的 `.obsidian/plugins/markdown-wechat-publisher` 目录，再重新加载 Obsidian 并启用插件。若修改过 Obsidian 配置目录，请使用对应目录。

![手动安装目录](pic/README/image-20260624125227093.png)

## 配置

打开 `设置 > Markdown WeChat Publisher`：

- 公众号配置：添加账号名称、App ID 和 App secret，测试连接后选择默认账号。推送草稿需要账号具有对应的微信接口权限；只复制排版内容无需配置公众号。
- 图片生成配置（可选）：填写 APIMart API 地址、密钥和模型，选择图片尺寸、分辨率，并设置超时和轮询间隔。不使用生图时无需配置。

![公众号配置](pic/README/image-20260624125323186.png)

## 快速使用

1. 打开一篇 Markdown 文档。
2. 点击侧边栏图标，或按 `Ctrl+P` 打开命令面板，搜索 `Markdown WeChat Publisher` 打开预览。
3. 选择主题，按需通过主题编辑器调整样式。
4. 需要配图时，添加提示词并点击 `生图`。
5. 点击 `复制` 后粘贴到公众号编辑器；或点击 `发布`，选择公众号、确认标题和封面，再推送到草稿箱。

选择封面后会进入裁剪弹窗，可拖动、缩放图片，以固定 2.35:1 比例裁剪。点击 `应用` 上传裁剪结果，原图和正文不变；返回或取消不会替换原有封面。

插件推送的是公众号草稿，不会直接群发文章。

## 图片生成

在文章中独占一行写入提示词，每条注释保持在同一行：

```markdown
<!-- image-prompt: 一张科技感公众号封面图，蓝色背景，简洁高级 -->
```

打开生图弹窗后，可编辑各条提示词，单独生成或点击 `全部开始生成`，并查看每张图片的状态。点击生成时，编辑后的提示词会同步回文章。

图片保存到文章所在目录的 `pic/文章名/` 下，并在对应注释下一行插入或更新图片链接。提示词注释会保留，不在文章预览中显示；再次打开弹窗后，可选择 `重新生成`。

## 隐私

- 账号凭据、插件设置和图片上传缓存保存在当前 Obsidian 仓库中；请勿公开包含密钥的配置文件。
- 推送时会向微信接口发送文章和图片；生图时会向配置的图片生成服务发送提示词。
- 远程图片会从对应地址加载。数学公式导出为图片时，会将公式内容发送给 CodeCogs 渲染服务。
- 封面裁剪在本地完成，只有应用裁剪结果时才上传封面到微信。

## 开发

```bash
npm install
npm run build
```

## 许可证

[AGPL-3.0](LICENSE)
