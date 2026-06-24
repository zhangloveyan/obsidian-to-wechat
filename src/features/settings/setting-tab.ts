import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { AccountManagerModal } from './account-manager-modal';
import { ImageGenerationModal } from './image-generation-modal';
import { ThemeEditorModal } from '../theme-editor/theme-editor-modal';
import { testImageGenerationAndSaveImage } from '../image-generation/image-generation-test';
import { IMAGE_PROMPT_FORMAT } from '../image-generation/prompt-extractor';
import type WechatPublisherPlugin from '../../plugin';

export class WechatSettingTab extends PluginSettingTab {
    plugin: WechatPublisherPlugin;

    constructor(app: App, plugin: WechatPublisherPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('otw-settings');

        new Setting(containerEl)
            .setName('插件设置')
            .setHeading();

        new Setting(containerEl)
            .setName('主题编辑器')
            .setDesc('可视化编辑文章排版主题样式，支持内置主题和自定义主题')
            .addButton(btn => btn
                .setButtonText('打开主题编辑器')
                .setCta()
                .onClick(() => {
                    const modal = new ThemeEditorModal(this.app, this.plugin);
                    modal.open();
                }));

        new Setting(containerEl)
            .setName('微信公众号配置')
            .setHeading();
        this.renderAccountList(containerEl);

        new Setting(containerEl)
            .setName('图片生成配置')
            .setHeading();
        this.renderImageGenerationSettings(containerEl);
    }

    private renderAccountList(containerEl: HTMLElement) {
        const accounts = this.plugin.settingsManager.getSettings().wechatAccounts;
        const defaultAccount = this.plugin.settingsManager.getDefaultAccount();
        const desc = accounts.length > 0
            ? `已配置 ${accounts.length} 个公众号 / 默认：${defaultAccount?.name || '未设置'}`
            : '尚未配置公众号';

        new Setting(containerEl)
            .setName('公众号账号')
            .setDesc(desc)
            .addButton(btn => btn
                .setButtonText('管理')
                .setCta()
                .onClick(() => this.openAccountManagerModal()))
            .addButton(btn => btn
                .setButtonText('测试默认账号')
                .onClick(() => {
                    void (async () => {
                        const account = this.plugin.settingsManager.getDefaultAccount();
                        if (!account) {
                            new Notice('请先配置公众号账号');
                            return;
                        }

                        btn.setButtonText('测试中…').setDisabled(true);
                        try {
                            const result = await this.plugin.wechatPublisher.testConnection(account.appId, account.appSecret);
                            new Notice(`${account.name}：${result.message}`, result.ok ? 5000 : 10000);
                        } catch (error: unknown) {
                            const message = error instanceof Error ? error.message : String(error || '未知错误');
                            new Notice(`${account.name}：测试异常 — ${message}`, 10000);
                        } finally {
                            btn.setButtonText('测试默认账号').setDisabled(false);
                        }
                    })();
                }));
    }

    private openAccountManagerModal(): void {
        new AccountManagerModal(this.app, this.plugin, () => this.display()).open();
    }

    private renderImageGenerationSettings(containerEl: HTMLElement): void {
        const settings = this.plugin.settingsManager.getSettings().imageGeneration;
        const configured = !!settings.apiKey.trim() && !!settings.baseUrl.trim() && !!settings.model.trim();
        const modelText = settings.model ? `模型：${settings.model}` : '未配置模型';
        const statusText = configured
            ? `已配置 API / ${modelText} / 格式：${IMAGE_PROMPT_FORMAT}`
            : `未完整配置 / ${modelText} / 格式：${IMAGE_PROMPT_FORMAT}`;

        new Setting(containerEl)
            .setName('图片生成')
            .setDesc(statusText)
            .addButton(btn => btn
                .setButtonText('编辑')
                .setCta()
                .onClick(() => {
                    this.openImageGenerationModal();
                }))
            .addButton(btn => btn
                .setButtonText('测试接口')
                .onClick(() => {
                    void (async () => {
                        btn.setButtonText('测试中…').setDisabled(true);
                        try {
                            const path = await testImageGenerationAndSaveImage(
                                this.app,
                                this.plugin,
                                this.plugin.settingsManager.getSettings().imageGeneration,
                            );
                            new Notice(`图片生成接口测试成功，测试图片已保存：${path}`, 10000);
                        } catch (error) {
                            const message = error instanceof Error ? error.message : String(error || '未知错误');
                            new Notice(`图片生成接口测试失败：${message}`, 12000);
                        } finally {
                            btn.setButtonText('测试接口').setDisabled(false);
                        }
                    })();
                }));
    }

    private openImageGenerationModal(): void {
        const modal = new ImageGenerationModal(this.app, this.plugin, async (settings) => {
            await this.plugin.settingsManager.updateSettings({ imageGeneration: settings });
            this.display();
        });
        modal.open();
    }
}
