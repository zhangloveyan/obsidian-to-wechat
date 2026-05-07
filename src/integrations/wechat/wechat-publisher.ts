import { Notice, TFile } from 'obsidian';
import type WechatPublisherPlugin from '../../plugin';
import { WechatApiClient } from './wechat-api-client';
import { WechatImageUploader } from './wechat-uploader';
import { WechatDraftPublisher } from './wechat-draft';
import type { Logger } from '../../shared/logger';
import type { SettingsManager } from '../../features/settings/settings';
import { getOrCreateMetadata, isImageUploaded, addImageMetadata, updateMetadata } from '../../types/metadata';
import { requestUrl } from 'obsidian';

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
        return result?.media_id || '';
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

        let processedCount = 0;
        for (const img of Array.from(images)) {
            const src = img.getAttribute('src');
            if (!src) continue;

            if (onProgress) {
                const fileName = src.split('/').pop() || `图片 ${processedCount + 1}`;
                onProgress(processedCount, totalImages, fileName);
            }

            const imageUrl = await this.processImage(src, file, metadata);
            if (imageUrl) {
                img.setAttribute('src', imageUrl);
                processedCount++;
            }
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
        // Process document images
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
    ): Promise<string | null> {
        // 1. Base64 data URL
        if (imagePath.startsWith('data:image/')) {
            const match = imagePath.match(/^data:image\/(\w+);base64,(.+)$/);
            if (!match) return null;

            const ext = match[1];
            const base64Data = match[2];
            const fileName = `formula_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            const uploadResult = await this.uploader!.upload(bytes.buffer, fileName);
            return uploadResult?.url || null;
        }

        // 2. HTTP/HTTPS image
        if (imagePath.startsWith('http')) {
            let imageMetadata = isImageUploaded(metadata, imagePath);
            if (!imageMetadata) {
                try {
                    const response = await requestUrl({ url: imagePath });
                    if (response.status !== 200) return null;

                    const fileName = imagePath.split('/').pop()?.split('?')[0] || `web_image_${Date.now()}.png`;
                    const uploadResult = await this.uploader!.upload(response.arrayBuffer, fileName);
                    if (!uploadResult) return null;

                    imageMetadata = {
                        fileName: imagePath,
                        url: uploadResult.url,
                        media_id: uploadResult.media_id,
                        uploadTime: Date.now(),
                    };
                    addImageMetadata(metadata, imagePath, imageMetadata);
                    await updateMetadata(this.settingsManager, file, metadata);
                } catch (e) {
                    this.logger.error(`Failed to download network image: ${imagePath}`, e);
                    return null;
                }
            }
            return imageMetadata.url;
        }

        // 3. Local file path
        let fileName = imagePath.replace(/\\/g, '/').split('/').pop();
        if (!fileName) return null;
        if (fileName.includes('?')) fileName = fileName.split('?')[0];

        let imageMetadata = isImageUploaded(metadata, fileName);
        if (!imageMetadata) {
            const linkedFile = this.settingsManager.plugin.app.metadataCache.getFirstLinkpathDest(fileName, file.path);
            if (!linkedFile || !(linkedFile instanceof TFile)) return null;

            const arrayBuffer = await this.settingsManager.plugin.app.vault.readBinary(linkedFile);
            const uploadResult = await this.uploader!.upload(arrayBuffer, fileName);
            if (!uploadResult) return null;

            imageMetadata = {
                fileName,
                url: uploadResult.url,
                media_id: uploadResult.media_id,
                uploadTime: Date.now(),
            };
            addImageMetadata(metadata, fileName, imageMetadata);
            await updateMetadata(this.settingsManager, file, metadata);
        }

        return imageMetadata.url;
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
