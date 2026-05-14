import { App, Modal, Notice } from 'obsidian';
import type WechatPublisherPlugin from '../../plugin';
import type { StructuredTheme } from '../../core/theme/theme-types';
import { themeToCSS } from '../../core/theme/theme-types';
import { builtinStructuredThemes } from '../../core/theme/builtin-themes';
import { ArticleRenderer } from '../../core/render/article-renderer';
import { SAMPLE_ARTICLE_MARKDOWN } from '../../core/render/sample-article';

type EditorTab = 'container' | 'title' | 'paragraph' | 'list' | 'quote' | 'code' | 'image' | 'link' | 'table' | 'hr' | 'emphasis';
type SimpleStyleTab = 'paragraph' | 'quote' | 'image' | 'link' | 'hr';

const TAB_LABELS: Record<EditorTab, string> = {
    container: '全局',
    title: '标题',
    paragraph: '段落',
    list: '列表',
    quote: '引用',
    code: '代码',
    image: '图片',
    link: '链接',
    table: '表格',
    hr: '分割线',
    emphasis: '强调',
};

const TAB_ORDER: EditorTab[] = [
    'container', 'title', 'paragraph', 'list', 'quote', 'code',
    'image', 'link', 'table', 'hr', 'emphasis',
];

export class ThemeEditorModal extends Modal {
    plugin: WechatPublisherPlugin;

    private themes: StructuredTheme[] = [];
    private activeTheme: StructuredTheme | null = null;
    private activeTab: EditorTab = 'container';

    private themeListEl!: HTMLElement;
    private previewEl!: HTMLElement;
    private tabBarEl!: HTMLElement;
    private tabContentEl!: HTMLElement;
    private themeNameInput!: HTMLInputElement;

    constructor(app: App, plugin: WechatPublisherPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('otw-theme-editor');
        this.containerEl.querySelector('.modal')?.addClass('otw-theme-editor-modal');

        this.loadThemes();

        // 主布局：左侧列表 + 右侧编辑+预览
        const mainLayout = contentEl.createDiv({ cls: 'otw-theme-editor-layout' });

        // 左侧主题列表
        const leftPanel = mainLayout.createDiv({ cls: 'otw-theme-editor-sidebar' });
        leftPanel.createEl('h3', { text: '主题列表' });

        const addBtn = leftPanel.createEl('button', { text: '+ 新建主题', cls: 'otw-theme-editor-add-btn' });
        addBtn.addEventListener('click', () => this.createNewTheme());

        this.themeListEl = leftPanel.createDiv({ cls: 'otw-theme-editor-list' });

        // 右侧编辑+预览
        const rightPanel = mainLayout.createDiv({ cls: 'otw-theme-editor-main' });

        // 顶部：主题名称
        const headerBar = rightPanel.createDiv({ cls: 'otw-theme-editor-header' });
        this.themeNameInput = headerBar.createEl('input', { cls: 'otw-theme-editor-name-input' });
        this.themeNameInput.placeholder = '主题名称';
        this.themeNameInput.addEventListener('input', () => {
            if (this.activeTheme) {
                this.activeTheme.name = this.themeNameInput.value;
                this.refreshThemeList();
                if (!this.activeTheme.isPreset) this.saveThemes();
            }
        });

        const headerActions = headerBar.createDiv({ cls: 'otw-theme-editor-header-actions' });
        const deleteBtn = headerActions.createEl('button', { text: '删除', cls: 'otw-theme-editor-delete-btn' });
        deleteBtn.addEventListener('click', () => this.deleteCurrentTheme());
        const closeBtn = headerActions.createEl('button', { text: '关闭', cls: 'otw-theme-editor-close-btn' });
        closeBtn.addEventListener('click', () => this.close());

        // 下半：tab + 内容区
        const bottomArea = rightPanel.createDiv({ cls: 'otw-theme-editor-bottom' });

        // Tab 栏
        this.tabBarEl = bottomArea.createDiv({ cls: 'otw-theme-editor-tabs' });
        TAB_ORDER.forEach(tab => {
            const tabBtn = this.tabBarEl.createDiv({ cls: 'otw-theme-editor-tab', text: TAB_LABELS[tab] });
            tabBtn.addEventListener('click', () => this.switchTab(tab));
        });

        // 编辑区 + 预览区
        const splitArea = bottomArea.createDiv({ cls: 'otw-theme-editor-split' });

        // 左侧编辑器
        const editorArea = splitArea.createDiv({ cls: 'otw-theme-editor-editor' });
        this.tabContentEl = editorArea.createDiv({ cls: 'otw-theme-editor-tab-content' });

        // 右侧预览
        const previewArea = splitArea.createDiv({ cls: 'otw-theme-editor-preview-area' });
        previewArea.createEl('h4', { text: '实时预览' });
        const previewContent = previewArea.createDiv({ cls: 'otw-theme-editor-preview-content' });
        this.previewEl = previewContent.createDiv({ cls: 'otw-theme-editor-preview-render' });

        this.selectTheme(this.themes[0]?.id || 'default');
    }

    private loadThemes() {
        const data = this.plugin.settingsManager.getSettings();
        const saved = data.structuredThemes;

        if (saved && saved.length > 0) {
            // 合并：保留已保存的自定义主题 + 最新的预设主题
            const presetIds = new Set(builtinStructuredThemes.map(t => t.id));
            const customThemes = saved.filter(t => !presetIds.has(t.id));
            const presets = builtinStructuredThemes.map(t => ({ ...t }));
            this.themes = [...presets, ...customThemes];
        } else {
            this.themes = builtinStructuredThemes.map(t => ({ ...t }));
        }

        // 选中当前激活的主题
        const activeId = data.activeThemeId || 'default';
        this.activeTheme = this.themes.find(t => t.id === activeId) || this.themes[0] || null;
    }

    private saveThemes() {
        const customThemes = this.themes.filter(t => !t.isPreset);
        void this.plugin.settingsManager.updateSettings({ structuredThemes: customThemes });
    }

    private refreshThemeList() {
        this.themeListEl.empty();
        for (const theme of this.themes) {
            const item = this.themeListEl.createDiv({
                cls: 'otw-theme-editor-item' + (this.activeTheme?.id === theme.id ? ' active' : ''),
                text: theme.name,
            });
            item.addEventListener('click', () => this.selectTheme(theme.id));
        }
    }

    private selectTheme(id: string) {
        const theme = this.themes.find(t => t.id === id);
        if (!theme) return;
        this.activeTheme = theme;
        this.themeNameInput.value = theme.name;
        this.refreshThemeList();
        this.renderTabContent();
        this.updatePreview();
    }

    private switchTab(tab: EditorTab) {
        this.activeTab = tab;
        this.renderTabContent();
    }

    private renderTabContent() {
        this.tabBarEl.querySelectorAll('.otw-theme-editor-tab').forEach((el: HTMLElement, i: number) => {
            el.classList.toggle('active', TAB_ORDER[i] === this.activeTab);
        });

        if (!this.activeTheme) return;

        this.tabContentEl.empty();

        switch (this.activeTab) {
            case 'container': this.renderContainerTab(); break;
            case 'title': this.renderTitleTab(); break;
            case 'paragraph': this.renderSimpleTextarea('段落样式', 'paragraph'); break;
            case 'list': this.renderListTab(); break;
            case 'quote': this.renderSimpleTextarea('引用样式', 'quote'); break;
            case 'code': this.renderCodeTab(); break;
            case 'image': this.renderSimpleTextarea('图片样式', 'image'); break;
            case 'link': this.renderSimpleTextarea('链接样式', 'link'); break;
            case 'table': this.renderTableTab(); break;
            case 'hr': this.renderSimpleTextarea('分割线样式', 'hr'); break;
            case 'emphasis': this.renderEmphasisTab(); break;
        }
    }

    private createField(container: HTMLElement, label: string): HTMLInputElement {
        const row = container.createDiv({ cls: 'otw-theme-editor-field' });
        row.createEl('label', { text: label });
        const input = row.createEl('input', { type: 'text', cls: 'otw-theme-editor-input' });
        return input;
    }

    private createColorField(container: HTMLElement, label: string, onChange?: (color: string) => void): HTMLInputElement {
        const row = container.createDiv({ cls: 'otw-theme-editor-field otw-theme-editor-field-color' });
        row.createEl('label', { text: label });
        const wrapper = row.createDiv({ cls: 'otw-theme-editor-color-wrap' });
        const colorInput = wrapper.createEl('input', { type: 'color', cls: 'otw-theme-editor-color' });
        const textInput = wrapper.createEl('input', { type: 'text', cls: 'otw-theme-editor-input' });
        colorInput.addEventListener('input', () => {
            textInput.value = colorInput.value;
            if (onChange) onChange(colorInput.value);
        });
        textInput.addEventListener('input', () => {
            if (textInput.value.startsWith('#')) {
                colorInput.value = textInput.value;
                if (onChange) onChange(textInput.value);
            }
        });
        return textInput;
    }

    private extractColor(css: string): string {
        const match = css.match(/#[0-9a-fA-F]{3,8}/);
        return match ? match[0] : '#000000';
    }

    /** Replace or inject color declaration in a CSS string */
    private replaceColorInCss(css: string, colorValue: string): string {
        if (!css) return colorValue;
        const colorRegex = /color:\s*#[0-9a-fA-F]{3,8}\s*;?/;
        if (colorRegex.test(css)) {
            return css.replace(colorRegex, colorValue);
        }
        return css + ' ' + colorValue;
    }

    private createTextarea(container: HTMLElement, label: string, value: string, onChange: (v: string) => void): HTMLTextAreaElement {
        const row = container.createDiv({ cls: 'otw-theme-editor-field' });
        row.createEl('label', { text: label });
        const textarea = row.createEl('textarea', { cls: 'otw-theme-editor-textarea' });
        textarea.value = value;
        textarea.addEventListener('input', () => {
            onChange(textarea.value);
            this.updatePreview();
            if (this.activeTheme && !this.activeTheme.isPreset) this.saveThemes();
        });
        return textarea;
    }

    // --- Tab renderers ---

    private renderContainerTab() {
        const t = this.activeTheme!;
        const container = this.tabContentEl.createDiv({ cls: 'otw-theme-editor-fields' });
        container.createEl('h4', { text: '全局容器样式' });

        let fullTextarea: HTMLTextAreaElement | null = null;

        const fontSizeInput = this.createField(container, '字号 (px)');
        fontSizeInput.value = (t.container.match(/font-size:\s*(\d+)/)?.[1] || '16') + 'px';
        fontSizeInput.addEventListener('input', () => {
            t.container = t.container.replace(/font-size:\s*\d+px/, `font-size: ${fontSizeInput.value}`);
            if (fullTextarea) fullTextarea.value = t.container;
            this.updatePreview();
            if (!t.isPreset) this.saveThemes();
        });

        const colorInput = this.createColorField(container, '文字颜色', color => {
            t.container = this.replaceColorInCss(t.container, `color: ${color};`);
            if (fullTextarea) fullTextarea.value = t.container;
            this.updatePreview();
            if (!t.isPreset) this.saveThemes();
        });
        colorInput.value = this.extractColor(t.container || 'color: #4a4a4a;');

        const containerColorPick = container.querySelector('.otw-theme-editor-color') as HTMLInputElement;

        fullTextarea = this.createTextarea(container, '完整容器 CSS', t.container, v => {
            t.container = v;
            const fs = t.container.match(/font-size:\s*(\d+)/)?.[1];
            if (fs) fontSizeInput.value = fs + 'px';
            const newColor = this.extractColor(v);
            colorInput.value = newColor;
            if (containerColorPick && newColor.startsWith('#')) {
                containerColorPick.value = newColor;
            }
        });
    }

    private renderTitleTab() {
        const t = this.activeTheme!;
        const container = this.tabContentEl.createDiv({ cls: 'otw-theme-editor-fields' });
        container.createEl('h4', { text: '标题样式' });

        const levels: Array<'h1' | 'h2' | 'h3' | 'base'> = ['h1', 'h2', 'h3', 'base'];
        const labels: Record<string, string> = { h1: '一级标题', h2: '二级标题', h3: '三级标题', base: '小标题 (h4-h6)' };

        for (const level of levels) {
            const section = container.createDiv({ cls: 'otw-theme-editor-title-section' });
            section.createEl('h5', { text: labels[level] });

            let contentTextarea: HTMLTextAreaElement | null = null;

            const colorInput = this.createColorField(section, `${labels[level]} 颜色`, color => {
                const current = t.title[level].content;
                t.title[level].content = this.replaceColorInCss(current, `color: ${color};`);
                if (contentTextarea) {
                    contentTextarea.value = t.title[level].content;
                }
                this.updatePreview();
                if (!t.isPreset) this.saveThemes();
            });
            colorInput.value = this.extractColor(t.title[level].content || 'color: #000000;');

            const colorPickInput = section.querySelector('.otw-theme-editor-color') as HTMLInputElement;

            contentTextarea = this.createTextarea(section, `${labels[level]} content CSS`, t.title[level].content, v => {
                t.title[level].content = v;
                const newColor = this.extractColor(v);
                colorInput.value = newColor;
                if (colorPickInput && newColor.startsWith('#')) {
                    colorPickInput.value = newColor;
                }
            });

            this.createTextarea(section, `${labels[level]} base CSS`, t.title[level].base, v => {
                t.title[level].base = v;
            });
        }
    }

    private renderSimpleTextarea(label: string, key: SimpleStyleTab) {
        const t = this.activeTheme!;
        const container = this.tabContentEl.createDiv({ cls: 'otw-theme-editor-fields' });
        container.createEl('h4', { text: label });

        const cssValue = t[key] || '';
        if (cssValue.includes('color')) {
            const colorInput = this.createColorField(container, '文字颜色', color => {
                const current = t[key] || '';
                t[key] = this.replaceColorInCss(current, `color: ${color};`);
                this.updatePreview();
                if (!t.isPreset) this.saveThemes();
            });
            colorInput.value = this.extractColor(cssValue);
        }

        this.createTextarea(container, '完整 CSS', cssValue, v => {
            t[key] = v;
        });
    }

    private renderListTab() {
        const t = this.activeTheme!;
        const container = this.tabContentEl.createDiv({ cls: 'otw-theme-editor-fields' });
        container.createEl('h4', { text: '列表样式' });

        this.createTextarea(container, '列表容器 CSS', t.list?.container || '', v => { t.list = { ...t.list, container: v }; });
        this.createTextarea(container, '列表项 CSS', t.list?.item || '', v => { t.list = { ...t.list, item: v }; });
        this.createTextarea(container, '任务列表 CSS', t.list?.taskList || '', v => { t.list = { ...t.list, taskList: v }; });
    }

    private renderCodeTab() {
        const t = this.activeTheme!;
        const container = this.tabContentEl.createDiv({ cls: 'otw-theme-editor-fields' });
        container.createEl('h4', { text: '代码样式' });

        const blockCss = t.code?.block || '';
        if (blockCss.includes('color')) {
            const colorInput = this.createColorField(container, '代码颜色', color => {
                const current = t.code?.block || '';
                t.code = { ...t.code, block: this.replaceColorInCss(current, `color: ${color};`) };
                this.updatePreview();
                if (!t.isPreset) this.saveThemes();
            });
            colorInput.value = this.extractColor(blockCss);
        }

        this.createTextarea(container, '代码块 CSS', t.code?.block || '', v => { t.code = { ...t.code, block: v }; });
        this.createTextarea(container, '行内代码 CSS', t.code?.inline || '', v => { t.code = { ...t.code, inline: v }; });
    }

    private renderTableTab() {
        const t = this.activeTheme!;
        const container = this.tabContentEl.createDiv({ cls: 'otw-theme-editor-fields' });
        container.createEl('h4', { text: '表格样式' });

        this.createTextarea(container, '表格容器 CSS', t.table?.container || '', v => { t.table = { ...t.table, container: v }; });
        this.createTextarea(container, '表头 CSS', t.table?.header || '', v => { t.table = { ...t.table, header: v }; });
        this.createTextarea(container, '单元格 CSS', t.table?.cell || '', v => { t.table = { ...t.table, cell: v }; });
    }

    private renderEmphasisTab() {
        const t = this.activeTheme!;
        const container = this.tabContentEl.createDiv({ cls: 'otw-theme-editor-fields' });
        container.createEl('h4', { text: '强调样式' });

        this.createTextarea(container, '加粗 CSS', t.emphasis?.strong || '', v => { t.emphasis = { ...t.emphasis, strong: v }; });
        this.createTextarea(container, '斜体 CSS', t.emphasis?.em || '', v => { t.emphasis = { ...t.emphasis, em: v }; });
        this.createTextarea(container, '删除线 CSS', t.emphasis?.del || '', v => { t.emphasis = { ...t.emphasis, del: v }; });
    }

    // --- Actions ---

    private createNewTheme() {
        // 基于当前选中的主题创建副本
        const base = this.activeTheme || this.themes.find(t => t.id === 'default')!;
        const newTheme: StructuredTheme = {
            id: 'custom-' + Date.now(),
            name: `${base.name} 副本`,
            isVisible: true,
            isPreset: false,
            container: base.container,
            title: JSON.parse(JSON.stringify(base.title)),
            paragraph: base.paragraph,
            list: JSON.parse(JSON.stringify(base.list)),
            quote: base.quote,
            code: JSON.parse(JSON.stringify(base.code)),
            image: base.image,
            link: base.link,
            emphasis: JSON.parse(JSON.stringify(base.emphasis)),
            table: JSON.parse(JSON.stringify(base.table)),
            hr: base.hr,
            footnote: JSON.parse(JSON.stringify(base.footnote)),
        };
        this.themes.push(newTheme);
        this.saveThemes();
        this.selectTheme(newTheme.id);
    }

    private deleteCurrentTheme() {
        if (!this.activeTheme) return;
        if (this.activeTheme.isPreset) {
            new Notice('预设主题不可删除');
            return;
        }
        const idx = this.themes.indexOf(this.activeTheme);
        this.themes.splice(idx, 1);
        this.saveThemes();
        this.selectTheme(this.themes[Math.min(idx, this.themes.length - 1)]?.id || this.themes[0]?.id);
    }

    private updatePreview(): void {
        void this.renderPreview();
    }

    private async renderPreview(): Promise<void> {
        if (!this.activeTheme) return;
        await ArticleRenderer.renderToElement({
            app: this.app,
            markdown: SAMPLE_ARTICLE_MARKDOWN,
            sourcePath: '',
            container: this.previewEl,
            themeCss: themeToCSS(this.activeTheme),
        });
    }

    onClose() {
        this.contentEl.empty();
    }
}
