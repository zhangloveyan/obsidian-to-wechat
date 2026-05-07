/**
 * 内置结构化主题
 */
import type { StructuredTheme } from './theme-types';

export const builtinStructuredThemes: StructuredTheme[] = [
    {
        id: 'default',
        name: '默认',
        isVisible: true,
        isPreset: true,
        container: 'font-size: 16px; color: #4a4a4a; line-height: 1.8; letter-spacing: 0.03em;',
        title: {
            h1: {
                base: 'margin: 32px 0 16px; font-size: 2em; letter-spacing: -0.02em; line-height: 1.5;',
                content: 'font-weight: bold; color: #2c3e50;',
                after: '',
            },
            h2: {
                base: 'margin: 28px 0 14px; font-size: 1.5em; letter-spacing: -0.01em; line-height: 1.5;',
                content: 'font-weight: bold; color: #34495e;',
                after: '',
            },
            h3: {
                base: 'margin: 24px 0 12px; font-size: 1.25em; line-height: 1.5;',
                content: 'font-weight: bold; color: #3d566e;',
                after: '',
            },
            base: {
                base: 'margin: 20px 0 10px; font-size: 1em; line-height: 1.5;',
                content: 'font-weight: bold; color: #47637f;',
                after: '',
            },
        },
        paragraph: 'margin: 1em 0; line-height: 1.8; font-size: 1em;',
        list: {
            container: 'margin: 1em 0 0 0; padding: 0; color: #4a4a4a;',
            item: 'font-size: 1em; color: #4a4a4a; line-height: 1.8;',
            taskList: 'list-style: none; font-size: 1em; color: #4a4a4a; line-height: 1.8;',
        },
        quote: 'border-left: 4px solid #e0e0e0; border-radius: 6px; padding: 10px 16px; background: #f6f8fa; margin: 0.8em 0; color: #6a737d; font-style: italic; word-wrap: break-word;',
        code: {
            header: {
                container: 'margin-bottom: 1em; display: flex; gap: 6px;',
                dot: 'display: inline-block; width: 12px; height: 12px; border-radius: 50%;',
                colors: ['#ff5f56', '#ffbd2e', '#27c93f'],
            },
            block: 'color: #333; background: #f8f8f8; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin: 1.2em 0; padding: 1em; font-size: 14px; line-height: 1.6; overflow-x: auto; white-space: pre; word-break: normal; tab-size: 4;',
            inline: 'background: #f8f8f8; padding: 2px 6px; border-radius: 4px; color: #333; font-size: 14px; border: 1px solid #eee;',
        },
        image: 'max-width: 100%; height: auto; margin: 1em auto; display: block;',
        link: 'color: #3498db; text-decoration: none; border-bottom: 1px solid #3498db;',
        emphasis: {
            strong: 'font-weight: bold; color: #4a4a4a;',
            em: 'font-style: italic; color: #4a4a4a;',
            del: 'text-decoration: line-through; color: #4a4a4a;',
        },
        table: {
            container: 'width: 100%; margin: 1em 0; border-collapse: collapse; border: 1px solid #e1e4e8;',
            header: 'background: #f6f8fa; font-weight: bold; color: #4a4a4a; border-bottom: 2px solid #e1e4e8; font-size: 1em;',
            cell: 'border: 1px solid #f0f0f0; color: #4a4a4a; font-size: 1em;',
        },
        hr: 'border: none; border-top: 1px solid #f0f0f0; margin: 20px 0;',
        footnote: {
            ref: 'color: #3498db; text-decoration: none; font-size: 0.9em;',
            backref: 'color: #3498db; text-decoration: none; font-size: 0.9em;',
        },
    },
    {
        id: 'minimal',
        name: '极简',
        isVisible: true,
        isPreset: true,
        container: 'font-size: 16px; color: #4a4a4a; line-height: 1.8;',
        title: {
            h1: {
                base: 'margin: 32px 0 0; font-size: 2em; letter-spacing: -0.02em; line-height: 1.5; border-bottom: 1px solid rgba(0,0,0,0.1);',
                content: 'font-weight: bold; color: #000000;',
                after: '',
            },
            h2: {
                base: 'margin: 28px 0 0; font-size: 1.5em; letter-spacing: -0.01em; line-height: 1.5;',
                content: 'font-weight: bold; color: #262626;',
                after: '',
            },
            h3: {
                base: 'margin: 24px 0 0; font-size: 1.25em; line-height: 1.5;',
                content: 'font-weight: bold; color: #404040;',
                after: '',
            },
            base: {
                base: 'margin: 20px 0 0; font-size: 1em; line-height: 1.5;',
                content: 'font-weight: bold; color: #595959;',
                after: '',
            },
        },
        paragraph: 'line-height: 1.8; margin-top: 1em; font-size: 1em;',
        list: {
            container: 'padding-left: 32px; color: #4a4a4a;',
            item: 'font-size: 1em; color: #4a4a4a; line-height: 1.8;',
            taskList: 'list-style: none; font-size: 1em; color: #4a4a4a; line-height: 1.8;',
        },
        quote: 'border-left: 4px solid #262626; border-radius: 6px; padding: 10px 10px; background: #fafafa; margin: 0.8em 0; color: #404040; font-style: italic; word-wrap: break-word;',
        code: {
            header: {
                container: 'margin-bottom: 1em; display: flex; gap: 6px;',
                dot: 'display: inline-block; width: 12px; height: 12px; border-radius: 50%;',
                colors: ['#ff5f56', '#ffbd2e', '#27c93f'],
            },
            block: 'color: #333; background: #fafafa; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin: 1.2em 0; padding: 1em; font-size: 14px; line-height: 1.6; overflow-x: auto; white-space: pre; word-break: normal; tab-size: 4;',
            inline: 'background: #fafafa; padding: 2px 6px; border-radius: 4px; color: #333; font-size: 14px; border: 1px solid #eee;',
        },
        image: 'max-width: 100%; height: auto; margin: 1em auto; display: block;',
        link: 'color: #262626; text-decoration: none; border-bottom: 1px solid #262626;',
        emphasis: {
            strong: 'font-weight: bold; color: #262626;',
            em: 'font-style: italic; color: #404040;',
            del: 'text-decoration: line-through; color: #595959;',
        },
        table: {
            container: 'width: 100%; margin: 1em 0; border-collapse: collapse; border: 1px solid #f0f0f0;',
            header: 'background: #fafafa; font-weight: bold; color: #4a4a4a; border-bottom: 1px solid #f0f0f0; font-size: 1em;',
            cell: 'border: 1px solid #f0f0f0; color: #4a4a4a; font-size: 1em;',
        },
        hr: 'border: none; border-top: 1px solid #f0f0f0; margin: 20px 0;',
        footnote: {
            ref: 'color: #262626; text-decoration: none; font-size: 0.9em;',
            backref: 'color: #262626; text-decoration: none; font-size: 0.9em;',
        },
    },
    {
        id: 'orange',
        name: '橙心',
        isVisible: true,
        isPreset: true,
        container: 'font-size: 16px; color: #4a4a4a; line-height: 1.8; letter-spacing: 0.03em;',
        title: {
            h1: {
                base: 'margin: 32px 0 0; font-size: 2em; letter-spacing: -0.03em; line-height: 1.5;',
                content: 'font-weight: bold; color: #d64b3b;',
                after: '',
            },
            h2: {
                base: 'margin: 28px 0 0; font-size: 1.5em; letter-spacing: -0.02em; border-bottom: 2px solid #ef7060; line-height: 1.2;',
                content: 'font-weight: bold; color: #ef7060;',
                after: '',
            },
            h3: {
                base: 'margin: 24px 0 0; font-size: 1.25em; letter-spacing: -0.01em; line-height: 1.5;',
                content: 'font-weight: bold; color: #f18070;',
                after: '',
            },
            base: {
                base: 'margin: 20px 0 14px; font-size: 1em; line-height: 1.5;',
                content: 'font-weight: bold; color: #f39080;',
                after: '',
            },
        },
        paragraph: 'line-height: 1.8; margin-top: 1em; font-size: 1em;',
        list: {
            container: 'padding-left: 32px; color: #4a4a4a;',
            item: 'font-size: 1em; color: #4a4a4a; line-height: 1.8;',
            taskList: 'list-style: none; font-size: 1em; color: #4a4a4a; line-height: 1.8;',
        },
        quote: 'border-left: 4px solid #ef7060; border-radius: 6px; padding: 10px 10px; background: #fff5f4; margin: 0.8em 0; color: #d64b3b; font-style: italic; word-wrap: break-word;',
        code: {
            header: {
                container: 'margin-bottom: 1em; display: flex; gap: 6px;',
                dot: 'display: inline-block; width: 12px; height: 12px; border-radius: 50%;',
                colors: ['#ff5f56', '#ffbd2e', '#27c93f'],
            },
            block: 'color: #333; background: #fff8f7; border-radius: 8px; border: 1px solid #ffe8e6; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin: 1.2em 0; padding: 1em; font-size: 14px; line-height: 1.6; overflow-x: auto; white-space: pre; word-break: normal; tab-size: 4;',
            inline: 'background: #fff8f7; padding: 2px 6px; border-radius: 4px; color: #333; font-size: 14px; border: 1px solid #ffe8e6;',
        },
        image: 'max-width: 100%; height: auto; margin: 1em auto; display: block;',
        link: 'color: #ef7060; text-decoration: none; border-bottom: 1px solid #ef7060;',
        emphasis: {
            strong: 'font-weight: bold; color: #4a4a4a;',
            em: 'font-style: italic; color: #4a4a4a;',
            del: 'text-decoration: line-through; color: #4a4a4a;',
        },
        table: {
            container: 'width: 100%; margin: 1em 0; border-collapse: collapse; border: 1px solid #ffe8e6;',
            header: 'background: #fff8f7; font-weight: bold; color: #4a4a4a; border-bottom: 2px solid #ffe8e6; font-size: 1em;',
            cell: 'border: 1px solid #f0f0f0; color: #4a4a4a; font-size: 1em;',
        },
        hr: 'border: none; border-top: 1px solid #ffe8e6; margin: 20px 0;',
        footnote: {
            ref: 'color: #ef7060; text-decoration: none; font-size: 0.9em;',
            backref: 'color: #ef7060; text-decoration: none; font-size: 0.9em;',
        },
    },
    {
        id: 'elegant',
        name: '优雅',
        isVisible: true,
        isPreset: true,
        container: 'font-size: 16px; color: #4a4a4a; line-height: 1.8; letter-spacing: 0.03em;',
        title: {
            h1: {
                base: 'margin: 32px 0 0; font-size: 2em; letter-spacing: -0.03em; line-height: 1.5;',
                content: 'font-weight: bold; color: #553C9A;',
                after: '',
            },
            h2: {
                base: 'margin: 28px 0 0; font-size: 1.5em; letter-spacing: -0.02em; border-bottom: 2px solid #9F7AEA; line-height: 1.2;',
                content: 'font-weight: bold; color: #9F7AEA;',
                after: '',
            },
            h3: {
                base: 'margin: 24px 0 0; font-size: 1.25em; letter-spacing: -0.01em; line-height: 1.5;',
                content: 'font-weight: bold; color: #805AD5;',
                after: '',
            },
            base: {
                base: 'margin: 20px 0 14px; font-size: 1em; line-height: 1.5;',
                content: 'font-weight: bold; color: #805AD5;',
                after: '',
            },
        },
        paragraph: 'line-height: 1.8; margin-top: 1em; font-size: 1em;',
        list: {
            container: 'padding-left: 32px; color: #4a4a4a;',
            item: 'font-size: 1em; color: #4a4a4a; line-height: 1.8;',
            taskList: 'list-style: none; font-size: 1em; color: #4a4a4a; line-height: 1.8;',
        },
        quote: 'border-left: 4px solid #9F7AEA; border-radius: 6px; padding: 10px 10px; background: #f5f3ff; margin: 0.8em 0; color: #6B46C1; font-style: italic; word-wrap: break-word;',
        code: {
            header: {
                container: 'margin-bottom: 1em; display: flex; gap: 6px;',
                dot: 'display: inline-block; width: 12px; height: 12px; border-radius: 50%;',
                colors: ['#ff5f56', '#ffbd2e', '#27c93f'],
            },
            block: 'color: #333; background: #f8f8f8; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin: 1.2em 0; padding: 1em; font-size: 14px; line-height: 1.6; overflow-x: auto; white-space: pre; word-break: normal; tab-size: 4;',
            inline: 'background: #f8f8f8; padding: 2px 6px; border-radius: 4px; color: #333; font-size: 14px; border: 1px solid #eee;',
        },
        image: 'max-width: 100%; height: auto; margin: 1em auto; display: block;',
        link: 'color: #805AD5; text-decoration: none; border-bottom: 1px solid #9F7AEA;',
        emphasis: {
            strong: 'font-weight: bold; color: #4a4a4a;',
            em: 'font-style: italic; color: #4a4a4a;',
            del: 'text-decoration: line-through; color: #4a4a4a;',
        },
        table: {
            container: 'width: 100%; margin: 1em 0; border-collapse: collapse; border: 1px solid #e1e4e8;',
            header: 'background: #f6f8fa; font-weight: bold; color: #4a4a4a; border-bottom: 2px solid #e1e4e8; font-size: 1em;',
            cell: 'border: 1px solid #f0f0f0; color: #4a4a4a; font-size: 1em;',
        },
        hr: 'border: none; border-top: 1px solid #f0f0f0; margin: 20px 0;',
        footnote: {
            ref: 'color: #805AD5; text-decoration: none; font-size: 0.9em;',
            backref: 'color: #805AD5; text-decoration: none; font-size: 0.9em;',
        },
    },
    {
        id: 'dark',
        name: '深色',
        isVisible: true,
        isPreset: true,
        container: 'font-size: 16px; color: #4a4a4a; line-height: 1.8; letter-spacing: 0.03em;',
        title: {
            h1: {
                base: 'margin: 32px 0 0; font-size: 2em; letter-spacing: -0.03em; line-height: 1.5;',
                content: 'font-weight: bold; color: #1E90FF;',
                after: '',
            },
            h2: {
                base: 'margin: 28px 0 0; font-size: 1.5em; letter-spacing: -0.02em; border-left: 4px solid #1E90FF; padding-left: 12px; line-height: 1.5;',
                content: 'font-weight: bold; color: #3B9DFF;',
                after: '',
            },
            h3: {
                base: 'margin: 24px 0 0; font-size: 1.25em; letter-spacing: -0.01em; line-height: 1.5;',
                content: 'font-weight: bold; color: #57A9FF;',
                after: '',
            },
            base: {
                base: 'margin: 20px 0 0; font-size: 1em; line-height: 1.5;',
                content: 'font-weight: bold; color: #74B6FF;',
                after: '',
            },
        },
        paragraph: 'line-height: 1.8; margin-top: 1em; font-size: 1em;',
        list: {
            container: 'padding-left: 32px; color: #4a4a4a;',
            item: 'font-size: 1em; color: #4a4a4a; line-height: 1.8;',
            taskList: 'list-style: none; font-size: 1em; color: #4a4a4a; line-height: 1.8;',
        },
        quote: 'border-left: 4px solid #1E90FF; border-radius: 6px; padding: 10px 10px; background: #F5F9FF; margin: 0.8em 0; color: #6a737d; font-style: italic; word-wrap: break-word;',
        code: {
            header: {
                container: 'margin-bottom: 1em; display: flex; gap: 6px;',
                dot: 'display: inline-block; width: 12px; height: 12px; border-radius: 50%;',
                colors: ['#ff5f56', '#ffbd2e', '#27c93f'],
            },
            block: 'color: #333; background: #F8FBFF; border-radius: 8px; border: 1px solid #E6F0FF; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin: 1.2em 0; padding: 1em; font-size: 14px; line-height: 1.6; overflow-x: auto; white-space: pre; word-break: normal; tab-size: 4;',
            inline: 'background: #F8FBFF; padding: 2px 6px; border-radius: 4px; color: #333; font-size: 14px; border: 1px solid #E6F0FF;',
        },
        image: 'max-width: 100%; height: auto; margin: 1em auto; display: block;',
        link: 'color: #1E90FF; text-decoration: none; border-bottom: 1px solid #1E90FF;',
        emphasis: {
            strong: 'font-weight: bold; color: #4a4a4a;',
            em: 'font-style: italic; color: #4a4a4a;',
            del: 'text-decoration: line-through; color: #4a4a4a;',
        },
        table: {
            container: 'width: 100%; margin: 1em 0; border-collapse: collapse; border: 1px solid #E6F0FF;',
            header: 'background: #F8FBFF; font-weight: bold; color: #4a4a4a; border-bottom: 2px solid #E6F0FF; font-size: 1em;',
            cell: 'border: 1px solid #f0f0f0; color: #4a4a4a; font-size: 1em;',
        },
        hr: 'border: none; border-top: 1px solid #E6F0FF; margin: 20px 0;',
        footnote: {
            ref: 'color: #1E90FF; text-decoration: none; font-size: 0.9em;',
            backref: 'color: #1E90FF; text-decoration: none; font-size: 0.9em;',
        },
    },
    {
        id: 'academic',
        name: '学术',
        isVisible: true,
        isPreset: true,
        container: 'font-size: 16px; color: #4a4a4a; line-height: 1.8; letter-spacing: 0.03em;',
        title: {
            h1: {
                base: 'margin: 32px 0 0; font-size: 2em; letter-spacing: -0.03em; line-height: 1.5;',
                content: 'font-weight: bold; color: #5D4037;',
                after: '',
            },
            h2: {
                base: 'margin: 28px 0 0; font-size: 1.5em; letter-spacing: -0.02em; border-left: 4px solid #8D6E63; padding-left: 12px; line-height: 1.5;',
                content: 'font-weight: bold; color: #6D4C41;',
                after: '',
            },
            h3: {
                base: 'margin: 24px 0 0; font-size: 1.25em; letter-spacing: -0.01em; line-height: 1.5;',
                content: 'font-weight: bold; color: #795548;',
                after: '',
            },
            base: {
                base: 'margin: 20px 0 0; font-size: 1em; line-height: 1.5;',
                content: 'font-weight: bold; color: #8D6E63;',
                after: '',
            },
        },
        paragraph: 'line-height: 1.8; margin-top: 1em; font-size: 1em;',
        list: {
            container: 'padding-left: 32px; color: #4a4a4a;',
            item: 'font-size: 1em; color: #4a4a4a; line-height: 1.8;',
            taskList: 'list-style: none; font-size: 1em; color: #4a4a4a; line-height: 1.8;',
        },
        quote: 'border-left: 4px solid #8D6E63; border-radius: 6px; padding: 10px 10px; background: #EFEBE9; margin: 0.8em 0; color: #5D4037; font-style: italic; word-wrap: break-word;',
        code: {
            header: {
                container: 'margin-bottom: 1em; display: flex; gap: 6px;',
                dot: 'display: inline-block; width: 12px; height: 12px; border-radius: 50%;',
                colors: ['#ff5f56', '#ffbd2e', '#27c93f'],
            },
            block: 'color: #5D4037; background: #EFEBE9; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin: 1.2em 0; padding: 1em; font-size: 14px; line-height: 1.6; overflow-x: auto; white-space: pre; word-break: normal; tab-size: 4;',
            inline: 'background: #EFEBE9; padding: 2px 6px; border-radius: 4px; color: #5D4037; font-size: 14px; border: 1px solid #8D6E63;',
        },
        image: 'max-width: 100%; height: auto; margin: 1em auto; display: block;',
        link: 'color: #795548; text-decoration: none; border-bottom: 1px solid #8D6E63;',
        emphasis: {
            strong: 'font-weight: 600; color: #4a4a4a;',
            em: 'font-style: italic; color: #4a4a4a;',
            del: 'text-decoration: line-through; color: #4a4a4a;',
        },
        table: {
            container: 'width: 100%; margin: 1em 0; border-collapse: collapse; border: 1px solid #e1e4e8;',
            header: 'background: #f6f8fa; font-weight: bold; color: #4a4a4a; border-bottom: 2px solid #e1e4e8; font-size: 1em;',
            cell: 'border: 1px solid #f0f0f0; color: #4a4a4a; font-size: 1em;',
        },
        hr: 'border: none; border-top: 1px solid #f0f0f0; margin: 20px 0;',
        footnote: {
            ref: 'color: #5D4037; text-decoration: none; font-size: 0.9em;',
            backref: 'color: #5D4037; text-decoration: none; font-size: 0.9em;',
        },
    },
];
