export const COVER_ASPECT_RATIO = 47 / 20;
const MAX_COVER_WIDTH = 2350;
const MAX_COVER_BYTES = 10 * 1024 * 1024;

export interface CoverImageSource {
    data: ArrayBuffer;
    name: string;
}

export interface CroppedCover extends CoverImageSource {
    displayUrl: string;
}

export interface CoverCropData {
    x: number;
    y: number;
    width: number;
    height: number;
}

function validateBytes(size: number): void {
    if (!size) throw new Error('图片文件为空，请重新选择。');
    if (size > MAX_COVER_BYTES) throw new Error('封面图片超过 10MB，请压缩后重新选择。');
}

function encodePng(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (!blob || !blob.size || blob.type !== 'image/png') {
                reject(new Error('封面图片编码失败，请重试。'));
            } else {
                resolve(blob);
            }
        }, 'image/png');
    });
}

export function imageBlob(source: CoverImageSource): Blob {
    validateBytes(source.data.byteLength);
    const extension = source.name.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml',
    };
    return new Blob([source.data], { type: mimeTypes[extension] || 'application/octet-stream' });
}

// Freeze the decoded first frame so the crop preview and exported animation frame agree.
export async function prepareCoverImage(source: CoverImageSource): Promise<{ url: string; width: number; height: number }> {
    const blob = imageBlob(source);
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(blob);
    } catch {
        throw new Error(`无法读取图片 ${source.name}，请检查文件是否损坏或转换为 PNG/JPEG 后重试。`);
    }
    const { width, height } = bitmap;
    const canvas = document.createElement('canvas');
    try {
        if (width < 47 || height < 20) throw new Error('图片尺寸太小，封面至少需要 47 × 20 像素。');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('无法创建图片画布，请重试。');
        context.drawImage(bitmap, 0, 0);
        const png = await encodePng(canvas);
        return { url: URL.createObjectURL(png), width, height };
    } finally {
        bitmap.close();
        canvas.width = 0;
        canvas.height = 0;
    }
}

export function cropOutputSize(cropWidth: number): { width: number; height: number } {
    const width = Math.floor(Math.min(MAX_COVER_WIDTH, cropWidth) / 47) * 47;
    if (!Number.isFinite(width) || width < 47) throw new Error('裁剪区域太小，请缩小图片或选择更大的原图。');
    return { width, height: width / 47 * 20 };
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('无法生成封面预览，请重试。'));
        };
        reader.onerror = () => reject(new Error('无法生成封面预览，请重试。'));
        reader.readAsDataURL(blob);
    });
}

export async function encodeCroppedCover(canvas: HTMLCanvasElement, sourceName: string): Promise<CroppedCover> {
    if (!canvas.width || !canvas.height || canvas.width * 20 !== canvas.height * 47 || canvas.width > MAX_COVER_WIDTH) {
        throw new Error('封面裁剪尺寸无效，需要 2.35:1 比例且宽度不超过 2350 像素。');
    }
    const png = await encodePng(canvas);
    validateBytes(png.size);
    const [data, displayUrl] = await Promise.all([png.arrayBuffer(), blobToDataUrl(png)]);
    const filename = sourceName.split(/[\\/]/).pop() || 'image';
    const stem = filename.replace(/\.[^.]*$/, '') || 'image';
    return { data, displayUrl, name: `${stem}-cover.png` };
}
