export function outsideCode(markdown: string, transform: (text: string) => string, hideCode = false): string {
    const protectedParts: string[] = [];
    const protect = (value: string): string => {
        const index = protectedParts.push(hideCode ? value.replace(/[^\n]/g, ' ') : value) - 1;
        return '\ue000OTW' + index + '\ue001';
    };
    let fence: { marker: string; length: number } | undefined;
    const lines = markdown.split('\n');
    let block: string[] = [];
    const result: string[] = [];
    for (const line of lines) {
        const marker = line.match(/^ {0,3}(\x60{3,}|~{3,})(.*)$/);
        if (fence) {
            block.push(line);
            if (marker && marker[1][0] === fence.marker && marker[1].length >= fence.length && !marker[2].trim()) {
                result.push(protect(block.join('\n')));
                block = [];
                fence = undefined;
            }
        } else if (marker) {
            fence = { marker: marker[1][0], length: marker[1].length };
            block.push(line);
        } else if (/^(?: {4}|\t)/.test(line)) result.push(protect(line));
        else result.push(line.replace(/(\x60+)([\s\S]*?)\1(?!\x60)/g, protect));
    }
    if (block.length) result.push(protect(block.join('\n')));
    const normalized = transform(result.join('\n'));
    return normalized.replace(/\ue000OTW(\d+)\ue001/g, (_, index: string) => protectedParts[Number(index)]);
}
