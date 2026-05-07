import { highlightCodeElement } from './code-highlighter';

const MAC_CODE_SVG = [
    '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="45px" height="13px" viewBox="0 0 450 130">',
    '<ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)"></ellipse>',
    '<ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)"></ellipse>',
    '<ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)"></ellipse>',
    '</svg>',
].join('');

function buildLineNumbers(total: number): string {
    const numbers: string[] = [];
    for (let i = 1; i <= total; i++) {
        numbers.push(`<span style="display:block;padding:0 10px 0 0;line-height:1.75;text-align:right;">${i}</span>`);
    }
    return numbers.join('');
}

export function transformCodeBlocks(container: HTMLElement): void {
    container.querySelectorAll('pre').forEach(pre => {
        if (pre.classList.contains('frontmatter')) {
            pre.remove();
            return;
        }

        const codeEl = pre.querySelector('code') as HTMLElement | null;
        if (!codeEl) return;

        const highlighted = highlightCodeElement(codeEl);
        const lineNumbersHtml = buildLineNumbers(highlighted.lines.length);
        const codeInnerHtml = highlighted.lines.join('<br/>');

        const headerHtml = [
            '<span class="otw-code-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px 6px;">',
            `<span class="mac-sign" style="display:inline-flex;">${MAC_CODE_SVG}</span>`,
            `<span class="otw-code-language" style="font-size:12px;line-height:1;color:#57606a;">${highlighted.displayLanguage}</span>`,
            '</span>',
            '<span style="display:block;height:1px;border-bottom:1px solid #d8dee4;margin:0 14px;"></span>',
        ].join('');

        const bodyHtml = [
            '<span style="display:flex;align-items:flex-start;overflow-x:hidden;overflow-y:auto;width:100%;max-width:100%;padding:0;box-sizing:border-box">',
            '<span class="line-numbers" style="display:block;flex:0 0 auto;padding:10px 0 10px 10px;border-right:1px solid rgba(31,35,40,0.08);user-select:none;color:#8c959f;background:transparent;">',
            lineNumbersHtml,
            '</span>',
            '<span class="code-scroll" style="display:block;flex:1 1 auto;overflow-x:auto;overflow-y:visible;padding:10px 14px 12px 12px;min-width:0;box-sizing:border-box;">',
            `<span style="display:inline-block;white-space:pre;min-width:max-content;line-height:1.75;">${codeInnerHtml}</span>`,
            '</span>',
            '</span>',
        ].join('');

        const newSection = document.createElement('section');
        newSection.setAttribute('class', `otw-code-block hljs code__pre language-${highlighted.language}`);
        newSection.style.cssText = 'position:relative;background:#f6f8fa;color:#24292f;border:1px solid #d0d7de;border-radius:8px;padding:0;overflow-x:hidden;overflow-y:hidden;margin:1.5em 0;box-shadow:none;text-align:left;word-spacing:0;letter-spacing:0;';
        newSection.innerHTML = headerHtml + `<code class="language-${highlighted.language}" style="display:block;padding:0;overflow-x:hidden;text-indent:0;text-align:left;line-height:1.5;font-family:Menlo,Monaco,Consolas,Courier New,monospace;font-size:90%;margin:0;white-space:nowrap;color:inherit;background:none;">${bodyHtml}</code>`;
        pre.replaceWith(newSection);
    });
}

