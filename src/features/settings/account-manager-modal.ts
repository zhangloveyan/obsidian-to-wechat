import { App, Modal, Notice, Setting } from 'obsidian';
import type { WechatAccount } from './settings';
import { AccountModal } from './account-modal';
import type WechatPublisherPlugin from '../../plugin';

export class AccountManagerModal extends Modal {
    private plugin: WechatPublisherPlugin;
    private onChanged: () => void;

    constructor(app: App, plugin: WechatPublisherPlugin, onChanged: () => void) {
        super(app);
        this.plugin = plugin;
        this.onChanged = onChanged;
    }

    onOpen(): void {
        this.render();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private render(): void {
        const { contentEl } = this;
        const settings = this.plugin.settingsManager.getSettings();
        const accounts = settings.wechatAccounts;
        contentEl.empty();

        new Setting(contentEl)
            .setName('微信公众号配置')
            .setHeading();

        new Setting(contentEl)
            .setName('已配置公众号')
            .setDesc(accounts.length > 0 ? `共 ${accounts.length} 个公众号` : '尚未配置公众号，点击右侧按钮添加')
            .addButton(btn => btn
                .setButtonText('+ 添加公众号')
                .setCta()
                .onClick(() => this.openAccountModal(null)));

        if (accounts.length === 0) {
            contentEl.createDiv({
                cls: 'otw-account-manager-empty',
                text: '尚未配置公众号。',
            });
            return;
        }

        const listEl = contentEl.createDiv({ cls: 'otw-account-manager-list' });
        for (const account of accounts) {
            this.renderAccountItem(listEl, account);
        }
    }

    private renderAccountItem(containerEl: HTMLElement, account: WechatAccount): void {
        const settings = this.plugin.settingsManager.getSettings();
        const isDefault = account.id === settings.defaultAccountId || (!settings.defaultAccountId && settings.wechatAccounts[0]?.id === account.id);
        const maskedAppId = account.appId ? `${account.appId.slice(0, 4)}****${account.appId.slice(-4)}` : '未填写 App ID';

        const itemEl = containerEl.createDiv({ cls: 'otw-account-manager-item' });
        const infoEl = itemEl.createDiv({ cls: 'otw-account-manager-info' });
        infoEl.createDiv({
            cls: 'otw-account-manager-name',
            text: account.name + (isDefault ? '（默认）' : ''),
        });
        infoEl.createDiv({
            cls: 'otw-account-manager-appid',
            text: `App ID：${maskedAppId}`,
        });

        const actionsEl = itemEl.createDiv({ cls: 'otw-account-manager-actions' });

        if (!isDefault) {
            actionsEl.createEl('button', { text: '设为默认' }).addEventListener('click', () => {
                void (async () => {
                    await this.plugin.settingsManager.setDefaultAccount(account.id);
                    new Notice(`已设为默认公众号：${account.name}`);
                    this.onChanged();
                    this.render();
                })();
            });
        }

        actionsEl.createEl('button', { text: '编辑' }).addEventListener('click', () => this.openAccountModal(account));
        actionsEl.createEl('button', { text: '测试' }).addEventListener('click', event => {
            const button = event.currentTarget as HTMLButtonElement;
            void this.testAccount(account, button);
        });
        actionsEl.createEl('button', { text: '删除' }).addEventListener('click', () => {
            void this.deleteAccount(account);
        });
    }

    private openAccountModal(account: WechatAccount | null): void {
        const modal = new AccountModal(this.app, this.plugin, account, async (updatedAccount) => {
            if (account) {
                await this.plugin.settingsManager.updateAccount(account.id, updatedAccount);
                new Notice(`已更新公众号「${updatedAccount.name}」`);
            } else {
                await this.plugin.settingsManager.addAccount(updatedAccount);
                new Notice(`已添加公众号「${updatedAccount.name}」`);
            }
            this.onChanged();
            this.render();
        });
        modal.open();
    }

    private async testAccount(account: WechatAccount, button: HTMLButtonElement): Promise<void> {
        button.textContent = '测试中…';
        button.disabled = true;
        try {
            const result = await this.plugin.wechatPublisher.testConnection(account.appId, account.appSecret);
            new Notice(`${account.name}：${result.message}`, result.ok ? 5000 : 10000);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error || '未知错误');
            new Notice(`${account.name}：测试异常 — ${message}`, 10000);
        } finally {
            button.textContent = '测试';
            button.disabled = false;
        }
    }

    private async deleteAccount(account: WechatAccount): Promise<void> {
        const accounts = this.plugin.settingsManager.getSettings().wechatAccounts;
        if (accounts.length === 1) {
            new Notice('至少保留一个公众号配置');
            return;
        }

        await this.plugin.settingsManager.deleteAccount(account.id);
        new Notice(`已删除公众号「${account.name}」`);
        this.onChanged();
        this.render();
    }
}
