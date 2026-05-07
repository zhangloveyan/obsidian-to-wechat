import { requestUrl } from 'obsidian';
import type { Logger } from '../../shared/logger';
import type { WechatApiClient } from './wechat-api-client';

export interface UploadResult {
    url: string;
    media_id: string;
}

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
    async upload(imageData: ArrayBuffer, fileName: string): Promise<UploadResult | null> {
        const mime = this.getMimeType(fileName);
        const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);

        const formDataHeader = `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`;
        const formDataFooter = `\r\n--${boundary}--`;

        const headerArray = new TextEncoder().encode(formDataHeader);
        const footerArray = new TextEncoder().encode(formDataFooter);

        const combinedBuffer = new Uint8Array(headerArray.length + imageData.byteLength + footerArray.length);
        combinedBuffer.set(headerArray, 0);
        combinedBuffer.set(new Uint8Array(imageData), headerArray.length);
        combinedBuffer.set(footerArray, headerArray.length + imageData.byteLength);

        const response = await this.apiClient.requestWithTokenRetry(async (token) => {
            return requestUrl({
                url: `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`,
                method: 'POST',
                headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
                body: combinedBuffer.buffer,
            });
        });

        if (!response) return null;

        if (response.json.errcode && response.json.errcode !== 0) {
            this.logger.error('Upload failed:', response.json);
            return null;
        }

        return {
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
}
