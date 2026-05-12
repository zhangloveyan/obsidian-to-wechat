import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type { WechatAccount } from './settings';
import { AccountModal } from './account-modal';
import { ThemeEditorModal } from '../theme-editor/theme-editor-modal';
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

        containerEl.createEl('h2', { text: 'Markdown WeChat Publisher 设置' });

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

        containerEl.createEl('h3', { text: '微信公众号配置' });
        this.renderAccountList(containerEl);
    }

    private renderAccountList(containerEl: HTMLElement) {
        const accounts = this.plugin.settingsManager.getSettings().wechatAccounts;

        new Setting(containerEl)
            .setName('已配置的公众号')
            .setDesc(accounts.length > 0 ? `共 ${accounts.length} 个公众号` : '尚未配置公众号，点击下方按钮添加')
            .addButton(btn => btn
                .setButtonText('+ 添加公众号')
                .setCta()
                .onClick(() => this.openAccountModal(null)));

        for (const account of accounts) {
            const isDefault = account.id === this.plugin.settingsManager.getSettings().defaultAccountId;
            const maskedAppId = account.appId ? account.appId.slice(0, 4) + '****' + account.appId.slice(-4) : '';

            const settingEl = new Setting(containerEl)
                .setName(account.name + (isDefault ? ' (默认)' : ''))
                .setDesc(maskedAppId);

            if (!isDefault) {
                settingEl.addButton(btn => btn
                    .setButtonText('设为默认')
                    .onClick(async () => {
                        await this.plugin.settingsManager.setDefaultAccount(account.id);
                        this.display();
                    }));
            }

            settingEl
                .addButton(btn => btn
                    .setButtonText('编辑')
                    .onClick(() => this.openAccountModal(account)))
                .addButton(btn => btn
                    .setButtonText('测试')
                    .onClick(async () => {
                        btn.setButtonText('测试中…').setDisabled(true);
                        try {
                            const result = await this.plugin.wechatPublisher.testConnection(account.appId, account.appSecret);
                            if (result.ok) {
                                new Notice(`${account.name}：${result.message}`);
                            } else {
                                new Notice(`${account.name}：${result.message}`);
                            }
                        } catch (error: unknown) {
                            new Notice(`${account.name}：测试异常 — ${(error as Error).message || '未知错误'}`);
                        } finally {
                            btn.setButtonText('测试').setDisabled(false);
                        }
                    }))
                .addButton(btn => btn
                    .setButtonText('删除')
                    .onClick(async () => {
                        if (accounts.length === 1) {
                            new Notice('至少保留一个公众号配置');
                            return;
                        }
                        const name = account.name;
                        await this.plugin.settingsManager.deleteAccount(account.id);
                        new Notice(`已删除公众号「${name}」`);
                        this.display();
                    }));
        }
    }

    private openAccountModal(account: WechatAccount | null) {
        const modal = new AccountModal(this.app, this.plugin, account, async (updatedAccount) => {
            if (account) {
                await this.plugin.settingsManager.updateAccount(account.id, updatedAccount);
                new Notice(`已更新公众号「${updatedAccount.name}」`);
            } else {
                await this.plugin.settingsManager.addAccount(updatedAccount);
                new Notice(`已添加公众号「${updatedAccount.name}」`);
            }
            this.display();
        });
        modal.open();
    }
}
