import { ItemView, WorkspaceLeaf, TFile, setIcon, MarkdownView, Notice } from 'obsidian';
import { ArticleRenderer } from '../../core/render/article-renderer';
import { ClipboardExporter } from '../../core/output/clipboard-exporter';
import type { SettingsManager } from '../settings/settings';
import type { ThemeManager } from '../../core/theme/theme-service';
import type WechatPublisherPlugin from '../../plugin';
import { showPublishModal } from '../publish/platform-index';
import { ArticleImageGenerationModal } from '../image-generation/article-image-generation-modal';

export const VIEW_TYPE_PREVIEW = 'otw-preview';

export class PreviewView extends ItemView {
    private previewEl!: HTMLElement;
    private currentFile: TFile | null = null;
    private updateTimer: ReturnType<typeof setTimeout> | null = null;
    private refreshButton!: HTMLButtonElement;
    private generateImageButton!: HTMLButtonElement;
    private copyButton!: HTMLButtonElement;
    private publishButton!: HTMLButtonElement;
    private imageProgressEl!: HTMLElement;
    private imageProgressTitleEl!: HTMLElement;
    private imageProgressDetailEl!: HTMLElement;
    private imageProgressBarEl!: HTMLElement;
    private themeManager: ThemeManager;
    private settingsManager: SettingsManager;
    private customThemeSelect!: HTMLElement;
    private plugin: WechatPublisherPlugin;
    private lastSyncedThemeId = '';
    private lastThemeOptionsSnapshot = '';
    private lastThemeCSSSnapshot = '';

    constructor(
        leaf: WorkspaceLeaf,
        themeManager: ThemeManager,
        settingsManager: SettingsManager,
        plugin: WechatPublisherPlugin,
    ) {
        super(leaf);
        this.themeManager = themeManager;
        this.settingsManager = settingsManager;
        this.plugin = plugin;
    }

    getViewType() { return VIEW_TYPE_PREVIEW; }
    getDisplayText() { return '预览'; }
    getIcon() { return 'panel-right'; }

    async onOpen() {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.classList.remove('view-content');
        container.classList.add('otw-view-content');

        const toolbar = container.createEl('div', { cls: 'otw-toolbar' });
        const controlsGroup = toolbar.createEl('div', { cls: 'otw-controls-group' });

        this.refreshButton = controlsGroup.createEl('button', { cls: 'otw-refresh-button', attr: { 'aria-label': '刷新预览' } });
        setIcon(this.refreshButton, 'rotate-cw');
        this.refreshButton.addEventListener('click', () => {
            void this.forceRefreshPreview();
        });

        const themeOptions = this.getThemeOptions();
        this.customThemeSelect = this.createCustomSelect(controlsGroup, themeOptions);
        this.customThemeSelect.id = 'template-select';

        this.customThemeSelect.querySelector('.custom-select')?.addEventListener('change', (e: Event) => {
            void (async () => {
            const value = (e as CustomEvent).detail?.value || (this.customThemeSelect.querySelector('.custom-select') as HTMLElement)?.dataset.value;
            if (value) {
                this.themeManager.setActiveTheme(value);
                await this.settingsManager.updateSettings({ activeThemeId: value });
                this.applyCurrentTheme();
            }
            })();
        });

        const settings = this.settingsManager.getSettings();
        if (settings.activeThemeId) this.restoreSelectValue(this.customThemeSelect, settings.activeThemeId, themeOptions);

        this.generateImageButton = controlsGroup.createEl('button', { text: '生图', cls: 'otw-generate-image-button' });

        this.copyButton = controlsGroup.createEl('button', { text: '复制', cls: 'otw-copy-button' });

        this.publishButton = controlsGroup.createEl('button', { text: '发布', cls: 'otw-preview-publish-button' });

        this.imageProgressEl = container.createEl('div', { cls: 'otw-image-progress' });
        this.imageProgressTitleEl = this.imageProgressEl.createEl('div', { cls: 'otw-image-progress-title' });
        this.imageProgressDetailEl = this.imageProgressEl.createEl('div', { cls: 'otw-image-progress-detail' });
        const progressTrack = this.imageProgressEl.createEl('div', { cls: 'otw-image-progress-track' });
        this.imageProgressBarEl = progressTrack.createEl('div', { cls: 'otw-image-progress-bar' });
        this.hideImageProgress();

        this.previewEl = container.createEl('div', { cls: 'otw-preview-area' });

        this.copyButton.addEventListener('click', () => {
            void (async () => {
            if (!this.currentFile) return;
            this.copyButton.disabled = true;
            this.copyButton.setText('复制中...');

            try {
                const content = await this.app.vault.cachedRead(this.currentFile);
                const htmlContent = await ArticleRenderer.renderHtml({
                    app: this.app,
                    markdown: content,
                    sourcePath: this.currentFile.path,
                    themeManager: this.themeManager,
                    convertMathToSVG: true,
                });
                await ClipboardExporter.copyHtml(htmlContent, content);

                this.copyButton.setText('复制成功');
                setTimeout(() => { this.copyButton.disabled = false; this.copyButton.setText('复制'); }, 2000);
            } catch {
                this.copyButton.setText('复制失败');
                setTimeout(() => { this.copyButton.disabled = false; this.copyButton.setText('复制'); }, 2000);
            }
            })();
        });

        this.generateImageButton.addEventListener('click', () => {
            void this.generateArticleImages();
        });

        this.publishButton.addEventListener('click', () => {
            void (async () => {
            if (!this.currentFile) return;

            const leaves = this.app.workspace.getLeavesOfType('markdown');
            let markdownView: MarkdownView | null = null;

            for (const leaf of leaves) {
                const view = leaf.view;
                if (view instanceof MarkdownView && view.file === this.currentFile) {
                    markdownView = view;
                    break;
                }
            }

            if (!markdownView) {
                await this.app.workspace.openLinkText(this.currentFile.path, '', false);
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView && activeView.file === this.currentFile) {
                    markdownView = activeView;
                }
            }

            if (markdownView) {
                showPublishModal.call(this.plugin, markdownView);
            }
            })();
        });

        this.registerEvent(this.app.workspace.on('file-open', (file) => {
            void this.onFileOpen(file);
        }));
        this.registerEvent(this.app.vault.on('modify', this.onFileModify.bind(this)));

        const currentFile = this.app.workspace.getActiveFile();
        await this.onFileOpen(currentFile);
    }

    private applyCurrentTheme(): void {
        const section = this.previewEl.querySelector('.otw-content-section') as HTMLElement;
        if (section) this.themeManager.applyTheme(section);
    }

    private async syncThemeFromSettings(): Promise<void> {
        this.themeManager.reloadThemes();

        const settings = this.settingsManager.getSettings();
        const currentActiveId = settings.activeThemeId || 'default';

        const themeOptions = this.getThemeOptions();
        const themeOptionsSnapshot = themeOptions.map(o => o.value).join(',');
        const themeListChanged = themeOptionsSnapshot !== this.lastThemeOptionsSnapshot;

        if (themeListChanged) {
            this.lastThemeOptionsSnapshot = themeOptionsSnapshot;
            this.rebuildSelectOptions(this.customThemeSelect, themeOptions, currentActiveId);
        }

        const activeTheme = this.themeManager.getTheme(currentActiveId);
        const currentCSSSnapshot = activeTheme ? JSON.stringify({ name: activeTheme.name, title: activeTheme.title }) : '';
        const cssChanged = currentCSSSnapshot !== this.lastThemeCSSSnapshot;
        const themeIdChanged = currentActiveId !== this.lastSyncedThemeId;

        if (!themeIdChanged && !cssChanged && !themeListChanged) return;

        this.lastSyncedThemeId = currentActiveId;
        this.lastThemeCSSSnapshot = currentCSSSnapshot;

        this.themeManager.setActiveTheme(currentActiveId);
        this.restoreSelectValue(this.customThemeSelect, currentActiveId, themeOptions);
        this.applyCurrentTheme();
    }

    private rebuildSelectOptions(selectContainer: HTMLElement, options: { value: string; label: string }[], activeValue: string): void {
        const dropdown = selectContainer.querySelector('.select-dropdown');
        const selectedText = selectContainer.querySelector('.selected-text');
        const customSelect = selectContainer.querySelector('.custom-select');
        if (!dropdown || !selectedText || !customSelect) return;

        dropdown.empty();
        for (const option of options) {
            const item = dropdown.createEl('div', { cls: `select-item ${option.value === activeValue ? 'selected' : ''}`, text: option.label });
            item.dataset.value = option.value;
            item.addEventListener('click', () => {
                dropdown.querySelectorAll('.select-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                selectedText.textContent = option.label;
                customSelect.setAttribute('data-value', option.value);
                (dropdown as HTMLElement).classList.remove('show');
                customSelect.dispatchEvent(new CustomEvent('change', { detail: { value: option.value } }));
            });
        }

        const activeOption = options.find(o => o.value === activeValue);
        if (activeOption) {
            selectedText.textContent = activeOption.label;
            customSelect.setAttribute('data-value', activeOption.value);
        }
    }

    private restoreSelectValue(selectContainer: HTMLElement, value: string, options: { value: string; label: string }[]): void {
        const selectedText = selectContainer.querySelector('.selected-text');
        const dropdown = selectContainer.querySelector('.select-dropdown');
        if (selectedText && dropdown) {
            const option = options.find(o => o.value === value);
            if (option) {
                selectedText.textContent = option.label;
                selectContainer.querySelector('.custom-select')?.setAttribute('data-value', option.value);
                dropdown.querySelectorAll('.select-item').forEach(el => {
                    el.classList.toggle('selected', el.getAttribute('data-value') === option.value);
                });
            }
        }
    }

    private updateControlsState(enabled: boolean) {
        this.refreshButton.disabled = !enabled;
        const themeSelect = this.customThemeSelect.querySelector('.custom-select');
        if (themeSelect) {
            themeSelect.classList.toggle('disabled', !enabled);
        }
        this.copyButton.disabled = !enabled;
        this.generateImageButton.disabled = !enabled;
        this.publishButton.disabled = !enabled;
    }

    async onFileOpen(file: TFile | null) {
        this.currentFile = file;
        if (!file || file.extension !== 'md') {
            this.previewEl.empty();
            this.previewEl.createEl('div', { text: '只能预览 markdown 文本文档', cls: 'otw-empty-message' });
            this.updateControlsState(false);
            return;
        }
        this.updateControlsState(true);
        await this.updatePreview();
    }

    private async forceRefreshPreview(): Promise<void> {
        this.refreshButton.disabled = true;
        setIcon(this.refreshButton, 'loader');
        try {
            this.lastSyncedThemeId = '';
            this.lastThemeOptionsSnapshot = '';
            this.lastThemeCSSSnapshot = '';
            await this.syncThemeFromSettings();
            await this.updatePreview();
        } finally {
            this.refreshButton.disabled = false;
            setIcon(this.refreshButton, 'rotate-cw');
        }
    }

    onFileModify(file: TFile): void {
        if (file === this.currentFile) {
            if (this.updateTimer) clearTimeout(this.updateTimer);
            this.updateTimer = setTimeout(() => { void this.updatePreview(); }, 500);
        }
    }

    async updatePreview() {
        if (!this.currentFile) return;

        this.previewEl.empty();
        const content = await this.app.vault.cachedRead(this.currentFile);

        await ArticleRenderer.renderToElement({
            app: this.app,
            markdown: content,
            sourcePath: this.currentFile.path,
            container: this.previewEl,
            component: this,
            themeManager: this.themeManager,
        });
    }

    private async generateArticleImages(): Promise<void> {
        if (!this.currentFile) return;
        new ArticleImageGenerationModal(this.app, this.currentFile, this.settingsManager).open();
    }

    private showImageProgress(title: string, detail: string, percent: number): void {
        this.imageProgressEl.classList.add('is-visible');
        this.imageProgressTitleEl.setText(title);
        this.imageProgressDetailEl.setText(detail);
        this.imageProgressBarEl.style.width = `${percent}%`;
    }

    private hideImageProgress(): void {
        this.imageProgressEl.classList.remove('is-visible');
        this.imageProgressTitleEl.setText('');
        this.imageProgressDetailEl.setText('');
        this.imageProgressBarEl.style.width = '0%';
    }

    private createCustomSelect(parent: HTMLElement, options: { value: string; label: string }[]) {
        const container = parent.createEl('div', { cls: 'custom-select-container' });
        const select = container.createEl('div', { cls: 'custom-select' });
        const selectedText = select.createEl('span', { cls: 'selected-text' });
        select.createEl('span', { cls: 'select-arrow', text: '▾' });
        const dropdown = container.createEl('div', { cls: 'select-dropdown' });

        options.forEach(option => {
            const item = dropdown.createEl('div', { cls: 'select-item', text: option.label });
            item.dataset.value = option.value;
            item.addEventListener('click', () => {
                dropdown.querySelectorAll('.select-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                selectedText.textContent = option.label;
                select.dataset.value = option.value;
                dropdown.classList.remove('show');
                select.dispatchEvent(new CustomEvent('change', { detail: { value: option.value } }));
            });
        });

        if (options.length > 0) {
            selectedText.textContent = options[0].label;
            select.dataset.value = options[0].value;
            dropdown.querySelector('.select-item')?.classList.add('selected');
        }

        select.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('show'); });
        this.registerDomEvent(document, 'click', () => { dropdown.classList.remove('show'); });

        return container;
    }

    private getThemeOptions(): { value: string; label: string }[] {
        const allThemes = this.themeManager.getVisibleThemes();
        if (allThemes.length === 0) return [{ value: 'default', label: '默认主题' }];
        const presets = allThemes.filter(t => t.isPreset);
        const custom = allThemes.filter(t => !t.isPreset);
        return [...presets, ...custom].map(t => ({ value: t.id, label: t.name }));
    }
}
