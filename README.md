# Obsidian to WeChat

Preview, style, copy, and publish Obsidian Markdown notes to WeChat Official Accounts.

## Features

- Live preview for the active Markdown note.
- Visual theme editor with built-in and custom themes.
- Unified rendering for article preview, theme preview, copy, and publishing.
- Publish drafts to multiple WeChat Official Accounts.
- Copy rendered HTML to the WeChat editor.
- Upload local, remote, and generated images to WeChat material storage.
- GitHub-style highlighted code blocks with Mac-style headers, line numbers, and horizontal scrolling.
- Support for tables, lists, task lists, blockquotes, callouts, images, Mermaid diagrams, and math formulas.

## Installation

### Manual installation

1. Download the latest release files:
   - `main.js`
   - `manifest.json`
   - `styles.css`
2. Create this folder in your vault:

   ```text
   .obsidian/plugins/wechat-publisher
   ```

3. Put the three files into that folder.
4. Restart Obsidian.
5. Enable `Obsidian to WeChat` in `Settings > Community plugins`.

## WeChat Account Setup

Open `Settings > Obsidian to WeChat` and add one or more WeChat Official Accounts.

Each account requires:

- Account name
- AppID
- AppSecret

You can set a default account and choose a target account when publishing.

## Usage

1. Open a Markdown note.
2. Click the ribbon icon or run the command `Open Obsidian to WeChat`.
3. Select a theme and preview the rendered article.
4. Click `Copy to WeChat` to copy the rendered HTML.
5. Click `Publish` to select a cover image and create a WeChat draft.

## Theme Editor

The theme editor lets you adjust article styles visually and preview the result with a full Markdown sample.

Supported theme areas include:

- Container
- Headings
- Paragraphs
- Lists
- Quotes
- Code blocks
- Images
- Links
- Tables
- Dividers
- Emphasis styles

## Privacy

This plugin stores WeChat account credentials in the current Obsidian vault plugin data.

When publishing, it connects to the official WeChat API to:

- Fetch access tokens
- Upload images
- Create draft articles
- Read existing material items when selecting cover images

The plugin does not send article content to any third-party service other than the configured WeChat Official Account API. Math formulas may be converted through CodeCogs image rendering when formula image conversion is enabled during publishing.

## Development

Install dependencies:

```bash
npm install
```

Start development build:

```bash
npm run dev
```

Build production files:

```bash
npm run build
```

The build outputs:

- `main.js`
- `styles.css`
- `manifest.json`

## Project Structure

```text
src/
  core/
    output/       Clipboard and HTML output
    render/       Unified article rendering
    theme/        Theme types, presets, and CSS generation
    transform/    Markdown DOM transforms

  features/
    preview/      Preview view
    publish/      Publish and cover image modals
    settings/     Settings and account management
    theme-editor/ Theme editor modal

  integrations/
    wechat/       WeChat API client, uploader, draft publisher

  shared/         Shared utilities
```

## License

AGPL-3.0

