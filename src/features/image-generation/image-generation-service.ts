import type { App, TFile } from 'obsidian';
import type { ImageGenerationSettings, SettingsManager } from '../settings/settings';
import { ImageGenerationClient, type GeneratedImageData } from './image-generation-client';
import { collectImagePromptEntries, formatImagePromptLine, locatePrompt, updatePromptLine, upsertImageForPrompt } from './prompt-extractor';
import type { PromptAnchor } from './prompt-extractor';
import { errorMessage } from '../../shared/errors';

export type ImageTaskStatus = 'idle' | 'queued' | 'generating' | 'generated' | 'failed';
export interface ImagePromptTask {
    id: number;
    anchor: PromptAnchor;
    prompt: string;
    status: ImageTaskStatus;
    detail: string;
    imagePath: string | null;
}
interface Session {
    tasks: ImagePromptTask[];
    loaded: boolean;
    loading?: Promise<ImagePromptTask[]>;
    queue: Promise<void>;
    listeners: Set<() => void>;
}
interface ImageClient {
    generateImage(prompt: string, onProgress?: (message: string) => void, signal?: AbortSignal): Promise<GeneratedImageData>;
}
type ClientFactory = (settings: ImageGenerationSettings) => ImageClient;

export class ImageGenerationService {
    private sessions = new Map<TFile, Session>();
    private controller = new AbortController();
    private nextId = 1;

    constructor(
        private app: App,
        private settingsManager: SettingsManager,
        private createClient: ClientFactory = settings => new ImageGenerationClient(settings),
    ) {}

    async getTasks(file: TFile): Promise<ImagePromptTask[]> {
        const session = this.session(file);
        if (session.loaded) return session.tasks;
        return this.reloadTasks(file);
    }

    reloadTasks(file: TFile): Promise<ImagePromptTask[]> {
        const session = this.session(file);
        if (session.loading) return session.loading;
        if (session.tasks.some(isBusy)) return Promise.reject(new Error('请等待当前生成任务结束后重新读取提示词。'));
        session.loading = this.enqueue(file, async () => {
            this.checkActive();
            const markdown = await this.app.vault.read(file);
            session.tasks = collectImagePromptEntries(markdown).map(entry => ({
                id: this.nextId++, anchor: { markdown, lineIndex: entry.lineIndex },
                prompt: entry.prompt, status: entry.imagePath ? 'generated' : 'idle',
                detail: entry.imagePath || '', imagePath: entry.imagePath,
            }));
            session.loaded = true;
            this.notify(file);
        }).then(() => session.tasks).finally(() => { session.loading = undefined; });
        return session.loading;
    }

    subscribe(file: TFile, listener: () => void): () => void {
        const session = this.session(file);
        session.listeners.add(listener);
        return () => { session.listeners.delete(listener); };
    }

    syncPrompt(file: TFile, task: ImagePromptTask, prompt: string): Promise<void> {
        if (isBusy(task)) return Promise.resolve();
        formatImagePromptLine(prompt);
        const value = prompt.trim();
        task.prompt = value;
        return this.enqueue(file, async () => {
            await this.writePrompt(file, task, value);
            this.notify(file);
        });
    }

    generate(file: TFile, task: ImagePromptTask, prompt: string): Promise<void> {
        if (isBusy(task)) return Promise.resolve();
        formatImagePromptLine(prompt);
        const value = prompt.trim();
        const settings = { ...this.settingsManager.getSettings().imageGeneration };
        task.prompt = value;
        task.status = 'queued';
        task.detail = '等待生成';
        this.notify(file);
        return this.enqueue(file, async () => {
            let savedPath: string | undefined;
            try {
                this.checkActive();
                task.status = 'generating';
                task.detail = '正在同步提示词';
                this.notify(file);
                await this.writePrompt(file, task, value);
                const client = this.createClient(settings);
                const image = await client.generateImage(value, message => {
                    task.detail = message;
                    this.notify(file);
                }, this.controller.signal);
                this.checkActive();
                savedPath = await this.saveImage(file, image);
                task.detail = '正在回写文章';
                this.notify(file);
                let anchor = task.anchor;
                const relative = articleRelativePath(file, savedPath);
                await this.app.vault.process(file, markdown => {
                    this.checkActive();
                    const entry = locatePrompt(markdown, task.anchor);
                    if (entry.prompt !== value) throw new Error('提示词已修改，生成结果未写入文章。');
                    const original = collectImagePromptEntries(task.anchor.markdown).find(item => item.lineIndex === task.anchor.lineIndex);
                    if (entry.imagePath !== original?.imagePath) throw new Error('关联图片已修改，生成结果未覆盖原图片。');
                    const result = upsertImageForPrompt(markdown, entry.lineIndex, '![](<'+ relative + '>)');
                    anchor = { markdown: result, lineIndex: entry.lineIndex };
                    return result;
                });
                task.anchor = anchor;
                task.imagePath = relative;
                task.status = 'generated';
                task.detail = task.imagePath || savedPath;
            } catch (error) {
                task.status = 'failed';
                task.detail = errorMessage(error) + (savedPath ? ' 图片已保留：' + savedPath : '');
            } finally {
                this.notify(file);
            }
        });
    }

    generateAll(file: TFile, tasks: ImagePromptTask[]): Promise<void> {
        tasks.filter(task => !isBusy(task)).forEach(task => formatImagePromptLine(task.prompt));
        const jobs = tasks.filter(task => !isBusy(task)).map(task => this.generate(file, task, task.prompt));
        return Promise.all(jobs).then(() => undefined);
    }

    dispose(): void {
        this.controller.abort();
        for (const session of this.sessions.values()) session.listeners.clear();
    }

    private session(file: TFile): Session {
        let session = this.sessions.get(file);
        if (!session) {
            session = { tasks: [], loaded: false, queue: Promise.resolve(), listeners: new Set() };
            this.sessions.set(file, session);
        }
        return session;
    }

    private enqueue(file: TFile, operation: () => Promise<void>): Promise<void> {
        const session = this.session(file);
        const result = session.queue.then(operation);
        session.queue = result.catch(() => undefined);
        return result;
    }

    private async writePrompt(file: TFile, task: ImagePromptTask, prompt: string): Promise<void> {
        this.checkActive();
        let anchor = task.anchor;
        await this.app.vault.process(file, markdown => {
            this.checkActive();
            const entry = locatePrompt(markdown, task.anchor);
            const result = updatePromptLine(markdown, entry.lineIndex, prompt);
            anchor = { markdown: result, lineIndex: entry.lineIndex };
            return result;
        });
        task.anchor = anchor;
    }

    private async saveImage(file: TFile, image: GeneratedImageData): Promise<string> {
        const parent = file.path.slice(0, Math.max(0, file.path.lastIndexOf('/')));
        const folder = (parent ? parent + '/' : '') + 'pic/' + file.basename;
        let current = '';
        for (const part of folder.split('/')) {
            current = current ? current + '/' + part : part;
            if (!(await this.app.vault.adapter.exists(current))) {
                try { await this.app.vault.createFolder(current); }
                catch (error) { if (!(await this.app.vault.adapter.exists(current))) throw error; }
            }
        }
        this.checkActive();
        const path = folder + '/file-' + Date.now() + '-' + crypto.randomUUID().slice(0, 8) + image.extension;
        await this.app.vault.createBinary(path, image.data);
        return path;
    }

    private notify(file: TFile): void {
        for (const listener of this.session(file).listeners) {
            try { listener(); }
            catch (error) { console.error('生图状态更新失败：' + errorMessage(error)); }
        }
    }

    private checkActive(): void {
        if (this.controller.signal.aborted) throw new Error('插件已卸载，任务停止回写。');
    }
}

export function isBusy(task: ImagePromptTask): boolean {
    return task.status === 'queued' || task.status === 'generating';
}
function articleRelativePath(file: TFile, path: string): string {
    const index = file.path.lastIndexOf('/');
    return index < 0 ? path : path.slice(index + 1);
}
