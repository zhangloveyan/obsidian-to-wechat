import { getHighlighter, normalizeCodeLanguage } from './code-languages';

export interface HighlightedCode {
    language: string;
    displayLanguage: string;
    lines: string[];
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function preserveWhitespace(html: string): string {
    return html
        .replace(/\t/g, '    ')
        .replace(/(<span[^>]*>[^<]*<\/span>)(\s+)(<span[^>]*>)/g, (_match, left: string, spaces: string, right: string) => {
            return left + right.replace(/^(<span[^>]*>)/, `$1${spaces}`);
        })
        .replace(/(\s+)(<span[^>]*>)/g, (_match, spaces: string, span: string) => {
            return span.replace(/^(<span[^>]*>)/, `$1${spaces}`);
        })
        .replace(/(>[^<]+)|(^[^<]+)/g, value => value.replace(/ /g, '&nbsp;'));
}

function getCodeLanguage(codeEl: HTMLElement): string {
    const classNames = Array.from(codeEl.classList);
    const languageClass = classNames.find(className => className.startsWith('language-') || className.startsWith('lang-'));
    if (!languageClass) return 'plaintext';
    return languageClass.replace(/^language-/, '').replace(/^lang-/, '').split(/\s+/)[0];
}

export function highlightCodeElement(codeEl: HTMLElement): HighlightedCode {
    const highlighter = getHighlighter();
    const rawLanguage = getCodeLanguage(codeEl);
    const language = normalizeCodeLanguage(rawLanguage);
    const supportedLanguage = highlighter.getLanguage(language) ? language : 'plaintext';
    const text = codeEl.textContent || '';
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\n$/, '');
    const lines = normalizedText.split('\n');

    return {
        language: supportedLanguage,
        displayLanguage: rawLanguage || supportedLanguage,
        lines: lines.map(line => {
            if (!line) return '&nbsp;';
            const highlighted = supportedLanguage === 'plaintext'
                ? escapeHtml(line)
                : highlighter.highlight(line, { language: supportedLanguage }).value;
            return preserveWhitespace(highlighted) || '&nbsp;';
        }),
    };
}
