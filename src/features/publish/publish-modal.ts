import { App, Modal, Notice, Setting, type TFile } from 'obsidian';
import type WechatPublisherPlugin from '../../plugin';
import { CoverImageModal } from './cover-image-modal';
import { readArticle } from '../../integrations/obsidian/article-source';
import { errorMessage } from '../../shared/errors';
import type { SelectedCover } from './publish-service';
import { ArticleRenderer } from '../../core/render/article-renderer';

export class PublishModal extends Modal {
    private alive = false;
    private busy = false;
    private accountId = '';
    private cover?: SelectedCover;
    private coverPreview!: HTMLElement;
    private titleInput!: HTMLInputElement;
    private status!: HTMLElement;
    private button!: HTMLButtonElement;
    private picker?: CoverImageModal;
    private coverButton!: HTMLButtonElement;
    private picking = false;

    constructor(app: App, private plugin: WechatPublisherPlugin, private file: TFile) { super(app); }

    onOpen(): void {
        this.alive = true;
        this.contentEl.empty();
        this.contentEl.addClass('otw-publish-modal');
        new Setting(this.contentEl).setName('发布到微信公众号').setHeading();
        const settings = this.plugin.settingsManager.getSettings();
        const accounts = settings.wechatAccounts;
        if (!accounts.length) { new Notice('请先在设置中配置公众号'); this.close(); return; }
        this.accountId = accounts.find(account => account.id === settings.lastSelectedAccountId)?.id ||
            this.plugin.settingsManager.getDefaultAccount()?.id || accounts[0].id;
        const accountField = this.field('公众号');
        const select = accountField.createEl('select', { cls: 'otw-modal-input', attr: { 'aria-label': '公众号' } });
        for (const account of accounts) select.createEl('option', { value: account.id, text: account.name });
        select.value = this.accountId;
        select.addEventListener('change', () => {
            this.accountId = select.value;
            this.cover = undefined;
            this.coverPreview.setText('公众号已切换，请重新选择封面');
            this.coverPreview.removeClass('has-image');
            void this.plugin.settingsManager.updateSettings({ lastSelectedAccountId: this.accountId })
                .catch(error => new Notice('账号选择保存失败：' + errorMessage(error)));
        });
        this.titleInput = this.field('标题').createEl('input', { cls: 'otw-modal-input', attr: { 'aria-label': '文章标题' } });
        this.titleInput.value = this.file.basename;
        const cover = this.field('封面图').createDiv({ cls: 'otw-publish-cover-wrapper' });
        this.coverPreview = cover.createDiv({ cls: 'otw-publish-cover-preview', text: '未选择封面' });
        this.coverButton = cover.createEl('button', { cls: 'otw-publish-select-cover-btn', text: '选择封面' });
        this.coverButton.addEventListener('click', () => { void this.selectCover(); });
        this.status = this.contentEl.createDiv({ cls: 'otw-publish-status', attr: { 'aria-live': 'polite' } });
        this.button = this.contentEl.createDiv({ cls: 'otw-publish-actions' })
            .createEl('button', { text: '发布到草稿箱', cls: 'otw-publish-button' });
        this.button.addEventListener('click', () => { void this.publish(); });
    }

    private field(label: string): HTMLElement {
        const field = this.contentEl.createDiv({ cls: 'otw-publish-field' });
        field.createEl('label', { cls: 'otw-publish-field-label', text: label });
        return field;
    }

    private async selectCover(): Promise<void> {
        if (this.busy || this.picking) return;
        this.picking = true;
        this.coverButton.disabled = true;
        this.coverButton.setText('正在读取...');
        const accountId = this.accountId;
        try {
            const source = await readArticle(this.app, this.file);
            const article = await ArticleRenderer.render({ app: this.app, markdown: source.markdown,
                sourcePath: source.sourcePath, themeCss: this.plugin.themeManager.getActiveThemeCSS() });
            if (!this.alive || this.busy || accountId !== this.accountId) return;
            this.picker?.close();
            this.picker = new CoverImageModal(this.app, this.plugin, article, accountId, selected => {
                if (!this.alive || accountId !== this.accountId) return;
                this.cover = selected;
                this.coverPreview.empty();
                this.coverPreview.createEl('img', { cls: 'otw-cover-preview-img', attr: { src: selected.previewUrl, alt: '封面预览' } });
                this.coverPreview.addClass('has-image');
            });
            this.picker.open();
        } catch (error) { new Notice('选择封面失败：' + errorMessage(error), 10000); }
        finally {
            this.picking = false;
            if (this.alive) { this.coverButton.disabled = this.busy; this.coverButton.setText('选择封面'); }
        }
    }

    private async publish(): Promise<void> {
        if (this.busy) return;
        const title = this.titleInput.value.trim();
        if (!title) { new Notice('请输入标题'); return; }
        if (!this.cover) { new Notice('请先选择封面图'); return; }
        const request = { file: this.file, title, accountId: this.accountId, cover: { ...this.cover }, themeCss: this.plugin.themeManager.getActiveThemeCSS() };
        this.busy = true;
        this.setBusy(true);
        try {
            await this.plugin.publishing.publish(request, message => { if (this.alive) this.status.setText(message); });
            new Notice('已发布到微信公众号草稿箱');
            if (this.alive) this.close();
        } catch (error) {
            const message = errorMessage(error);
            if (this.alive) this.status.setText('发布失败：' + message);
            new Notice('发布失败：' + message, 12000);
        } finally {
            this.busy = false;
            if (this.alive) this.setBusy(false);
        }
    }

    private setBusy(busy: boolean): void {
        this.contentEl.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input, select, button')
            .forEach(input => { input.disabled = busy; });
        this.button.setText(busy ? '正在发布...' : '发布到草稿箱');
    }

    onClose(): void {
        this.alive = false;
        this.picker?.close();
        this.contentEl.empty();
    }
}
