import { TFile, type App } from 'obsidian';
import { outsideCode } from '../../shared/markdown-text';

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
    const attempts = [normalizedPath, normalizedPath.replace(/^\.\/+/, '')];
    if (normalizedPath.startsWith('app://')) {
        const matches = app.vault.getFiles().filter(file => normalizedPath.endsWith('/' + file.path));
        const file = matches.sort((a, b) => b.path.length - a.path.length)[0] || null;
        return { file, originalPath: rawPath, normalizedPath, attempts };
    }

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

export function normalizeMarkdownImageDestinations(markdown: string): string {
    return outsideCode(markdown, text => text.replace(/!\[([^\]]*)]\(([^<][^)\n]*\s[^)\n]*)\)/g, (full, alt: string, path: string) => {
        const cleanPath = path.trim();
        if (!cleanPath || isRemoteOrDataImage(cleanPath)) return full;
        if (!/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(normalizeImagePath(cleanPath))) return full;
        return `![${alt}](<${cleanPath}>)`;
    }));
}
