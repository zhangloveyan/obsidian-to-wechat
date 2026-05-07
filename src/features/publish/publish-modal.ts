import { App, Modal, Notice, MarkdownView } from 'obsidian';
import type WechatPublisherPlugin from '../../plugin';
import { CoverImageModal } from './cover-image-modal';
import { ArticleRenderer } from '../../core/render/article-renderer';

export class PublishModal extends Modal {
    plugin: WechatPublisherPlugin;
    markdownView: MarkdownView;
    titleInput!: HTMLInputElement;
    coverImagePreview!: HTMLElement;
    selectedCoverMediaId = '';
    selectedAccountId = '';

    constructor(app: App, plugin: WechatPublisherPlugin, markdownView: MarkdownView) {
        super(app);
        this.plugin = plugin;
        this.markdownView = markdownView;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('otw-publish-modal');

        contentEl.createEl('h2', { cls: 'otw-publish-title', text: '发布到微信公众号' });

        // Accounts check
        const accounts = this.plugin.settingsManager.getSettings().wechatAccounts;
        if (accounts.length === 0) { new Notice('请先在设置中配置公众号'); this.close(); return; }

        // Account selector
        if (accounts.length > 1) {
            const defaultAccount = this.plugin.settingsManager.getDefaultAccount();
            const lastAccountId = this.plugin.settingsManager.getSettings().lastSelectedAccountId;
            this.selectedAccountId = accounts.find(a => a.id === (lastAccountId || defaultAccount?.id))?.id || accounts[0]?.id;

            const accountField = contentEl.createDiv({ cls: 'otw-publish-field' });
            accountField.createEl('label', { cls: 'otw-publish-field-label', text: '公众号' });

            const accountSelect = document.createElement('select');
            accountSelect.className = 'otw-modal-input';
            for (const account of accounts) {
                const option = document.createElement('option');
                option.value = account.id;
                option.text = account.name + (account.id === this.plugin.settingsManager.getSettings().defaultAccountId ? ' (默认)' : '');
                if (account.id === this.selectedAccountId) option.selected = true;
                accountSelect.appendChild(option);
            }
            accountSelect.addEventListener('change', () => {
                this.selectedAccountId = accountSelect.value;
                this.plugin.settingsManager.updateSettings({ lastSelectedAccountId: this.selectedAccountId });
            });
            accountField.appendChild(accountSelect);
        } else {
            this.selectedAccountId = accounts[0].id;
        }

        // Title
        const titleField = contentEl.createDiv({ cls: 'otw-publish-field' });
        titleField.createEl('label', { cls: 'otw-publish-field-label', text: '标题' });
        this.titleInput = document.createElement('input');
        this.titleInput.type = 'text';
        this.titleInput.className = 'otw-modal-input';
        this.titleInput.value = this.markdownView.file?.basename || '';
        titleField.appendChild(this.titleInput);

        // Cover image
        const coverField = contentEl.createDiv({ cls: 'otw-publish-field' });
        coverField.createEl('label', { cls: 'otw-publish-field-label', text: '封面图' });

        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'otw-publish-cover-wrapper';

        this.coverImagePreview = document.createElement('div');
        this.coverImagePreview.className = 'otw-publish-cover-preview';
        this.coverImagePreview.textContent = '未选择封面';

        const selectCoverButton = document.createElement('button');
        selectCoverButton.className = 'otw-publish-select-cover-btn';
        selectCoverButton.textContent = '选择封面';
        selectCoverButton.addEventListener('click', () => {
            const coverImageModal = new CoverImageModal(this.app, this.plugin, this.markdownView, this.selectedAccountId, (mediaId, url) => {
                this.selectedCoverMediaId = mediaId;
                this.coverImagePreview.empty();
                const img = document.createElement('img');
                img.className = 'otw-cover-preview-img';
                img.src = url;
                img.onerror = () => {
                    this.coverImagePreview.empty();
                    this.coverImagePreview.textContent = '图片加载失败';
                };
                img.onload = () => {
                    this.coverImagePreview.classList.add('has-image');
                };
                this.coverImagePreview.appendChild(img);
            });
            coverImageModal.open();
        });

        coverWrapper.appendChild(this.coverImagePreview);
        coverWrapper.appendChild(selectCoverButton);
        coverField.appendChild(coverWrapper);

        // Divider
        contentEl.createEl('hr', { cls: 'otw-publish-divider' });

        const publishButtonContainer = contentEl.createDiv({ cls: 'otw-publish-actions' });
        const publishButton = publishButtonContainer.createEl('button', { text: '发布到草稿箱', cls: 'otw-publish-button' });

        publishButton.addEventListener('click', async () => {
            const title = this.titleInput.value;
            if (!title) { new Notice('请输入标题'); return; }
            if (!this.markdownView.file) { new Notice('无法获取当前文件'); return; }
            if (!this.selectedCoverMediaId) { new Notice('请先选择封面图'); return; }

            publishButton.textContent = '正在发布...';
            publishButton.disabled = true;

            try {
                this.plugin.wechatPublisher.switchAccount(this.selectedAccountId);

                const content = this.markdownView.getViewData();
                const htmlContent = await ArticleRenderer.renderHtml({
                    app: this.app,
                    markdown: content,
                    sourcePath: this.markdownView.file?.path || '',
                    themeManager: this.plugin.themeManager,
                    convertMathToSVG: true,
                });

                const success = await this.plugin.wechatPublisher.publishToWechat(
                    title,
                    htmlContent,
                    this.selectedCoverMediaId,
                    this.markdownView.file,
                );

                if (success) {
                    publishButton.textContent = '发布成功';
                    publishButton.classList.add('success');
                    setTimeout(() => this.close(), 1500);
                } else {
                    publishButton.textContent = '发布失败，请重试';
                    publishButton.disabled = false;
                }
            } catch (error: unknown) {
                console.error('发布失败:', error);
                new Notice('发布失败：' + ((error as Error).message || '未知错误'));
                publishButton.disabled = false;
                publishButton.textContent = '发布到草稿箱';
            }
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
