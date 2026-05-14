import { requestUrl, Notice, TFile } from 'obsidian';
import type { WechatApiClient } from './wechat-api-client';
import type { SettingsManager } from '../../features/settings/settings';

export interface DraftOptions {
    title: string;
    content: string;
    thumbMediaId: string;
    file: TFile;
}

/**
 * Handles WeChat draft creation and update.
 */
export class WechatDraftPublisher {
    private apiClient: WechatApiClient;
    private settingsManager: SettingsManager;

    constructor(apiClient: WechatApiClient, settingsManager: SettingsManager) {
        this.apiClient = apiClient;
        this.settingsManager = settingsManager;
    }

    /** Create or update a draft */
    async publish(options: DraftOptions): Promise<boolean> {
        const { title, content, thumbMediaId, file } = options;
        const articles = {
            title,
            content,
            thumb_media_id: thumbMediaId,
            author: '',
            digest: '',
            show_cover_pic: thumbMediaId ? 1 : 0,
            content_source_url: '',
            need_open_comment: 0,
            only_fans_can_comment: 0,
        };

        // 始终创建新草稿（不保留旧 media_id，避免意外覆盖）
        let response = await this.apiClient.requestWithTokenRetry(async (token) => {
            return requestUrl({
                url: `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`,
                method: 'POST',
                body: JSON.stringify({ articles: [articles] }),
            });
        });

        if (!response) {
            const tokenError = this.apiClient.getLastTokenErrorMessage();
            new Notice(`创建微信公众号草稿失败：${tokenError || '微信接口无响应，请检查网络、IP 白名单和公众号配置。'}`);
            return false;
        }

        if (response.status !== 200) {
            if (response.json?.errcode && response.json.errcode !== 0) {
                new Notice(`创建微信公众号草稿失败：${this.apiClient.getErrorMessage(response.json)}`);
            } else {
                new Notice(`创建微信公众号草稿失败：HTTP ${response.status}`);
            }
            return false;
        }

        if (response.json?.errcode && response.json.errcode !== 0) {
            new Notice(`创建微信公众号草稿失败：${this.apiClient.getErrorMessage(response.json)}`);
            return false;
        }

        new Notice('成功发布到微信公众号草稿箱');
        return true;
    }

    /** Get materials from WeChat library (paginated) */
    async getMaterials(page = 0, pageSize = 20): Promise<{ items: Array<{ media_id: string; name: string; url: string }>; totalCount: number }> {
        const response = await this.apiClient.requestWithTokenRetry(async (token) => {
            return requestUrl({
                url: `https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=${token}`,
                method: 'POST',
                body: JSON.stringify({ type: 'image', offset: page * pageSize, count: pageSize }),
            });
        });

        if (!response) {
            const tokenError = this.apiClient.getLastTokenErrorMessage();
            new Notice(`获取微信素材列表失败：${tokenError || '微信接口无响应，请检查网络、IP 白名单和公众号配置。'}`);
            return { items: [], totalCount: 0 };
        }

        if (response.json.errcode && response.json.errcode !== 0) {
            new Notice(`获取微信素材列表失败：${this.apiClient.getErrorMessage(response.json)}`);
            return { items: [], totalCount: 0 };
        }

        return {
            items: response.json.item || [],
            totalCount: response.json.total_count || 0,
        };
    }
}
