import { outsideCode } from '../../shared/markdown-text';

/** Protect fenced and inline code before normalizing supported LaTeX delimiters. */
export function preprocessMathFormula(markdown: string): string {
    return outsideCode(markdown, text => text
        .replace(/\\\[([\s\S]+?)\\\]/g, (_, tex: string) => '$$' + tex + '$$')
        .replace(/\\\(([^\n]+?)\\\)/g, (_, tex: string) => '$' + tex + '$'));
}

export async function waitForAsyncRender(container: HTMLElement, timeout = 5000): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < timeout) {
        const maths = Array.from(container.querySelectorAll('.math, mjx-container'))
            .filter(node => !node.parentElement?.closest('.math, mjx-container'));
        const diagrams = Array.from(container.querySelectorAll('.mermaid'))
            .filter(node => !node.parentElement?.closest('.mermaid'));
        const ready = maths.every(node => node.matches('mjx-container') ? node.childNodes.length > 0 : !!node.querySelector('mjx-container')) &&
            diagrams.every(node => !!node.querySelector('svg'));
        if (ready) return;
        await new Promise<void>(resolve => window.setTimeout(resolve, 50));
    }
    throw new Error('公式或图表渲染超时，请检查 Markdown 语法后重试。');
}

export function transformMath(container: HTMLElement, markdown: string): void {
    const nodes = Array.from(container.querySelectorAll('mjx-container'))
        .filter(node => !node.parentElement?.closest('mjx-container'));
    if (!nodes.length) return;
    const formulas = extractFormulas(markdown);
    if (nodes.length !== formulas.length) throw new Error('公式与渲染结果数量不一致，已停止转换，避免错配公式。');
    nodes.forEach((node, index) => {
        const formula = formulas[index];
        const image = container.ownerDocument.win.createEl('img');
        image.className = formula.isBlock ? 'otw-math-block' : 'otw-math-inline';
        image.alt = formula.tex;
        image.src = 'https://latex.codecogs.com/png.latex?' + encodeURIComponent('\\dpi{200} ' + formula.tex);
        node.replaceWith(image);
    });
}

export function extractFormulas(markdown: string): Array<{ tex: string; isBlock: boolean }> {
    const text = outsideCode(markdown, value => value, true);
    const formulas: Array<{ tex: string; isBlock: boolean }> = [];
    const pattern = /(^|[^\\$])(\$\$([\s\S]+?)\$\$|\$((?:[^$\n\\]|\\.)+?)\$)(?!\$)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
        formulas.push({ tex: (match[3] ?? match[4]).trim(), isBlock: match[3] !== undefined });
        pattern.lastIndex = match.index + match[0].length;
    }
    return formulas;
}
