export function transformLists(container: HTMLElement): void {
    const roots = Array.from(container.querySelectorAll<HTMLElement>('ul, ol'))
        .filter(list => !list.parentElement?.closest('ul, ol'));
    for (const list of roots) list.replaceWith(convertList(list, 0));
}

function convertList(list: HTMLElement, depth: number): HTMLElement {
    const doc = list.ownerDocument;
    const section = doc.win.createEl('section');
    section.className = 'otw-list-section' + (depth ? ' otw-list-nested' : '');
    const ordered = list.tagName === 'OL';
    const items = Array.from(list.children).filter(item => item.tagName === 'LI');
    const step = list.hasAttribute('reversed') ? -1 : 1;
    let number = Number(list.getAttribute('start') || (step < 0 ? items.length : 1));
    section.dataset.listType = ordered ? 'ordered' : 'unordered';
    for (const item of items) {
        if (item.hasAttribute('value')) number = Number(item.getAttribute('value'));
        const row = doc.win.createEl('section');
        row.className = 'otw-list-item' + (item.classList.contains('task-list-item') ? ' task-list-item' : '');
        const marker = doc.win.createSpan();
        marker.className = 'otw-list-marker';
        marker.textContent = ordered ? String(number) + '. ' : '• ';
        const content = doc.win.createSpan();
        content.className = 'otw-list-content';
        while (item.firstChild) content.appendChild(item.firstChild);
        for (const nested of Array.from(content.querySelectorAll<HTMLElement>('ul, ol'))) {
            if (!nested.parentElement?.closest('ul, ol')) nested.replaceWith(convertList(nested, depth + 1));
        }
        row.append(marker, content);
        section.append(row);
        number += step;
    }
    return section;
}
