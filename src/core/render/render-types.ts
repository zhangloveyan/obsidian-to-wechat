import type { App } from 'obsidian';

export interface ArticleRenderRequest {
    app: App;
    markdown: string;
    sourcePath?: string;
    themeCss?: string;
    document?: Document;
}

export interface RenderedArticle {
    element: HTMLElement;
    html: string;
    markdown: string;
    sourcePath: string;
}

export interface ArticleRenderToElementRequest extends ArticleRenderRequest {
    container: HTMLElement;
}
