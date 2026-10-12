import { App, Modal, Notice, Setting, TextComponent } from 'obsidian';
import type { WechatAccount } from './settings';
import type WechatPublisherPlugin from '../../plugin';
import { errorMessage } from '../../shared/errors';

export class AccountModal extends Modal {
    plugin: WechatPublisherPlugin;
    account: WechatAccount | null;
    onSave: (account: WechatAccount) => void | Promise<void>;

    nameInput!: TextComponent;
    appIdInput!: TextComponent;
    appSecretInput!: TextComponent;

    constructor(app: App, plugin: WechatPublisherPlugin, account: WechatAccount | null, onSave: (account: WechatAccount) => void | Promise<void>) {
        super(app);
        this.plugin = plugin;
        this.account = account;
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        new Setting(contentEl)
            .setName(this.account ? '编辑公众号' : '添加公众号')
            .setHeading();

        new Setting(contentEl)
            .setName('名称')
            .setDesc('用于区分不同公众号的标识')
            .addText(text => {
                this.nameInput = text;
                text.setPlaceholder('如：主号、测试号').setValue(this.account?.name || '');
            });

        new Setting(contentEl)
            .setName('App ID')
            .setDesc('微信公众号的开发者标识')
            .addText(text => {
                this.appIdInput = text;
                text.setPlaceholder('输入开发者标识').setValue(this.account?.appId || '');
            });

        new Setting(contentEl)
            .setName('App secret')
            .setDesc('微信公众号的开发者密钥')
            .addText(text => {
                this.appSecretInput = text;
                text.inputEl.type = 'password';
                text.setPlaceholder('输入开发者密钥').setValue(this.account?.appSecret || '');
            });

        new Setting(contentEl)
            .setName('连接测试')
            .setDesc('使用当前填写的账号凭据测试连接，验证密钥和 IP 白名单')
            .addButton(btn => {
                btn.setButtonText('测试连接').onClick(() => {
                    void (async () => {
                    const appId = this.appIdInput.getValue().trim();
                    const appSecret = this.appSecretInput.getValue().trim();
                    if (!appId || !appSecret) {
                        new Notice('请先填写开发者标识和密钥');
                        return;
                    }
                    btn.setButtonText('测试中…').setDisabled(true);
                    try {
                        const result = await this.plugin.wechatPublisher.testConnection(appId, appSecret);
                        new Notice(result.message, result.ok ? 5000 : 10000);
                    } catch (error: unknown) {
                        new Notice('连接测试异常：' + errorMessage(error), 10000);
                    } finally {
                        btn.setButtonText('测试连接').setDisabled(false);
                    }
                    })();
                });
            });

        new Setting(contentEl)
            .addButton(btn => btn.setButtonText('取消').onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText(this.account ? '保存' : '添加')
                .setCta()
                .onClick(() => {
                    void (async () => {
                    const name = this.nameInput.getValue().trim();
                    const appId = this.appIdInput.getValue().trim();
                    const appSecret = this.appSecretInput.getValue().trim();
                    if (!name) { new Notice('请输入名称'); return; }
                    if (!appId) { new Notice('请输入开发者标识'); return; }
                    if (!appSecret) { new Notice('请输入开发者密钥'); return; }

                    btn.setDisabled(true);
                    try {
                        await this.onSave({ id: this.account?.id || 'account_' + crypto.randomUUID(), name, appId, appSecret });
                        this.close();
                    } catch (error) {
                        new Notice('保存公众号配置失败：' + errorMessage(error), 10000);
                    } finally { btn.setDisabled(false); }
                    })();
                }));
    }

    onClose() {
        this.contentEl.empty();
    }
}
