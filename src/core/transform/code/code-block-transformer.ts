import { sanitizeHTMLToDom } from 'obsidian';
import { highlightCodeElement } from './code-highlighter';

export function transformCodeBlocks(container: HTMLElement): void {
    const doc = container.ownerDocument;
    for (const pre of Array.from(container.querySelectorAll('pre'))) {
        if (pre.classList.contains('frontmatter')) { pre.remove(); continue; }
        const code = pre.querySelector<HTMLElement>('code');
        if (!code || pre.querySelector('svg')) continue;
        const highlighted = highlightCodeElement(code);
        const section = doc.win.createEl('section');
        section.className = 'otw-code-block hljs';
        const header = doc.win.createSpan();
        header.className = 'otw-code-header';
        const dots = doc.win.createSpan();
        dots.className = 'otw-code-dots';
        for (let index = 0; index < 3; index++) {
            const dot = doc.win.createSpan();
            dot.className = 'otw-code-dot otw-code-dot-' + index;
            dots.appendChild(dot);
        }
        const label = doc.win.createSpan();
        label.className = 'otw-code-language';
        label.textContent = highlighted.displayLanguage;
        header.append(dots, label);
        const body = doc.win.createEl('code');
        body.className = 'otw-code-body';
        const numbers = doc.win.createSpan();
        numbers.className = 'otw-line-numbers';
        highlighted.lines.forEach((_, index) => {
            const number = doc.win.createSpan();
            number.textContent = String(index + 1);
            numbers.appendChild(number);
        });
        const scroll = doc.win.createSpan();
        scroll.className = 'otw-code-scroll';
        const text = doc.win.createSpan();
        text.className = 'otw-code-text';
        text.appendChild(doc.importNode(sanitizeHTMLToDom(highlighted.lines.join('<br>')), true));
        scroll.appendChild(text);
        body.append(numbers, scroll);
        section.append(header, body);
        pre.replaceWith(section);
    }
}
