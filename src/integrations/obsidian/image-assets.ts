import { requestUrl, TFile, type App } from 'obsidian';
import { resolveImageFile } from './image-path-resolver';

export interface ImageAsset { data: ArrayBuffer; name: string; mime: string }
const EXTENSIONS: Record<string, string> = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/bmp': 'bmp', 'image/webp': 'webp', 'image/svg+xml': 'svg',
};

export async function readImageAsset(app: App, image: HTMLImageElement, sourcePath: string): Promise<ImageAsset> {
    const source = image.getAttribute('src') || '';
    const vaultPath = image.dataset.otwVaultPath;
    if (vaultPath || (!/^https?:\/\//i.test(source) && !source.startsWith('data:'))) {
        const file = vaultPath ? app.vault.getAbstractFileByPath(vaultPath) : resolveImageFile(app, source, sourcePath).file;
        if (!(file instanceof TFile)) throw new Error('本地图片不存在：' + (vaultPath || source));
        const data = await app.vault.readBinary(file);
        return { data, name: file.name, mime: detectMime(data, file.extension) };
    }
    if (source.startsWith('data:')) {
        const match = source.match(/^data:(image\/[a-z0-9.+-]+)(;base64)?,([\s\S]*)$/i);
        if (!match) throw new Error('图片 data URL 格式无效。');
        const bytes = match[2] ? Uint8Array.from(window.atob(match[3]), char => char.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(match[3]));
        const data = bytes.buffer;
        const mime = detectMime(data, EXTENSIONS[match[1]] || '');
        return { data, mime, name: 'embedded.' + (EXTENSIONS[mime] || 'png') };
    }
    const response = await requestUrl({ url: source, throw: false });
    if (response.status < 200 || response.status >= 300) throw new Error('网络图片下载失败，HTTP ' + response.status + '：' + new URL(source).pathname);
    const mime = detectMime(response.arrayBuffer);
    if (!mime) throw new Error('网络图片响应不是受支持的图片：' + new URL(source).pathname);
    return { data: response.arrayBuffer, mime, name: 'remote.' + EXTENSIONS[mime] };
}

export function detectMime(data: ArrayBuffer, extension = ''): string {
    const bytes = new Uint8Array(data);
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    const text = new TextDecoder().decode(bytes.slice(0, 512));
    if (/^GIF8[79]a/.test(text)) return 'image/gif';
    if (text.startsWith('BM')) return 'image/bmp';
    if (text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP') return 'image/webp';
    if (/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(text)) return 'image/svg+xml';
    return extension.toLowerCase() === 'svg' && text.includes('<svg') ? 'image/svg+xml' : '';
}

export function imageDataUrl(asset: ImageAsset): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('图片编码失败。'));
        reader.onerror = () => reject(new Error('图片编码失败。'));
        reader.readAsDataURL(new Blob([asset.data], { type: asset.mime }));
    });
}
