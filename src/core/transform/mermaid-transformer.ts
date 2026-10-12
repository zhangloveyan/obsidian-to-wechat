import { svgToDataUrl } from './svg-image';

export async function transformMermaid(container: HTMLElement): Promise<void> {
    const diagrams = Array.from(container.querySelectorAll<HTMLElement>('.mermaid'))
        .filter(node => !node.parentElement?.closest('.mermaid'));
    for (const diagram of diagrams) {
        const svg = diagram.querySelector('svg');
        if (!svg) throw new Error('Mermaid 图表未完成渲染。');
        const data = await svgToDataUrl(svg);
        if (!data) throw new Error('Mermaid 图表转换图片失败。');
        const image = container.ownerDocument.win.createEl('img');
        image.src = data;
        image.alt = 'Mermaid diagram';
        image.className = 'otw-diagram';
        diagram.replaceWith(image);
    }
}
