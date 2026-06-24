export interface ImagePromptEntry {
    lineIndex: number;
    line: string;
    prompt: string;
    imageLineIndex: number | null;
    imagePath: string | null;
}

const IMAGE_PROMPT_PATTERN = /^\s*<!--\s*image-prompt:\s*([\s\S]*?)\s*-->\s*$/;
const MARKDOWN_IMAGE_PATTERN = /^\s*!\[[^\]]*]\((<[^>]+>|[^)\n]+)\)\s*$/;

export const IMAGE_PROMPT_FORMAT = '<!-- image-prompt: 你的图片描述 -->';

export function collectImagePromptEntries(markdown: string): ImagePromptEntry[] {
    const entries: ImagePromptEntry[] = [];
    const lines = splitMarkdownLines(markdown).lines;

    lines.forEach((line, lineIndex) => {
        const match = line.match(IMAGE_PROMPT_PATTERN);
        if (!match) return;

        const prompt = match[1].trim();
        if (!prompt) return;

        const imageLineIndex = findNextImageLine(lines, lineIndex);
        const imagePath = imageLineIndex === null ? null : extractMarkdownImagePath(lines[imageLineIndex]);
        entries.push({ lineIndex, line, prompt, imageLineIndex, imagePath });
    });

    return entries;
}

export function updatePromptLine(markdown: string, lineIndex: number, prompt: string): string {
    const parsed = splitMarkdownLines(markdown);
    if (lineIndex >= 0 && lineIndex < parsed.lines.length) {
        parsed.lines[lineIndex] = formatImagePromptLine(prompt);
    }
    return joinMarkdownLines(parsed.lines, parsed.hasTrailingNewline);
}

export function upsertImageForPrompt(markdown: string, promptLineIndex: number, imageMarkdown: string): string {
    const parsed = splitMarkdownLines(markdown);
    const lines = parsed.lines;
    const imageLineIndex = findNextImageLine(lines, promptLineIndex);

    if (imageLineIndex !== null) {
        lines[imageLineIndex] = imageMarkdown;
    } else {
        lines.splice(promptLineIndex + 1, 0, imageMarkdown);
    }

    return joinMarkdownLines(lines, parsed.hasTrailingNewline);
}

export function formatImagePromptLine(prompt: string): string {
    return `<!-- image-prompt: ${prompt.trim()} -->`;
}

function findNextImageLine(lines: string[], promptLineIndex: number): number | null {
    const nextIndex = promptLineIndex + 1;
    if (nextIndex >= lines.length) return null;
    return MARKDOWN_IMAGE_PATTERN.test(lines[nextIndex]) ? nextIndex : null;
}

function extractMarkdownImagePath(line: string): string | null {
    const match = line.match(MARKDOWN_IMAGE_PATTERN);
    if (!match) return null;
    return match[1].trim().replace(/^<|>$/g, '');
}

function splitMarkdownLines(markdown: string): { lines: string[]; hasTrailingNewline: boolean } {
    const hasTrailingNewline = /\r?\n$/.test(markdown);
    const lines = markdown.split(/\r?\n/);
    if (hasTrailingNewline) lines.pop();
    return { lines, hasTrailingNewline };
}

function joinMarkdownLines(lines: string[], hasTrailingNewline: boolean): string {
    return lines.join('\n') + (hasTrailingNewline ? '\n' : '');
}
