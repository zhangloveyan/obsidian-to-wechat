import type { WechatApiClient } from './wechat-api-client';
import type { UploadedImage } from '../obsidian/image-cache';
import { detectMime } from '../obsidian/image-assets';

export class WechatImageUploader {
    constructor(private client: WechatApiClient) {}

    async upload(data: ArrayBuffer, originalName: string): Promise<UploadedImage> {
        if (!data.byteLength) throw new Error('上传图片失败：文件为空。');
        if (data.byteLength > 10 * 1024 * 1024) throw new Error('上传图片失败：图片超过 10MB，请压缩后重试。');
        const mime = detectMime(data);
        const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/bmp': 'bmp' };
        if (!extensions[mime]) throw new Error('上传图片失败：格式不支持或文件已损坏，请转换为 PNG/JPEG/GIF/BMP。');
        const stem = (originalName.split(/[\\/]/).pop() || 'image').replace(/\.[^.]*$/, '').replace(/[\r\n"]/g, '_');
        const name = stem + '.' + extensions[mime];
        const boundary = '----otw-' + crypto.randomUUID();
        const header = new TextEncoder().encode('--' + boundary + '\r\nContent-Disposition: form-data; name="media"; filename="' + name + '"\r\nContent-Type: ' + mime + '\r\n\r\n');
        const footer = new TextEncoder().encode('\r\n--' + boundary + '--\r\n');
        const body = new Uint8Array(header.length + data.byteLength + footer.length);
        body.set(header);
        body.set(new Uint8Array(data), header.length);
        body.set(footer, header.length + data.byteLength);
        const result = await this.client.request('/cgi-bin/material/add_material?type=image', {
            method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary }, body: body.buffer,
        }, '上传图片 ' + name);
        if (typeof result.url !== 'string' || !/^https?:\/\//i.test(result.url) || typeof result.media_id !== 'string' || !result.media_id) {
            throw new Error('上传图片失败：微信响应缺少 url 或 media_id。');
        }
        return { url: result.url, media_id: result.media_id };
    }
}
