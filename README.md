# Markdown WeChat Publisher

> 在 Obsidian 中完成排版、预览与草稿推送，让公众号内容生产回归写作本身。

**Markdown WeChat Publisher** 是一款 Obsidian 插件，用于预览、排版、复制并推送 Markdown 到微信公众号。你可以在熟悉的笔记环境中调整主题、生成配图、裁剪封面，再将文章复制到公众号编辑器或推送到草稿箱。

Preview and style Markdown notes, generate images, and publish drafts to WeChat Official Accounts from Obsidian.

[English](README.en.md)

[![Obsidian 社区插件](https://img.shields.io/badge/Obsidian-Community%20plugin-7C3AED)](https://community.obsidian.md/plugins/markdown-wechat-publisher)
[![许可证：AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue)](LICENSE)
[![最新版本](https://img.shields.io/github/v/release/zhangloveyan/obsidian-to-wechat)](https://github.com/zhangloveyan/obsidian-to-wechat/releases/latest)

## 核心功能

| 功能 | 说明 |
| --- | --- |
| **Obsidian 本地推送** | 预览 Markdown 排版，一键复制到公众号编辑器，或连同本地、网络图片推送到草稿箱 |
| **可视化样式编辑** | 内置多套主题，可创建自定义主题，实时调整标题、段落、引用、代码块、图片和表格等样式 |
| **多公众号管理** | 集中配置多个账号，支持连接测试、默认账号设置和发布前选择目标公众号 |
| **APIMart 图片生成** | 通过 `image-prompt` 注释生成配图，支持编辑提示词、查看进度和重新生成；图片保存到本地，提示词保留 |
| **公众号封面裁剪** | 固定 2.35:1 比例，支持拖动和缩放；裁剪结果作为独立 PNG 上传，不修改原图或正文 |

代码块采用 GitHub 风格语法高亮、Mac 风格外观，并显示行号。

## 快速开始

### 从插件市场安装（推荐）

1. 打开 Obsidian `设置 > 第三方插件`，按提示启用第三方插件。
2. 点击 `浏览`，搜索 `Markdown WeChat Publisher`。
3. 安装并启用插件。

插件市场页面：
[Markdown WeChat Publisher](https://community.obsidian.md/plugins/markdown-wechat-publisher)

![Obsidian 插件市场](pic/README/image-20260624125109700.png)

### 手动安装

1. 从 [最新 Release](https://github.com/zhangloveyan/obsidian-to-wechat/releases/latest) 下载 `main.js`、`manifest.json` 和 `styles.css`。
2. 在 Obsidian 仓库中创建以下目录，并放入这三个文件：

   ```text
   .obsidian/plugins/markdown-wechat-publisher/
   ```

3. 重新加载 Obsidian，在 `设置 > 第三方插件` 中启用插件。

若修改过 Obsidian 配置目录，请将 `.obsidian` 替换为对应目录。

![手动安装目录](pic/README/image-20260624125227093.png)

## 配置

打开 `设置 > Markdown WeChat Publisher`，在公众号配置弹窗中添加账号。

| 字段 | 说明 |
| --- | --- |
| **账号名称** | 用于区分不同公众号的自定义名称 |
| **App ID** | 对应公众号的开发者 ID（AppID） |
| **App secret** | 对应公众号的开发者密钥（AppSecret） |

填写后可测试连接并设置默认账号。推送草稿需要账号具有对应的微信接口权限；只复制排版内容无需配置公众号。

![公众号配置](pic/README/image-20260624125323186.png)

### 图片生成配置（可选）

在图片生成配置弹窗中填写 APIMart 参数：

- API 地址、API 密钥和模型。
- 图片尺寸与分辨率。
- 超时时间与轮询间隔。

不使用生图时无需配置。测试接口会实际生成图片，并保存到插件目录的 `temp/` 下，便于检查结果。

## 使用指南

### 基本流程

```text
打开 Markdown 文档 -> 打开预览 -> 选择主题、调整样式
-> 按需生成配图 -> 复制内容或选择封面后推送草稿
```

1. 打开一篇 Markdown 文档。
2. 点击侧边栏图标，或按 `Ctrl+P` 打开命令面板，搜索 `Markdown WeChat Publisher` 打开预览。
3. 选择主题，按需通过主题编辑器调整样式。
4. 需要配图时，添加提示词并点击 `生图`。
5. 点击 `复制` 后粘贴到公众号编辑器；或点击 `发布`，选择公众号、确认标题和封面，再推送到草稿箱。

插件推送的是公众号草稿，不会直接群发文章。

主题编辑器、文章预览、复制与发布共用同一套排版处理。内置主题不可直接修改，点击 `编辑副本` 创建自定义主题后调整样式。

### 封面裁剪

发布时，选择文章图片或本地图片作为封面，确认后进入裁剪弹窗：

- 固定 **2.35:1** 比例，支持拖动和缩放。
- 点击 `应用`，以独立 PNG 上传裁剪结果，最大 2350 × 1000 像素，不放大小图。
- **不修改原图或正文**；返回或取消不会替换原有封面，上传失败可重试。
- 裁剪完全在本地运行，不依赖 CDN，沿用 10MB 图片限制。

### 文章配图

在文章中独占一行写入提示词，每条注释保持在同一行：

```markdown
<!-- image-prompt: 一张科技感公众号封面图，蓝色背景，简洁高级 -->
```

打开生图弹窗后，可编辑各条提示词，单独生成或点击 `全部开始生成`，并查看每张图片的状态。点击生成时，编辑后的提示词会同步回文章。

图片保存到文章所在目录的 `pic/文章名/` 下，并在对应注释下一行插入或更新图片链接。提示词注释会保留，不在文章预览中显示；再次打开弹窗后，可选择 `重新生成`。

关闭弹窗不会中断当前任务，重新打开可查看进度和结果；手动调整文章中的提示词后，用刷新按钮重新读取。若生成期间提示词或关联图片发生冲突，插件保留生成图片并提示路径，不覆盖正文。退出 Obsidian 或卸载插件后不继续任务。

## 截图

![文章预览与样式选择](pic/README/image-20260624125418855.png)

## 技术栈

- TypeScript、Obsidian API：插件功能与界面。
- esbuild：打包 JavaScript 和样式。
- highlight.js、juice：代码高亮与公众号 HTML 样式内联。
- Cropper.js 1.6.2：本地封面裁剪。

最低 Obsidian 版本为 1.11.7，具体要求见 [manifest.json](manifest.json)。

### 项目结构

```text
obsidian-to-wechat/
|-- src/
|   |-- core/              # 渲染、主题、内容转换与复制
|   |-- features/          # 预览、主题编辑、设置、生图与发布
|   |-- integrations/      # 微信接口与图片处理
|   |-- shared/            # 公共工具
|   |-- styles/            # 界面样式
|   `-- types/             # 数据类型
|-- tests/                # 渲染、配置、生图与接口回归用例
|-- scripts/              # 浏览器测试、发布检查与生图模拟接口
|-- docs/                 # 方案、发布说明与检查清单
|-- pic/README/           # 文档截图
|-- .github/workflows/    # 自动发布工作流
|-- manifest.json         # 插件信息
|-- package.json          # 依赖与命令
`-- esbuild.config.mjs    # 构建配置
```

## 开发

### 本地构建

需要 Node.js 和 npm；当前发布工作流使用 Node.js 22。

```bash
# 按锁定版本安装依赖
npm ci

# 开发模式（监听文件变更）
npm run dev

# 生产构建
npm run build
```

构建产物为 `main.js`、`manifest.json` 和 `styles.css`，可按手动安装步骤放入测试仓库。

### 运行测试

```bash
npm run check
```

包含类型检查、官方 ESLint、业务测试、构建、浏览器渲染与裁剪测试、版本及产物检查。浏览器测试默认使用本机 Chrome，可通过环境变量 `PLAYWRIGHT_CHANNEL` 选择其他已安装通道。微信和生图接口使用模拟数据，不产生真实发布或生图费用；浏览器中的 Obsidian 宿主由测试替身提供。

## 隐私

- 账号凭据和插件设置保存在 `data.json`；图片上传记录独立保存在 `image-cache.json`，按账号和图片内容区分，最多保留 2000 条、90 天，可在设置中清理。不保存草稿缓存，请勿公开包含密钥的配置文件。
- 推送时会向微信接口发送文章和图片；生图时会向配置的图片生成服务发送提示词。
- 远程图片会从对应地址加载。数学公式在预览、复制与发布中统一使用 CodeCogs 图片，会向该服务发送公式内容。
- 封面裁剪在本地完成，不依赖 CDN，只有应用裁剪结果时才上传封面到微信。

## 常见问题

**App ID 和 App secret 在哪里获取？**

登录 [微信公众号后台](https://mp.weixin.qq.com/)，在对应账号的开发配置中查看 AppID 和管理 AppSecret，再填写到插件的公众号配置中。

**提示 IP 不在白名单怎么办？**

在公众号后台的 IP 白名单配置中，添加微信错误提示里显示的公网 IP，然后重新测试连接。网络或代理变化可能导致出口 IP 改变。

**封面裁剪会修改原始图片吗？**

不会。裁剪结果作为独立 PNG 上传，原图和正文保持不变。

**生图后还能修改提示词、重新生成吗？**

可以。提示词注释保留在文章中，再次打开生图弹窗即可编辑并重新生成，成功后更新对应图片链接。

**支持多个公众号同时发布吗？**

支持管理多个公众号，但每次发布选择一个目标账号，不会同时群发到多个账号。

## 贡献

欢迎通过 [Issue](https://github.com/zhangloveyan/obsidian-to-wechat/issues) 反馈问题或建议。报告问题时请附上复现步骤、Obsidian 与插件版本，截图和日志中请隐藏密钥。

提交代码可 Fork 仓库、创建分支并发起 Pull Request，说明修改内容，并完成相关构建与测试。

## 许可证

本项目采用 [AGPL-3.0](LICENSE) 许可证。

## 相关链接

- [Obsidian 社区插件页面](https://community.obsidian.md/plugins/markdown-wechat-publisher)
- [最新 Release](https://github.com/zhangloveyan/obsidian-to-wechat/releases/latest)
- [发布说明](docs/release-notes.md)
- [问题反馈](https://github.com/zhangloveyan/obsidian-to-wechat/issues)
