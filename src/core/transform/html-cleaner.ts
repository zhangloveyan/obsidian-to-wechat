export function cleanObsidianUIElements(element: HTMLElement): void {
    for (const link of Array.from(element.querySelectorAll('.internal-link'))) {
        link.replaceWith(...Array.from(link.childNodes));
    }
    const controls = '.copy-code-button,.clickable-icon,.markdown-embed-link,.collapse-indicator,.file-embed-link,.popover,.tooltip';
    for (const control of Array.from(element.querySelectorAll(controls))) {
        if (!control.closest('.mermaid,.plantuml') && !control.matches('svg') && !control.querySelector('svg')) control.remove();
    }
    for (const pre of Array.from(element.querySelectorAll('pre'))) {
        pre.querySelectorAll('button').forEach(button => button.remove());
        if (pre.matches('.mermaid,.plantuml') || pre.querySelector('svg,.mermaid,.plantuml')) continue;
        for (const child of Array.from(pre.children)) if (child.tagName !== 'CODE') child.remove();
    }
    for (const checkbox of Array.from(element.querySelectorAll<HTMLInputElement>('input.task-list-item-checkbox'))) {
        checkbox.replaceWith(element.ownerDocument.createTextNode(checkbox.checked ? '[x] ' : '[ ] '));
    }
}
