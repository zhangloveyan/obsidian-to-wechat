import type { StructuredTheme } from '../../core/theme/theme-types';
import type { DocumentMetadata } from '../../types/metadata';
import type WechatPublisherPlugin from '../../plugin';

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
    documentMetadata: Record<string, DocumentMetadata>;
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
    documentMetadata: {},
    imageGeneration: DEFAULT_IMAGE_GENERATION_SETTINGS,
};

export class SettingsManager {
    plugin: WechatPublisherPlugin;
    private settings: MPSettings;

    constructor(plugin: WechatPublisherPlugin) {
        this.plugin = plugin;
        this.settings = { ...DEFAULT_SETTINGS };
    }

    async loadSettings(): Promise<void> {
        const savedData = (await this.plugin.loadData()) || {};

        if (!savedData.wechatAccounts) {
            savedData.wechatAccounts = [];
        }

        if (!savedData.structuredThemes) {
            savedData.structuredThemes = [];
        }

        savedData.imageGeneration = {
            ...DEFAULT_IMAGE_GENERATION_SETTINGS,
            ...(savedData.imageGeneration || {}),
        };

        this.settings = { ...DEFAULT_SETTINGS, ...savedData };
    }

    async saveSettings(): Promise<void> {
        await this.plugin.saveData(this.settings);
    }

    getSettings(): MPSettings {
        return this.settings;
    }

    async updateSettings(updates: Partial<MPSettings>): Promise<void> {
        this.settings = { ...this.settings, ...updates };
        await this.saveSettings();
    }

    // Account management
    getAccount(accountId: string): WechatAccount | undefined {
        return this.settings.wechatAccounts.find(a => a.id === accountId);
    }

    getDefaultAccount(): WechatAccount | undefined {
        if (!this.settings.defaultAccountId) {
            return this.settings.wechatAccounts[0];
        }
        return this.getAccount(this.settings.defaultAccountId) || this.settings.wechatAccounts[0];
    }

    async addAccount(account: WechatAccount): Promise<void> {
        this.settings = {
            ...this.settings,
            wechatAccounts: [...this.settings.wechatAccounts, account],
        };
        if (!this.settings.defaultAccountId) {
            this.settings.defaultAccountId = account.id;
        }
        await this.saveSettings();
    }

    async updateAccount(accountId: string, updates: Partial<WechatAccount>): Promise<void> {
        this.settings = {
            ...this.settings,
            wechatAccounts: this.settings.wechatAccounts.map(a =>
                a.id === accountId ? { ...a, ...updates } : a
            ),
        };
        await this.saveSettings();
    }

    async deleteAccount(accountId: string): Promise<void> {
        const accounts = this.settings.wechatAccounts.filter(a => a.id !== accountId);
        const updates: Partial<MPSettings> = { wechatAccounts: accounts };
        if (this.settings.defaultAccountId === accountId) {
            updates.defaultAccountId = accounts[0]?.id || '';
        }
        this.settings = { ...this.settings, ...updates };
        await this.saveSettings();
    }

    async setDefaultAccount(accountId: string): Promise<void> {
        this.settings = { ...this.settings, defaultAccountId: accountId };
        await this.saveSettings();
    }
}
