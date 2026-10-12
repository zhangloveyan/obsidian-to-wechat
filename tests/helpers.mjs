import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function loadTs(path, obsidian = {}) {
    const result = buildSync({ entryPoints: [path], bundle: true, platform: 'node', format: 'cjs', external: ['obsidian'], write: false });
    const module = { exports: {} };
    new Function('module', 'exports', 'require', result.outputFiles[0].text)(module, module.exports, name => name === 'obsidian' ? obsidian : require(name));
    return module.exports;
}
