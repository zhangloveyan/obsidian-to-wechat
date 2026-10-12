import { App, Modal, setIcon, setTooltip } from 'obsidian';
import Cropper from 'cropperjs';
import { COVER_ASPECT_RATIO, cropOutputSize, encodeCroppedCover, prepareCoverImage } from './cover-crop-image';
import type { CoverCropData, CoverImageSource, CroppedCover } from './cover-crop-image';

export class CoverCropModal extends Modal {
    private alive = false;
    private cropper?: Cropper;
    private objectUrl?: string;
    private resizeObserver?: ResizeObserver;
    private resizeFrame?: number;

    constructor(
        app: App,
        private cropSource: CoverImageSource,
        private applyCover: (cover: CroppedCover) => Promise<void>,
        private dismissed: () => void,
    ) {
        super(app);
    }

    get isActive(): boolean { return this.alive; }

    onOpen(): void {
        this.alive = true;
        this.setTitle('裁剪封面');
        this.modalEl.addClass('otw-cover-crop-modal');
        const root = this.contentEl;
        root.empty();
        const header = root.createDiv({ cls: 'otw-cover-crop-header' });
        const back = header.createEl('button', { cls: 'otw-cover-crop-icon', attr: { type: 'button', 'aria-label': '返回' } });
        setIcon(back, 'arrow-left');
        setTooltip(back, '返回');
        header.createEl('span', { cls: 'otw-cover-crop-title', text: '裁剪封面 · 2.35:1' });
        const apply = header.createEl('button', { text: '应用', cls: 'otw-modal-btn-cta', attr: { type: 'button' } });
        apply.disabled = true;
        const stage = root.createDiv({ cls: 'otw-cover-crop-stage', attr: { tabindex: '0', role: 'group', 'aria-label': '封面裁剪区域' } });
        const controls = root.createDiv({ cls: 'otw-cover-crop-controls' });
        const smaller = controls.createEl('button', { cls: 'otw-cover-crop-icon', attr: { type: 'button', 'aria-label': '缩小图片' } });
        setIcon(smaller, 'zoom-out');
        setTooltip(smaller, '缩小图片');
        const slider = controls.createEl('input', { attr: { type: 'range', min: '1', max: '4', step: '0.01', value: '1', 'aria-label': '图片缩放' } });
        const larger = controls.createEl('button', { cls: 'otw-cover-crop-icon', attr: { type: 'button', 'aria-label': '放大图片' } });
        setIcon(larger, 'zoom-in');
        setTooltip(larger, '放大图片');
        const status = root.createDiv({ cls: 'otw-cover-crop-status', text: '正在读取图片...', attr: { role: 'status' } });
        for (const control of [smaller, slider, larger]) control.disabled = true;
        back.addEventListener('click', () => this.close());

        void (async () => {
            try {
                const prepared = await prepareCoverImage(this.cropSource);
                if (!this.alive) { URL.revokeObjectURL(prepared.url); return; }
                this.objectUrl = prepared.url;
                const image = stage.createEl('img', { attr: { alt: '待裁剪封面', src: prepared.url } });
                let ready = false;
                let busy = false;
                let pendingCover: CroppedCover | undefined;
                let pendingCropKey = '';
                const minimumRatio = (): number => {
                    const box = this.cropper!.getCropBoxData();
                    return Math.max(box.width / prepared.width, box.height / prepared.height);
                };
                const syncZoom = (): void => {
                    if (!ready || !this.cropper) return;
                    const value = Math.max(1, this.cropper.getImageData().width / prepared.width / minimumRatio());
                    slider.value = String(value);
                    slider.setAttribute('aria-valuetext', `${Math.round(value * 100)}%`);
                    smaller.disabled = busy || value <= 1.001;
                    larger.disabled = busy || value >= 3.999;
                };
                const zoomTo = (value: number): void => {
                    if (!ready || busy || !this.cropper) return;
                    this.cropper.zoomTo(minimumRatio() * Math.max(1, Math.min(4, value)));
                    syncZoom();
                };
                const mountCropper = (previous?: CoverCropData): void => {
                    ready = false;
                    this.cropper?.destroy();
                    this.cropper = new Cropper(image, {
                        aspectRatio: COVER_ASPECT_RATIO, viewMode: 1, dragMode: 'move', autoCropArea: 1,
                        responsive: false, cropBoxMovable: false, cropBoxResizable: false,
                        toggleDragModeOnDblclick: false, background: false, guides: false,
                        center: false, highlight: false, rotatable: false, scalable: false,
                        zoomOnWheel: false, zoomOnTouch: false, checkOrientation: false, checkCrossOrigin: false,
                        ready: () => {
                            if (!this.alive || !this.cropper) return;
                            const bounds = this.cropper.getContainerData();
                            const width = Math.min(bounds.width - 32, (bounds.height - 32) * COVER_ASPECT_RATIO);
                            const height = width / COVER_ASPECT_RATIO;
                            const scale = Math.max(width / prepared.width, height / prepared.height);
                            this.cropper.setCanvasData({ width: prepared.width * scale, height: prepared.height * scale,
                                left: (bounds.width - prepared.width * scale) / 2, top: (bounds.height - prepared.height * scale) / 2 });
                            this.cropper.setCropBoxData({ width, height, left: (bounds.width - width) / 2, top: (bounds.height - height) / 2 });
                            if (previous) {
                                const restoredScale = width / previous.width;
                                this.cropper.setCanvasData({ width: prepared.width * restoredScale, height: prepared.height * restoredScale,
                                    left: (bounds.width - width) / 2 - previous.x * restoredScale,
                                    top: (bounds.height - height) / 2 - previous.y * restoredScale });
                            }
                            ready = true;
                            slider.disabled = false;
                            apply.disabled = false;
                            syncZoom();
                            status.setText('');
                        },
                        crop: () => syncZoom(),
                    });
                };
                mountCropper();
                let measuredWidth = stage.clientWidth;
                let measuredHeight = stage.clientHeight;
                this.resizeObserver = new ResizeObserver(() => {
                    if (!this.alive || !ready || busy || !this.cropper) return;
                    if (measuredWidth === stage.clientWidth && measuredHeight === stage.clientHeight) return;
                    window.cancelAnimationFrame(this.resizeFrame ?? 0);
                    this.resizeFrame = window.requestAnimationFrame(() => {
                        if (!this.alive || !ready || busy || !this.cropper) return;
                        const previous = this.cropper.getData();
                        measuredWidth = stage.clientWidth;
                        measuredHeight = stage.clientHeight;
                        mountCropper(previous);
                    });
                });
                this.resizeObserver.observe(stage);
                slider.addEventListener('input', () => zoomTo(Number(slider.value)));
                smaller.addEventListener('click', () => zoomTo(Number(slider.value) - 0.1));
                larger.addEventListener('click', () => zoomTo(Number(slider.value) + 0.1));
                stage.addEventListener('keydown', event => {
                    const moves: Record<string, number[]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
                    const delta = moves[event.key];
                    if (!delta || !ready || busy) return;
                    event.preventDefault();
                    const distance = event.shiftKey ? 20 : 5;
                    this.cropper?.move(delta[0] * distance, delta[1] * distance);
                });
                apply.addEventListener('click', () => {
                    if (!this.alive || !ready || busy || !this.cropper) return;
                    busy = true;
                    for (const control of [apply, back, smaller, slider, larger]) control.disabled = true;
                    this.cropper.disable();
                    apply.setText('处理中...');
                    status.setText('正在生成封面...');
                    void (async () => {
                        try {
                            const data = this.cropper!.getData();
                            const cropKey = JSON.stringify([data.x, data.y, data.width, data.height]);
                            if (!pendingCover || pendingCropKey !== cropKey) {
                                const size = cropOutputSize(data.width);
                                const canvas = this.cropper!.getCroppedCanvas({ ...size, imageSmoothingEnabled: true, imageSmoothingQuality: 'high' });
                                if (!canvas) throw new Error('无法生成封面，请重新选择图片。');
                                try { pendingCover = await encodeCroppedCover(canvas, this.cropSource.name); }
                                finally { canvas.width = 0; canvas.height = 0; }
                                pendingCropKey = cropKey;
                            }
                            if (!this.alive) return;
                            apply.setText('上传中...');
                            status.setText('正在上传封面...');
                            await this.applyCover(pendingCover);
                            if (this.alive) this.close();
                        } catch (error) {
                            if (!this.alive) return;
                            status.setText(error instanceof Error ? error.message : '封面处理失败，请重试。');
                            busy = false;
                            this.cropper?.enable();
                            for (const control of [apply, back, slider]) control.disabled = false;
                            apply.setText('重试');
                            syncZoom();
                        }
                    })();
                });
            } catch (error) {
                if (this.alive) status.setText(error instanceof Error ? error.message : '图片无法读取，请返回重新选择。');
            }
        })();
    }

    onClose(): void {
        this.alive = false;
        this.resizeObserver?.disconnect();
        window.cancelAnimationFrame(this.resizeFrame ?? 0);
        this.cropper?.destroy();
        this.cropper = undefined;
        if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = undefined;
        this.contentEl.empty();
        this.dismissed();
    }
}
