import { Plugin, TFile } from 'obsidian';
import { PreviewView, VIEW_TYPE_PREVIEW } from './features/preview/preview-view';
import { ThemeManager } from './core/theme/theme-service';
import { SettingsManager } from './features/settings/settings';
import { ContentTransformer } from './core/render/markdown-html-renderer';
import { WechatSettingTab } from './features/settings/setting-tab';
import { WechatPublisher } from './integrations/wechat/wechat-publisher';
import { createLogger, Logger } from './shared/logger';
import { WechatAccount } from './features/settings/settings';

export default class WechatPublisherPlugin extends Plugin {
    settingsManager: SettingsManager;
    themeManager: ThemeManager;
    wechatPublisher: WechatPublisher;
    logger: Logger;

    get settings() {
        return this.settingsManager.getSettings();
    }

    async onload() {
        this.logger = createLogger(false);
        this.logger.info('Loading Markdown WeChat Publisher plugin');

        this.settingsManager = new SettingsManager(this);
        await this.settingsManager.loadSettings();

        this.themeManager = new ThemeManager(this);
        await this.themeManager.initialize();

        ContentTransformer.initialize(this.app);

        this.wechatPublisher = new WechatPublisher(this);
        this.logger.debug('Wechat publisher initialized');

        this.registerView(
            VIEW_TYPE_PREVIEW,
            (leaf) => new PreviewView(leaf, this.themeManager, this.settingsManager, this),
        );

        this.addRibbonIcon('pen-tool', '打开 Markdown WeChat Publisher', () => {
            this.activateView();
        });

        this.addCommand({
            id: 'open-obsidian-to-wechat',
            name: '打开 Markdown WeChat Publisher',
            callback: async () => {
                await this.activateView();
            },
        });

        this.addSettingTab(new WechatSettingTab(this.app, this));

        this.logger.info('Markdown WeChat Publisher plugin loaded');
    }

    async activateView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PREVIEW);
        if (leaves.length > 0) {
            this.app.workspace.revealLeaf(leaves[0]);
            return;
        }

        const rightLeaf = this.app.workspace.getRightLeaf(false);
        if (rightLeaf) {
            await rightLeaf.setViewState({
                type: VIEW_TYPE_PREVIEW,
                active: true,
            });
        }
    }

    getDefaultAccount(): WechatAccount | undefined {
        return this.settingsManager.getDefaultAccount();
    }

    async publishToWechat(title: string, content: string, thumbMediaId: string, file: TFile, accountId?: string): Promise<boolean> {
        if (accountId) {
            this.wechatPublisher.switchAccount(accountId);
        }
        return this.wechatPublisher.publishToWechat(title, content, thumbMediaId, file);
    }

    onunload() {
        this.logger.info('Unloading Markdown WeChat Publisher plugin');
    }
}
