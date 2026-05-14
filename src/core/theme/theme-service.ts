import type { StructuredTheme } from './theme-types';
import { themeToCSS } from './theme-types';
import { builtinStructuredThemes } from './builtin-themes';
import type WechatPublisherPlugin from '../../plugin';

export class ThemeManager {
    private plugin: WechatPublisherPlugin;
    private structuredThemes: StructuredTheme[] = [];
    private activeTheme: StructuredTheme | null = null;

    constructor(plugin: WechatPublisherPlugin) {
        this.plugin = plugin;
    }

    initialize(): void {
        this.reloadThemes();

        const data = this.plugin.settingsManager.getSettings();
        const activeId = data.activeThemeId || 'default';
        this.setActiveTheme(activeId);
    }

    /** 从设置重新加载主题列表（主题编辑器保存后调用） */
    reloadThemes(): void {
        const data = this.plugin.settingsManager.getSettings();
        const saved = data.structuredThemes;

        if (saved && saved.length > 0) {
            const presetIds = new Set(builtinStructuredThemes.map(t => t.id));
            const customThemes = saved.filter(t => !presetIds.has(t.id));
            this.structuredThemes = [...builtinStructuredThemes, ...customThemes];
        } else {
            this.structuredThemes = [...builtinStructuredThemes];
        }
    }

    getAllThemes(): StructuredTheme[] { return [...this.structuredThemes]; }
    getVisibleThemes(): StructuredTheme[] { return this.structuredThemes.filter(t => t.isVisible); }
    getTheme(themeId: string): StructuredTheme | undefined { return this.structuredThemes.find(t => t.id === themeId); }
    getActiveTheme(): StructuredTheme | null { return this.activeTheme; }

    setActiveTheme(themeId: string): boolean {
        const theme = this.structuredThemes.find(t => t.id === themeId);
        if (theme) { this.activeTheme = theme; return true; }
        const defaultTheme = this.structuredThemes.find(t => t.id === 'default');
        if (defaultTheme) { this.activeTheme = defaultTheme; }
        return false;
    }

    /** 获取当前主题的 CSS 字符串，用于 juice 内联 */
    getActiveThemeCSS(): string {
        if (!this.activeTheme) return '';
        return themeToCSS(this.activeTheme);
    }

    /** 用于预览：将 CSS 注入到 DOM 元素 */
    applyTheme(element: HTMLElement): void {
        if (!this.activeTheme) return;

        const existingStyle = element.querySelector('style[data-otw-theme]');
        if (existingStyle) existingStyle.remove();

        const css = this.getActiveThemeCSS();
        const styleElement = document.createElement('style');
        styleElement.setAttribute('data-otw-theme', this.activeTheme.id);
        styleElement.textContent = css;
        element.insertBefore(styleElement, element.firstChild);
    }
}
