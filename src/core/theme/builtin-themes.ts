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
        container: 'font-size: 16px; color: #000000; line-height: 1.8; letter-spacing: 0.03em;',
        title: {
            h1: {
                base: 'margin: 32px 0 16px; font-size: 2em; letter-spacing: -0.02em; line-height: 1.5;',
                content: 'font-weight: bold; color: #000000;',
                after: '',
            },
            h2: {
                base: 'margin: 28px 0 14px; font-size: 1.5em; letter-spacing: -0.01em; line-height: 1.5;',
                content: 'font-weight: bold; color: #000000;',
                after: '',
            },
            h3: {
                base: 'margin: 24px 0 12px; font-size: 1.25em; line-height: 1.5;',
                content: 'font-weight: bold; color: #000000;',
                after: '',
            },
            base: {
                base: 'margin: 20px 0 10px; font-size: 1em; line-height: 1.5;',
                content: 'font-weight: bold; color: #000000;',
                after: '',
            },
        },
        paragraph: 'margin: 1em 0; line-height: 1.8; font-size: 1em;',
        list: {
            container: 'margin: 1em 0 0 0; padding: 0; color: #000000;',
            item: 'font-size: 1em; color: #000000; line-height: 1.8;',
            taskList: 'list-style: none; font-size: 1em; color: #000000; line-height: 1.8;',
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
            strong: 'font-weight: bold; color: #000000;',
            em: 'font-style: italic; color: #000000;',
            del: 'text-decoration: line-through; color: #000000;',
        },
        table: {
            container: 'width: 100%; margin: 1em 0; border-collapse: collapse; border: 1px solid #e1e4e8;',
            header: 'background: #f6f8fa; font-weight: bold; color: #000000; border-bottom: 2px solid #e1e4e8; font-size: 1em;',
            cell: 'border: 1px solid #f0f0f0; color: #000000; font-size: 1em;',
        },
        hr: 'border: none; border-top: 1px solid #f0f0f0; margin: 20px 0;',
        footnote: {
            ref: 'color: #3498db; text-decoration: none; font-size: 0.9em;',
            backref: 'color: #3498db; text-decoration: none; font-size: 0.9em;',
        },
    },
    {
        id: 'wechat-classic',
        name: '经典',
        isVisible: true,
        isPreset: true,
        container: 'font-family: -apple-system-font, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif; font-size: 16px; color: rgba(51, 51, 51, 1); line-height: 1.75; word-break: break-word;',
        title: {
            h1: {
                base: 'font-size: 1.7em; text-align: center; margin: 0.2em 0 1em; line-height: 1.4; padding-bottom: .3em; border-bottom: 2px solid #333333;',
                content: 'font-weight: 700; color: #333333;',
                after: '',
            },
            h2: {
                base: 'display: block; width: 100%; box-sizing: border-box; margin: 1.8em 0 .9em; padding: 0 0 .45em 12px; line-height: 1.35; font-size: 1.35em; border-left: 4px solid #333333; border-bottom: 1px dashed rgba(51, 51, 51, 0.45);',
                content: 'font-weight: 700; color: #111111;',
                after: '',
            },
            h3: {
                base: 'display: block; width: 100%; box-sizing: border-box; margin: 1.8em 0 .9em; padding: 0; line-height: 1.35; font-size: 1.18em;',
                content: 'font-weight: 700; color: #111111;',
                after: '',
            },
            base: {
                base: 'margin: 1.4em 0 .6em; line-height: 1.4; font-size: 1em;',
                content: 'font-weight: 700; color: #333333;',
                after: '',
            },
        },
        paragraph: 'margin: 1em 0; line-height: 1.75; font-size: 1em; text-align: left; text-indent: 0;',
        list: {
            container: 'margin: 1em 0; padding: 0; color: rgba(51, 51, 51, 1);',
            item: 'margin: .45em 0; font-size: 1em; color: rgba(51, 51, 51, 1); line-height: 1.75;',
            taskList: 'list-style: none; margin: .45em 0; font-size: 1em; color: rgba(51, 51, 51, 1); line-height: 1.75;',
        },
        quote: 'margin: 1.25em 0; padding: 1em 1em 1em 1.2em; background: #f7f7f7; border-left: 4px solid #333333; border-radius: 6px; color: #555555; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); word-wrap: break-word;',
        code: {
            header: {
                container: 'margin-bottom: 0; display: flex; gap: 6px;',
                dot: 'display: inline-block; width: 12px; height: 12px; border-radius: 50%;',
                colors: ['#ff5f57', '#febc2e', '#28c840'],
            },
            block: 'color: #334155; background: #f8fafc; border: 1px solid #dbe4f0; border-radius: 8px; margin: 10px 8px; padding: 0; font-size: 90%; line-height: 1.75; overflow-x: auto; white-space: pre; word-break: normal; tab-size: 4; box-shadow: inset 0 0 10px rgba(15, 23, 42, 0.04);',
            inline: 'background: #f3f5f7; padding: .15em .35em; border-radius: 4px; color: rgba(51, 51, 51, 1); font-family: Menlo, Monaco, "Courier New", monospace; font-size: 0.9em;',
        },
        image: 'display: block; max-width: 100%; height: auto; margin: .1em auto .5em; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);',
        link: 'color: #576b95; text-decoration: none;',
        emphasis: {
            strong: 'font-weight: 700; color: #333333;',
            em: 'font-style: italic; color: rgba(51, 51, 51, 1);',
            del: 'text-decoration: line-through; color: rgba(51, 51, 51, 0.72);',
        },
        table: {
            container: 'width: 100%; margin: 1.2em 0; border-collapse: collapse; border: 1px solid #d1d5db;',
            header: 'border: 1px solid #d1d5db; background: #f8fafc; color: rgba(51, 51, 51, 1); font-weight: 700; font-size: 1em; text-align: left;',
            cell: 'border: 1px solid #d1d5db; color: rgba(51, 51, 51, 1); font-size: 1em; text-align: left;',
        },
        hr: 'border: none; border-top: 1px solid #e5e7eb; margin: 2em 0;',
        footnote: {
            ref: 'color: #576b95; text-decoration: none; font-size: 0.9em;',
            backref: 'color: #576b95; text-decoration: none; font-size: 0.9em;',
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
                base: 'margin: 32px 0 0; font-size: 2em; letter-spacing: -0.02em; line-height: 1.5; border-bottom: 1px solid #000000;',
                content: 'font-weight: bold; color: #000000;',
                after: '',
            },
            h2: {
                base: 'margin: 28px 0 0; font-size: 1.5em; letter-spacing: -0.01em; line-height: 1.5; border-bottom: 1px solid #262626;',
                content: 'font-weight: bold; color: #262626;',
                after: '',
            },
            h3: {
                base: 'margin: 24px 0 0; font-size: 1.25em; line-height: 1.5; border-bottom: 1px solid #404040;',
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
                base: 'margin: 32px 0 0; font-size: 2em; letter-spacing: -0.03em; line-height: 1.5; border-bottom: 2px solid #d64b3b;',
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
                base: 'margin: 32px 0 0; font-size: 2em; letter-spacing: -0.03em; line-height: 1.5; border-bottom: 2px solid #553C9A;',
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
        id: 'royal-blue',
        name: '宝蓝',
        isVisible: true,
        isPreset: true,
        container: 'font-size: 16px; color: #4a4a4a; line-height: 1.8; letter-spacing: 0.03em;',
        title: {
            h1: {
                base: 'margin: 32px 0 0; font-size: 2em; letter-spacing: -0.03em; line-height: 1.5; border-bottom: 2px solid #1E90FF;',
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
                base: 'margin: 32px 0 0; font-size: 2em; letter-spacing: -0.03em; line-height: 1.5; border-bottom: 2px solid #2f3437;',
                content: 'font-weight: bold; color: #2f3437;',
                after: '',
            },
            h2: {
                base: 'margin: 28px 0 0; font-size: 1.5em; letter-spacing: -0.02em; border-left: 4px solid #6b7280; padding-left: 12px; line-height: 1.5;',
                content: 'font-weight: bold; color: #3f464a;',
                after: '',
            },
            h3: {
                base: 'margin: 24px 0 0; font-size: 1.25em; letter-spacing: -0.01em; line-height: 1.5;',
                content: 'font-weight: bold; color: #4b5358;',
                after: '',
            },
            base: {
                base: 'margin: 20px 0 0; font-size: 1em; line-height: 1.5;',
                content: 'font-weight: bold; color: #6b7280;',
                after: '',
            },
        },
        paragraph: 'line-height: 1.8; margin-top: 1em; font-size: 1em;',
        list: {
            container: 'padding-left: 32px; color: #4a4a4a;',
            item: 'font-size: 1em; color: #4a4a4a; line-height: 1.8;',
            taskList: 'list-style: none; font-size: 1em; color: #4a4a4a; line-height: 1.8;',
        },
        quote: 'border-left: 4px solid #6b7280; border-radius: 6px; padding: 10px 10px; background: #f4f5f5; margin: 0.8em 0; color: #2f3437; font-style: italic; word-wrap: break-word;',
        code: {
            header: {
                container: 'margin-bottom: 1em; display: flex; gap: 6px;',
                dot: 'display: inline-block; width: 12px; height: 12px; border-radius: 50%;',
                colors: ['#ff5f56', '#ffbd2e', '#27c93f'],
            },
            block: 'color: #2f3437; background: #f4f5f5; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin: 1.2em 0; padding: 1em; font-size: 14px; line-height: 1.6; overflow-x: auto; white-space: pre; word-break: normal; tab-size: 4;',
            inline: 'background: #f4f5f5; padding: 2px 6px; border-radius: 4px; color: #2f3437; font-size: 14px; border: 1px solid #6b7280;',
        },
        image: 'max-width: 100%; height: auto; margin: 1em auto; display: block;',
        link: 'color: #3f464a; text-decoration: none; border-bottom: 1px solid #6b7280;',
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
