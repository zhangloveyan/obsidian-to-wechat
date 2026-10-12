import { sanitizeHTMLToDom } from 'obsidian';

export function parseHtml(html: string, doc: Document = document): HTMLElement {
    const container = doc.win.createDiv();
    container.appendChild(doc.importNode(sanitizeHTMLToDom(html), true));
    return container;
}
