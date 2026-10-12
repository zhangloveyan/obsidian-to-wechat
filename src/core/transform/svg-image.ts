export async function svgToDataUrl(svg: SVGSVGElement): Promise<string | null> {
    const viewBox = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    const width = viewBox[2] || parseFloat(svg.getAttribute('width') || '') || 800;
    const height = viewBox[3] || parseFloat(svg.getAttribute('height') || '') || 600;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    const canvas = svg.ownerDocument.win.createEl('canvas');
    const scale = Math.min(2, 4096 / Math.max(width, height));
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    try {
        const context = canvas.getContext('2d');
        if (!context) return null;
        const clone = svg.cloneNode(true) as SVGSVGElement;
        clone.setAttribute('width', String(width));
        clone.setAttribute('height', String(height));
        if (!clone.hasAttribute('viewBox')) clone.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
        // A self-contained data URL also permits Mermaid's foreignObject labels on the canvas.
        const source = new XMLSerializer().serializeToString(clone);
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
            const timeout = window.setTimeout(() => { cleanup(); reject(new Error('图表图片解码超时')); }, 5000);
            const cleanup = () => { window.clearTimeout(timeout); image.onload = null; image.onerror = null; };
            image.onload = () => { cleanup(); resolve(); };
            image.onerror = () => { cleanup(); reject(new Error('图表图片解码失败')); };
            image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
        });
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
    } catch {
        return null;
    } finally {
        canvas.width = 0;
        canvas.height = 0;
    }
}
