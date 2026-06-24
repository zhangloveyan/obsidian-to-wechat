import type { App } from 'obsidian';
import type { ImageGenerationSettings } from '../settings/settings';
import { ImageGenerationClient } from './image-generation-client';
import type WechatPublisherPlugin from '../../plugin';

export async function testImageGenerationAndSaveImage(
    app: App,
    plugin: WechatPublisherPlugin,
    settings: ImageGenerationSettings,
): Promise<string> {
    const client = new ImageGenerationClient(settings);
    const image = await client.generateImage('一张白色背景的极简测试图片');
    const path = await nextTempImagePath(app, plugin, image.extension);
    await ensureFolderExists(app, parentPath(path));
    await app.vault.adapter.writeBinary(path, image.data);
    return path;
}

async function nextTempImagePath(app: App, plugin: WechatPublisherPlugin, extension: string): Promise<string> {
    const folder = `${plugin.manifest.dir || '.obsidian/plugins/markdown-wechat-publisher'}/temp`;
    const safeExtension = extension.startsWith('.') ? extension : `.${extension}`;
    const baseName = `image-generation-test-${formatDate(new Date())}`;
    let candidate = `${folder}/${baseName}${safeExtension}`;
    let suffix = 2;

    while (await app.vault.adapter.exists(candidate)) {
        candidate = `${folder}/${baseName}-${suffix}${safeExtension}`;
        suffix++;
    }

    return candidate;
}

async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
    const parts = folderPath.split('/').filter(Boolean);
    let current = '';

    for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        if (!(await app.vault.adapter.exists(current))) {
            await app.vault.adapter.mkdir(current);
        }
    }
}

function parentPath(path: string): string {
    const index = path.lastIndexOf('/');
    return index >= 0 ? path.slice(0, index) : '';
}

function formatDate(date: Date): string {
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    const hours = pad2(date.getHours());
    const minutes = pad2(date.getMinutes());
    const seconds = pad2(date.getSeconds());
    return `${month}-${day}-${hours}${minutes}${seconds}`;
}

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}
