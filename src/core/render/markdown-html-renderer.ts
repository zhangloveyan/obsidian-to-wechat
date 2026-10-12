import { MarkdownRenderer, type App, type Component } from 'obsidian';
import { cleanObsidianUIElements } from '../transform/html-cleaner';
import { preprocessMathFormula, waitForAsyncRender, transformMath } from '../transform/math-formula';
import { transformCodeBlocks } from '../transform/code/code-block-transformer';
import { transformLists } from '../transform/list-transformer';
import { transformCallouts } from '../transform/callout-transformer';
import { transformImages } from '../transform/image-transformer';
import { transformMermaid } from '../transform/mermaid-transformer';
import { normalizeMarkdownImageDestinations } from '../../integrations/obsidian/image-path-resolver';

export async function renderMarkdown(
    app: App, markdown: string, stage: HTMLElement, sourcePath: string, component: Component,
): Promise<HTMLElement> {
    const normalized = preprocessMathFormula(normalizeMarkdownImageDestinations(markdown));
    await MarkdownRenderer.render(app, normalized, stage, sourcePath, component);
    await waitForAsyncRender(stage);
    await transformMermaid(stage);
    transformMath(stage, normalized);
    cleanObsidianUIElements(stage);
    for (const br of Array.from(stage.querySelectorAll('br'))) {
        if (br.closest('pre, code')) continue;
        const next = br.nextSibling;
        if (next?.nodeType === 3) next.textContent = next.textContent?.replace(/^[\t\r\n ]+/, '') || '';
    }
    const section = stage.ownerDocument.win.createEl('section');
    section.className = 'otw-content-section';
    while (stage.firstChild) section.appendChild(stage.firstChild);
    stage.appendChild(section);
    transformLists(section);
    transformCodeBlocks(section);
    transformCallouts(section);
    transformImages(app, section, sourcePath);
    return section;
}
