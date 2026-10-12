# Markdown WeChat Publisher

Markdown WeChat Publisher is an Obsidian plugin for previewing, styling, copying, and sending Markdown to the WeChat draft box, with custom themes, multiple account management, and AI image generation.

[中文文档](README.md)

## Features

- Publish local notes to WeChat: preview Markdown formatting, copy it to the WeChat editor, or send it with local and remote images to the draft box. Drag and zoom a selected cover to crop it at 2.35:1 without changing the original image.
- Visual style editor: use built-in themes or create custom ones, with live adjustments for headings, paragraphs, quotes, code blocks, images, and tables. Code blocks include GitHub-style highlighting, Mac-style headers, and line numbers.
- Multiple WeChat Official Accounts: configure accounts together, test connections, and set a default. Select the target before publishing without repeatedly entering an App ID and App secret.
- APIMart image generation: describe images with `image-prompt` comments, edit prompts, generate individual images or batches, track progress, and regenerate results. Images are saved locally and inserted into the article; prompts remain available for later edits.

![Article preview and theme selection](pic/README/image-20260624125418855.png)

## Installation

### Install from the community plugin marketplace

1. Open `Settings > Community plugins` in Obsidian and follow the prompt to enable community plugins.
2. Click `Browse` and search for `Markdown WeChat Publisher`.
3. Install and enable the plugin.

Plugin marketplace page:
[Markdown WeChat Publisher](https://community.obsidian.md/plugins/markdown-wechat-publisher)

![Markdown WeChat Publisher in the Obsidian community plugin marketplace](pic/README/image-20260624125109700.png)

### Manual installation

Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/zhangloveyan/obsidian-to-wechat/releases/latest). Place them in `.obsidian/plugins/markdown-wechat-publisher` inside your vault, reload Obsidian, and enable the plugin. Use your custom configuration directory instead of `.obsidian` if you have changed it.

![Manual plugin folder](pic/README/image-20260624125227093.png)

## Setup

Open `Settings > Markdown WeChat Publisher`:

- Account settings: enter an account name, App ID, and App secret, test the connection, and choose a default account. Sending drafts requires the corresponding WeChat API permissions. Copying formatted content does not require account setup.
- Image generation settings (optional): enter the APIMart API URL, key, and model, then choose an aspect ratio and resolution and set the timeout and polling interval. Skip this setup if you do not use image generation.

![WeChat account settings](pic/README/image-20260624125323186.png)

## Quick start

1. Open a Markdown note.
2. Open the preview from the ribbon icon, or press `Ctrl+P` and search for `Markdown WeChat Publisher` in the command palette.
3. Choose a theme and adjust its styles in the theme editor as needed.
4. To add images, insert prompt comments and click the image generation button (`生图`).
5. Click Copy (`复制`) and paste into the WeChat editor, or click Publish (`发布`), choose the account, confirm the title and cover, and send the article to the draft box.

Selecting a cover opens a crop dialog. Drag and zoom the image within a fixed 2.35:1 frame, then click Apply to upload the crop. The original image and note remain unchanged; going back or cancelling does not replace the previous cover.

The plugin creates WeChat drafts. It does not broadcast articles to subscribers.

## Image generation

Put each prompt comment on its own line, keeping the entire comment on a single line:

```markdown
<!-- image-prompt: A clean blue technology cover image for a WeChat article -->
```

In the image generation dialog, edit prompts, generate one image or start all tasks, and check each image's status. Edited prompts are written back to the note when generation starts.

Images are saved under `pic/<note name>/` beside the note, and the image link is inserted or updated on the line immediately after its prompt. The prompt comment stays in the note but is hidden in the article preview, so you can reopen the dialog and regenerate the image later.

## Privacy

- Account credentials, settings, and uploaded-image cache are stored in the current Obsidian vault. Do not publish configuration files containing secrets.
- Publishing sends articles and images to WeChat. Image generation sends prompts to the configured image generation service.
- Remote images are loaded from their source URLs. Exporting mathematical formulas as images sends their content to the CodeCogs rendering service.
- Cover cropping runs locally. A cropped cover is uploaded to WeChat only when you apply it.

## Development

```bash
npm install
npm run build
```

## License

[AGPL-3.0](LICENSE)
