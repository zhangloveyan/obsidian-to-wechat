export interface ImagePromptEntry {
    lineIndex: number;
    line: string;
    prompt: string;
    imageLineIndex: number | null;
    imagePath: string | null;
}

export interface PromptAnchor {
    markdown: string;
    lineIndex: number;
}

const IMAGE_PROMPT_PATTERN = /^\s*<!--\s*image-prompt:\s*(.*?)\s*-->\s*$/;
const MARKDOWN_IMAGE_PATTERN = /^\s*!\[[^\]]*]\((<[^>]+>|[^)\n]+)\)\s*$/;
export const IMAGE_PROMPT_FORMAT = '<!-- image-prompt: 你的图片描述 -->';

export function collectImagePromptEntries(markdown: string): ImagePromptEntry[] {
    const entries: ImagePromptEntry[] = [];
    const { lines } = splitMarkdownLines(markdown);
    let fence: { char: string; length: number } | undefined;
    let inComment = false;
    lines.forEach((line, lineIndex) => {
        const marker = line.match(/^ {0,3}(\x60{3,}|~{3,})(.*)$/);
        if (marker && !inComment) {
            if (!fence) fence = { char: marker[1][0], length: marker[1].length };
            else if (marker[1][0] === fence.char && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
            return;
        }
        if (fence || /^(?: {4}|\t)/.test(line)) return;
        if (inComment) {
            if (line.includes('-->')) inComment = false;
            return;
        }
        const match = line.match(IMAGE_PROMPT_PATTERN);
        if (!match) {
            const start = line.indexOf('<!--');
            if (start >= 0 && line.indexOf('-->', start + 4) < 0) inComment = true;
            return;
        }
        const prompt = match[1].trim();
        if (!prompt) return;
        const imageLineIndex = findNextImageLine(lines, lineIndex);
        const imageMatch = imageLineIndex === null ? null : lines[imageLineIndex].match(MARKDOWN_IMAGE_PATTERN);
        entries.push({
            lineIndex, line, prompt, imageLineIndex,
            imagePath: imageMatch ? imageMatch[1].trim().replace(/^<|>$/g, '') : null,
        });
    });
    return entries;
}

/** Only rebase across unchanged prefix/suffix lines; ambiguous edits must never overwrite prose. */
export function locatePrompt(markdown: string, anchor: PromptAnchor): ImagePromptEntry {
    const before = splitMarkdownLines(anchor.markdown).lines;
    const after = splitMarkdownLines(markdown).lines;
    let index = anchor.lineIndex;
    if (anchor.markdown !== markdown) {
        let prefix = 0;
        while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
        let suffix = 0;
        while (suffix < before.length - prefix && suffix < after.length - prefix &&
            before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
        if (index >= prefix) {
            if (index < before.length - suffix) throw promptConflict();
            index += after.length - before.length;
        }
    }
    const entry = collectImagePromptEntries(markdown).find(item => item.lineIndex === index);
    if (!entry || entry.line !== before[anchor.lineIndex]) throw promptConflict();
    return entry;
}

export function updatePromptLine(markdown: string, lineIndex: number, prompt: string): string {
    if (!collectImagePromptEntries(markdown).some(entry => entry.lineIndex === lineIndex)) throw promptConflict();
    const parsed = splitMarkdownLines(markdown);
    parsed.lines[lineIndex] = formatImagePromptLine(prompt);
    return joinMarkdownLines(parsed);
}

export function upsertImageForPrompt(markdown: string, promptLineIndex: number, imageMarkdown: string): string {
    if (!collectImagePromptEntries(markdown).some(entry => entry.lineIndex === promptLineIndex)) throw promptConflict();
    const parsed = splitMarkdownLines(markdown);
    const imageLineIndex = findNextImageLine(parsed.lines, promptLineIndex);
    if (imageLineIndex !== null) parsed.lines[imageLineIndex] = imageMarkdown;
    else parsed.lines.splice(promptLineIndex + 1, 0, imageMarkdown);
    return joinMarkdownLines(parsed);
}

export function formatImagePromptLine(prompt: string): string {
    const value = prompt.trim();
    if (!value || /[\r\n]|-->/u.test(value)) throw new Error('提示词不能为空、包含换行或注释结束符。');
    return '<!-- image-prompt: ' + value + ' -->';
}

function promptConflict(): Error {
    return new Error('提示词位置或内容已改变，已停止回写以保护正文。请点击生图窗口的刷新按钮重新读取提示词。');
}

function findNextImageLine(lines: string[], index: number): number | null {
    const next = index + 1;
    return next < lines.length && MARKDOWN_IMAGE_PATTERN.test(lines[next]) ? next : null;
}

function splitMarkdownLines(markdown: string): { lines: string[]; hasTrailingNewline: boolean; newline: string } {
    const hasTrailingNewline = /\r?\n$/.test(markdown);
    const lines = markdown.split(/\r?\n/);
    if (hasTrailingNewline) lines.pop();
    return { lines, hasTrailingNewline, newline: markdown.includes('\r\n') ? '\r\n' : '\n' };
}

function joinMarkdownLines(parsed: ReturnType<typeof splitMarkdownLines>): string {
    return parsed.lines.join(parsed.newline) + (parsed.hasTrailingNewline ? parsed.newline : '');
}
