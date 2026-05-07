import type { App, Component } from 'obsidian';
import type { ThemeManager } from '../theme/theme-service';

export interface ArticleRenderRequest {
    app: App;
    markdown: string;
    sourcePath?: string;
    component?: Component;
    themeManager?: ThemeManager;
    themeCss?: string;
    convertMathToSVG?: boolean;
}

export interface ArticleRenderToElementRequest extends ArticleRenderRequest {
    container: HTMLElement;
}
