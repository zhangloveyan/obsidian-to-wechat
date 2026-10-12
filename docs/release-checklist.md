# 发布检查清单

## Obsidian 社区插件版本规则

Obsidian 插件市场会根据 `manifest.json` 中的 `version` 字段查找同名 GitHub Release。

如果 `manifest.json` 中是：

```json
{
  "version": "0.1.6"
}
```

GitHub Release 的 tag 必须是：

```text
0.1.6
```

不要使用：

```text
v0.1.6
```

否则插件市场会报：

```text
No release matches your manifest version
```

## 发布步骤

1. 更新版本号：
   - `manifest.json`
   - `package.json`
   - `package-lock.json`
   - `versions.json`

2. 构建并确认产物：

   ```bash
   npm run build
   ```

3. 更新 `docs/release-notes.md`（当前版本的中英文更新说明，Release 工作流会读取此文件），并按需同步中英文 README 的功能用法。提交代码，暂不推送默认分支。

4. 创建和版本号完全一致的 tag：

   ```bash
   git tag 0.1.6
   git push origin 0.1.6
   ```

5. 等待 GitHub Actions 成功，确认同名正式 Release（不是草稿或预发布）已生成，并包含：
   - `main.js`
   - `manifest.json`
   - `styles.css`

6. 核对 Release 的 `manifest.json.version`、tag 和本地版本一致，检查三个附件完整且对应本次构建，然后推送默认分支。这样默认分支不会提前指向尚未发布的版本。

7. 将 `main.js`、`manifest.json`、`styles.css` 复制到本地测试库的 `markdown-wechat-publisher` 插件目录。不要覆盖 `data.json`。

8. 已上线插件不需要重新提交 PR。社区目录会检查新 Release；登录插件管理页，在 `...` 菜单选择 `Check for new releases` 可立即检查，必要时用 `Request review` 触发复核。确认市场版本与检查结果后再报告同步完成，不把 GitHub 发布成功当成市场审核通过。

依据：[官方提交说明](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin)、[插件管理说明](https://docs.obsidian.md/community-directory/manage-entry)。

## 注意

- Obsidian 插件 Release tag 不能带 `v` 前缀。
- tag 必须和 `manifest.json.version` 完全一致。
- 如果误推了 `v0.1.6`，需要删除错误 tag，并重新推送 `0.1.6`。
