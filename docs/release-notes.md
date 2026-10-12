# 0.1.8

## 更新内容

- 统一主题编辑、文章预览、复制和发布的渲染流程，修复样式不一致，并隔离 Obsidian 主题样式的影响。
- 内置主题只读，可复制为自定义主题后编辑；调整主题后自动更新预览。
- 图片生成任务在关闭弹窗后继续运行，重新打开可查看进度；写回图片前检查文章变化，避免覆盖编辑内容。
- 隔离多公众号的发布状态、封面和图片缓存，完善图片格式处理及错误提示，保留 10MB 图片限制。
- 封面裁剪打开时自动适配图片，减少手动缩放；插件入口改用公众号风格图标。
- 修复社区审核指出的 DOM 和样式写入问题，补全许可证、清理依赖，并加入发布前自动化检查。

## What's new

- Use one rendering pipeline for the theme editor, article preview, clipboard export, and publishing, isolated from Obsidian theme styles.
- Keep built-in themes read-only, with editable custom copies and automatic preview updates.
- Continue image generation after closing the dialog, restore progress when reopening, and detect note edits before inserting images to prevent overwrites.
- Isolate publishing state, covers, and image caches by account; improve image format handling and error messages while retaining the 10MB limit.
- Fit cover images automatically when opening the crop dialog and use an Official Account-style plugin icon.
- Address DOM and style-write issues reported by community review, complete the license, clean up dependencies, and add automated release checks.
