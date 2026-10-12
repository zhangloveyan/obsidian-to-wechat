import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const bundle = await build({
    stdin: { resolveDir: process.cwd(), contents: [
        'export { ArticleRenderer } from "./src/core/render/article-renderer";',
        'export { themeToCSS } from "./src/core/theme/theme-types";',
        'export { builtinStructuredThemes } from "./src/core/theme/builtin-themes";',
        'export { SAMPLE_ARTICLE_MARKDOWN } from "./src/core/render/sample-article";',
        'export { metrics } from "./tests/browser-host.mjs";',
        'export * from "./src/core/transform/math-formula";',
        'export { transformMermaid } from "./src/core/transform/mermaid-transformer";',
        'export { PublishService } from "./src/features/publish/publish-service";',
        'export { ClipboardExporter } from "./src/core/output/clipboard-exporter";',
        'export { ThemeEditorModal } from "./src/features/theme-editor/theme-editor-modal";',
        'export { ThemeManager } from "./src/core/theme/theme-service";',
        'export { SettingsManager } from "./src/features/settings/settings";',
        'export { TFile, sanitizeHTMLToDom } from "obsidian";',
        'export { prepareImageForWechat } from "./src/core/output/image-output";',
        'export { svgToDataUrl } from "./src/core/transform/svg-image";',
    ].join('\n') },
    bundle: true, platform: 'browser', format: 'iife', globalName: 'RenderTest', write: false,
    loader: { '.css': 'text', '.md': 'text', '.jpg': 'dataurl' },
    plugins: [{ name: 'obsidian-host', setup(builder) {
        builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: resolve('tests/browser-host.mjs') }));
    } }],
});
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1550, height: 1000 } });
const errors = [];
page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
await page.route(/^https?:/, route => route.abort());
try {
    await page.route('http://localhost/', route => route.fulfill({ contentType:'text/html', body:'<div id="preview" style="width:750px"></div><iframe id="export" style="width:750px;height:850px"></iframe>' }));
    await page.goto('http://localhost/');
    await page.addStyleTag({ content: await readFile('styles.css', 'utf8') + '\nh4,h5,h6{color:magenta!important;margin-top:99px!important;}body{display:flex;gap:12px;font-family:Arial;}' });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const themes = await page.evaluate(() => RenderTest.builtinStructuredThemes.map(theme => theme.id));
    for (const id of themes) {
        const result = await page.evaluate(async id => {
            const theme = RenderTest.builtinStructuredThemes.find(theme => theme.id === id);
            const request = { app: {}, markdown: RenderTest.SAMPLE_ARTICLE_MARKDOWN, themeCss: RenderTest.themeToCSS(theme) };
            const article = await RenderTest.ArticleRenderer.render(request);
            const preview = document.querySelector('#preview');
            RenderTest.ArticleRenderer.mount(preview, article);
            const exported = await RenderTest.ArticleRenderer.renderHtml(request);
            const doc = document.querySelector('iframe').contentDocument;
            doc.body.replaceChildren(article.element.cloneNode(true));
            doc.body.style.margin = '0';
            const properties = ['color', 'backgroundColor', 'fontSize', 'lineHeight', 'borderBottomColor', 'borderBottomWidth', 'paddingLeft', 'marginTop', 'whiteSpace'];
            const inspect = root => ['h1','h2','h3','h4','h5','h6','p','.otw-list-item','.otw-code-block','.otw-code-body','th','td'].map(selector => {
                const el = root.querySelector(selector);
                if (!el) return null;
                const style = el.ownerDocument.defaultView.getComputedStyle(el);
                return [selector, ...properties.map(key => style[key])];
            });
            return {
                sameHtml: article.html === exported,
                preview: inspect(preview.shadowRoot), export: inspect(doc),
                firstMargin: preview.shadowRoot.querySelector('.otw-content-section').firstElementChild.style.marginTop,
                styles: preview.shadowRoot.querySelectorAll('style').length,
                stageCount: document.querySelectorAll('.otw-render-stage').length,
                balanced: RenderTest.metrics.loaded === RenderTest.metrics.unloaded,
                headings: preview.shadowRoot.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
            };
        }, id);
        assert.equal(result.sameHtml, true, id + ': same HTML');
        assert.deepEqual(result.preview, result.export, id + ': same computed styles');
        assert.equal(result.firstMargin, '0px');
        assert.equal(result.styles, 0);
        assert.equal(result.stageCount, 0);
        assert.equal(result.balanced, true);
        assert.ok(result.headings >= 6);
        console.log('PASS canonical preview/export: ' + id);
    }
    const regression = await page.evaluate(async () => {
        const theme = structuredClone(RenderTest.builtinStructuredThemes[0]);
        theme.title.h2.after = 'content:"*"; display:inline; color:#ff0000;';
        theme.title.base.content = 'color:#123456;';
        const markdown = '## Decorated\n\n<ol start="3"><li>Third<ul><li>Child</li></ul><ol start="8"><li>Eight</li></ol></li><li value="9">Nine</li></ol>\n\n```js\n/* comment\ncontinued */\nconst x = 1;\n```';
        const article = await RenderTest.ArticleRenderer.render({ app:{}, markdown, themeCss: RenderTest.themeToCSS(theme) });
        const preview = document.querySelector('#preview');
        RenderTest.ArticleRenderer.mount(preview, article);
        const markers = Array.from(article.element.querySelectorAll('.otw-list-marker')).map(el => el.textContent.trim());
        const numbers = Array.from(article.element.querySelectorAll('.otw-line-numbers > span')).map(el => el.textContent);
        await Promise.all([
            RenderTest.ArticleRenderer.renderToElement({ app:{}, markdown:'<!-- delay:80 -->\nOld', container:preview }),
            RenderTest.ArticleRenderer.renderToElement({ app:{}, markdown:'New', container:preview }),
        ]);
        const latest = preview.shadowRoot.textContent;
        RenderTest.ArticleRenderer.clear(preview);
        const message = document.createElement('p'); message.textContent = 'Empty'; preview.append(message);
        return { markers, numbers, decorated: article.element.querySelector('h2').textContent, latest,
            comment: article.element.querySelector('.hljs-comment')?.textContent,
            emptySlot: !!preview.shadowRoot.querySelector('slot'),
        };
    });
    assert.deepEqual(regression.markers, ['3.', '•', '8.', '9.']);
    assert.deepEqual(regression.numbers, ['1','2','3']);
    assert.equal(regression.decorated, 'Decorated*');
    assert.match(regression.comment, /continued/);
    assert.match(regression.latest, /New/);
    assert.doesNotMatch(regression.latest, /Old/);
    assert.equal(regression.emptySlot, true);
    console.log('PASS nested lists, pseudo-elements, multiline highlighting, stale rendering and clearing');
    const mathAndDiagram = await page.evaluate(async () => {
        const container = document.createElement('div');
        container.append(RenderTest.sanitizeHTMLToDom('<span class="math"><mjx-container><span>x</span></mjx-container></span><div class="math"><mjx-container><span>y</span></mjx-container></div>'));
        await RenderTest.waitForAsyncRender(container, 100);
        RenderTest.transformMath(container, '$x$\n\n$$y$$');
        const mathImages = [...container.querySelectorAll('img')].map(image => ({ alt: image.alt, cls: image.className }));
        container.replaceChildren();
        container.append(RenderTest.sanitizeHTMLToDom('<div class="mermaid"><svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50"><rect width="100" height="50" fill="#ed3030"/></svg></div>'));
        await RenderTest.transformMermaid(container);
        const diagram = container.querySelector('img'); await diagram.decode();
        const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 100;
        const ctx = canvas.getContext('2d'); ctx.drawImage(diagram, 0, 0);
        container.replaceChildren();
        container.append(RenderTest.sanitizeHTMLToDom('<span class="math"><mjx-container><span>x</span></mjx-container></span><div class="mermaid"></div>'));
        let timedOut = false;
        try { await RenderTest.waitForAsyncRender(container, 100); } catch { timedOut = true; }
        return { mathImages, pixel: [...ctx.getImageData(10, 10, 1, 1).data], timedOut };
    });
    assert.deepEqual(mathAndDiagram.mathImages, [{ alt:'x', cls:'otw-math-inline' }, { alt:'y', cls:'otw-math-block' }]);
    assert.deepEqual(mathAndDiagram.pixel, [237, 48, 48, 255]);
    assert.equal(mathAndDiagram.timedOut, true);
    const labelPixels = await page.evaluate(async () => {
        const svg = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><foreignObject width="120" height="40"><div xmlns="http://www.w3.org/1999/xhtml" style="font:20px Arial;color:black">Label</div></foreignObject></svg>', 'image/svg+xml').documentElement;
        const url = await RenderTest.svgToDataUrl(svg);
        if (!url) return 0;
        const img = new Image(); img.src = url; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0);
        const data = ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let dark = 0;
        for (let i=0; i<data.length; i+=4) if(data[i]<128 && data[i+3]>0) dark++;
        return dark;
    });
    assert.ok(labelPixels > 10, 'Mermaid HTML labels must remain visible in converted pixels');
    console.log('PASS math pairing, Mermaid pixels and incomplete async rendering');
    const convertedImage = await page.evaluate(async () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="#00aacc"/></svg>';
        const result = await RenderTest.prepareImageForWechat({ data:new TextEncoder().encode(svg).buffer, name:'mock.svg', mime:'image/svg+xml' }, document);
        const bitmap = await createImageBitmap(new Blob([result.data], { type:result.mime }));
        const canvas = document.createElement('canvas'); canvas.width = 20; canvas.height = 10;
        const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0); bitmap.close();
        return { name:result.name, mime:result.mime, pixel:[...ctx.getImageData(2, 2, 1, 1).data] };
    });
    assert.deepEqual(convertedImage, { name:'mock.png', mime:'image/png', pixel:[0, 170, 204, 255] });
    console.log('PASS generated SVG assets are converted to a WeChat-compatible PNG');

    const outputs = await page.evaluate(async () => {
        const file = new RenderTest.TFile('notes/article.md');
        const pic = new RenderTest.TFile('notes/pic.png'); pic.extension = 'png';
        const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==';
        const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0)).buffer;
        const markdown = '# Title\n\nFirst line\nSecond line\n\n![](pic.png)\n\n<a class="internal-link"><img src="pic.png"></a>\n\n<span class="internal-embed image-embed" src="pic.png"></span>';
        const app = { workspace: { getActiveViewOfType: () => null, getLeavesOfType: () => [] },
            metadataCache: { getFirstLinkpathDest: () => pic }, vault: { read: async () => markdown, getResourcePath: () => 'app://vault/notes/pic.png',
                getAbstractFileByPath: path => path === pic.path ? pic : file, readBinary: async () => bytes } };
        const themeCss = RenderTest.themeToCSS(RenderTest.builtinStructuredThemes[0]);
        const article = await RenderTest.ArticleRenderer.render({ app, markdown, sourcePath:file.path, themeCss });
        const copied = [];
        window.ClipboardItem = class { constructor(data) { this.data = data; } };
        Object.defineProperty(navigator, 'clipboard', { value:{ write: async items => { copied.push(...items); } }, configurable:true });
        await RenderTest.ClipboardExporter.copyArticle(app, article);
        let uploadCount = 0, draft;
        const publisher = { createSession: () => ({ account:{ id:'a', appId:'wx-a' },
            upload: async () => { uploadCount++; return { url:'https://wechat.test/pic.png', media_id:'pic' }; },
            createDraft: async (title, html, cover) => { draft = { title, html, cover }; return 'draft'; } }) };
        const service = new RenderTest.PublishService(app, publisher);
        const request = { file, accountId:'a', title:'Title', themeCss, cover:{ accountId:'a', appId:'wx-a', mediaId:'cover' } };
        const progress = [];
        await service.publish(request, message => progress.push(message));
        const layout = html => {
            const root = document.createElement('div'); root.append(RenderTest.sanitizeHTMLToDom(html));
            for (const image of root.querySelectorAll('img')) { image.setAttribute('src', 'asset'); image.removeAttribute('data-otw-vault-path'); }
            return root.innerHTML;
        };
        const copiedHtml = await copied[0].data['text/html'].text();
        let wrongCover = false;
        try { await service.publish({ ...request, cover:{ ...request.cover, appId:'wx-b' } }, () => {}); } catch { wrongCover = true; }
        let release; const gate = new Promise(resolve => { release = resolve; });
        const originalRead = app.vault.read; app.vault.read = async () => { await gate; return markdown; };
        const job = service.publish(request, () => {});
        let duplicate = false;
        try { await service.publish(request, () => {}); } catch { duplicate = true; }
        service.dispose(); release();
        let stopped = false;
        try { await job; } catch { stopped = true; }
        app.vault.read = originalRead;
        return { canonical:layout(article.html), copied:layout(copiedHtml), published:layout(draft.html), uploadCount, wrongCover, duplicate, stopped,
            imageCount:article.element.querySelectorAll('img').length, copiedLocal:copiedHtml.includes('data:image/png'), publishedLocal:draft.html.includes('app://'), plain:await copied[0].data['text/plain'].text(), markdown };
    });
    assert.equal(outputs.canonical, outputs.copied);
    assert.equal(outputs.canonical, outputs.published);
    assert.equal(outputs.uploadCount, 1);
    assert.equal(outputs.imageCount, 3);
    assert.equal(outputs.copiedLocal, true); assert.equal(outputs.publishedLocal, false);
    assert.equal(outputs.plain, outputs.markdown);
    assert.ok(outputs.wrongCover && outputs.duplicate && outputs.stopped);
    console.log('PASS preview/copy/publish parity, local assets, cover isolation, duplicate submission and unload');
    await mkdir('output/playwright', { recursive: true });
    for (const width of [1200, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(async width => {
            document.body.style.display = 'block';
            document.querySelector('iframe').hidden = true;
            document.querySelector('#preview').style.width = Math.min(750, width - 32) + 'px';
            await RenderTest.ArticleRenderer.renderToElement({ app:{}, markdown:RenderTest.SAMPLE_ARTICLE_MARKDOWN,
                themeCss:RenderTest.themeToCSS(RenderTest.builtinStructuredThemes[3]), container:document.querySelector('#preview') });
            await Promise.all(Array.from(document.querySelector('#preview').shadowRoot.querySelectorAll('img')).map(img => img.decode()));
        }, width);
        await page.screenshot({ path:'output/playwright/render-' + width + '.png', fullPage:true });
        const layout = await page.evaluate(() => {
            const root = document.querySelector('#preview').shadowRoot;
            return { scroll:root.querySelector('.otw-code-scroll').scrollWidth, client:root.querySelector('.otw-code-scroll').clientWidth,
                imgWidth: root.querySelector('img').naturalWidth, width:document.documentElement.scrollWidth };
        });
        assert.ok(layout.imgWidth > 0);
        assert.ok(layout.scroll > layout.client);
        assert.ok(layout.width <= width, 'article must not overflow viewport');
    }
    await page.addStyleTag({ content: ':root{--background-primary:#fff;--background-secondary:#f4f4f4;--text-normal:#222;--text-muted:#666;--background-modifier-border:#ddd;--interactive-accent:#7652db;--text-on-accent:white}*{box-sizing:border-box}.modal-container{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0005}.modal{background:white}.modal-content{margin:0;padding:0}.setting-item-heading{font-weight:600;padding-bottom:12px}button,input,textarea{font:inherit}button{cursor:pointer}button:disabled{opacity:.45}' });
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.evaluate(() => {
        window.savedSettings = [];
        const settingsManager = new RenderTest.SettingsManager({ saveData: async data => { savedSettings.push(structuredClone(data)); } });
        window.themePlugin = { settingsManager, themeManager:new RenderTest.ThemeManager(settingsManager) };
        window.themeEditor = new RenderTest.ThemeEditorModal({}, themePlugin); themeEditor.open();
    });
    await page.waitForFunction(() => !!document.querySelector('.otw-theme-editor-preview-content > div')?.shadowRoot?.querySelector('h1'));
    assert.equal(await page.getByLabel('主题名称').getAttribute('readonly'), '');
    await page.getByRole('button', { name:'编辑副本', exact:true }).click();
    await page.getByLabel('主题名称').fill('Custom test');
    const cssField = page.getByLabel('全局 CSS', { exact:true });
    await cssField.fill('font-size:16px;color:#123456;line-height:1.8;');
    await page.waitForFunction(() => savedSettings.at(-1)?.structuredThemes[0]?.container.includes('#123456'));
    const custom = await page.evaluate(() => ({ presets:themePlugin.themeManager.getTheme('default').container, custom:themePlugin.themeManager.getAllThemes().at(-1).container }));
    assert.doesNotMatch(custom.presets, /#123456/);
    assert.match(custom.custom, /#123456/);
    for (const width of [1200, 390]) {
        await page.setViewportSize({ width, height:900 });
        await page.waitForFunction(() => !!document.querySelector('.otw-theme-editor-preview-content > div')?.shadowRoot?.querySelector('h1'));
        await page.screenshot({ path:'output/playwright/theme-editor-' + width + '.png' });
        const fits = await page.evaluate(() => {
            const modal = document.querySelector('.modal').getBoundingClientRect();
            return [...document.querySelectorAll('.otw-theme-editor-header input,.otw-theme-editor-header button,.otw-theme-editor-textarea')].every(element => {
                const rect = element.getBoundingClientRect(); return rect.left >= modal.left && rect.right <= modal.right;
            });
        });
        assert.ok(fits, 'theme editor controls must fit at ' + width);
    }
    await page.getByRole('button', { name:'删除', exact:true }).click();
    await page.waitForFunction(() => savedSettings.at(-1)?.structuredThemes.length === 0);
    await page.getByRole('button', { name:'关闭', exact:true }).click();
    console.log('PASS read-only presets, editable copies, autosave/delete and responsive theme editor');
    assert.deepEqual(errors, []);
    console.log('PASS desktop/mobile asset and layout checks');
} finally { await browser.close(); }
