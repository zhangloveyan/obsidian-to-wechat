import type { LanguageFn } from 'highlight.js';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import graphql from 'highlight.js/lib/languages/graphql';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const COMMON_LANGUAGES: Record<string, LanguageFn> = {
    bash,
    c,
    cpp,
    csharp,
    css,
    diff,
    go,
    graphql,
    ini,
    java,
    javascript,
    json,
    markdown,
    plaintext,
    python,
    rust,
    shell,
    sql,
    typescript,
    xml,
    yaml,
};

const LANGUAGE_ALIASES: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    html: 'xml',
};

let registered = false;

export function getHighlighter() {
    if (!registered) {
        Object.entries(COMMON_LANGUAGES).forEach(([name, language]) => {
            hljs.registerLanguage(name, language);
        });
        registered = true;
    }
    return hljs;
}

export function normalizeCodeLanguage(language: string): string {
    const normalized = language.trim().toLowerCase();
    if (!normalized) return 'plaintext';
    return LANGUAGE_ALIASES[normalized] || normalized;
}

