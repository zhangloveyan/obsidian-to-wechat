import { requestUrl } from 'obsidian';
import type { ImageGenerationSettings } from '../settings/settings';

const TERMINAL_STATES = new Set(['completed', 'failed', 'cancelled']);

export interface GeneratedImageData {
    data: ArrayBuffer;
    extension: string;
    outputUrl: string;
}

interface ImageTaskPayload {
    status?: string;
    task_id?: string;
    error?: unknown;
    [key: string]: unknown;
}

export class ImageGenerationClient {
    private settings: ImageGenerationSettings;

    constructor(settings: ImageGenerationSettings) {
        this.settings = settings;
    }

    async generateImage(prompt: string, onProgress?: (message: string) => void): Promise<GeneratedImageData> {
        this.validateSettings();

        const prediction = await this.createPrediction(prompt);
        const completed = await this.waitForPrediction(prediction, onProgress);
        const status = String(completed.status || '');

        if (status !== 'completed') {
            const detail = typeof completed.error === 'string' ? completed.error : status || '未知状态';
            throw new Error(`图片生成失败：${detail}`);
        }

        const outputUrl = firstOutputUrl(completed);
        return this.downloadImage(outputUrl);
    }

    async testConnection(): Promise<{ ok: boolean; message: string }> {
        try {
            await this.generateImage('一张白色背景的极简测试图片', () => undefined);
            return { ok: true, message: '图片生成接口测试成功。' };
        } catch (error) {
            return { ok: false, message: `图片生成接口测试失败：${formatError(error)}` };
        }
    }

    private validateSettings(): void {
        if (!this.settings.apiKey.trim()) {
            throw new Error('请先填写图片生成 API 密钥。');
        }

        if (!this.settings.baseUrl.trim()) {
            throw new Error('请先填写图片生成 API 地址。');
        }

        if (!this.settings.model.trim()) {
            throw new Error('请先填写图片生成模型。');
        }
    }

    private async createPrediction(prompt: string): Promise<ImageTaskPayload> {
        const response = await requestUrl({
            url: `${normalizeBaseUrl(this.settings.baseUrl)}/v1/images/generations`,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.settings.apiKey.trim()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.settings.model.trim(),
                prompt,
                size: this.settings.size.trim() || '16:9',
                resolution: this.settings.resolution.trim() || '2K',
                n: 1,
            }),
        });

        if (response.status < 200 || response.status >= 300) {
            throw new Error(`提交图片生成任务失败，HTTP ${response.status}。`);
        }

        return extractTaskPayload(response.json);
    }

    private async waitForPrediction(
        prediction: ImageTaskPayload,
        onProgress?: (message: string) => void,
    ): Promise<ImageTaskPayload> {
        let current = prediction;
        let status = String(current.status || '');
        if (TERMINAL_STATES.has(status)) return current;

        const taskId = String(current.task_id || '').trim();
        if (!taskId) {
            throw new Error('图片生成接口返回缺少 task_id。');
        }

        const timeoutSeconds = Math.max(1, Number(this.settings.timeoutSeconds) || 180);
        const pollIntervalSeconds = Math.max(1, Number(this.settings.pollIntervalSeconds) || 2);
        const startedAt = Date.now();
        const deadline = startedAt + timeoutSeconds * 1000;

        onProgress?.(`已提交任务 ${taskId}，等待生成结果。`);

        while (Date.now() < deadline) {
            await sleep(pollIntervalSeconds * 1000);
            current = await this.getPrediction(taskId);
            status = String(current.status || '');
            onProgress?.(`任务 ${taskId} 状态：${status || 'unknown'}`);

            if (TERMINAL_STATES.has(status)) {
                return current;
            }
        }

        throw new Error(`图片生成超时，已等待 ${timeoutSeconds} 秒。`);
    }

    private async getPrediction(taskId: string): Promise<ImageTaskPayload> {
        const response = await requestUrl({
            url: `${normalizeBaseUrl(this.settings.baseUrl)}/v1/tasks/${encodeURIComponent(taskId)}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.settings.apiKey.trim()}`,
            },
        });

        if (response.status < 200 || response.status >= 300) {
            throw new Error(`查询图片生成任务失败，HTTP ${response.status}。`);
        }

        return extractTaskPayload(response.json);
    }

    private async downloadImage(outputUrl: string): Promise<GeneratedImageData> {
        const response = await requestUrl({ url: outputUrl });

        if (response.status < 200 || response.status >= 300) {
            throw new Error(`下载生成图片失败，HTTP ${response.status}。`);
        }

        return {
            data: response.arrayBuffer,
            extension: extensionFromResponse(outputUrl, response.headers),
            outputUrl,
        };
    }
}

function extractTaskPayload(payload: unknown): ImageTaskPayload {
    if (isRecord(payload)) {
        const data = payload.data;
        if (Array.isArray(data) && isRecord(data[0])) return data[0] as ImageTaskPayload;
        if (isRecord(data)) return data as ImageTaskPayload;
        return payload as ImageTaskPayload;
    }

    throw new Error('图片生成接口返回格式无法识别。');
}

function firstOutputUrl(payload: ImageTaskPayload): string {
    const urls = findUrls(payload);
    const url = urls.find(Boolean);
    if (!url) {
        throw new Error(`图片生成结果中没有可下载图片。状态：${String(payload.status || 'unknown')}`);
    }
    return url;
}

function findUrls(value: unknown): string[] {
    if (typeof value === 'string') {
        const text = value.trim();
        return /^https?:\/\//i.test(text) ? [text] : [];
    }

    if (Array.isArray(value)) {
        return value.flatMap(item => findUrls(item));
    }

    if (isRecord(value)) {
        return Object.values(value).flatMap(item => findUrls(item));
    }

    return [];
}

function extensionFromResponse(url: string, headers: Record<string, string>): string {
    const contentType = (headers['content-type'] || headers['Content-Type'] || '').split(';')[0].trim();
    const typeMap: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/bmp': '.bmp',
        'image/svg+xml': '.svg',
    };

    if (typeMap[contentType]) return typeMap[contentType];

    const path = url.split(/[?#]/)[0];
    const match = path.match(/\.(png|jpe?g|webp|gif|bmp|svg)$/i);
    if (match) return `.${match[1].toLowerCase().replace('jpeg', 'jpg')}`;

    return '.png';
}

function normalizeBaseUrl(baseUrl: string): string {
    return baseUrl.trim().replace(/\/+$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error || '未知错误');
}
