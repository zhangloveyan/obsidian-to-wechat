import type { App } from 'obsidian';
import { isRemoteOrDataImage, resolveImageFile } from '../../integrations/obsidian/image-path-resolver';

export function transformImages(app: App, container: HTMLElement, sourcePath: string): void {
    for (const embed of Array.from(container.querySelectorAll<HTMLElement>('span.internal-embed[src]'))) {
        const source = embed.getAttribute('src') || '';
        const isImage = embed.classList.contains('image-embed') || !!embed.querySelector('img') || /\.(?:png|jpe?g|gif|bmp|webp|svg)(?:$|[#|?])/i.test(source);
        if (!isImage) continue;
        const resolved = resolveImageFile(app, source.split('|')[0], sourcePath);
        if (!resolved.file) throw new Error('嵌入图片不存在：' + source + '；文章：' + sourcePath);
        const image = container.ownerDocument.win.createEl('img');
        image.alt = embed.getAttribute('alt') || '';
        image.src = app.vault.getResourcePath(resolved.file);
        image.dataset.otwVaultPath = resolved.file.path;
        const width = embed.getAttribute('width');
        if (width && /^\d+$/.test(width)) image.width = Number(width);
        embed.replaceWith(image);
    }
    for (const image of Array.from(container.querySelectorAll<HTMLImageElement>('img[src]'))) {
        const source = image.getAttribute('src') || '';
        if (isRemoteOrDataImage(source) || image.dataset.otwVaultPath) continue;
        const resolved = resolveImageFile(app, source, sourcePath);
        if (!resolved.file) throw new Error('图片路径无法解析：' + source + '；文章：' + sourcePath);
        image.dataset.otwVaultPath = resolved.file.path;
        image.src = app.vault.getResourcePath(resolved.file);
    }
}
