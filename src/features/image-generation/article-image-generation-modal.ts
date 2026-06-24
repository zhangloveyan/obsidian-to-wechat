import { App, Modal, Notice, Setting, TFile, TextComponent } from 'obsidian';
import type { SettingsManager } from '../settings/settings';
import { ImageGenerationService } from './image-generation-service';
import type { ImagePromptEntry } from './prompt-extractor';

type TaskStatus = 'idle' | 'generating' | 'generated' | 'failed';

interface ImagePromptTask {
    entry: ImagePromptEntry;
    promptInput: TextComponent;
    statusEl: HTMLElement;
    detailEl: HTMLElement;
    actionButton: HTMLButtonElement;
    status: TaskStatus;
}

export class ArticleImageGenerationModal extends Modal {
    private file: TFile;
    private service: ImageGenerationService;
    private tasks: ImagePromptTask[] = [];
    private taskListEl!: HTMLElement;
    private summaryEl!: HTMLElement;

    constructor(app: App, file: TFile, settingsManager: SettingsManager) {
        super(app);
        this.file = file;
        this.service = new ImageGenerationService(app, settingsManager);
    }

    async onOpen(): Promise<void> {
        const { contentEl } = this;
        this.modalEl.addClass('otw-image-generation-modal');
        contentEl.empty();
        this.tasks = [];

        const heading = new Setting(contentEl)
            .setName('图片生成')
            .setHeading();
        heading.settingEl.addClass('otw-modal-heading');

        const headerRow = contentEl.createDiv({ cls: 'otw-image-generation-header-row' });
        this.summaryEl = headerRow.createDiv({ cls: 'otw-image-generation-summary' });
        this.summaryEl.setText(`当前文章：${this.file.name}`);
        headerRow.createEl('button', { text: '全部开始生成', cls: 'otw-image-generation-all-button' })
            .addEventListener('click', () => {
                void this.generateAll();
            });

        this.taskListEl = contentEl.createDiv({ cls: 'otw-image-generation-task-list' });
        await this.loadTasks();
    }

    onClose(): void {
        this.contentEl.empty();
    }

    private async loadTasks(): Promise<void> {
        this.taskListEl.empty();
        this.tasks = [];

        const entries = await this.service.getPromptEntries(this.file);
        this.summaryEl.setText(`当前文章：${this.file.name}，共 ${entries.length} 条提示词`);

        if (entries.length === 0) {
            this.taskListEl.createDiv({
                cls: 'otw-image-generation-empty',
                text: '未找到图片提示词，请使用格式：<!-- image-prompt: 你的图片描述 -->',
            });
            return;
        }

        entries.forEach((entry, index) => this.renderTask(entry, index));
    }

    private renderTask(entry: ImagePromptEntry, index: number): void {
        const card = this.taskListEl.createDiv({ cls: 'otw-image-generation-task' });
        const taskLine = card.createDiv({ cls: 'otw-image-generation-task-line' });
        taskLine.createSpan({ cls: 'otw-image-generation-task-index', text: `${index + 1}.` });

        const task: Partial<ImagePromptTask> = {
            entry,
            status: entry.imagePath ? 'generated' : 'idle',
        };

        const promptInput = new TextComponent(taskLine);
        task.promptInput = promptInput;
        promptInput.inputEl.addClass('otw-image-generation-prompt-input');
        promptInput.setValue(entry.prompt);

        task.actionButton = taskLine.createEl('button', {
            text: entry.imagePath ? '重新生成' : '生成',
            cls: 'otw-image-generation-task-button',
        });
        task.actionButton.addEventListener('click', () => {
            void this.generateOne(task as ImagePromptTask);
        });

        const statusLine = card.createDiv({ cls: 'otw-image-generation-status-line' });
        task.statusEl = statusLine.createSpan({
            cls: 'otw-image-generation-task-status',
            text: entry.imagePath ? '状态：已生成' : '状态：未生成',
        });
        task.detailEl = statusLine.createSpan({
            cls: 'otw-image-generation-task-detail',
            text: entry.imagePath ? ` · ${entry.imagePath}` : '',
        });

        this.tasks.push(task as ImagePromptTask);
    }

    private async generateAll(): Promise<void> {
        for (const task of this.tasks) {
            if (task.status === 'generating') return;
            await this.generateOne(task);
            if (task.status === 'failed') return;
        }
    }

    private async generateOne(task: ImagePromptTask): Promise<void> {
        const prompt = task.promptInput.getValue().trim();
        if (!prompt) {
            new Notice('提示词不能为空');
            return;
        }

        this.setTaskStatus(task, 'generating', '正在生成...');
        task.actionButton.disabled = true;
        task.actionButton.setText('生成中...');

        try {
            const generated = await this.service.generatePromptImage(
                this.file,
                task.entry.lineIndex,
                prompt,
                message => {
            task.detailEl.setText(` · ${message}`);
                },
            );

            task.entry.prompt = generated.prompt;
            task.entry.imagePath = generated.relativePath;
            task.status = 'generated';
            this.setTaskStatus(task, 'generated', `图片：${generated.relativePath}`);
            task.actionButton.setText('重新生成');
            new Notice(`图片生成成功：${generated.relativePath}`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error || '未知错误');
            task.status = 'failed';
            this.setTaskStatus(task, 'failed', `错误：${message}`);
            task.actionButton.setText('重试');
            new Notice(`图片生成失败：${message}`, 12000);
        } finally {
            task.actionButton.disabled = false;
        }
    }

    private setTaskStatus(task: ImagePromptTask, status: TaskStatus, detail: string): void {
        task.status = status;
        const labelMap: Record<TaskStatus, string> = {
            idle: '未生成',
            generating: '生成中',
            generated: '已生成',
            failed: '失败',
        };
        task.statusEl.setText(`状态：${labelMap[status]}`);
        task.detailEl.setText(detail ? ` · ${detail}` : '');
    }
}
