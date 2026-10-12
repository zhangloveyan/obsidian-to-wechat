import { App, Modal, Notice, Setting, TFile, TextComponent } from 'obsidian';
import { ImageGenerationService, isBusy, type ImagePromptTask } from './image-generation-service';

export class ArticleImageGenerationModal extends Modal {
    private alive = false;
    private unsubscribe?: () => void;
    private tasks: ImagePromptTask[] = [];
    private allButton!: HTMLButtonElement;

    constructor(app: App, private file: TFile, private service: ImageGenerationService) {
        super(app);
    }

    onOpen(): void {
        this.alive = true;
        this.modalEl.addClass('otw-image-generation-modal');
        this.contentEl.empty();
        const heading = new Setting(this.contentEl).setName('图片生成').setHeading();
        heading.settingEl.addClass('otw-modal-heading');
        const header = this.contentEl.createDiv({ cls: 'otw-image-generation-header-row' });
        const summary = header.createDiv({ cls: 'otw-image-generation-summary', text: '当前文章：' + this.file.name });
        this.allButton = header.createEl('button', { text: '全部开始生成', cls: 'otw-image-generation-all-button' });
        this.allButton.disabled = true;
        this.allButton.addEventListener('click', () => {
            void this.run(() => this.service.generateAll(this.file, this.tasks));
        });
        const list = this.contentEl.createDiv({ cls: 'otw-image-generation-task-list' });
        void this.service.getTasks(this.file).then(tasks => {
            if (!this.alive) return;
            this.tasks = tasks;
            summary.setText('当前文章：' + this.file.name + '，共 ' + tasks.length + ' 条提示词');
            if (!tasks.length) list.createDiv({ cls: 'otw-image-generation-empty', text: '未找到图片提示词。' });
            const updateRows = tasks.map((task, index) => this.renderTask(list, task, index));
            const update = () => {
                updateRows.forEach(render => render());
                this.allButton.disabled = !tasks.length || tasks.some(isBusy);
            };
            this.unsubscribe = this.service.subscribe(this.file, update);
            update();
        }).catch(error => {
            if (this.alive) list.setText(error instanceof Error ? error.message : String(error));
        });
    }

    onClose(): void {
        this.alive = false;
        this.unsubscribe?.();
        this.contentEl.empty();
    }

    private renderTask(list: HTMLElement, task: ImagePromptTask, index: number): () => void {
        const row = list.createDiv({ cls: 'otw-image-generation-task' });
        const line = row.createDiv({ cls: 'otw-image-generation-task-line' });
        line.createSpan({ cls: 'otw-image-generation-task-index', text: String(index + 1) + '.' });
        const input = new TextComponent(line).setValue(task.prompt);
        input.inputEl.addClass('otw-image-generation-prompt-input');
        input.inputEl.ariaLabel = '提示词 ' + (index + 1);
        input.onChange(value => { task.prompt = value; });
        input.inputEl.addEventListener('change', () => {
            void this.run(() => this.service.syncPrompt(this.file, task, input.getValue()));
        });
        const button = line.createEl('button', { cls: 'otw-image-generation-task-button' });
        button.addEventListener('click', () => {
            void this.run(() => this.service.generate(this.file, task, input.getValue()));
        });
        const statusLine = row.createDiv({ cls: 'otw-image-generation-status-line' });
        const status = statusLine.createSpan({ cls: 'otw-image-generation-task-status' });
        const detail = statusLine.createSpan({ cls: 'otw-image-generation-task-detail' });
        return () => {
            input.setDisabled(isBusy(task));
            button.disabled = isBusy(task);
            button.setText(isBusy(task) ? '生成中...' : task.status === 'failed' ? '重试' : task.imagePath ? '重新生成' : '生成');
            const labels = { idle: '未生成', queued: '排队中', generating: '生成中', generated: '已生成', failed: '失败' };
            status.setText('状态：' + labels[task.status]);
            detail.setText(task.detail ? ' · ' + task.detail : '');
        };
    }

    private async run(operation: () => Promise<void>): Promise<void> {
        try { await operation(); }
        catch (error) { new Notice(error instanceof Error ? error.message : String(error), 12000); }
    }
}
