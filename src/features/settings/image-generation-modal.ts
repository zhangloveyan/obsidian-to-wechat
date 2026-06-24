import { App, DropdownComponent, Modal, Notice, Setting, TextAreaComponent, TextComponent } from 'obsidian';
import type { ImageGenerationSettings } from './settings';
import { testImageGenerationAndSaveImage } from '../image-generation/image-generation-test';
import { collectImagePromptEntries, IMAGE_PROMPT_FORMAT } from '../image-generation/prompt-extractor';
import type WechatPublisherPlugin from '../../plugin';

const DEFAULT_PROMPT_SAMPLE = [
    '<!-- image-prompt: 一张科技感公众号封面图，蓝色背景，简洁高级 -->',
    '',
    '普通正文，不会被提取。',
].join('\n');

const IMAGE_SIZE_OPTIONS = ['21:9', '16:9', '4:3', '3:2', '1:1', '9:16', '3:4', '2:3', '5:4', '4:5'];
const IMAGE_RESOLUTION_OPTIONS = ['512', '1K', '2K', '4K'];

export class ImageGenerationModal extends Modal {
    private plugin: WechatPublisherPlugin;
    private onSave: (settings: ImageGenerationSettings) => void | Promise<void>;

    private apiKeyInput!: TextComponent;
    private baseUrlInput!: TextComponent;
    private modelInput!: TextComponent;
    private sizeInput!: DropdownComponent;
    private resolutionInput!: DropdownComponent;
    private timeoutInput!: TextComponent;
    private pollIntervalInput!: TextComponent;
    private promptSampleInput!: TextAreaComponent;
    private promptTestResultEl!: HTMLElement;

    constructor(
        app: App,
        plugin: WechatPublisherPlugin,
        onSave: (settings: ImageGenerationSettings) => void | Promise<void>,
    ) {
        super(app);
        this.plugin = plugin;
        this.onSave = onSave;
    }

    onOpen(): void {
        const { contentEl } = this;
        const settings = this.plugin.settingsManager.getSettings().imageGeneration;
        contentEl.empty();

        const heading = new Setting(contentEl)
            .setName('图片生成配置')
            .setHeading();
        heading.settingEl.addClass('otw-modal-heading');

        const baseUrlSetting = new Setting(contentEl)
            .setName('API 地址')
            .setDesc('图片生成服务地址，例如 https://api.apimart.ai')
            .addText(text => {
                this.baseUrlInput = text;
                text.inputEl.addClass('otw-api-text-input');
                text.setPlaceholder('https://api.apimart.ai').setValue(settings.baseUrl);
            });
        baseUrlSetting.settingEl.addClass('otw-api-text-setting');

        const apiKeySetting = new Setting(contentEl)
            .setName('API 密钥')
            .setDesc('用于调用图片生成接口的 Bearer Token')
            .addText(text => {
                this.apiKeyInput = text;
                text.inputEl.type = 'password';
                text.inputEl.addClass('otw-api-text-input', 'otw-api-key-input');
                text.setPlaceholder('sk-...').setValue(settings.apiKey);
            })
            .addExtraButton(button => {
                let visible = false;
                button.extraSettingsEl.addClass('otw-api-key-toggle');
                button
                    .setIcon('eye')
                    .setTooltip('显示密钥')
                    .onClick(() => {
                        visible = !visible;
                        this.apiKeyInput.inputEl.type = visible ? 'text' : 'password';
                        button.setIcon(visible ? 'eye-off' : 'eye');
                        button.setTooltip(visible ? '隐藏密钥' : '显示密钥');
                    });
            });
        apiKeySetting.settingEl.addClass('otw-api-text-setting');
        apiKeySetting.settingEl.addClass('otw-api-key-setting');

        const modelSetting = new Setting(contentEl)
            .setName('模型')
            .setDesc('图片生成模型名称')
            .addText(text => {
                this.modelInput = text;
                text.inputEl.addClass('otw-api-text-input');
                text.setPlaceholder('gemini-3.1-flash-image-preview').setValue(settings.model);
            });
        modelSetting.settingEl.addClass('otw-api-text-setting');

        const generationParams = contentEl.createDiv({ cls: 'otw-two-field-row' });
        generationParams.createSpan({ cls: 'otw-inline-field-label', text: '图片尺寸' });
        this.sizeInput = new DropdownComponent(generationParams);
        this.sizeInput.selectEl.ariaLabel = '图片尺寸';
        setDropdownOptions(this.sizeInput, IMAGE_SIZE_OPTIONS, settings.size);
        generationParams.createSpan({ cls: 'otw-inline-field-label', text: '分辨率' });
        this.resolutionInput = new DropdownComponent(generationParams);
        this.resolutionInput.selectEl.ariaLabel = '分辨率';
        setDropdownOptions(this.resolutionInput, IMAGE_RESOLUTION_OPTIONS, settings.resolution);

        const waitParams = contentEl.createDiv({ cls: 'otw-two-field-row' });
        waitParams.createSpan({ cls: 'otw-inline-field-label', text: '超时时间' });
        this.timeoutInput = new TextComponent(waitParams);
        this.timeoutInput.inputEl.ariaLabel = '超时时间';
        this.timeoutInput.setPlaceholder('180').setValue(String(settings.timeoutSeconds));
        waitParams.createSpan({ cls: 'otw-inline-field-label', text: '轮询间隔' });
        this.pollIntervalInput = new TextComponent(waitParams);
        this.pollIntervalInput.inputEl.ariaLabel = '轮询间隔';
        this.pollIntervalInput.setPlaceholder('2').setValue(String(settings.pollIntervalSeconds));

        const promptFormatSection = contentEl.createDiv({ cls: 'otw-prompt-format-section' });
        promptFormatSection.createEl('div', { cls: 'otw-prompt-format-title', text: '提示词格式' });
        promptFormatSection.createEl('code', { cls: 'otw-prompt-format-code', text: IMAGE_PROMPT_FORMAT });

        const promptTestBlock = promptFormatSection.createDiv({ cls: 'otw-prompt-test-block' });
        promptTestBlock.createEl('div', { cls: 'otw-prompt-test-title', text: '提示词测试文本' });
        promptTestBlock.createEl('div', { cls: 'otw-prompt-test-desc', text: '用于测试固定格式能否被正确提取' });
        this.promptSampleInput = new TextAreaComponent(promptTestBlock);
        this.promptSampleInput.inputEl.rows = 4;
        this.promptSampleInput.inputEl.addClass('otw-prompt-test-textarea');
        this.promptSampleInput.setValue(DEFAULT_PROMPT_SAMPLE);

        const testRow = promptFormatSection.createDiv({ cls: 'otw-prompt-format-test-row' });
        testRow.createEl('button', { text: '测试' }).addEventListener('click', () => this.testPromptFormat());
        this.promptTestResultEl = testRow.createSpan({ cls: 'otw-prompt-format-test-result' });
        this.promptTestResultEl.setText('测试结果会显示在这里。');

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('测试接口')
                .onClick(() => {
                    void (async () => {
                        btn.setButtonText('测试中…').setDisabled(true);
                        try {
                            const path = await this.testApiAndSaveImage();
                            new Notice(`图片生成接口测试成功，测试图片已保存：${path}`, 10000);
                        } catch (error) {
                            const message = error instanceof Error ? error.message : String(error || '未知错误');
                            new Notice(`图片生成接口测试失败：${message}`, 12000);
                        } finally {
                            btn.setButtonText('测试接口').setDisabled(false);
                        }
                    })();
                }))
            .addButton(btn => btn
                .setButtonText('取消')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('保存')
                .setCta()
                .onClick(() => {
                    void (async () => {
                        await this.onSave(this.readSettings());
                        new Notice('图片生成配置已保存');
                        this.close();
                    })();
                }));
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private testPromptFormat(): void {
        const entries = collectImagePromptEntries(this.promptSampleInput.getValue());
        this.promptTestResultEl.empty();

        if (entries.length === 0) {
            this.promptTestResultEl.setText('未提取到提示词。');
            return;
        }

        this.promptTestResultEl.setText(`结果：${entries.map(entry => entry.prompt).join('；')}`);
    }

    private async testApiAndSaveImage(): Promise<string> {
        return testImageGenerationAndSaveImage(this.app, this.plugin, this.readSettings());
    }

    private readSettings(): ImageGenerationSettings {
        return {
            apiKey: this.apiKeyInput.getValue().trim(),
            baseUrl: this.baseUrlInput.getValue().trim(),
            model: this.modelInput.getValue().trim(),
            size: this.sizeInput.getValue().trim(),
            resolution: this.resolutionInput.getValue().trim(),
            timeoutSeconds: parsePositiveInt(this.timeoutInput.getValue(), 180),
            pollIntervalSeconds: parsePositiveInt(this.pollIntervalInput.getValue(), 2),
        };
    }
}

function setDropdownOptions(dropdown: DropdownComponent, options: string[], currentValue: string): void {
    const value = currentValue.trim();
    const values = value && !options.includes(value) ? [value, ...options] : options;
    values.forEach(option => dropdown.addOption(option, option));
    dropdown.setValue(value || options[0]);
}

function parsePositiveInt(value: string, fallback: number): number {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
