/**
 * 结构化主题类型定义
 * 每个元素是一个 key-value 对象，渲染时转为 CSS 字符串
 */

/** 标题样式（h1-h6） */
export interface TitleStyle {
    /** 容器样式，如 margin, padding */
    base: string;
    /** 文字内容样式，如 color, font-weight */
    content: string;
    /** :after 伪元素样式，如图标装饰 */
    after: string;
}

/** 代码样式 */
export interface CodeStyle {
    /** 代码块容器样式 */
    block: string;
    /** 行内代码样式 */
    inline: string;
    /** macOS 窗口按钮 */
    header: {
        container: string;
        dot: string;
        colors: string[];
    };
}

/** 表格样式 */
export interface TableStyle {
    /** 表格容器 */
    container: string;
    /** 表头 */
    header: string;
    /** 单元格 */
    cell: string;
}

/** 列表样式 */
export interface ListStyle {
    /** 列表容器 */
    container: string;
    /** 列表项 */
    item: string;
    /** 任务列表 */
    taskList: string;
}

/** 强调样式 */
export interface EmphasisStyle {
    strong: string;
    em: string;
    del: string;
}

/** 脚注样式 */
export interface FootnoteStyle {
    ref: string;
    backref: string;
}

/** 完整主题结构 */
export interface StructuredTheme {
    id: string;
    name: string;
    /** 是否可见 */
    isVisible: boolean;
    /** 是否预设（不可删除） */
    isPreset: boolean;
    /** 容器级样式 */
    container: string;
    /** 标题 */
    title: {
        h1: TitleStyle;
        h2: TitleStyle;
        h3: TitleStyle;
        base: TitleStyle;
    };
    /** 段落 */
    paragraph: string;
    /** 列表 */
    list: ListStyle;
    /** 引用 */
    quote: string;
    /** 代码 */
    code: CodeStyle;
    /** 图片 */
    image: string;
    /** 链接 */
    link: string;
    /** 强调 */
    emphasis: EmphasisStyle;
    /** 表格 */
    table: TableStyle;
    /** 分割线 */
    hr: string;
    /** 脚注 */
    footnote: FootnoteStyle;
}

function githubCodeHighlightCSS(): string {
    return [
        '.otw-content-section .otw-code-block.hljs { color: #24292f; background: #f6f8fa; }',
        '.otw-content-section .otw-code-block .hljs-doctag, .otw-content-section .otw-code-block .hljs-keyword, .otw-content-section .otw-code-block .hljs-meta .hljs-keyword, .otw-content-section .otw-code-block .hljs-template-tag, .otw-content-section .otw-code-block .hljs-template-variable, .otw-content-section .otw-code-block .hljs-type, .otw-content-section .otw-code-block .hljs-variable.language_ { color: #cf222e; }',
        '.otw-content-section .otw-code-block .hljs-title, .otw-content-section .otw-code-block .hljs-title.class_, .otw-content-section .otw-code-block .hljs-title.class_.inherited__, .otw-content-section .otw-code-block .hljs-title.function_ { color: #8250df; }',
        '.otw-content-section .otw-code-block .hljs-attr, .otw-content-section .otw-code-block .hljs-attribute, .otw-content-section .otw-code-block .hljs-literal, .otw-content-section .otw-code-block .hljs-meta, .otw-content-section .otw-code-block .hljs-number, .otw-content-section .otw-code-block .hljs-operator, .otw-content-section .otw-code-block .hljs-selector-attr, .otw-content-section .otw-code-block .hljs-selector-class, .otw-content-section .otw-code-block .hljs-selector-id, .otw-content-section .otw-code-block .hljs-variable { color: #0550ae; }',
        '.otw-content-section .otw-code-block .hljs-meta .hljs-string, .otw-content-section .otw-code-block .hljs-regexp, .otw-content-section .otw-code-block .hljs-string { color: #0a3069; }',
        '.otw-content-section .otw-code-block .hljs-built_in, .otw-content-section .otw-code-block .hljs-symbol { color: #953800; }',
        '.otw-content-section .otw-code-block .hljs-code, .otw-content-section .otw-code-block .hljs-comment, .otw-content-section .otw-code-block .hljs-formula { color: #6e7781; }',
        '.otw-content-section .otw-code-block .hljs-name, .otw-content-section .otw-code-block .hljs-quote, .otw-content-section .otw-code-block .hljs-selector-pseudo, .otw-content-section .otw-code-block .hljs-selector-tag { color: #116329; }',
        '.otw-content-section .otw-code-block .hljs-subst { color: #24292f; }',
        '.otw-content-section .otw-code-block .hljs-section { color: #0550ae; font-weight: bold; }',
        '.otw-content-section .otw-code-block .hljs-bullet { color: #735c0f; }',
        '.otw-content-section .otw-code-block .hljs-emphasis { color: #24292f; font-style: italic; }',
        '.otw-content-section .otw-code-block .hljs-strong { color: #24292f; font-weight: bold; }',
        '.otw-content-section .otw-code-block .hljs-addition { color: #116329; background-color: #dafbe1; }',
        '.otw-content-section .otw-code-block .hljs-deletion { color: #82071e; background-color: #ffebe9; }',
    ].join('\n');
}

/** 将结构化主题转为 CSS 字符串 */
export function themeToCSS(theme: StructuredTheme): string {
    const parts: string[] = [];

    // 容器
    if (theme.container) {
        parts.push(`.otw-content-section { ${theme.container} }`);
    }

    // 标题
    const titleLevels = ['h1', 'h2', 'h3', 'base'] as const;
    const selectors: Record<string, string> = {
        h1: 'h1', h2: 'h2', h3: 'h3', base: 'h4, h5, h6',
    };
    for (const level of titleLevels) {
        const t = theme.title[level];
        const sel = selectors[level];
        if (t.base || t.content) {
            parts.push(`.otw-content-section ${sel} { ${t.base} ${t.content} }`);
        }
        if (t.after) {
            parts.push(`.otw-content-section ${sel}::after { ${t.after} }`);
        }
    }

    // 段落
    if (theme.paragraph) {
        parts.push(`.otw-content-section p { ${theme.paragraph} }`);
    }

    // 列表
    if (theme.list?.container) {
        parts.push(`.otw-content-section .otw-list-section { ${theme.list.container} }`);
    }
    if (theme.list?.item) {
        parts.push(`.otw-content-section .otw-list-item { ${theme.list.item} }`);
    }
    if (theme.list?.taskList) {
        parts.push(`.otw-content-section .task-list-item { ${theme.list.taskList} }`);
    }

    // 引用
    if (theme.quote) {
        parts.push(`.otw-content-section blockquote { ${theme.quote} }`);
        parts.push(`.otw-content-section blockquote p { margin: 0; padding: 0; line-height: inherit; }`);
    }

    // 代码
    if (theme.code?.block) {
        parts.push(`.otw-content-section .otw-code-block { ${theme.code.block} }`);
        parts.push('.otw-content-section .otw-code-block code { display: block; min-width: 100%; max-width: none; white-space: nowrap; word-break: normal; overflow-wrap: normal; word-wrap: normal; tab-size: 4; }');
    }
    if (theme.code?.inline) {
        parts.push(`.otw-content-section p code, .otw-content-section li code, .otw-content-section blockquote code, .otw-content-section td code, .otw-content-section th code { ${theme.code.inline} }`);
    }
    if (theme.code?.header?.container) {
        parts.push(`.otw-content-section .otw-code-header { ${theme.code.header.container} }`);
    }
    if (theme.code?.header?.dot) {
        parts.push(`.otw-content-section .mac-sign svg ellipse { ${theme.code.header.dot} }`);
    }
    parts.push(githubCodeHighlightCSS());

    // 图片
    if (theme.image) {
        parts.push(`.otw-content-section img { ${theme.image} }`);
    }

    // 链接
    if (theme.link) {
        parts.push(`.otw-content-section a { ${theme.link} }`);
    }

    // 强调
    if (theme.emphasis?.strong) {
        parts.push(`.otw-content-section strong { ${theme.emphasis.strong} }`);
    }
    if (theme.emphasis?.em) {
        parts.push(`.otw-content-section em { ${theme.emphasis.em} }`);
    }
    if (theme.emphasis?.del) {
        parts.push(`.otw-content-section del { ${theme.emphasis.del} }`);
    }

    // 表格
    if (theme.table?.container) {
        parts.push(`.otw-content-section table { ${theme.table.container} }`);
    }
    if (theme.table?.header) {
        parts.push(`.otw-content-section th { ${theme.table.header} padding: 8px; }`);
    }
    if (theme.table?.cell) {
        parts.push(`.otw-content-section td { ${theme.table.cell} padding: 8px; }`);
    }

    // 分割线
    if (theme.hr) {
        parts.push(`.otw-content-section hr { ${theme.hr} }`);
    }

    // 脚注
    if (theme.footnote?.ref) {
        parts.push(`.otw-content-section .footnote-ref { ${theme.footnote.ref} }`);
    }
    if (theme.footnote?.backref) {
        parts.push(`.otw-content-section .footnote-backref { ${theme.footnote.backref} }`);
    }

    return parts.join('\n');
}
