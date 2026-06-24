import { App, TFile } from 'obsidian';
import type { SettingsManager } from '../settings/settings';
import { ImageGenerationClient } from './image-generation-client';
import {
    collectImagePromptEntries,
    ImagePromptEntry,
    updatePromptLine,
    upsertImageForPrompt,
} from './prompt-extractor';

export interface ImageGenerationProgress {
    current: number;
    total: number;
    message: string;
}

export interface ImageGenerationResult {
    generatedCount: number;
    failedCount: number;
    images: Array<{
        prompt: string;
        path: string;
        relativePath: string;
    }>;
}

export interface GeneratedPromptImage {
    prompt: string;
    path: string;
    relativePath: string;
}

export class ImageGenerationService {
    private app: App;
    private settingsManager: SettingsManager;

    constructor(app: App, settingsManager: SettingsManager) {
        this.app = app;
        this.settingsManager = settingsManager;
    }

    async generateForFile(
        file: TFile,
        onProgress?: (progress: ImageGenerationProgress) => void,
    ): Promise<ImageGenerationResult> {
        const entries = await this.getPromptEntries(file);

        if (entries.length === 0) {
            return { generatedCount: 0, failedCount: 0, images: [] };
        }

        const images: ImageGenerationResult['images'] = [];

        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            const current = index + 1;
            const total = entries.length;

            const generated = await this.generatePromptImage(file, entry.lineIndex, entry.prompt, message => {
                onProgress?.({ current, total, message: message || `开始生成第 ${current}/${total} 张图片。` });
            });
            images.push({
                prompt: generated.prompt,
                path: generated.path,
                relativePath: generated.relativePath,
            });
            onProgress?.({ current, total, message: `生成成功：${generated.relativePath}` });
        }

        return {
            generatedCount: images.length,
            failedCount: entries.length - images.length,
            images,
        };
    }

    async getPromptEntries(file: TFile): Promise<ImagePromptEntry[]> {
        const markdown = await this.app.vault.cachedRead(file);
        return collectImagePromptEntries(markdown);
    }

    async syncPrompt(file: TFile, lineIndex: number, prompt: string): Promise<void> {
        const markdown = await this.app.vault.cachedRead(file);
        await this.app.vault.modify(file, updatePromptLine(markdown, lineIndex, prompt));
    }

    async generatePromptImage(
        file: TFile,
        lineIndex: number,
        prompt: string,
        onProgress?: (message: string) => void,
    ): Promise<GeneratedPromptImage> {
        const settings = this.settingsManager.getSettings().imageGeneration;
        const client = new ImageGenerationClient(settings);
        const normalizedPrompt = prompt.trim();

        onProgress?.('正在同步提示词到文章。');
        let markdown = await this.app.vault.cachedRead(file);
        markdown = updatePromptLine(markdown, lineIndex, normalizedPrompt);
        await this.app.vault.modify(file, markdown);

        onProgress?.('正在提交图片生成任务。');
        const image = await client.generateImage(normalizedPrompt, onProgress);
        const targetPath = await this.nextImagePath(file, image.extension);
        await this.ensureFolderExists(parentPath(targetPath));
        await this.app.vault.createBinary(targetPath, image.data);

        const relativePath = toArticleRelativePath(file, targetPath);
        markdown = await this.app.vault.cachedRead(file);
        const updatedMarkdown = upsertImageForPrompt(markdown, lineIndex, `![](${relativePath})`);
        await this.app.vault.modify(file, updatedMarkdown);

        return {
            prompt: normalizedPrompt,
            path: targetPath,
            relativePath,
        };
    }

    private async nextImagePath(file: TFile, extension: string): Promise<string> {
        const folder = imageFolderPath(file);
        const safeExtension = extension.startsWith('.') ? extension : `.${extension}`;
        const baseName = `file-${formatDate(new Date())}`;
        let candidate = `${folder}/${baseName}${safeExtension}`;
        let suffix = 2;

        while (await this.app.vault.adapter.exists(candidate)) {
            candidate = `${folder}/${baseName}-${suffix}${safeExtension}`;
            suffix++;
        }

        return candidate;
    }

    private async ensureFolderExists(folderPath: string): Promise<void> {
        if (!folderPath) return;

        const parts = folderPath.split('/').filter(Boolean);
        let current = '';

        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            if (!(await this.app.vault.adapter.exists(current))) {
                await this.app.vault.createFolder(current);
            }
        }
    }
}

function imageFolderPath(file: TFile): string {
    const articleDir = parentPath(file.path);
    const folder = `pic/${file.basename}`;
    return articleDir ? `${articleDir}/${folder}` : folder;
}

function toArticleRelativePath(file: TFile, imagePath: string): string {
    const articleDir = parentPath(file.path);
    if (!articleDir) return imagePath;
    const prefix = `${articleDir}/`;
    return imagePath.startsWith(prefix) ? imagePath.slice(prefix.length) : imagePath;
}

function parentPath(path: string): string {
    const index = path.lastIndexOf('/');
    return index >= 0 ? path.slice(0, index) : '';
}

function formatDate(date: Date): string {
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    const hours = pad2(date.getHours());
    const minutes = pad2(date.getMinutes());
    const seconds = pad2(date.getSeconds());
    return `${month}-${day}-${hours}${minutes}${seconds}`;
}

function pad2(value: number): string {
    return String(value).padStart(2, '0');
}
