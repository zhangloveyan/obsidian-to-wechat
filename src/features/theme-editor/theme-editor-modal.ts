import { App, Modal, Notice, Setting } from 'obsidian';
import type WechatPublisherPlugin from '../../plugin';
import type { StructuredTheme } from '../../core/theme/theme-types';
import { themeToCSS } from '../../core/theme/theme-types';
import { ArticleRenderer } from '../../core/render/article-renderer';
import { SAMPLE_ARTICLE_MARKDOWN } from '../../core/render/sample-article';
import { errorMessage } from '../../shared/errors';

type EditorTab = 'container' | 'title' | 'paragraph' | 'list' | 'quote' | 'code' | 'image' | 'link' | 'table' | 'hr' | 'emphasis';
const TABS: Record<EditorTab, string> = {
    container: '全局', title: '标题', paragraph: '段落', list: '列表', quote: '引用', code: '代码',
    image: '图片', link: '链接', table: '表格', hr: '分割线', emphasis: '强调',
};
interface StyleField { label: string; read: () => string; write: (value: string) => void }

export class ThemeEditorModal extends Modal {
    private themes: StructuredTheme[] = [];
    private activeTheme!: StructuredTheme;
    private activeTab: EditorTab = 'container';
    private list!: HTMLElement;
    private preview!: HTMLElement;
    private fields!: HTMLElement;
    private tabs!: HTMLElement;
    private name!: HTMLInputElement;
    private deleteButton!: HTMLButtonElement;
    private previewTimer?: number;
    private saveTimer?: number;
    private alive = false;
    private previewRevision = 0;

    constructor(app: App, private plugin: WechatPublisherPlugin) { super(app); }

    onOpen(): void {
        this.alive = true;
        this.themes = this.plugin.themeManager.getAllThemes();
        this.modalEl.addClass('otw-theme-editor-modal');
        this.contentEl.empty();
        this.contentEl.addClass('otw-theme-editor');
        const layout = this.contentEl.createDiv({ cls: 'otw-theme-editor-layout' });
        const sidebar = layout.createDiv({ cls: 'otw-theme-editor-sidebar' });
        new Setting(sidebar).setName('主题列表').setHeading();
        sidebar.createEl('button', { text: '新建主题', cls: 'otw-theme-editor-add-btn' })
            .addEventListener('click', () => this.createTheme());
        this.list = sidebar.createDiv({ cls: 'otw-theme-editor-list' });
        const main = layout.createDiv({ cls: 'otw-theme-editor-main' });
        const header = main.createDiv({ cls: 'otw-theme-editor-header' });
        this.name = header.createEl('input', { cls: 'otw-theme-editor-name-input', attr: { 'aria-label': '主题名称' } });
        this.name.addEventListener('input', () => {
            if (this.activeTheme.isPreset) return;
            this.activeTheme.name = this.name.value;
            this.renderList();
            this.scheduleSave();
        });
        const actions = header.createDiv({ cls: 'otw-theme-editor-header-actions' });
        actions.createEl('button', { text: '编辑副本' }).addEventListener('click', () => this.createTheme());
        this.deleteButton = actions.createEl('button', { text: '删除', cls: 'otw-theme-editor-delete-btn' });
        this.deleteButton.addEventListener('click', () => this.deleteTheme());
        actions.createEl('button', { text: '关闭', cls: 'otw-theme-editor-close-btn' }).addEventListener('click', () => this.close());
        const bottom = main.createDiv({ cls: 'otw-theme-editor-bottom' });
        this.tabs = bottom.createDiv({ cls: 'otw-theme-editor-tabs' });
        for (const tab of Object.keys(TABS) as EditorTab[]) {
            this.tabs.createEl('button', { cls: 'otw-theme-editor-tab', text: TABS[tab], attr: { 'data-tab': tab } })
                .addEventListener('click', () => { this.activeTab = tab; this.renderFields(); });
        }
        const split = bottom.createDiv({ cls: 'otw-theme-editor-split' });
        this.fields = split.createDiv({ cls: 'otw-theme-editor-editor' }).createDiv({ cls: 'otw-theme-editor-tab-content' });
        const previewArea = split.createDiv({ cls: 'otw-theme-editor-preview-area' });
        new Setting(previewArea).setName('实时预览').setHeading();
        this.preview = previewArea.createDiv({ cls: 'otw-theme-editor-preview-content' }).createDiv();
        this.selectTheme(this.plugin.themeManager.getActiveTheme().id);
    }

    private selectTheme(id: string): void {
        this.activeTheme = this.themes.find(theme => theme.id === id) || this.themes[0];
        this.name.value = this.activeTheme.name;
        this.name.readOnly = this.activeTheme.isPreset;
        this.deleteButton.disabled = this.activeTheme.isPreset;
        this.renderList();
        this.renderFields();
        this.schedulePreview();
    }

    private renderList(): void {
        this.list.empty();
        for (const theme of this.themes) {
            this.list.createEl('button', {
                cls: 'otw-theme-editor-item' + (this.activeTheme?.id === theme.id ? ' active' : ''),
                text: theme.name,
            }).addEventListener('click', () => this.selectTheme(theme.id));
        }
    }

    private renderFields(): void {
        this.tabs.querySelectorAll<HTMLElement>('[data-tab]').forEach(tab => tab.toggleClass('active', tab.dataset.tab === this.activeTab));
        this.fields.empty();
        for (const field of styleFields(this.activeTheme, this.activeTab)) {
            const row = this.fields.createDiv({ cls: 'otw-theme-editor-field' });
            row.createEl('label', { text: field.label });
            const controls = row.createDiv({ cls: 'otw-theme-editor-color-wrap' });
            const color = controls.createEl('input', { type: 'color', cls: 'otw-theme-editor-color', attr: { 'aria-label': field.label + '颜色' } });
            color.disabled = this.activeTheme.isPreset;
            const size = controls.createEl('input', { type: 'text', cls: 'otw-theme-editor-input', attr: { 'aria-label': field.label + '字号', placeholder: '字号，例如 16px' } });
            size.disabled = this.activeTheme.isPreset;
            const textarea = row.createEl('textarea', { cls: 'otw-theme-editor-textarea', attr: { 'aria-label': field.label } });
            textarea.value = field.read();
            textarea.readOnly = this.activeTheme.isPreset;
            const sync = () => {
                const style = parseDeclarations(this.contentEl.ownerDocument, textarea.value);
                size.value = style.fontSize;
                color.value = colorToHex(style.color) || '#000000';
            };
            const changed = () => {
                field.write(textarea.value);
                this.scheduleSave();
                this.schedulePreview();
            };
            textarea.addEventListener('input', () => { sync(); changed(); });
            color.addEventListener('input', () => {
                const style = parseDeclarations(this.contentEl.ownerDocument, textarea.value);
                style.setProperty('color', color.value);
                textarea.value = style.cssText;
                changed();
            });
            size.addEventListener('change', () => {
                const style = parseDeclarations(this.contentEl.ownerDocument, textarea.value);
                if (!size.value.trim()) style.removeProperty('font-size');
                else style.setProperty('font-size', size.value.trim());
                textarea.value = style.cssText;
                sync();
                changed();
            });
            sync();
        }
    }

    private createTheme(): void {
        const theme = structuredClone(this.activeTheme || this.themes[0]);
        theme.id = 'custom-' + crypto.randomUUID();
        theme.name += ' 副本';
        theme.isPreset = false;
        theme.isVisible = true;
        this.themes.push(theme);
        this.selectTheme(theme.id);
        this.scheduleSave();
    }

    private deleteTheme(): void {
        if (this.activeTheme.isPreset) return;
        const id = this.activeTheme.id;
        this.themes = this.themes.filter(theme => theme.id !== id);
        this.selectTheme(this.themes[0].id);
        this.scheduleSave();
    }

    private scheduleSave(): void {
        window.clearTimeout(this.saveTimer);
        this.saveTimer = window.setTimeout(() => this.save(), 250);
    }

    private save(): void {
        this.saveTimer = undefined;
        const structuredThemes = this.themes.filter(theme => !theme.isPreset);
        const settings = this.plugin.settingsManager.getSettings();
        const activeExists = this.themes.some(theme => theme.id === settings.activeThemeId);
        void this.plugin.settingsManager.updateSettings({
            structuredThemes,
            ...(activeExists ? {} : { activeThemeId: 'default' }),
        }).catch(error => new Notice('主题保存失败：' + errorMessage(error)));
    }

    private schedulePreview(): void {
        const revision = ++this.previewRevision;
        window.clearTimeout(this.previewTimer);
        ArticleRenderer.clear(this.preview);
        this.previewTimer = window.setTimeout(() => {
            const css = themeToCSS(this.activeTheme);
            void ArticleRenderer.renderToElement({
                app: this.app, markdown: SAMPLE_ARTICLE_MARKDOWN, container: this.preview, themeCss: css,
            }).catch(error => {
                if (this.alive && revision === this.previewRevision) {
                    ArticleRenderer.clear(this.preview);
                    this.preview.setText('预览失败：' + errorMessage(error));
                }
            });
        }, 150);
    }

    onClose(): void {
        this.alive = false;
        window.clearTimeout(this.previewTimer);
        window.clearTimeout(this.saveTimer);
        if (this.saveTimer !== undefined) this.save();
        ArticleRenderer.clear(this.preview);
        this.contentEl.empty();
    }
}

function parseDeclarations(doc: Document, value: string): CSSStyleDeclaration {
    const element = doc.win.createSpan();
    element.setAttribute('style', value);
    return element.style;
}

function colorToHex(value: string): string | null {
    const components = value.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/);
    if (components) return '#' + components.slice(1).map(part => Number(part).toString(16).padStart(2, '0')).join('');
    if (/^#[a-f\d]{6}$/i.test(value)) return value;
    return null;
}

function styleFields(theme: StructuredTheme, tab: EditorTab): StyleField[] {
    const field = <K extends string>(target: Record<K, string>, key: K, label: string): StyleField => ({
        label, read: () => target[key] || '', write: value => { target[key] = value; },
    });
    switch (tab) {
        case 'title':
            return (['h1', 'h2', 'h3', 'base'] as const).flatMap(level =>
                (['base', 'content', 'after'] as const).map(key => field(theme.title[level], key, level + ' ' + key + ' CSS')));
        case 'list': return [field(theme.list, 'container', '列表容器 CSS'), field(theme.list, 'item', '列表项 CSS'), field(theme.list, 'taskList', '任务列表 CSS')];
        case 'code': return [field(theme.code, 'block', '代码块 CSS'), field(theme.code, 'inline', '行内代码 CSS'), field(theme.code.header, 'container', '代码标题栏 CSS'), field(theme.code.header, 'dot', '代码圆点 CSS')];
        case 'table': return [field(theme.table, 'container', '表格 CSS'), field(theme.table, 'header', '表头 CSS'), field(theme.table, 'cell', '单元格 CSS')];
        case 'emphasis': return [field(theme.emphasis, 'strong', '加粗 CSS'), field(theme.emphasis, 'em', '斜体 CSS'), field(theme.emphasis, 'del', '删除线 CSS')];
        default: return [field(theme, tab, TABS[tab] + ' CSS')];
    }
}
