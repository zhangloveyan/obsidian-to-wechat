import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Real browser pixels and Cropper.js, with only the Obsidian host and upload transport replaced.
function obsidianHost() {
    const modals = [];
    const notices = [];
    const urls = new Set();
    const originalCreate = URL.createObjectURL.bind(URL);
    const originalRevoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = originalCreate(blob); urls.add(url); return url; };
    URL.revokeObjectURL = url => { urls.delete(url); originalRevoke(url); };
    HTMLElement.prototype.createEl = function (tag, options = {}) {
        const element = document.createElement(tag);
        if (options.cls) element.className = options.cls;
        if (options.text) element.textContent = options.text;
        for (const [key, value] of Object.entries(options.attr || {})) element.setAttribute(key, value);
        this.append(element);
        return element;
    };
    HTMLElement.prototype.createDiv = function (options) { return this.createEl('div', options); };
    HTMLElement.prototype.empty = function () { this.replaceChildren(); };
    HTMLElement.prototype.setText = function (text) { this.textContent = text; };
    HTMLElement.prototype.addClass = function (...names) { this.classList.add(...names); };
    class Modal {
        constructor(app) {
            this.app = app;
            this.containerEl = document.createElement('div');
            this.containerEl.className = 'modal-container';
            this.modalEl = this.containerEl.createDiv({ cls: 'modal' });
            this.titleEl = this.modalEl.createDiv({ cls: 'modal-title' });
            this.contentEl = this.modalEl.createDiv({ cls: 'modal-content' });
        }
        setTitle(text) { this.titleEl.setText(text); }
        open() {
            this.selection = { rangeCount: 0 };
            modals.push(this);
            document.body.append(this.containerEl);
            this.onOpen();
        }
        close() {
            const index = modals.indexOf(this);
            if (index < 0) return;
            modals.splice(index, 1);
            this.onClose();
            this.containerEl.remove();
        }
    }
    class TFile {
        constructor(path) {
            this.path = path;
            this.name = path.split('/').pop();
            this.extension = path.split('.').pop();
        }
    }
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') modals.at(-1)?.close();
    });
    return {
        Modal, TFile, App: class {}, MarkdownView: class {},
        Notice: class { constructor(text) { notices.push(text); } },
        setIcon: (element, icon) => { element.textContent = { 'arrow-left': '←', 'zoom-out': '−', 'zoom-in': '+' }[icon]; },
        setTooltip: (element, text) => { element.title = text; },
        modals, notices, urls,
    };
}

const bundle = await build({
    stdin: {
        contents: [
            'export { CoverImageModal } from "./src/features/publish/cover-image-modal";',
            'export { CoverCropModal } from "./src/features/publish/cover-crop-modal";',
            'export * from "./src/features/publish/cover-crop-image";',
            'export { TFile } from "obsidian";',
        ].join('\n'),
        resolveDir: process.cwd(),
    },
    bundle: true, platform: 'browser', format: 'iife', globalName: 'CoverTest', write: false,
    plugins: [{
        name: 'obsidian-test-host',
        setup(builder) {
            builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: 'obsidian', namespace: 'host' }));
            builder.onLoad({ filter: /.*/, namespace: 'host' }, () => ({
                contents: 'const host = window.host = (' + obsidianHost.toString() + ')();' +
                    'export const { Modal, TFile, App, MarkdownView, Notice, setIcon, setTooltip } = host;',
            }));
        },
    }],
});
const appCss = [
    ':root { --background-primary:#fff; --background-secondary:#f4f4f4; --background-modifier-border:#ddd; --interactive-accent:#7852dc; --text-muted:#666; --text-normal:#222; --text-on-accent:white; --font-ui-medium:16px; --font-ui-small:13px; }',
    '* {box-sizing:border-box;} body{margin:0;font-family:Arial,sans-serif;color:var(--text-normal);background:var(--background-primary);}',
    'body.dark {--background-primary:#202020;--background-secondary:#292929;--text-normal:#eee;--text-muted:#bbb;--background-modifier-border:#555;}',
    '.modal-container{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0005;}',
    '.modal{background:var(--background-primary);width:min(600px,92vw);max-height:90vh;overflow:auto;padding:20px;border:1px solid var(--background-modifier-border);border-radius:8px;}',
    'button{font:inherit;color:var(--text-normal);background:var(--background-primary);border:1px solid var(--background-modifier-border);padding:6px 12px;}',
    'button:disabled{opacity:.5;} button,input{font-family:inherit;}',
].join('\n');
const css = await readFile('styles.css', 'utf8');
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
page.setDefaultTimeout(10000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const reports = [];
function animatedGif() {
    const width = 94, height = 40;
    const size = Buffer.from([width, 0, height, 0]);
    const chunks = [Buffer.from('GIF89a'), size, Buffer.from([0x80, 0, 0, 229, 38, 32, 20, 61, 202]),
        Buffer.from([0x21, 0xff, 11]), Buffer.from('NETSCAPE2.0'), Buffer.from([3, 1, 0, 0, 0])];
    for (const color of [0, 1]) {
        chunks.push(Buffer.from([0x21, 0xf9, 4, 8, 8, 0, 0, 0, 0x2c, 0, 0, 0, 0]), size, Buffer.from([0, 2]));
        const bytes = [];
        let bits = 0, length = 0;
        const code = value => {
            bits |= value << length; length += 3;
            while (length >= 8) { bytes.push(bits & 255); bits >>= 8; length -= 8; }
        };
        for (let i = 0; i < width * height; i++) { code(4); code(color); }
        code(5);
        if (length) bytes.push(bits & 255);
        for (let i = 0; i < bytes.length; i += 255) {
            const block = Buffer.from(bytes.slice(i, i + 255));
            chunks.push(Buffer.from([block.length]), block);
        }
        chunks.push(Buffer.from([0]));
    }
    return Buffer.concat([...chunks, Buffer.from([0x3b])]);
}
async function check(name, run) {
    await run();
    reports.push(name);
    console.log('PASS ' + name);
}
async function ready() {
    await page.waitForFunction(() => {
        const modal = host.modals.at(-1);
        return modal?.cropper && !modal.contentEl.querySelector('.otw-cover-crop-header .otw-modal-btn-cta')?.disabled;
    });
}
async function closeAll() {
    await page.evaluate(() => { while (host.modals.length) host.modals.at(-1).close(); });
    await page.waitForFunction(() => host.urls.size === 0);
}
async function fixture(width = 1200, height = 800, type = 'image/png') {
    return page.evaluate(async ({ width, height, type }) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.fillStyle = '#d43c3c'; context.fillRect(0, 0, width / 2, height / 2);
        context.fillStyle = '#39a956'; context.fillRect(width / 2, 0, width / 2, height / 2);
        context.fillStyle = '#346adb'; context.fillRect(0, height / 2, width / 2, height / 2);
        context.fillStyle = '#e2b93b'; context.fillRect(width / 2, height / 2, width / 2, height / 2);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, type));
        window.fixtureSource = { data: await blob.arrayBuffer(), name: '封面测试.' + (type === 'image/jpeg' ? 'jpg' : 'png') };
        window.fixtureUrl = canvas.toDataURL(type);
        return fixtureUrl;
    }, { width, height, type });
}
async function openCrop() {
    await page.evaluate(() => {
        window.result = null;
        window.crop = new CoverTest.CoverCropModal({}, fixtureSource, async cover => { window.result = cover; }, () => {});
        crop.open();
    });
    await ready();
}
async function apply() {
    await page.getByRole('button', { name: '应用', exact: true }).click();
    await page.waitForFunction(() => !!window.result);
}
async function outputInfo() {
    return page.evaluate(async () => {
        const bitmap = await createImageBitmap(new Blob([result.data], { type: 'image/png' }));
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0);
        const pixels = [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1]]
            .map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data));
        const previewBytes = Uint8Array.from(atob(result.displayUrl.split(',')[1]), ch => ch.charCodeAt(0));
        const uploadedBytes = new Uint8Array(result.data);
        const info = { width: bitmap.width, height: bitmap.height, pixels, name: result.name,
            previewMatches: previewBytes.length === uploadedBytes.length && previewBytes.every((v, i) => v === uploadedBytes[i]) };
        bitmap.close();
        return info;
    });
}
async function screenshot(name) {
    if (!process.env.CROP_SCREENSHOT_DIR) return;
    await mkdir(process.env.CROP_SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({ path: resolve(process.env.CROP_SCREENSHOT_DIR, name + '.png') });
}
async function openPicker(mode = 'success') {
    await page.evaluate(({ mode }) => {
        window.uploads = []; window.choices = []; window.reads = 0;
        const article = new CoverTest.TFile('attachments/封面测试.png');
        const app = {
            metadataCache: { getFirstLinkpathDest: () => article },
            vault: {
                getResourcePath: () => fixtureUrl,
                getAbstractFileByPath: () => article,
                readBinary: async () => { window.reads++; return fixtureSource.data; },
            },
        };
        const plugin = { wechatPublisher: {
            switchAccount: account => { window.uploadAccount = account; },
            uploadImageToWechat: async (data, name) => {
                uploads.push({ data, name });
                if (mode === 'retry' && uploads.length === 1) return '';
                if (mode === 'delay') return new Promise(resolve => { window.finishUpload = resolve; });
                return 'test-media-id';
            },
        } };
        window.picker = new CoverTest.CoverImageModal(app, plugin,
            { file: { path: '文章.md' }, getViewData: () => '![](attachments/封面测试.png)' },
            'account-1', (id, url) => { choices.push({ id, url }); });
        picker.open();
    }, { mode });
}

try {
    await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');
    await page.addStyleTag({ content: appCss + css });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });

    await check('initial crop: centered minimum zoom for all image and viewport ratios', async () => {
        for (const viewport of [{ width: 1100, height: 850 }, { width: 390, height: 720 }, { width: 1100, height: 480 }]) {
            await page.setViewportSize(viewport);
            await page.evaluate(dark => document.body.classList.toggle('dark', dark), viewport.width === 390);
            for (const [width, height] of [[1200, 800], [1600, 900], [800, 800], [600, 1400], [3000, 600], [2350, 1000]]) {
                await fixture(width, height); await openCrop();
                const initial = await page.evaluate(() => {
                    const image = crop.cropper.getImageData();
                    const canvas = crop.cropper.getCanvasData();
                    const box = crop.cropper.getCropBoxData();
                    const container = crop.cropper.getContainerData();
                    const minimum = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight);
                    return { canvas, box, container, ratio: image.width / image.naturalWidth / minimum,
                        data: crop.cropper.getData(), zoomText: document.querySelector('input[type=range]').getAttribute('aria-valuetext') };
                });
                const label = `${width}x${height} in ${viewport.width}x${viewport.height}`;
                assert.ok(Math.abs(initial.ratio - 1) < 0.0001, `${label}: initial zoom is ${initial.ratio}, expected minimum`);
                assert.equal(await page.getByRole('slider').inputValue(), '1', label);
                assert.equal(initial.zoomText, '100%', label);
                assert.ok(await page.getByRole('button', { name: '缩小图片', exact: true }).isDisabled(), label);
                for (const element of [initial.canvas, initial.box]) {
                    assert.ok(Math.abs(element.left + element.width / 2 - initial.container.width / 2) < 0.1, `${label}: horizontally centered ${JSON.stringify(element)}`);
                    assert.ok(Math.abs(element.top + element.height / 2 - initial.container.height / 2) < 0.1, `${label}: vertically centered`);
                }
                if (width / height <= 2.35) {
                    assert.ok(Math.abs(initial.canvas.width - initial.box.width) < 0.1, `${label}: fit width`);
                } else {
                    assert.ok(Math.abs(initial.canvas.height - initial.box.height) < 0.1, `${label}: fit height`);
                }
                if (height === 1400 || width === 3000) await screenshot(`initial-${width}x${height}-${viewport.width}x${viewport.height}`);
                await page.getByRole('slider').fill('2');
                await page.getByRole('slider').fill('1');
                const minimum = await page.evaluate(() => crop.cropper.getData());
                for (const key of ['width', 'height']) {
                    assert.ok(Math.abs(minimum[key] - initial.data[key]) < 0.1, `${label}: initial crop matches manual minimum (${key})`);
                }
                await apply();
                assert.ok((await outputInfo()).pixels.every(pixel => pixel[3] === 255), `${label}: no empty crop edges`);
                await closeAll();
            }
        }
        await page.setViewportSize({ width: 1100, height: 850 });
        await page.evaluate(() => document.body.classList.remove('dark'));
    });

    await check('landscape PNG: exact ratio, independent bytes, matching preview', async () => {
        await fixture(); await openCrop(); await screenshot('desktop-light'); await apply();
        const result = await outputInfo();
        assert.equal(result.width * 20, result.height * 47);
        assert.ok(result.width <= 1200);
        assert.ok(result.previewMatches);
        assert.equal(result.name, '封面测试-cover.png');
        assert.deepEqual(result.pixels, [[212, 60, 60, 255], [57, 169, 86, 255], [52, 106, 219, 255], [226, 185, 59, 255]]);
        await closeAll();
    });
    await check('portrait: fixed frame, zoom, drag, no empty crop edges', async () => {
        await fixture(600, 1400); await openCrop();
        const before = await page.evaluate(() => crop.cropper.getData());
        await page.getByRole('slider').fill('2');
        const frame = await page.locator('.cropper-face').boundingBox();
        await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
        await page.mouse.down(); await page.mouse.move(frame.x + frame.width / 2 + 65, frame.y + frame.height / 2 + 80, { steps: 8 }); await page.mouse.up();
        const after = await page.evaluate(() => crop.cropper.getData());
        assert.ok(after.width < before.width);
        assert.ok(Math.abs(after.y - before.y) > 1);
        await screenshot('portrait-dragged'); await apply();
        const info = await outputInfo();
        assert.ok(info.width <= after.width);
        assert.ok(info.pixels.every(pixel => pixel[3] === 255));
        await closeAll();
    });
    await check('large JPEG: PNG output capped at 2350 x 1000', async () => {
        await fixture(3000, 1800, 'image/jpeg'); await openCrop(); await apply();
        const info = await outputInfo();
        assert.equal(info.width, 2350); assert.equal(info.height, 1000); await closeAll();
    });
    await check('animated GIF: preview and PNG stay on the first frame', async () => {
        await page.evaluate(bytes => {
            window.fixtureSource = { data: new Uint8Array(bytes).buffer, name: 'animated.gif' };
        }, Array.from(animatedGif()));
        await openCrop();
        await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 260)));
        await apply();
        const info = await outputInfo();
        assert.ok(info.previewMatches);
        assert.deepEqual(info.pixels, Array.from({ length: 4 }, () => [229, 38, 32, 255]));
        await closeAll();
    });
    await check('resize and dark narrow viewport preserve crop and fit controls', async () => {
        await fixture(); await openCrop(); await page.getByRole('slider').fill('1.7');
        const before = await page.evaluate(() => crop.cropper.getData());
        await page.evaluate(() => document.body.classList.add('dark'));
        await page.setViewportSize({ width: 390, height: 720 });
        await page.waitForFunction(() => {
            const modal = document.querySelector('.otw-cover-crop-modal');
            const stage = modal.querySelector('.otw-cover-crop-stage');
            return crop.cropper.getContainerData().width === stage.clientWidth &&
                !modal.querySelector('.otw-modal-btn-cta').disabled;
        });
        const after = await page.evaluate(() => crop.cropper.getData());
        for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(after[key] - before[key]) < 1, key);
        const fits = await page.evaluate(() => {
            const modal = document.querySelector('.otw-cover-crop-modal').getBoundingClientRect();
            return Array.from(document.querySelectorAll('.otw-cover-crop-header > *, .otw-cover-crop-controls > *'))
                .every(element => { const r = element.getBoundingClientRect(); return r.left >= modal.left && r.right <= modal.right; });
        });
        assert.ok(fits); await screenshot('narrow-dark');
        await apply(); assert.ok((await outputInfo()).previewMatches); await closeAll();
        await page.setViewportSize({ width: 1100, height: 850 });
        await page.evaluate(() => document.body.classList.remove('dark'));
    });
    await check('article picker: return keeps selection, apply uploads cropped PNG', async () => {
        await fixture(); await openPicker();
        await page.locator('.otw-modal-image-item').click();
        await page.getByRole('button', { name: '确认', exact: true }).click(); await ready();
        await page.getByRole('button', { name: '返回', exact: true }).click();
        assert.equal(await page.evaluate(() => uploads.length), 0);
        assert.equal(await page.locator('.otw-modal-image-selected').count(), 1);
        await page.getByRole('button', { name: '确认', exact: true }).click(); await ready();
        await page.getByRole('button', { name: '应用', exact: true }).click();
        await page.waitForFunction(() => choices.length === 1);
        const info = await page.evaluate(() => {
            const upload = uploads[0];
            return { name: upload.name, id: choices[0].id, account: uploadAccount,
                matches: Array.from(new Uint8Array(upload.data)).every((v, i) => v === atob(choices[0].url.split(',')[1]).charCodeAt(i)),
                closed: host.modals.length === 0 };
        });
        assert.equal(info.name, '封面测试-cover.png'); assert.equal(info.id, 'test-media-id');
        assert.equal(info.account, 'account-1'); assert.ok(info.matches && info.closed);
        await closeAll();
    });
    await check('local file and upload retry preserve the same cropped result', async () => {
        const url = await fixture(); await openPicker('retry');
        await page.getByText('本地图片', { exact: true }).click();
        await page.locator('input[type=file]').setInputFiles({ name: '本地图片.png', mimeType: 'image/png', buffer: Buffer.from(url.split(',')[1], 'base64') });
        await page.getByRole('button', { name: '确认', exact: true }).click(); await ready();
        await page.getByRole('button', { name: '应用', exact: true }).click();
        await page.getByRole('button', { name: '重试', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => choices.length), 0);
        await page.getByRole('button', { name: '重试', exact: true }).click();
        await page.waitForFunction(() => choices.length === 1);
        assert.ok(await page.evaluate(() => uploads.length === 2 && uploads[0].data === uploads[1].data && reads === 0));
        await closeAll();
    });
    await check('cancel and late uploads never replace the existing cover', async () => {
        await openPicker('delay');
        await page.locator('.otw-modal-image-item').click();
        await page.getByRole('button', { name: '确认', exact: true }).click(); await ready();
        await page.keyboard.press('Escape');
        assert.equal(await page.evaluate(() => uploads.length), 0);
        await page.getByRole('button', { name: '确认', exact: true }).click(); await ready();
        await page.getByRole('button', { name: '应用', exact: true }).click();
        await page.waitForFunction(() => !!window.finishUpload);
        await page.keyboard.press('Escape');
        await page.evaluate(async () => { finishUpload('late-id'); await new Promise(resolve => setTimeout(resolve, 20)); });
        assert.equal(await page.evaluate(() => choices.length), 0);
        assert.equal(await page.locator('.otw-modal-image-selected').count(), 1);
        await closeAll();
    });
    await check('invalid dimensions, empty or oversized files cannot upload', async () => {
        const errors = await page.evaluate(async () => {
            const failures = [];
            for (const data of [new ArrayBuffer(0), new ArrayBuffer(10 * 1024 * 1024 + 1), new Uint8Array([1, 2, 3]).buffer]) {
                try { await CoverTest.prepareCoverImage({ data, name: 'invalid.png' }); }
                catch (error) { failures.push(error.message); }
            }
            for (const width of [0, 20, NaN]) {
                try { CoverTest.cropOutputSize(width); }
                catch (error) { failures.push(error.message); }
            }
            return failures;
        });
        assert.equal(errors.length, 6);
    });
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => host.urls.size), 0);
    console.log('Passed ' + reports.length + ' cover crop browser checks.');
} finally {
    await browser.close();
}
