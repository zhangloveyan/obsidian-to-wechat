import { imageDataUrl, type ImageAsset } from '../../integrations/obsidian/image-assets';

export async function prepareImageForWechat(asset: ImageAsset, doc: Document): Promise<ImageAsset> {
    if (asset.mime !== 'image/webp' && asset.mime !== 'image/svg+xml') return asset;
    if (asset.data.byteLength > 10 * 1024 * 1024) throw new Error('图片超过 10MB，请压缩后重试。');
    const image = doc.win.createEl('img');
    const source = await imageDataUrl(asset);
    await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => { cleanup(); reject(new Error('图片解码超时：' + asset.name)); }, 10000);
        const cleanup = () => { window.clearTimeout(timeout); image.onload = null; image.onerror = null; };
        image.onload = () => { cleanup(); resolve(); };
        image.onerror = () => { cleanup(); reject(new Error('图片解码失败：' + asset.name)); };
        image.src = source;
    });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 32_000_000) {
        throw new Error('图片尺寸无效或超过 3200 万像素：' + asset.name);
    }
    const canvas = doc.win.createEl('canvas');
    try {
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('无法创建图片转换画布。');
        context.drawImage(image, 0, 0);
        const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片转换 PNG 失败：' + asset.name)), 'image/png');
        });
        if (blob.size > 10 * 1024 * 1024) throw new Error('图片转换后超过 10MB，请压缩原图后重试。');
        return { data: await blob.arrayBuffer(), mime: 'image/png', name: asset.name.replace(/\.[^.]+$/, '') + '.png' };
    } finally { canvas.width = 0; canvas.height = 0; }
}
