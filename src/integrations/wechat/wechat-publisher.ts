import { Notice, TFile, requestUrl } from 'obsidian';
import type WechatPublisherPlugin from '../../plugin';
import { WechatApiClient } from './wechat-api-client';
import { WechatImageUploader } from './wechat-uploader';
import { WechatDraftPublisher } from './wechat-draft';
import type { Logger } from '../../shared/logger';
import type { SettingsManager } from '../../features/settings/settings';
import { getOrCreateMetadata, isImageUploaded, addImageMetadata, updateMetadata } from '../../types/metadata';
import { isRemoteOrDataImage, normalizeImagePath, resolveImageFile } from './image-path-resolver';

/**
 * Facade that coordinates WechatApiClient, WechatImageUploader, and WechatDraftPublisher.
 * Also handles document image processing (base64, http, local file paths).
 */
export class WechatPublisher {
    private logger: Logger;
    private settingsManager: SettingsManager;
    private apiClient: WechatApiClient | null = null;
    private uploader: WechatImageUploader | null = null;
    private draftPublisher: WechatDraftPublisher | null = null;

    constructor(plugin: WechatPublisherPlugin) {
        this.logger = plugin.logger;
        this.settingsManager = plugin.settingsManager;

        const account = this.settingsManager.getDefaultAccount();
        if (account) {
            this.apiClient = new WechatApiClient(account, this.logger);
            this.uploader = new WechatImageUploader(this.apiClient, this.logger);
            this.draftPublisher = new WechatDraftPublisher(this.apiClient, this.settingsManager);
        }
    }

    private ensureReady(): boolean {
        if (!this.apiClient) {
            new Notice('请先在设置中配置公众号账号');
            return false;
        }
        return true;
    }

    /** Reinitialize with a different account */
    switchAccount(accountId: string): void {
        const account = this.settingsManager.getAccount(accountId);
        if (!account) {
            throw new Error(`Account not found: ${accountId}`);
        }
        this.apiClient = new WechatApiClient(account, this.logger);
        this.uploader = new WechatImageUploader(this.apiClient, this.logger);
        this.draftPublisher = new WechatDraftPublisher(this.apiClient, this.settingsManager);
    }

    /** Test connection with given credentials */
    async testConnection(appId: string, appSecret: string): Promise<{ ok: boolean; message: string }> {
        return WechatApiClient.testConnection(appId, appSecret, this.logger);
    }

    /** Upload image to WeChat and get media_id */
    async uploadImageToWechat(imageData: ArrayBuffer, fileName: string): Promise<string> {
        if (!this.ensureReady()) return '';
        const result = await this.uploader!.upload(imageData, fileName);
        if (!result.ok) {
            new Notice(`上传图片失败：${fileName}\n${result.message}`, 10000);
            return '';
        }
        return result.media_id;
    }

    /** Get materials from WeChat library */
    async getWechatMaterials(page = 0, pageSize = 20): Promise<{ items: Array<{ media_id: string; name: string; url: string }>; totalCount: number }> {
        if (!this.ensureReady()) return { items: [], totalCount: 0 };
        return this.draftPublisher!.getMaterials(page, pageSize);
    }

    /** Process all images in document HTML and replace src with WeChat URLs */
    async processDocumentImages(
        content: string,
        file: TFile,
        onProgress?: (current: number, total: number, imageName?: string) => void,
    ): Promise<string> {
        const metadata = getOrCreateMetadata(this.settingsManager, file);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;

        const images = tempDiv.querySelectorAll('img');
        const totalImages = images.length;
        const failures: string[] = [];

        let processedCount = 0;
        for (const img of Array.from(images)) {
            const src = img.getAttribute('src');
            if (!src) continue;

            if (onProgress) {
                const fileName = normalizeImagePath(src).split('/').pop() || `图片 ${processedCount + 1}`;
                onProgress(processedCount, totalImages, fileName);
            }

            const result = await this.processImage(src, file, metadata);
            if (result.url) {
                img.setAttribute('src', result.url);
                processedCount++;
            } else {
                failures.push(result.message);
            }
        }

        if (failures.length > 0) {
            const message = [
                `正文图片上传失败，共 ${failures.length} 张：`,
                ...failures.map((failure, index) => `${index + 1}. ${failure}`),
            ].join('\n');
            new Notice(message, 12000);
            throw new Error(message);
        }

        this.processLists(tempDiv);
        return tempDiv.innerHTML;
    }

    /** Full publish workflow: process images → create/update draft */
    async publishToWechat(
        title: string,
        content: string,
        thumbMediaId: string,
        file: TFile,
    ): Promise<boolean> {
        if (!this.ensureReady()) return false;
        const processedContent = await this.processDocumentImages(content, file);

        return this.draftPublisher!.publish({
            title,
            content: processedContent,
            thumbMediaId,
            file,
        });
    }

    /** Process a single image (base64, http, or local file) */
    private async processImage(
        imagePath: string,
        file: TFile,
        metadata: any,
    ): Promise<{ url: string | null; message: string }> {
        const normalizedPath = normalizeImagePath(imagePath);

        if (imagePath.startsWith('data:image/')) {
            return this.processBase64Image(imagePath);
        }

        if (isRemoteOrDataImage(imagePath) || /^https?:\/\//i.test(normalizedPath)) {
            return this.processRemoteImage(imagePath, normalizedPath, file, metadata);
        }

        return this.processLocalImage(imagePath, normalizedPath, file, metadata);
    }

    private async processBase64Image(imagePath: string): Promise<{ url: string | null; message: string }> {
        const match = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!match) return { url: null, message: `Base64 图片格式无法识别：${shortenImagePath(imagePath)}` };

        const ext = match[1];
        const base64Data = match[2];
        const fileName = `formula_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        try {
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const uploadResult = await this.uploader!.upload(bytes.buffer, fileName);
            if (!uploadResult.ok) {
                return { url: null, message: `${fileName}：${uploadResult.message}` };
            }
            return { url: uploadResult.url, message: '' };
        } catch (error) {
            return { url: null, message: `${fileName}：Base64 图片处理失败，${formatError(error)}` };
        }
    }

    private async processRemoteImage(
        imagePath: string,
        normalizedPath: string,
        file: TFile,
        metadata: any,
    ): Promise<{ url: string | null; message: string }> {
        let imageMetadata = isImageUploaded(metadata, imagePath);
        if (!imageMetadata) {
            try {
                const response = await requestUrl({ url: imagePath });
                if (response.status !== 200) {
                    return { url: null, message: `网络图片下载失败：${imagePath}，HTTP ${response.status}` };
                }

                const fileName = normalizedPath.split('/').pop() || `web_image_${Date.now()}.png`;
                const uploadResult = await this.uploader!.upload(response.arrayBuffer, fileName);
                if (!uploadResult.ok) {
                    return { url: null, message: `网络图片上传失败：${imagePath}，${uploadResult.message}` };
                }

                imageMetadata = {
                    fileName: imagePath,
                    url: uploadResult.url,
                    media_id: uploadResult.media_id,
                    uploadTime: Date.now(),
                };
                addImageMetadata(metadata, imagePath, imageMetadata);
                await updateMetadata(this.settingsManager, file, metadata);
            } catch (error) {
                this.logger.error(`Failed to download network image: ${imagePath}`, error);
                return { url: null, message: `网络图片处理失败：${imagePath}，${formatError(error)}` };
            }
        }

        return { url: imageMetadata.url, message: '' };
    }

    private async processLocalImage(
        imagePath: string,
        normalizedPath: string,
        file: TFile,
        metadata: any,
    ): Promise<{ url: string | null; message: string }> {
        const resolved = resolveImageFile(this.settingsManager.plugin.app, normalizedPath, file.path);
        if (!resolved.file) {
            return {
                url: null,
                message: `本地图片路径解析失败：${imagePath}。已尝试：${resolved.attempts.join(' | ')}`,
            };
        }

        const metadataKey = resolved.file.path;
        let imageMetadata = isImageUploaded(metadata, metadataKey);
        if (!imageMetadata) {
            try {
                const arrayBuffer = await this.settingsManager.plugin.app.vault.readBinary(resolved.file);
                const uploadResult = await this.uploader!.upload(arrayBuffer, resolved.file.name);
                if (!uploadResult.ok) {
                    return {
                        url: null,
                        message: `本地图片上传失败：${resolved.file.path}，${uploadResult.message}`,
                    };
                }

                imageMetadata = {
                    fileName: metadataKey,
                    url: uploadResult.url,
                    media_id: uploadResult.media_id,
                    uploadTime: Date.now(),
                };
                addImageMetadata(metadata, metadataKey, imageMetadata);
                await updateMetadata(this.settingsManager, file, metadata);
            } catch (error) {
                return {
                    url: null,
                    message: `本地图片读取失败：${resolved.file.path}，${formatError(error)}`,
                };
            }
        }

        return { url: imageMetadata.url, message: '' };
    }

    /** Process lists (delegated to shared utility) */
    private processLists(container: HTMLElement): void {
        container.querySelectorAll('.otw-list-item').forEach(item => {
            const el = item as HTMLElement;
            if (!el.style.paddingLeft) {
                el.style.paddingLeft = '2em';
            }
        });
    }
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function shortenImagePath(path: string): string {
    return path.length > 80 ? `${path.slice(0, 77)}...` : path;
}
