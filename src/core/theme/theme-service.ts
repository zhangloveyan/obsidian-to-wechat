import type { StructuredTheme } from './theme-types';
import { themeToCSS } from './theme-types';
import { builtinStructuredThemes } from './builtin-themes';
import type { SettingsManager } from '../../features/settings/settings';

export class ThemeManager {
    constructor(private settings: SettingsManager) {}

    getAllThemes(): StructuredTheme[] {
        const ids = new Set(builtinStructuredThemes.map(theme => theme.id));
        const custom = this.settings.getSettings().structuredThemes.filter(theme => !ids.has(theme.id));
        return structuredClone([...builtinStructuredThemes, ...custom.map(theme => ({ ...theme, isPreset: false }))]);
    }

    getVisibleThemes(): StructuredTheme[] { return this.getAllThemes().filter(theme => theme.isVisible); }
    getTheme(id: string): StructuredTheme | undefined { return this.getAllThemes().find(theme => theme.id === id); }
    getActiveTheme(): StructuredTheme {
        return this.getTheme(this.settings.getSettings().activeThemeId) || structuredClone(builtinStructuredThemes[0]);
    }
    getActiveThemeCSS(): string { return themeToCSS(this.getActiveTheme()); }
}
