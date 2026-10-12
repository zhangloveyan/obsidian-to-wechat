import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const markdown = new MarkdownIt({ html: true, breaks: true });
Object.defineProperty(Document.prototype, 'win', { get() { return this.defaultView || window; } });
window.createEl = tag => document.createElement(tag);
window.createDiv = () => document.createElement('div');
window.createSpan = () => document.createElement('span');
export const metrics = { loaded: 0, unloaded: 0 };
HTMLElement.prototype.empty = function () { this.replaceChildren(); };
HTMLElement.prototype.createEl = function (tag, options = {}) {
    const element = this.ownerDocument.createElement(tag);
    if (options.cls) element.className = options.cls;
    if (options.text) element.textContent = options.text;
    for (const [key, value] of Object.entries({ ...options.attr, ...(options.type ? { type: options.type } : {}) })) element.setAttribute(key, value);
    this.append(element); return element;
};
HTMLElement.prototype.createDiv = function (options) { return this.createEl('div', options); };
HTMLElement.prototype.createSpan = function (options) { return this.createEl('span', options); };
HTMLElement.prototype.addClass = function (...classes) { this.classList.add(...classes); };
HTMLElement.prototype.toggleClass = function (name, value) { this.classList.toggle(name, value); };
HTMLElement.prototype.setText = function (text) { this.textContent = text; };
HTMLElement.prototype.setCssProps = function (props) { for (const [key, value] of Object.entries(props)) this.style.setProperty(key, value); };
HTMLElement.prototype.setCssStyles = function (props) { Object.assign(this.style, props); };
export class Component {
    load() { metrics.loaded++; }
    unload() { metrics.unloaded++; }
}
export class TFile {
    constructor(path) { this.path = path; this.name = path.split('/').pop(); this.basename = this.name.replace(/\.[^.]+$/, ''); }
}
export class MarkdownView {}
export class Modal {
    constructor(app) {
        this.app = app; this.containerEl = document.createElement('div'); this.containerEl.className = 'modal-container';
        this.modalEl = this.containerEl.createDiv({ cls: 'modal' }); this.contentEl = this.modalEl.createDiv({ cls: 'modal-content' });
    }
    open() { document.body.append(this.containerEl); this.onOpen(); }
    close() { this.onClose(); this.containerEl.remove(); }
}
export class Setting {
    constructor(parent) { this.settingEl = parent.createDiv({ cls: 'setting-item' }); }
    setName(text) { this.settingEl.textContent = text; return this; }
    setHeading() { this.settingEl.classList.add('setting-item-heading'); return this; }
}
export class Notice { constructor(text) { metrics.notices ||= []; metrics.notices.push(text); } }
export async function requestUrl(options) { throw new Error('Unexpected external request: ' + options.url); }
export const sanitizeHTMLToDom = html => DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true, ADD_TAGS: ['mjx-container'], ALLOW_UNKNOWN_PROTOCOLS: true });
export const MarkdownRenderer = {
    async render(_app, source, element) {
        const delay = source.match(/<!-- delay:(\d+) -->/);
        if (delay) await new Promise(resolve => setTimeout(resolve, Number(delay[1])));
        element.append(sanitizeHTMLToDom(markdown.render(source)));
    },
};
