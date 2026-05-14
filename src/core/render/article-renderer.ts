import { markdownToHtml, renderMarkdownContentToElement } from './markdown-html-renderer';
import type { ArticleRenderRequest, ArticleRenderToElementRequest } from './render-types';

export class ArticleRenderer {
    static async renderToElement(request: ArticleRenderToElementRequest): Promise<HTMLElement | null> {
        const { app, markdown, sourcePath = '', container } = request;
        container.empty();

        await renderMarkdownContentToElement(
            app,
            markdown,
            container,
            sourcePath,
            request.component,
            true,
        );
        this.applyTheme(container, request);

        return container.querySelector<HTMLElement>('.otw-content-section');
    }

    static async renderHtml(request: ArticleRenderRequest): Promise<string> {
        return markdownToHtml(
            request.app,
            request.markdown,
            request.sourcePath || '',
            request.themeManager,
            request.convertMathToSVG || false,
        );
    }

    private static applyTheme(container: HTMLElement, request: ArticleRenderRequest): void {
        const section = container.querySelector<HTMLElement>('.otw-content-section');
        if (!section) return;

        const css = request.themeCss || request.themeManager?.getActiveThemeCSS() || '';
        if (!css) return;

        section.querySelectorAll('style[data-otw-theme]').forEach(style => style.remove());

        const styleElement = document.createElement('style');
        styleElement.setAttribute('data-otw-theme', 'active');
        styleElement.textContent = css;
        section.insertBefore(styleElement, section.firstChild);
    }

}
