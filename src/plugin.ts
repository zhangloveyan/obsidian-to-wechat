import { addIcon, Plugin, removeIcon, normalizePath, Notice } from 'obsidian';
import { PreviewView, VIEW_TYPE_PREVIEW } from './features/preview/preview-view';
import { ThemeManager } from './core/theme/theme-service';
import { SettingsManager } from './features/settings/settings';
import { WechatSettingTab } from './features/settings/setting-tab';
import { WechatPublisher } from './integrations/wechat/wechat-publisher';
import { createLogger, Logger } from './shared/logger';
import { PLUGIN_ICON_ID, PLUGIN_ICON_SVG } from './shared/plugin-icon';
import { ImageGenerationService } from './features/image-generation/image-generation-service';
import { ImageUploadCache } from './integrations/obsidian/image-cache';
import { PublishService } from './features/publish/publish-service';
import { errorMessage } from './shared/errors';

export default class WechatPublisherPlugin extends Plugin {
    settingsManager: SettingsManager;
    themeManager: ThemeManager;
    wechatPublisher: WechatPublisher;
    logger: Logger;
    imageGeneration: ImageGenerationService;
    imageCache: ImageUploadCache;
    publishing: PublishService;

    async onload() {
        this.logger = createLogger(false);
        this.logger.info('Loading Markdown WeChat Publisher plugin');

        this.settingsManager = new SettingsManager(this);
        await this.settingsManager.loadSettings();
        this.imageGeneration = new ImageGenerationService(this.app, this.settingsManager);
        this.register(() => this.imageGeneration.dispose());

        this.themeManager = new ThemeManager(this.settingsManager);

        const directory = this.manifest.dir || normalizePath(this.app.vault.configDir + '/plugins/' + this.manifest.id);
        this.imageCache = new ImageUploadCache(this.app.vault.adapter, directory + '/image-cache.json');
        await this.imageCache.load().catch(error => this.logger.warn('图片缓存读取失败，将重新上传图片', error));
        this.wechatPublisher = new WechatPublisher(this.settingsManager, this.imageCache, this.logger);
        this.publishing = new PublishService(this.app, this.wechatPublisher);
        this.register(() => this.publishing.dispose());
        this.logger.debug('Wechat publisher initialized');

        addIcon(PLUGIN_ICON_ID, PLUGIN_ICON_SVG);
        this.register(() => removeIcon(PLUGIN_ICON_ID));

        this.registerView(
            VIEW_TYPE_PREVIEW,
            (leaf) => new PreviewView(leaf, this),
        );

        this.addRibbonIcon(PLUGIN_ICON_ID, '打开预览', () => {
            void this.activateView().catch(error => { new Notice('打开预览失败：' + errorMessage(error)); });
        });

        this.addCommand({
            id: 'open-obsidian-to-wechat',
            name: '打开预览',
            callback: () => {
                void this.activateView().catch(error => { new Notice('打开预览失败：' + errorMessage(error)); });
            },
        });

        this.addSettingTab(new WechatSettingTab(this.app, this));

        this.logger.info('Markdown WeChat Publisher plugin loaded');
    }

    async activateView() {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_PREVIEW);
        if (leaves.length > 0) {
            await this.app.workspace.revealLeaf(leaves[0]);
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

    onunload() {
        this.logger.info('Unloading Markdown WeChat Publisher plugin');
    }
}
