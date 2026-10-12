import { requestUrl, type RequestUrlParam, type RequestUrlResponse } from 'obsidian';
import type { ImageGenerationSettings } from '../settings/settings';
import { errorMessage, isRecord } from '../../shared/errors';

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
        this.settings = { ...settings };
    }

    async generateImage(prompt: string, onProgress?: (message: string) => void, signal?: AbortSignal): Promise<GeneratedImageData> {
        this.validateSettings();
        checkCancelled(signal);

        const prediction = await this.createPrediction(prompt);
        checkCancelled(signal);
        const completed = await this.waitForPrediction(prediction, onProgress, signal);
        const status = String(completed.status || '');

        if (status !== 'completed') {
            const detail = errorDetail(completed.error) || status || '未知状态';
            throw new Error('图片生成失败：' + errorMessage(detail, [this.settings.apiKey]));
        }

        const outputUrl = firstOutputUrl(completed);
        checkCancelled(signal);
        const image = await this.downloadImage(outputUrl);
        checkCancelled(signal);
        return image;
    }

    private validateSettings(): void {
        if (!this.settings.apiKey.trim()) {
            throw new Error('请先填写图片生成 API 密钥。');
        }

        if (!this.settings.baseUrl.trim()) {
            throw new Error('请先填写图片生成 API 地址。');
        }
        if (!/^https?:\/\//i.test(this.settings.baseUrl.trim())) throw new Error('图片生成 API 地址必须以 http:// 或 https:// 开头。');

        if (!this.settings.model.trim()) {
            throw new Error('请先填写图片生成模型。');
        }
    }

    private async createPrediction(prompt: string): Promise<ImageTaskPayload> {
        const response = await this.request({
            throw: false,
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
        }, '提交图片生成任务');
        return this.readTask(response, '提交图片生成任务');
    }

    private async waitForPrediction(
        prediction: ImageTaskPayload,
        onProgress?: (message: string) => void,
        signal?: AbortSignal,
    ): Promise<ImageTaskPayload> {
        let current = prediction;
        let status = String(current.status || '');
        if (TERMINAL_STATES.has(status)) return current;

        const id = current.task_id || current.id;
        const taskId = typeof id === 'string' ? id.trim() : '';
        if (!taskId) {
            throw new Error('图片生成接口返回缺少 task_id。');
        }

        const timeoutSeconds = Math.max(1, Number(this.settings.timeoutSeconds) || 180);
        const pollIntervalSeconds = Math.max(1, Number(this.settings.pollIntervalSeconds) || 2);
        const startedAt = Date.now();
        const deadline = startedAt + timeoutSeconds * 1000;

        onProgress?.(`已提交任务 ${taskId}，等待生成结果。`);

        while (Date.now() < deadline) {
            checkCancelled(signal);
            await sleep(Math.min(pollIntervalSeconds * 1000, Math.max(0, deadline - Date.now())), signal);
            if (Date.now() >= deadline) break;
            current = await this.getPrediction(taskId);
            checkCancelled(signal);
            status = String(current.status || '');
            onProgress?.(`任务 ${taskId} 状态：${status || 'unknown'}`);

            if (TERMINAL_STATES.has(status)) {
                return current;
            }
        }

        throw new Error(`图片生成超时，已等待 ${timeoutSeconds} 秒。`);
    }

    private async getPrediction(taskId: string): Promise<ImageTaskPayload> {
        const response = await this.request({
            throw: false,
            url: `${normalizeBaseUrl(this.settings.baseUrl)}/v1/tasks/${encodeURIComponent(taskId)}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.settings.apiKey.trim()}`,
            },
        }, '查询图片生成任务 ' + taskId);
        return this.readTask(response, '查询图片生成任务 ' + taskId);
    }

    private async downloadImage(outputUrl: string): Promise<GeneratedImageData> {
        const response = await this.request({ url: outputUrl, throw: false }, '下载生成图片');

        const type = response.headers['content-type'] || response.headers['Content-Type'] || '';
        if (!type.startsWith('image/') || !response.arrayBuffer.byteLength) {
            throw new Error('下载生成图片失败：服务返回的不是有效图片，Content-Type=' + type);
        }

        return {
            data: response.arrayBuffer,
            extension: extensionFromResponse(outputUrl, response.headers),
            outputUrl,
        };
    }

    private async request(options: RequestUrlParam, stage: string): Promise<RequestUrlResponse> {
        try {
            const response = await requestUrl(options);
            if (response.status < 200 || response.status >= 300) throw new Error(httpError(stage, response.status, response.text));
            return response;
        } catch (error) {
            const note = options.method === 'POST' ? ' 请先检查服务端任务记录，避免重复生成计费。' : '';
            throw new Error(stage + '：' + errorMessage(error, [this.settings.apiKey.trim()]) + note);
        }
    }

    private readTask(response: RequestUrlResponse, stage: string): ImageTaskPayload {
        let payload: unknown;
        try { payload = JSON.parse(response.text); }
        catch { throw new Error(stage + '失败：HTTP ' + response.status + '，响应不是有效 JSON。'); }
        if (isRecord(payload) && payload.error) {
            throw new Error(stage + '失败：' + errorMessage(errorDetail(payload.error) || errorDetail(payload.message) || '服务返回错误', [this.settings.apiKey.trim()]));
        }
        return extractTaskPayload(payload);
    }
}

function extractTaskPayload(payload: unknown): ImageTaskPayload {
    if (isRecord(payload)) {
        const data = payload.data;
        if (Array.isArray(data) && isRecord(data[0])) return data[0];
        if (isRecord(data)) return data;
        return payload;
    }

    throw new Error('图片生成接口返回格式无法识别。');
}

function firstOutputUrl(payload: ImageTaskPayload): string {
    const result = isRecord(payload.result) ? payload.result : {};
    const urls = findUrls(payload.output ?? result.images ?? payload.images);
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
        return findUrls(value.url ?? value.urls ?? value.image_url ?? []);
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

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const abort = () => {
            window.clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
            reject(new Error('图片生成任务已停止。'));
        };
        const timer = window.setTimeout(() => {
            signal?.removeEventListener('abort', abort);
            resolve();
        }, ms);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
    });
}

function checkCancelled(signal?: AbortSignal): void {
    if (signal?.aborted) throw new Error('图片生成任务已停止。');
}

function errorDetail(error: unknown): string {
    if (typeof error === 'string') return error;
    if (isRecord(error) && typeof error.message === 'string') return error.message;
    return '';
}

function httpError(stage: string, status: number, body: string): string {
    let detail = '';
    try {
        const payload: unknown = JSON.parse(body);
        if (isRecord(payload)) detail = errorDetail(payload.error) || errorDetail(payload.message);
    } catch { /* Non-JSON proxy responses are identified by their HTTP status. */ }
    const hints: Record<number, string> = { 401: '请检查 API 密钥。', 403: '请检查密钥权限、服务地区或网关限制。', 429: '请求过于频繁或额度不足。' };
    return stage + '失败，HTTP ' + status + '。' + (hints[status] || '') + (detail ? ' 服务返回：' + detail.slice(0, 300) : '');
}
