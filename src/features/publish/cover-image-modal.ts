import { App, Modal, Notice, MarkdownView, TFile } from 'obsidian';
import type WechatPublisherPlugin from '../../plugin';
import { extractImagePathsFromMarkdown, isRemoteOrDataImage, normalizeImagePath, resolveImageFile } from '../../integrations/wechat/image-path-resolver';
import { CoverCropModal } from './cover-crop-modal';
import { imageBlob } from './cover-crop-image';
import type { CoverImageSource } from './cover-crop-image';

interface ArticleImage {
    displayUrl: string;
    file: TFile;
}

export class CoverImageModal extends Modal {
    private alive = false;
    private activeTab: 'article' | 'local' = 'article';
    private localSource?: CoverImageSource;
    private localPreviewUrl?: string;
    private selectedArticleImage?: TFile;
    private readingLocal = false;
    private openingCrop = false;
    private localReadVersion = 0;
    private selectionVersion = 0;
    private cropModal?: CoverCropModal;
    private confirmButton!: HTMLButtonElement;

    constructor(
        app: App,
        private plugin: WechatPublisherPlugin,
        private markdownView: MarkdownView,
        private accountId: string,
        private onImageSelected: (mediaId: string, url: string) => void,
    ) {
        super(app);
    }

    onOpen(): void {
        this.alive = true;
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('otw-cover-modal');
        this.modalEl.addClass('mod-wechat-cover');
        contentEl.createEl('h2', { text: '选择封面图' });

        const tabsContainer = contentEl.createDiv({ cls: 'otw-modal-tabs' });
        const articleTab = tabsContainer.createDiv({ cls: 'otw-modal-tab active', text: '文章图片' });
        const localTab = tabsContainer.createDiv({ cls: 'otw-modal-tab', text: '本地图片' });
        const contentContainer = contentEl.createDiv({ cls: 'otw-modal-content' });
        const articleContent = contentContainer.createDiv({ cls: 'otw-modal-article-content' });
        const localContent = contentContainer.createDiv({ cls: 'otw-modal-local-content otw-modal-content-hidden' });
        const articleImages = this.resolveArticleImages();
        const imageGrid = articleContent.createDiv({ cls: 'otw-modal-image-grid' });
        if (!articleImages.length) {
            articleContent.createDiv({ cls: 'otw-modal-empty-msg', text: '文章中暂无图片，请从本地选择' });
        }
        for (const image of articleImages) {
            const item = imageGrid.createDiv({ cls: 'otw-modal-image-item' });
            const img = item.createEl('img', { attr: { src: image.displayUrl, alt: image.file.name } });
            img.onerror = () => {
                item.remove();
                if (this.selectedArticleImage === image.file) {
                    this.selectedArticleImage = undefined;
                    ++this.selectionVersion;
                    this.updateConfirmState();
                }
            };
            item.addEventListener('click', () => {
                imageGrid.querySelectorAll('.otw-modal-image-item').forEach(el => el.classList.remove('otw-modal-image-selected'));
                item.classList.add('otw-modal-image-selected');
                this.selectedArticleImage = image.file;
                ++this.selectionVersion;
                this.updateConfirmState();
            });
        }

        const fileInputContainer = localContent.createDiv({ cls: 'otw-modal-file-input-container' });
        const fileInput = fileInputContainer.createEl('input', { attr: { type: 'file', accept: 'image/*', 'aria-label': '本地封面图片' } });
        const imagePreview = localContent.createDiv({ cls: 'otw-modal-image-preview', text: '选择图片预览' });
        fileInput.addEventListener('change', () => {
            void this.readLocalFile(fileInput.files?.[0], imagePreview);
        });

        const buttonContainer = contentEl.createDiv({ cls: 'otw-modal-buttons' });
        buttonContainer.createEl('button', { text: '取消' }).addEventListener('click', () => this.close());
        this.confirmButton = buttonContainer.createEl('button', { text: '确认', cls: 'otw-modal-btn-cta' });
        this.confirmButton.addEventListener('click', () => { void this.openCrop(); });
        const switchTab = (tab: 'article' | 'local'): void => {
            this.activeTab = tab;
            ++this.selectionVersion;
            articleTab.classList.toggle('active', tab === 'article');
            localTab.classList.toggle('active', tab === 'local');
            articleContent.classList.toggle('otw-modal-content-hidden', tab !== 'article');
            localContent.classList.toggle('otw-modal-content-hidden', tab !== 'local');
            this.updateConfirmState();
        };
        articleTab.addEventListener('click', () => switchTab('article'));
        localTab.addEventListener('click', () => switchTab('local'));
        this.updateConfirmState();
    }

    private updateConfirmState(): void {
        if (!this.alive || !this.confirmButton) return;
        const hasImage = this.activeTab === 'article' ? !!this.selectedArticleImage : !!this.localSource && !this.readingLocal;
        this.confirmButton.disabled = !hasImage || this.openingCrop || !!this.cropModal;
        this.confirmButton.setText(this.openingCrop ? '读取中...' : '确认');
    }

    private async readLocalFile(file: File | undefined, preview: HTMLElement): Promise<void> {
        const request = ++this.localReadVersion;
        ++this.selectionVersion;
        this.localSource = undefined;
        this.releasePreviewUrl();
        this.readingLocal = !!file;
        preview.setText(file ? '正在读取图片...' : '选择图片预览');
        this.updateConfirmState();
        if (!file) return;
        try {
            const source = { data: await file.arrayBuffer(), name: file.name };
            if (!this.alive || request !== this.localReadVersion) return;
            const blob = imageBlob(source);
            this.localSource = source;
            this.localPreviewUrl = URL.createObjectURL(blob);
            preview.empty();
            preview.createEl('img', { cls: 'preview-image', attr: { src: this.localPreviewUrl, alt: file.name } });
        } catch (error) {
            if (!this.alive || request !== this.localReadVersion) return;
            preview.setText(error instanceof Error ? error.message : '读取图片失败，请重新选择。');
        } finally {
            if (this.alive && request === this.localReadVersion) {
                this.readingLocal = false;
                this.updateConfirmState();
            }
        }
    }

    private async openCrop(): Promise<void> {
        if (!this.alive || this.confirmButton.disabled || this.cropModal) return;
        const request = this.selectionVersion;
        const file = this.selectedArticleImage;
        const localSource = this.activeTab === 'local' ? this.localSource : undefined;
        this.openingCrop = true;
        this.updateConfirmState();
        try {
            const source = localSource || (file ? { data: await this.app.vault.readBinary(file), name: file.name } : undefined);
            if (!this.alive || request !== this.selectionVersion) return;
            if (!source) throw new Error('请先选择封面图片。');
            const modal = new CoverCropModal(this.app, source, async cover => {
                this.plugin.wechatPublisher.switchAccount(this.accountId);
                const mediaId = await this.plugin.wechatPublisher.uploadImageToWechat(cover.data, cover.name);
                if (!mediaId) throw new Error('封面上传失败，裁剪结果已保留，请重试。');
                if (!this.alive || this.cropModal !== modal || !modal.isActive) return;
                this.onImageSelected(mediaId, cover.displayUrl);
                this.close();
            }, () => {
                if (this.cropModal === modal) this.cropModal = undefined;
                this.updateConfirmState();
            });
            this.cropModal = modal;
            modal.open();
        } catch (error) {
            if (this.alive) new Notice(error instanceof Error ? error.message : '封面图片读取失败，请重试。');
        } finally {
            this.openingCrop = false;
            this.updateConfirmState();
        }
    }

    private resolveArticleImages(): ArticleImage[] {
        const result: ArticleImage[] = [];
        const sourceFile = this.markdownView.file;
        for (const rawPath of extractImagePathsFromMarkdown(this.markdownView.getViewData())) {
            if (isRemoteOrDataImage(rawPath) || !sourceFile) continue;
            const resolved = resolveImageFile(this.app, normalizeImagePath(rawPath), sourceFile.path);
            if (resolved.file) result.push({ displayUrl: this.app.vault.getResourcePath(resolved.file), file: resolved.file });
        }
        return result;
    }

    private releasePreviewUrl(): void {
        if (this.localPreviewUrl) URL.revokeObjectURL(this.localPreviewUrl);
        this.localPreviewUrl = undefined;
    }

    onClose(): void {
        this.alive = false;
        ++this.localReadVersion;
        ++this.selectionVersion;
        this.cropModal?.close();
        this.cropModal = undefined;
        this.releasePreviewUrl();
        this.localSource = undefined;
        this.contentEl.empty();
    }
}
