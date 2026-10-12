import type { WechatApiClient } from './wechat-api-client';

export class WechatDraftPublisher {
    constructor(private client: WechatApiClient) {}

    async create(title: string, content: string, coverMediaId: string): Promise<string> {
        const result = await this.client.request('/cgi-bin/draft/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ articles: [{
                title, content, thumb_media_id: coverMediaId, author: '', digest: '',
                show_cover_pic: 1, content_source_url: '', need_open_comment: 0, only_fans_can_comment: 0,
            }] }),
        }, '创建微信公众号草稿');
        if (typeof result.media_id !== 'string' || !result.media_id) {
            throw new Error('创建草稿的响应缺少 media_id，结果未确认，请检查微信草稿箱后再重试。');
        }
        return result.media_id;
    }
}
