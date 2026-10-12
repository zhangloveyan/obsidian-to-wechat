import { ItemView, WorkspaceLeaf, TFile, setIcon, Notice } from 'obsidian';
import { ArticleRenderer } from '../../core/render/article-renderer';
import type { RenderedArticle } from '../../core/render/render-types';
import { ClipboardExporter } from '../../core/output/clipboard-exporter';
import type WechatPublisherPlugin from '../../plugin';
import { PublishModal } from '../publish/publish-modal';
import { ArticleImageGenerationModal } from '../image-generation/article-image-generation-modal';
import { PLUGIN_ICON_ID } from '../../shared/plugin-icon';
import { readArticle } from '../../integrations/obsidian/article-source';
import { errorMessage } from '../../shared/errors';

export const VIEW_TYPE_PREVIEW = 'otw-preview';

export class PreviewView extends ItemView {
    private preview!: HTMLElement;
    private file: TFile | null = null;
    private timer?: number;
    private revision = 0;
    private alive = false;
    private result?: { key: string; article: RenderedArticle };
    private refresh!: HTMLButtonElement;
    private copy!: HTMLButtonElement;
    private publish!: HTMLButtonElement;
    private generate!: HTMLButtonElement;
    private select!: HTMLSelectElement;
    private copying = false;
    private unsubscribe?: () => void;

    constructor(leaf: WorkspaceLeaf, private plugin: WechatPublisherPlugin) { super(leaf); }
    getViewType(): string { return VIEW_TYPE_PREVIEW; }
    getDisplayText(): string { return '预览'; }
    getIcon(): string { return PLUGIN_ICON_ID; }

    async onOpen(): Promise<void> {
        this.alive = true;
        this.contentEl.empty();
        this.contentEl.addClass('otw-view-content');
        const toolbar = this.contentEl.createDiv({ cls: 'otw-toolbar' }).createDiv({ cls: 'otw-controls-group' });
        this.refresh = toolbar.createEl('button', { cls: 'otw-refresh-button', attr: { 'aria-label': '刷新预览', title: '刷新预览' } });
        setIcon(this.refresh, 'rotate-cw');
        this.refresh.addEventListener('click', () => { this.result = undefined; this.schedule(); });
        this.select = toolbar.createEl('select', { cls: 'otw-theme-select', attr: { 'aria-label': '文章主题' } });
        this.select.addEventListener('change', () => {
            void this.plugin.settingsManager.updateSettings({ activeThemeId: this.select.value })
                .catch(error => this.report('主题保存失败', error));
        });
        this.generate = toolbar.createEl('button', { text: '生图', cls: 'otw-generate-image-button' });
        this.generate.addEventListener('click', () => {
            if (this.file) new ArticleImageGenerationModal(this.app, this.file, this.plugin.imageGeneration).open();
        });
        this.copy = toolbar.createEl('button', { text: '复制', cls: 'otw-copy-button' });
        this.copy.addEventListener('click', () => { void this.copyArticle(); });
        this.publish = toolbar.createEl('button', { text: '发布', cls: 'otw-preview-publish-button' });
        this.publish.addEventListener('click', () => {
            if (this.file) new PublishModal(this.app, this.plugin, this.file).open();
        });
        this.preview = this.contentEl.createDiv({ cls: 'otw-preview-area' });
        this.updateThemes();
        this.unsubscribe = this.plugin.settingsManager.subscribe(() => {
            if (!this.alive) return;
            this.updateThemes();
            this.schedule();
        });
        this.registerEvent(this.app.workspace.on('file-open', file => this.openFile(file)));
        this.registerEvent(this.app.vault.on('modify', file => { if (file === this.file) this.schedule(); }));
        this.registerEvent(this.app.workspace.on('editor-change', (_editor, view) => { if (view.file === this.file) this.schedule(); }));
        this.openFile(this.app.workspace.getActiveFile());
        window.clearTimeout(this.timer);
        await this.updatePreview();
    }

    private openFile(file: TFile | null): void {
        this.file = file?.extension === 'md' ? file : null;
        this.result = undefined;
        this.revision++;
        ArticleRenderer.clear(this.preview);
        this.controls();
        if (!this.file) this.preview.createDiv({ cls: 'otw-empty-message', text: '请选择 Markdown 文档' });
        else this.schedule();
    }

    private schedule(): void {
        this.revision++;
        window.clearTimeout(this.timer);
        this.timer = window.setTimeout(() => { void this.updatePreview(); }, 200);
    }

    private async prepare(file: TFile): Promise<RenderedArticle> {
        const themeCss = this.plugin.themeManager.getActiveThemeCSS();
        const snapshot = await readArticle(this.app, file);
        const key = JSON.stringify([snapshot.sourcePath, snapshot.markdown, themeCss]);
        if (this.result?.key === key) return this.result.article;
        const article = await ArticleRenderer.render({
            app: this.app, markdown: snapshot.markdown, sourcePath: snapshot.sourcePath,
            themeCss, document: this.preview.ownerDocument,
        });
        if (this.file === file && this.alive) this.result = { key, article };
        return article;
    }

    private async updatePreview(): Promise<void> {
        const file = this.file;
        if (!file || !this.alive) return;
        const revision = ++this.revision;
        this.refresh.disabled = true;
        try {
            const article = await this.prepare(file);
            if (!this.alive || revision !== this.revision) return;
            ArticleRenderer.mount(this.preview, article);
        } catch (error) {
            if (this.alive && revision === this.revision) {
                ArticleRenderer.clear(this.preview);
                this.preview.createDiv({ text: '预览失败：' + errorMessage(error) });
            }
        } finally {
            if (this.alive && revision === this.revision) this.controls();
        }
    }

    private async copyArticle(): Promise<void> {
        const file = this.file;
        if (!file || this.copying) return;
        this.copying = true;
        this.copy.setText('复制中');
        this.controls();
        try {
            const article = await this.prepare(file);
            await ClipboardExporter.copyArticle(this.app, article);
            new Notice('已复制');
        } catch (error) { this.report('复制失败', error); }
        finally {
            this.copying = false;
            if (this.alive) { this.copy.setText('复制'); this.controls(); }
        }
    }

    private updateThemes(): void {
        this.select.empty();
        for (const theme of this.plugin.themeManager.getVisibleThemes()) this.select.createEl('option', { value: theme.id, text: theme.name });
        this.select.value = this.plugin.themeManager.getActiveTheme().id;
    }

    private controls(): void {
        const disabled = !this.file;
        this.refresh.disabled = disabled;
        this.select.disabled = disabled;
        this.copy.disabled = disabled || this.copying;
        this.generate.disabled = disabled;
        this.publish.disabled = disabled;
    }

    private report(stage: string, error: unknown): void { new Notice(stage + '：' + errorMessage(error), 10000); }

    onClose(): Promise<void> {
        this.alive = false;
        this.unsubscribe?.();
        this.revision++;
        window.clearTimeout(this.timer);
        ArticleRenderer.clear(this.preview);
        this.contentEl.empty();
        return Promise.resolve();
    }
}
