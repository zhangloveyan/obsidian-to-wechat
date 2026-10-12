import { WechatApiClient } from './wechat-api-client';
import { WechatImageUploader } from './wechat-uploader';
import { WechatDraftPublisher } from './wechat-draft';
import { ImageUploadCache, imageFingerprint, type UploadedImage } from '../obsidian/image-cache';
import type { SettingsManager, WechatAccount } from '../../features/settings/settings';
import type { Logger } from '../../shared/logger';

export interface WechatSession {
    readonly account: Readonly<WechatAccount>;
    upload(data: ArrayBuffer, name: string): Promise<UploadedImage>;
    createDraft(title: string, content: string, coverMediaId: string): Promise<string>;
}

export class WechatPublisher {
    private clients = new Map<string, WechatApiClient>();
    private uploads = new Map<string, Promise<UploadedImage>>();

    constructor(private settings: SettingsManager, private cache: ImageUploadCache, private logger: Logger) {}

    createSession(accountId: string): WechatSession {
        const account = this.settings.getAccount(accountId);
        if (!account) throw new Error('公众号配置不存在，请重新选择。');
        const identity = JSON.stringify([account.id, account.appId, account.appSecret]);
        let client = this.clients.get(identity);
        if (!client) {
            client = new WechatApiClient(account, this.logger);
            this.clients.set(identity, client);
            // Remove obsolete credentials without changing clients owned by in-flight sessions.
            for (const [key, value] of this.clients) {
                if (value.account.id === accountId && key !== identity) this.clients.delete(key);
            }
        }
        const uploader = new WechatImageUploader(client);
        const drafts = new WechatDraftPublisher(client);
        const accountKey = client.account.id + ':' + client.account.appId;
        return {
            account: client.account,
            upload: async (data, name) => {
                const fingerprint = await imageFingerprint(data);
                const key = accountKey + ':' + fingerprint;
                const cached = this.cache.get(key);
                if (cached) return cached;
                const existing = this.uploads.get(key);
                if (existing) return existing;
                const revision = this.cache.revision;
                const upload = uploader.upload(data, name).then(async result => {
                    try { await this.cache.put(key, result, revision); }
                    catch (error) { this.logger.warn('图片已上传，但缓存保存失败', error); }
                    return result;
                });
                this.uploads.set(key, upload);
                try { return await upload; }
                finally { this.uploads.delete(key); }
            },
            createDraft: (title, content, coverMediaId) => drafts.create(title, content, coverMediaId),
        };
    }

    testConnection(appId: string, appSecret: string): Promise<{ ok: boolean; message: string }> {
        return WechatApiClient.testConnection(appId, appSecret, this.logger);
    }
}
