# Markdown WeChat Publisher

Markdown WeChat Publisher 是一个用于将 Obsidian Markdown 文档预览、排版、复制并发布到微信公众号的插件。

## 功能

- 实时预览当前 Markdown 文档。
- 可视化主题编辑器，支持内置主题和自定义主题。
- 文章预览、主题预览、复制和发布使用统一渲染逻辑。
- 支持发布草稿到多个微信公众号。
- 支持复制渲染后的 HTML 到微信公众号编辑器。
- 支持上传本地图片、远程图片和生成图片到微信素材库。
- 支持 GitHub 风格代码高亮、Mac 风格代码块、行号和横向滚动。
- 支持表格、列表、任务列表、引用、Callout、图片、Mermaid 图表和数学公式。

## 安装

### 手动安装

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

## 微信公众号配置

打开 `设置 > Markdown WeChat Publisher`，添加一个或多个微信公众号。

每个账号需要填写：

- 账号名称
- AppID
- AppSecret

你可以设置默认账号，并在发布时选择目标公众号。

## 使用方式

1. 打开一篇 Markdown 文档。
2. 点击侧边栏图标，或执行命令 `Open Markdown WeChat Publisher`。
3. 选择主题并预览文章效果。
4. 点击 `Copy to WeChat` 复制排版后的 HTML。
5. 点击 `Publish` 选择封面图，并创建微信公众号草稿。

## 主题编辑器

主题编辑器支持可视化调整文章样式，并使用完整 Markdown 示例实时预览效果。

支持的样式区域包括：

- 容器
- 标题
- 段落
- 列表
- 引用
- 代码块
- 图片
- 链接
- 表格
- 分割线
- 强调样式

## 隐私

插件会将微信公众号账号凭据保存在当前 Obsidian 仓库的插件数据中。

发布时，插件会连接微信官方 API，用于：

- 获取 access token
- 上传图片
- 创建草稿文章
- 选择封面图时读取已有素材

插件不会将文章内容发送到已配置微信公众号 API 以外的第三方服务。发布时如果启用了数学公式图片转换，数学公式可能会通过 CodeCogs 渲染为图片。

## 开发

安装依赖：

```bash
npm install
```

启动开发构建：

```bash
npm run dev
```

构建生产文件：

```bash
npm run build
```

构建产物：

- `main.js`
- `styles.css`
- `manifest.json`

## 项目结构

```text
src/
  core/
    output/       剪贴板和 HTML 输出
    render/       统一文章渲染
    theme/        主题类型、预设和 CSS 生成
    transform/    Markdown DOM 转换

  features/
    preview/      预览视图
    publish/      发布和封面图弹窗
    settings/     设置和账号管理
    theme-editor/ 主题编辑器弹窗

  integrations/
    wechat/       微信 API 客户端、上传器和草稿发布

  shared/         通用工具
```

## 许可证

AGPL-3.0
