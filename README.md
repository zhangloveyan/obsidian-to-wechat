# Markdown WeChat Publisher

Preview, style, copy, and publish Markdown notes from Obsidian to WeChat Official Accounts.

[中文文档](README.zh-CN.md)

## Features

- Preview Markdown with WeChat-friendly formatting.
- Adjust article styles with a visual theme editor.
- Copy rendered content to the WeChat editor.
- Publish notes to WeChat draft box.
- Manage multiple WeChat Official Accounts.
- Upload local and remote images to WeChat material storage.
- Render GitHub-style highlighted code blocks with Mac-style headers and line numbers.

## Installation

1. Download the latest release files:
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. Create this folder in your vault:

   ```text
   .obsidian/plugins/markdown-wechat-publisher
   ```

3. Put the three files into that folder.
4. Restart Obsidian.
5. Enable `Markdown WeChat Publisher` in `Settings > Community plugins`.

## Setup

Open `Settings > Markdown WeChat Publisher` and add a WeChat Official Account.

Each account requires:

- Account name
- App ID
- App secret

You can test the connection after entering the account credentials.

## Usage

1. Open a Markdown note.
2. Open the plugin preview from the ribbon icon, or press `Ctrl+P` and search for `Markdown WeChat Publisher` in the command palette.
3. Choose a theme and check the preview.
4. Copy the rendered content to the WeChat editor, or publish it to the WeChat draft box.

## Privacy

Account credentials and plugin settings are stored in the current Obsidian vault.

When publishing, the plugin connects to the configured WeChat Official Account API to fetch access tokens, upload images, and create drafts.

The plugin does not send article content to other third-party services.

## Development

```bash
npm install
npm run build
```

## License

AGPL-3.0
