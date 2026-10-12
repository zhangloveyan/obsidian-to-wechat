import type { StructuredTheme } from '../../core/theme/theme-types';
import { builtinStructuredThemes } from '../../core/theme/builtin-themes';
import { isRecord as record } from '../../shared/errors';

export interface WechatAccount {
    id: string;
    name: string;
    appId: string;
    appSecret: string;
}

export interface ImageGenerationSettings {
    apiKey: string;
    baseUrl: string;
    model: string;
    size: string;
    resolution: string;
    timeoutSeconds: number;
    pollIntervalSeconds: number;
}

export interface MPSettings {
    activeThemeId: string;
    wechatAccounts: WechatAccount[];
    defaultAccountId: string;
    lastSelectedAccountId?: string;
    structuredThemes: StructuredTheme[];
    imageGeneration: ImageGenerationSettings;
}

export const DEFAULT_IMAGE_GENERATION_SETTINGS: ImageGenerationSettings = {
    apiKey: '',
    baseUrl: 'https://api.apimart.ai',
    model: 'gemini-3.1-flash-image-preview',
    size: '16:9',
    resolution: '2K',
    timeoutSeconds: 180,
    pollIntervalSeconds: 2,
};

const DEFAULT_SETTINGS: MPSettings = {
    activeThemeId: 'default',
    wechatAccounts: [],
    defaultAccountId: '',
    structuredThemes: [],
    imageGeneration: DEFAULT_IMAGE_GENERATION_SETTINGS,
};

type SettingsListener = (settings: MPSettings) => void;
interface SettingsStorage {
    loadData(): Promise<unknown>;
    saveData(settings: MPSettings): Promise<void>;
}

export class SettingsManager {
    private settings: MPSettings = structuredClone(DEFAULT_SETTINGS);
    private writes: Promise<void> = Promise.resolve();
    private listeners = new Set<SettingsListener>();

    constructor(private storage: SettingsStorage) {}

    async loadSettings(): Promise<void> {
        const raw: unknown = await this.storage.loadData();
        const data = record(raw) ? raw : {};
        const accounts = Array.isArray(data.wechatAccounts) ? data.wechatAccounts.filter(isAccount) : [];
        const themes = Array.isArray(data.structuredThemes) ? data.structuredThemes.filter(isTheme) : [];
        const image = record(data.imageGeneration) ? data.imageGeneration : {};
        this.settings = {
            activeThemeId: text(data.activeThemeId, 'default'),
            wechatAccounts: structuredClone(accounts),
            defaultAccountId: text(data.defaultAccountId),
            lastSelectedAccountId: text(data.lastSelectedAccountId),
            structuredThemes: structuredClone(themes),
            imageGeneration: {
                apiKey: text(image.apiKey),
                baseUrl: text(image.baseUrl, DEFAULT_IMAGE_GENERATION_SETTINGS.baseUrl),
                model: text(image.model, DEFAULT_IMAGE_GENERATION_SETTINGS.model),
                size: text(image.size, DEFAULT_IMAGE_GENERATION_SETTINGS.size),
                resolution: text(image.resolution, DEFAULT_IMAGE_GENERATION_SETTINGS.resolution),
                timeoutSeconds: positive(image.timeoutSeconds, 180),
                pollIntervalSeconds: positive(image.pollIntervalSeconds, 2),
            },
        };
    }

    getSettings(): MPSettings { return structuredClone(this.settings); }

    subscribe(listener: SettingsListener): () => void {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }

    updateSettings(updates: Partial<MPSettings>): Promise<void> {
        const patch = structuredClone(updates);
        return this.mutate(current => ({ ...current, ...patch }));
    }

    private mutate(update: (current: MPSettings) => MPSettings): Promise<void> {
        const write = this.writes.then(async () => {
            const next = update(this.getSettings());
            await this.storage.saveData(next);
            this.settings = next;
            for (const listener of this.listeners) {
                try { listener(this.getSettings()); }
                catch (error) { console.error('配置变更通知失败', error); }
            }
        });
        this.writes = write.catch(() => undefined);
        return write;
    }

    getAccount(accountId: string): WechatAccount | undefined {
        return this.getSettings().wechatAccounts.find(account => account.id === accountId);
    }

    getDefaultAccount(): WechatAccount | undefined {
        return this.getAccount(this.settings.defaultAccountId) || this.getSettings().wechatAccounts[0];
    }

    addAccount(account: WechatAccount): Promise<void> {
        const value = structuredClone(account);
        return this.mutate(current => {
            if (!isAccount(value) || current.wechatAccounts.some(item => item.id === value.id)) throw new Error('公众号配置无效或已存在。');
            return { ...current, wechatAccounts: [...current.wechatAccounts, value], defaultAccountId: current.defaultAccountId || value.id };
        });
    }

    updateAccount(accountId: string, updates: Partial<WechatAccount>): Promise<void> {
        const patch = structuredClone(updates);
        return this.mutate(current => {
            if (!current.wechatAccounts.some(account => account.id === accountId)) throw new Error('公众号不存在。');
            return { ...current, wechatAccounts: current.wechatAccounts.map(account => account.id === accountId ? { ...account, ...patch, id: accountId } : account) };
        });
    }

    deleteAccount(accountId: string): Promise<void> {
        return this.mutate(current => {
            const accounts = current.wechatAccounts.filter(account => account.id !== accountId);
            return { ...current, wechatAccounts: accounts,
                defaultAccountId: current.defaultAccountId === accountId ? accounts[0]?.id || '' : current.defaultAccountId,
                lastSelectedAccountId: current.lastSelectedAccountId === accountId ? '' : current.lastSelectedAccountId };
        });
    }

    setDefaultAccount(accountId: string): Promise<void> {
        return this.mutate(current => {
            if (!current.wechatAccounts.some(account => account.id === accountId)) throw new Error('公众号不存在。');
            return { ...current, defaultAccountId: accountId };
        });
    }
}

function text(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback; }
function positive(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}
function isAccount(value: unknown): value is WechatAccount {
    return record(value) && ['id', 'name', 'appId', 'appSecret'].every(key => typeof value[key] === 'string');
}
function isTheme(value: unknown): value is StructuredTheme {
    return matchesShape(value, builtinStructuredThemes[0]);
}
function matchesShape(value: unknown, template: unknown): boolean {
    if (Array.isArray(template)) return Array.isArray(value) && value.every(item => typeof item === 'string');
    if (record(template)) return record(value) && Object.entries(template).every(([key, item]) => matchesShape(value[key], item));
    return typeof value === typeof template;
}
