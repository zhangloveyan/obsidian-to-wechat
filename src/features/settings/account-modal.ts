import { App, Modal, Notice, Setting, TextComponent } from 'obsidian';
import type { WechatAccount } from './settings';
import type WechatPublisherPlugin from '../../plugin';

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
        contentEl.createEl('h2', { text: this.account ? '编辑公众号' : '添加公众号' });

        new Setting(contentEl)
            .setName('名称')
            .setDesc('用于区分不同公众号的标识')
            .addText(text => {
                this.nameInput = text;
                text.setPlaceholder('如：主号、测试号').setValue(this.account?.name || '');
            });

        new Setting(contentEl)
            .setName('AppID')
            .setDesc('微信公众号的 AppID')
            .addText(text => {
                this.appIdInput = text;
                text.setPlaceholder('输入 AppID').setValue(this.account?.appId || '');
            });

        new Setting(contentEl)
            .setName('AppSecret')
            .setDesc('微信公众号的 AppSecret')
            .addText(text => {
                this.appSecretInput = text;
                text.setPlaceholder('输入 AppSecret').setValue(this.account?.appSecret || '');
            });

        new Setting(contentEl)
            .setName('连接测试')
            .setDesc('使用当前填写的 AppID 和 AppSecret 测试微信 Token 获取，验证 IP 白名单是否配置正确')
            .addButton(btn => {
                btn.setButtonText('测试连接').onClick(async () => {
                    const appId = this.appIdInput.getValue().trim();
                    const appSecret = this.appSecretInput.getValue().trim();
                    if (!appId || !appSecret) {
                        new Notice('请先填写 AppID 和 AppSecret');
                        return;
                    }
                    btn.setButtonText('测试中…').setDisabled(true);
                    try {
                        const result = await this.plugin.wechatPublisher.testConnection(appId, appSecret);
                        if (result.ok) {
                            new Notice(result.message);
                        } else {
                            new Notice(result.message);
                        }
                    } catch (error: unknown) {
                        new Notice('连接测试异常：' + (error instanceof Error ? error.message : '未知错误'));
                    } finally {
                        btn.setButtonText('测试连接').setDisabled(false);
                    }
                });
            });

        new Setting(contentEl)
            .addButton(btn => btn.setButtonText('取消').onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText(this.account ? '保存' : '添加')
                .setCta()
                .onClick(async () => {
                    const name = this.nameInput.getValue().trim();
                    const appId = this.appIdInput.getValue().trim();
                    const appSecret = this.appSecretInput.getValue().trim();
                    if (!name) { new Notice('请输入名称'); return; }
                    if (!appId) { new Notice('请输入 AppID'); return; }
                    if (!appSecret) { new Notice('请输入 AppSecret'); return; }

                    if (this.account) {
                        await this.onSave({ ...this.account, name, appId, appSecret });
                    } else {
                        await this.onSave({ id: `account_${Date.now()}`, name, appId, appSecret });
                    }
                    this.close();
                }));
    }

    onClose() {
        this.contentEl.empty();
    }
}
