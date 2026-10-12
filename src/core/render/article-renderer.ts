import { Component } from 'obsidian';
import { inlineContent } from 'juice';
import { renderMarkdown } from './markdown-html-renderer';
import { parseHtml } from '../transform/dom';
import baseCSS from './article.css';
import type { ArticleRenderRequest, ArticleRenderToElementRequest, RenderedArticle } from './render-types';

export class ArticleRenderer {
    private static revisions = new WeakMap<HTMLElement, number>();

    static async render(request: ArticleRenderRequest): Promise<RenderedArticle> {
        const { app, markdown, sourcePath = '' } = request;
        const css = request.themeCss ?? '';
        const doc = request.document || document;
        const stage = doc.win.createDiv();
        stage.className = 'otw-render-stage';
        stage.setAttribute('aria-hidden', 'true');
        doc.body.appendChild(stage);
        const component = new Component();
        component.load();
        try {
            const content = await renderMarkdown(app, markdown, stage, sourcePath, component);
            const html = inlineContent(content.outerHTML, baseCSS + '\n' + css, {
                applyStyleTags: false, removeStyleTags: true, inlinePseudoElements: true,
                preserveMediaQueries: false, preserveFontFaces: false,
            });
            const parsed = parseHtml(html, doc);
            const element = parsed.querySelector<HTMLElement>('.otw-content-section');
            if (!element) throw new Error('文章渲染结果为空。');
            element.querySelector<HTMLElement>(':scope > *')?.setCssStyles({ marginTop: '0' });
            return { element, html: element.outerHTML, markdown, sourcePath };
        } finally {
            component.unload();
            stage.remove();
        }
    }

    static async renderToElement(request: ArticleRenderToElementRequest): Promise<HTMLElement | null> {
        const revision = (this.revisions.get(request.container) || 0) + 1;
        this.revisions.set(request.container, revision);
        const result = await this.render({ ...request, document: request.container.ownerDocument });
        if (this.revisions.get(request.container) !== revision) return null;
        this.mount(request.container, result);
        return result.element;
    }

    static mount(container: HTMLElement, article: RenderedArticle): void {
        container.empty();
        // Shadow DOM prevents Obsidian themes and other preview instances from restyling article content.
        const root = container.shadowRoot || container.attachShadow({ mode: 'open' });
        root.replaceChildren(article.element.cloneNode(true));
    }

    static clear(container: HTMLElement): void {
        this.revisions.set(container, (this.revisions.get(container) || 0) + 1);
        container.shadowRoot?.replaceChildren(container.ownerDocument.win.createEl('slot'));
        container.empty();
    }

    static async renderHtml(request: ArticleRenderRequest): Promise<string> {
        return (await this.render(request)).html;
    }
}
