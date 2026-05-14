import { requestUrl } from 'obsidian';
import type { Logger } from '../../shared/logger';
import type { WechatApiClient } from './wechat-api-client';

export interface UploadResult {
    url: string;
    media_id: string;
}

export interface UploadFailure {
    errcode?: number;
    errmsg?: string;
    message: string;
}

export type ImageUploadResult =
    | { ok: true; url: string; media_id: string }
    | ({ ok: false } & UploadFailure);

/**
 * Handles image upload to WeChat material library.
 */
export class WechatImageUploader {
    private apiClient: WechatApiClient;
    private logger: Logger;

    constructor(apiClient: WechatApiClient, logger: Logger) {
        this.apiClient = apiClient;
        this.logger = logger;
    }

    /** Upload an image and get media_id + url */
    async upload(imageData: ArrayBuffer, fileName: string): Promise<ImageUploadResult> {
        const mime = this.getMimeType(fileName);
        const validationError = this.validateImage(fileName, imageData.byteLength, mime);
        if (validationError) return { ok: false, message: validationError };

        const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);

        const formDataHeader = `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`;
        const formDataFooter = `\r\n--${boundary}--`;

        const headerArray = new TextEncoder().encode(formDataHeader);
        const footerArray = new TextEncoder().encode(formDataFooter);

        const combinedBuffer = new Uint8Array(headerArray.length + imageData.byteLength + footerArray.length);
        combinedBuffer.set(headerArray, 0);
        combinedBuffer.set(new Uint8Array(imageData), headerArray.length);
        combinedBuffer.set(footerArray, headerArray.length + imageData.byteLength);

        let response;
        try {
            response = await this.apiClient.requestWithTokenRetry(async (token) => {
                return requestUrl({
                    url: `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`,
                    method: 'POST',
                    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
                    body: combinedBuffer.buffer,
                });
            });
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            return { ok: false, message: `网络请求失败：${detail}` };
        }

        if (!response) {
            const tokenError = this.apiClient.getLastTokenErrorMessage();
            return {
                ok: false,
                message: tokenError || '微信接口无响应，可能是网络、IP 白名单或 access token 获取失败。',
            };
        }

        if (response.json?.errcode && response.json.errcode !== 0) {
            this.logger.error('Upload failed:', response.json);
            return {
                ok: false,
                errcode: response.json.errcode,
                errmsg: response.json.errmsg,
                message: this.apiClient.getErrorMessage(response.json),
            };
        }

        if (!response.json?.url || !response.json?.media_id) {
            return {
                ok: false,
                message: `微信上传接口返回异常：${JSON.stringify(response.json || {})}`,
            };
        }

        return {
            ok: true,
            url: response.json.url,
            media_id: response.json.media_id,
        };
    }

    private getMimeType(fileName: string): string {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const types: Record<string, string> = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            bmp: 'image/bmp',
        };
        return types[ext] || 'image/jpeg';
    }

    private validateImage(fileName: string, byteLength: number, mime: string): string | null {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const supported = ['bmp', 'png', 'jpeg', 'jpg', 'gif'];
        if (!supported.includes(ext)) {
            return `图片格式不支持：${fileName}。微信公众号永久图片素材通常支持 bmp/png/jpeg/jpg/gif，请转换格式后重试。`;
        }

        const maxBytes = 10 * 1024 * 1024;
        if (byteLength > maxBytes) {
            const sizeMb = (byteLength / 1024 / 1024).toFixed(2);
            return `图片过大：${fileName} (${sizeMb}MB)。当前插件限制为 10MB 以内，请压缩后重试。`;
        }

        if (!mime.startsWith('image/')) {
            return `文件不是图片类型：${fileName}`;
        }

        return null;
    }
}
