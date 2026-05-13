import { TFile, type App } from 'obsidian';

export interface ImagePathResolution {
    file: TFile | null;
    originalPath: string;
    normalizedPath: string;
    attempts: string[];
}

export function normalizeImagePath(rawPath: string): string {
    let value = rawPath.trim();

    if (value.startsWith('<') && value.endsWith('>')) {
        value = value.slice(1, -1).trim();
    }

    value = value.replace(/\\/g, '/');
    value = value.split('#')[0].split('?')[0];

    try {
        value = decodeURIComponent(value);
    } catch {
        // Keep the original value if it is not valid URI-encoded text.
    }

    return value.trim();
}

export function isRemoteOrDataImage(path: string): boolean {
    return /^https?:\/\//i.test(path) || path.startsWith('data:image/');
}

export function resolveImageFile(app: App, rawPath: string, sourcePath: string): ImagePathResolution {
    const normalizedPath = normalizeImagePath(rawPath);
    const attempts = buildPathAttempts(rawPath, normalizedPath);

    for (const attempt of attempts) {
        const linkedFile = app.metadataCache.getFirstLinkpathDest(attempt, sourcePath);
        if (linkedFile instanceof TFile) {
            return { file: linkedFile, originalPath: rawPath, normalizedPath, attempts };
        }

        const directFile = app.vault.getAbstractFileByPath(attempt);
        if (directFile instanceof TFile) {
            return { file: directFile, originalPath: rawPath, normalizedPath, attempts };
        }
    }

    return { file: null, originalPath: rawPath, normalizedPath, attempts };
}

export function extractImagePathsFromMarkdown(markdown: string): string[] {
    const paths: string[] = [];
    const addPath = (path: string) => {
        const cleanPath = path.trim();
        if (cleanPath && !paths.includes(cleanPath)) paths.push(cleanPath);
    };

    const mdImageRegex = /!\[[^\]]*]\((<[^>]+>|[^)\n]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = mdImageRegex.exec(markdown)) !== null) {
        addPath(match[1]);
    }

    const wikiImageRegex = /!\[\[([^\]]+)]]/g;
    while ((match = wikiImageRegex.exec(markdown)) !== null) {
        addPath(match[1].split('|')[0]);
    }

    const htmlImgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    while ((match = htmlImgRegex.exec(markdown)) !== null) {
        addPath(match[1]);
    }

    return paths;
}

export function normalizeMarkdownImageDestinations(markdown: string): string {
    return markdown.replace(/!\[([^\]]*)]\(([^<][^)\n]*\s[^)\n]*)\)/g, (full, alt: string, path: string) => {
        const cleanPath = path.trim();
        if (!cleanPath || isRemoteOrDataImage(cleanPath)) return full;
        if (!/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(normalizeImagePath(cleanPath))) return full;
        return `![${alt}](<${cleanPath}>)`;
    });
}

function buildPathAttempts(rawPath: string, normalizedPath: string): string[] {
    const attempts = new Set<string>();
    const add = (value: string | undefined) => {
        const clean = value?.trim();
        if (clean) attempts.add(clean);
    };

    add(rawPath);
    add(normalizedPath);
    add(normalizedPath.replace(/^\.\/+/, ''));

    const fileName = normalizedPath.split('/').pop();
    add(fileName);

    return Array.from(attempts);
}
