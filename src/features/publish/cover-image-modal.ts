import { App, Modal, Notice, MarkdownView, TFile } from 'obsidian';
import type WechatPublisherPlugin from '../../plugin';
import { extractImagePathsFromMarkdown, isRemoteOrDataImage, normalizeImagePath, resolveImageFile } from '../../integrations/wechat/image-path-resolver';

interface ArticleImage {
    rawPath: string;
    displayUrl: string;
    file: TFile;
}

export class CoverImageModal extends Modal {
    plugin: WechatPublisherPlugin;
    markdownView: MarkdownView;
    accountId: string;
    selectedMediaId = '';
    selectedDisplayUrl = '';
    onImageSelected: (mediaId: string, url: string) => void;

    private localFileInput: HTMLInputElement | null = null;
    private localFileData: ArrayBuffer | null = null;
    private localFileName = '';
    private localDataUrl = '';
    private selectedArticleImage: TFile | null = null;

    constructor(app: App, plugin: WechatPublisherPlugin, markdownView: MarkdownView, accountId: string, onImageSelected: (mediaId: string, url: string) => void) {
        super(app);
        this.plugin = plugin;
        this.markdownView = markdownView;
        this.accountId = accountId;
        this.onImageSelected = onImageSelected;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('otw-cover-modal');

        const modalEl = this.containerEl.querySelector('.modal') as HTMLElement;
        if (modalEl) modalEl.classList.add('mod-wechat-cover');

        contentEl.createEl('h2', { text: '选择封面图' });

        // Tabs
        const tabsContainer = contentEl.createDiv({ cls: 'otw-modal-tabs' });
        const articleTab = tabsContainer.createDiv({ cls: 'otw-modal-tab active', text: '文章图片' });
        const localTab = tabsContainer.createDiv({ cls: 'otw-modal-tab', text: '本地图片' });

        const contentContainer = contentEl.createDiv({ cls: 'otw-modal-content' });
        const articleContent = contentContainer.createDiv({ cls: 'otw-modal-article-content' });
        const localContent = contentContainer.createDiv({ cls: 'otw-modal-local-content otw-modal-content-hidden' });
        let updateConfirmState = () => {};

        // Resolve article images
        const articleImages = this.resolveArticleImages();

        const imageGrid = articleContent.createDiv({ cls: 'otw-modal-image-grid' });
        const emptyMsg = articleContent.createDiv({ cls: 'otw-modal-empty-msg', text: '文章中暂无图片，请从本地选择' });

        if (articleImages.length > 0) {
            emptyMsg.remove();
            for (const imgInfo of articleImages) {
                const item = imageGrid.createDiv({ cls: 'otw-modal-image-item' });
                const img = item.createEl('img');
                img.src = imgInfo.displayUrl;
                const capturedImgInfo = imgInfo;
                const capturedItem = item;
                img.onerror = () => { capturedItem.remove(); };
                item.addEventListener('click', () => {
                    void (async () => {
                    imageGrid.querySelectorAll('.otw-modal-image-item').forEach((el: HTMLElement) => el.classList.remove('otw-modal-image-selected'));
                    capturedItem.classList.add('otw-modal-image-selected');
                    this.selectedMediaId = 'article_' + Date.now();
                    this.selectedArticleImage = capturedImgInfo.file;
                    // Convert to data URL on click for reliable preview display
                    this.selectedDisplayUrl = await this.fileToDataUrl(capturedImgInfo.file);
                    this.localFileData = null;
                    updateConfirmState();
                    })();
                });
            }
        }

        // Local image tab
        const fileInputContainer = localContent.createDiv({ cls: 'otw-modal-file-input-container' });
        this.localFileInput = fileInputContainer.createEl('input');
        this.localFileInput.type = 'file';
        this.localFileInput.accept = 'image/*';
        const imagePreview = localContent.createDiv({ cls: 'otw-modal-image-preview', text: '选择图片预览' });

        this.localFileInput.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                const selectedFile = target.files[0];
                this.localFileName = selectedFile.name;
                this.localFileData = null;
                updateConfirmState();

                const previewReader = new FileReader();
                previewReader.onload = (e) => {
                    if (e.target?.result) {
                        this.localDataUrl = e.target.result as string;
                        imagePreview.empty();
                        const img = imagePreview.createEl('img', { cls: 'preview-image' });
                        img.src = this.localDataUrl;
                        this.selectedMediaId = 'local_' + Date.now();
                        this.selectedDisplayUrl = this.localDataUrl;
                        this.selectedArticleImage = null;
                    }
                };
                previewReader.readAsDataURL(selectedFile);

                const dataReader = new FileReader();
                dataReader.onload = (e) => {
                    if (e.target?.result) {
                        this.localFileData = e.target.result as ArrayBuffer;
                        updateConfirmState();
                    }
                };
                dataReader.readAsArrayBuffer(selectedFile);
            } else {
                imagePreview.textContent = '选择图片预览';
                this.localFileData = null;
                this.localDataUrl = '';
                this.localFileName = '';
                this.selectedMediaId = '';
                this.selectedArticleImage = null;
                updateConfirmState();
            }
        });

        // Buttons
        const buttonContainer = contentEl.createDiv({ cls: 'otw-modal-buttons' });
        const cancelButton = buttonContainer.createEl('button', { text: '取消' });
        cancelButton.addEventListener('click', () => this.close());
        const confirmButton = buttonContainer.createEl('button', { text: '确认', cls: 'otw-modal-btn-cta' });
        confirmButton.disabled = true;

        articleTab.addEventListener('click', () => {
            articleTab.classList.add('active');
            localTab.classList.remove('active');
            articleContent.classList.remove('otw-modal-content-hidden');
            localContent.classList.add('otw-modal-content-hidden');
        });

        localTab.addEventListener('click', () => {
            localTab.classList.add('active');
            articleTab.classList.remove('active');
            articleContent.classList.add('otw-modal-content-hidden');
            localContent.classList.remove('otw-modal-content-hidden');
        });

        updateConfirmState = () => {
            const activeTab = articleTab.classList.contains('active') ? 'article' : 'local';
            if (activeTab === 'article') {
                confirmButton.disabled = !this.selectedMediaId.startsWith('article_');
            } else {
                confirmButton.disabled = !this.localFileData;
            }
        };

        // Listen for tab switches and image selections instead of polling
        articleTab.addEventListener('click', updateConfirmState);
        localTab.addEventListener('click', updateConfirmState);

        confirmButton.addEventListener('click', () => {
            void (async () => {
            if (!this.selectedMediaId) { new Notice('请先选择图片'); return; }
            confirmButton.disabled = true;
            confirmButton.textContent = '上传中...';

            const activeTab = articleTab.classList.contains('active') ? 'article' : 'local';

            try {
                this.plugin.wechatPublisher.switchAccount(this.accountId);

                if (activeTab === 'local') {
                    if (!this.localFileData) {
                        new Notice('请先选择图片');
                        confirmButton.disabled = false;
                        confirmButton.textContent = '确认';
                        return;
                    }
                    const mediaId = await this.plugin.wechatPublisher.uploadImageToWechat(this.localFileData, this.localFileName);
                    if (!mediaId) {
                        new Notice(`上传封面图失败：${this.localFileName}`);
                        confirmButton.disabled = false;
                        confirmButton.textContent = '确认';
                        return;
                    }
                    this.onImageSelected(mediaId, this.localDataUrl);
                    this.close();
                    return;
                }

                if (this.selectedArticleImage) {
                    const arrayBuffer = await this.app.vault.readBinary(this.selectedArticleImage);
                    const mediaId = await this.plugin.wechatPublisher.uploadImageToWechat(arrayBuffer, this.selectedArticleImage.name);
                    if (!mediaId) {
                        new Notice(`上传封面图失败：${this.selectedArticleImage.path}`);
                        confirmButton.disabled = false;
                        confirmButton.textContent = '确认';
                        return;
                    }
                    this.onImageSelected(mediaId, this.selectedDisplayUrl);
                    this.close();
                } else {
                    new Notice('图片加载失败');
                    confirmButton.disabled = false;
                    confirmButton.textContent = '确认';
                }
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : String(error || '未知错误');
                new Notice('上传失败：' + message);
                confirmButton.disabled = false;
                confirmButton.textContent = '确认';
            }
            })();
        });
    }

    /** Convert TFile to base64 data URL */
    private async fileToDataUrl(file: TFile): Promise<string> {
        try {
            const arrayBuffer = await this.app.vault.readBinary(file);
            const bytes = new Uint8Array(arrayBuffer);
            const ext = file.extension || 'png';
            const mimeTypes: Record<string, string> = {
                png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
                gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp',
            };
            const mime = mimeTypes[ext] || 'image/png';
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            return `data:${mime};base64,${btoa(binary)}`;
        } catch {
            return '';
        }
    }

    private resolveArticleImages(): ArticleImage[] {
        const result: ArticleImage[] = [];
        const rawPaths = extractImagePathsFromMarkdown(this.markdownView.getViewData());
        const sourceFile = this.markdownView.file;

        for (const rawPath of rawPaths) {
            if (isRemoteOrDataImage(rawPath)) {
                continue;
            }

            if (sourceFile) {
                const resolved = resolveImageFile(this.app, normalizeImagePath(rawPath), sourceFile.path);
                if (resolved.file) {
                    const resourcePath = this.app.vault.getResourcePath(resolved.file);
                    result.push({ rawPath, displayUrl: resourcePath, file: resolved.file });
                    continue;
                }
            }
        }

        return result;
    }

    onClose() {
        this.contentEl.empty();
    }
}
