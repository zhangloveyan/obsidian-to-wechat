import type { DataAdapter } from 'obsidian';
import { isRecord } from '../../shared/errors';

export interface UploadedImage { url: string; media_id: string }
interface CacheEntry extends UploadedImage { uploadedAt: number }
const MAX_ENTRIES = 2000;
const MAX_AGE = 90 * 24 * 60 * 60 * 1000;

export class ImageUploadCache {
    private entries: Record<string, CacheEntry> = {};
    private writes: Promise<void> = Promise.resolve();
    private generation = 0;

    constructor(private adapter: Pick<DataAdapter, 'exists' | 'read' | 'write'>, private path: string) {}

    async load(): Promise<void> {
        if (!(await this.adapter.exists(this.path))) return;
        const value: unknown = JSON.parse(await this.adapter.read(this.path));
        if (!isRecord(value) || value.version !== 1 || !isRecord(value.entries)) return;
        this.entries = Object.fromEntries(Object.entries(value.entries).filter((pair): pair is [string, CacheEntry] => {
            const entry = pair[1];
            return isRecord(entry) && typeof entry.url === 'string' && /^https?:\/\//.test(entry.url) &&
                typeof entry.media_id === 'string' && !!entry.media_id && typeof entry.uploadedAt === 'number' &&
                Number.isFinite(entry.uploadedAt) && entry.uploadedAt <= Date.now() && Date.now() - entry.uploadedAt < MAX_AGE;
        }).slice(-MAX_ENTRIES));
    }

    get size(): number { return Object.keys(this.entries).length; }
    get revision(): number { return this.generation; }

    get(key: string): UploadedImage | undefined {
        const entry = this.entries[key];
        if (!entry || Date.now() - entry.uploadedAt >= MAX_AGE) return undefined;
        return { url: entry.url, media_id: entry.media_id };
    }

    put(key: string, image: UploadedImage, revision: number): Promise<void> {
        return this.enqueue(() => {
            if (revision !== this.generation) return;
            this.entries[key] = { ...image, uploadedAt: Date.now() };
            this.entries = Object.fromEntries(Object.entries(this.entries)
                .filter(([, value]) => Date.now() - value.uploadedAt < MAX_AGE)
                .sort((a, b) => a[1].uploadedAt - b[1].uploadedAt).slice(-MAX_ENTRIES));
        });
    }

    clear(): Promise<void> {
        this.generation++;
        return this.enqueue(() => { this.entries = {}; });
    }

    private enqueue(change: () => void): Promise<void> {
        const write = this.writes.then(async () => {
            change();
            await this.adapter.write(this.path, JSON.stringify({ version: 1, entries: this.entries }));
        });
        this.writes = write.catch(() => undefined);
        return write;
    }
}

export async function imageFingerprint(data: ArrayBuffer): Promise<string> {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    return Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
}
