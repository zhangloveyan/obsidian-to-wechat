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

3. 提交代码并推送到 GitHub。

4. 创建和版本号完全一致的 tag：

   ```bash
   git tag 0.1.6
   git push origin 0.1.6
   ```

5. 确认 GitHub Release 已生成，并包含：
   - `main.js`
   - `manifest.json`
   - `styles.css`

## 注意

- Obsidian 插件 Release tag 不能带 `v` 前缀。
- tag 必须和 `manifest.json.version` 完全一致。
- 如果误推了 `v0.1.6`，需要删除错误 tag，并重新推送 `0.1.6`。
