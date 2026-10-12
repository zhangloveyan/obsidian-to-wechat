const CALLOUT_COLORS:Record<string, { bg: string; border: string; title: string; icon: string }> = {
        note:      { bg: '#e8f0fe', border: '#448aff', title: '#448aff', icon: '📝' },
        info:      { bg: '#e8f0fe', border: '#448aff', title: '#448aff', icon: 'ℹ️' },
        tip:       { bg: '#e6f7f2', border: '#00bfa5', title: '#00bfa5', icon: '💡' },
        hint:      { bg: '#e6f7f2', border: '#00bfa5', title: '#00bfa5', icon: '💡' },
        important: { bg: '#f3e8fd', border: '#7c4dff', title: '#7c4dff', icon: '🔥' },
        warning:   { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '⚠️' },
        caution:   { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '⚠️' },
        attention: { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '⚠️' },
        danger:    { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '⛔' },
        error:     { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '❌' },
        bug:       { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '🐛' },
        success:   { bg: '#e8f5e9', border: '#00c853', title: '#00c853', icon: '✅' },
        check:     { bg: '#e8f5e9', border: '#00c853', title: '#00c853', icon: '✅' },
        done:      { bg: '#e8f5e9', border: '#00c853', title: '#00c853', icon: '✅' },
        question:  { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '❓' },
        help:      { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '❓' },
        faq:       { bg: '#fff8e1', border: '#ff9100', title: '#ff9100', icon: '❓' },
        failure:   { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '❌' },
        fail:      { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '❌' },
        missing:   { bg: '#ffeef0', border: '#ff1744', title: '#ff1744', icon: '❌' },
        abstract:  { bg: '#e0f7fa', border: '#00b8d4', title: '#00b8d4', icon: '📋' },
        summary:   { bg: '#e0f7fa', border: '#00b8d4', title: '#00b8d4', icon: '📋' },
        tldr:      { bg: '#e0f7fa', border: '#00b8d4', title: '#00b8d4', icon: '📋' },
        example:   { bg: '#f3e8fd', border: '#7c4dff', title: '#7c4dff', icon: '📖' },
        todo:      { bg: '#e8f0fe', border: '#448aff', title: '#448aff', icon: '☑️' },
        quote:     { bg: '#f5f5f5', border: '#9e9e9e', title: '#757575', icon: '💬' },
        cite:      { bg: '#f5f5f5', border: '#9e9e9e', title: '#757575', icon: '💬' },
    };

export function transformCallouts(container: HTMLElement): void {
    const doc = container.ownerDocument;
    // Convert inner callouts first so moving children preserves the transformed subtree.
    const callouts = Array.from(container.querySelectorAll<HTMLElement>('.callout')).reverse();
    for (const callout of callouts) {
        const type = (callout.dataset.callout || 'note').toLowerCase();
        const colors = CALLOUT_COLORS[type] || CALLOUT_COLORS.note;
        const section = doc.win.createEl('section');
        section.className = 'otw-callout';
        section.setCssProps({ '--otw-callout-bg': colors.bg, '--otw-callout-color': colors.border });
        section.setCssStyles({ backgroundColor: colors.bg, borderLeftColor: colors.border });
        const title = doc.win.createEl('section');
        title.className = 'otw-callout-title';
        title.setCssStyles({ color: colors.title });
        const originalTitle = callout.querySelector('.callout-title-inner');
        title.textContent = colors.icon + ' ' + (originalTitle?.textContent || type);
        section.appendChild(title);
        const body = callout.querySelector('.callout-content');
        if (body) {
            const content = doc.win.createEl('section');
            content.className = 'otw-callout-content';
            while (body.firstChild) content.appendChild(body.firstChild);
            section.appendChild(content);
        }
        callout.replaceWith(section);
    }
}
