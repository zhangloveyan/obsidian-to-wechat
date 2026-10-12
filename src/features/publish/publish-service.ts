import type { App, TFile } from 'obsidian';
import { ArticleRenderer } from '../../core/render/article-renderer';
import { readArticle } from '../../integrations/obsidian/article-source';
import { readImageAsset } from '../../integrations/obsidian/image-assets';
import type { WechatPublisher } from '../../integrations/wechat/wechat-publisher';
import { errorMessage } from '../../shared/errors';
import { prepareImageForWechat } from '../../core/output/image-output';

export interface SelectedCover {
    accountId: string;
    appId: string;
    mediaId: string;
    previewUrl: string;
}
export interface PublishRequest {
    file: TFile;
    accountId: string;
    title: string;
    cover: SelectedCover;
    themeCss: string;
}

export class PublishService {
    private active = new Set<string>();
    private disposed = false;
    constructor(private app: App, private publisher: WechatPublisher) {}

    dispose(): void { this.disposed = true; }

    private checkActive(): void {
        if (this.disposed) throw new Error('插件已卸载，发布任务已停止。');
    }

    async publish(request: PublishRequest, progress: (message: string) => void): Promise<string> {
        this.checkActive();
        const session = this.publisher.createSession(request.accountId);
        if (request.cover.accountId !== session.account.id || request.cover.appId !== session.account.appId) {
            throw new Error('封面所属公众号与当前账号不一致，请重新选择封面。');
        }
        const key = request.file.path + ':' + session.account.appId;
        if (this.active.has(key)) throw new Error('这篇文章正在发布，请勿重复提交。');
        this.active.add(key);
        try {
            progress('正在渲染文章');
            const source = await readArticle(this.app, request.file);
            const article = await ArticleRenderer.render({ app: this.app, markdown: source.markdown, sourcePath: source.sourcePath, themeCss: request.themeCss });
            const element = article.element.cloneNode(true) as HTMLElement;
            const images = Array.from(element.querySelectorAll<HTMLImageElement>('img'));
            const uploaded = new Map<string, string>();
            for (const [index, image] of images.entries()) {
                this.checkActive();
                progress('正在上传正文图片 ' + (index + 1) + '/' + images.length);
                const identity = image.dataset.otwVaultPath || image.getAttribute('src') || '';
                let url = uploaded.get(identity);
                if (!url) {
                    try {
                        const original = await readImageAsset(this.app, image, source.sourcePath);
                        const asset = await prepareImageForWechat(original, image.ownerDocument);
                        const result = await session.upload(asset.data, asset.name);
                        url = result.url;
                        uploaded.set(identity, url);
                    } catch (error) {
                        const path = identity.startsWith('data:') ? '内嵌图片' : identity.split(/[?#]/)[0];
                        throw new Error(source.sourcePath + ' 第 ' + (index + 1) + ' 张图片（' + path + '）：' + errorMessage(error));
                    }
                }
                image.src = url;
                image.removeAttribute('data-otw-vault-path');
            }
            progress('正在创建微信草稿');
            this.checkActive();
            return await session.createDraft(request.title.trim(), element.outerHTML, request.cover.mediaId);
        } finally { this.active.delete(key); }
    }
}
