import type { App } from 'obsidian';
import type { RenderedArticle } from '../render/render-types';
import { readImageAsset, imageDataUrl } from '../../integrations/obsidian/image-assets';
import { prepareImageForWechat } from './image-output';

export class ClipboardExporter {
    static async copyArticle(app: App, article: RenderedArticle): Promise<void> {
        const container = article.element.cloneNode(true) as HTMLElement;
        const encoded = new Map<string, Promise<string>>();
        for (const image of Array.from(container.querySelectorAll<HTMLImageElement>('img'))) {
            const key = image.dataset.otwVaultPath || image.getAttribute('src') || '';
            if (!key) throw new Error('文章包含没有地址的图片。');
            let result = encoded.get(key);
            if (!result) {
                result = readImageAsset(app, image, article.sourcePath)
                    .then(asset => prepareImageForWechat(asset, image.ownerDocument)).then(imageDataUrl);
                encoded.set(key, result);
            }
            image.src = await result;
            image.removeAttribute('data-otw-vault-path');
        }
        const item = new ClipboardItem({
            'text/html': new Blob([container.outerHTML], { type: 'text/html' }),
            'text/plain': new Blob([article.markdown], { type: 'text/plain' }),
        });
        const navigator = article.element.ownerDocument.defaultView?.navigator;
        if (!navigator?.clipboard) throw new Error('当前窗口不支持剪贴板写入。');
        await navigator.clipboard.write([item]);
    }
}
