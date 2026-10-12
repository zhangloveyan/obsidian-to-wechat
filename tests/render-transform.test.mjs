import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers.mjs';

const math = loadTs('src/core/transform/math-formula.ts');
class TFile { constructor(path) { this.path = path; } }
const paths = loadTs('src/integrations/obsidian/image-path-resolver.ts', { TFile });

test('math delimiters are normalized without changing code examples', () => {
    const source = ['Inline \\(a+b\\)', '\\[c+d\\]', '`\\(example\\)`', '~~~tex', '\\(code\\)', '~~~'].join('\n');
    const converted = math.preprocessMathFormula(source);
    assert.match(converted, /Inline \$a\+b\$/);
    assert.match(converted, /\$\$c\+d\$\$/);
    assert.match(converted, /`\\\(example\\\)`/);
    assert.deepEqual(math.extractFormulas(converted), [{ tex: 'a+b', isBlock: false }, { tex: 'c+d', isBlock: true }]);
});

test('block formulas are not duplicated as inline formulas', () => {
    assert.deepEqual(math.extractFormulas('A $x$\n\n$$\ny + z\n$$\n\nB $a$ and $b$.'), [
        { tex: 'x', isBlock: false }, { tex: 'y + z', isBlock: true }, { tex: 'a', isBlock: false }, { tex: 'b', isBlock: false },
    ]);
});

test('image paths preserve Chinese names, spaces and encoded literal hash characters', () => {
    assert.equal(paths.normalizeImagePath('<附件/中文%20图片.png?version=1>'), '附件/中文 图片.png');
    assert.equal(paths.normalizeImagePath('assets/a%23b.png#size'), 'assets/a#b.png');
    assert.equal(paths.normalizeMarkdownImageDestinations('![](Pasted image 2026.png)'), '![](<Pasted image 2026.png>)');
    const example = '```md\n![](Pasted image 2026.png)\n```';
    assert.equal(paths.normalizeMarkdownImageDestinations(example), example);
});

test('same-name images resolve relative to the article, never by an arbitrary basename fallback', () => {
    const a = new TFile('a/pic.png'), b = new TFile('b/pic.png');
    const app = { vault: { getFiles: () => [a, b], getAbstractFileByPath: path => [a, b].find(file => file.path === path) },
        metadataCache: { getFirstLinkpathDest: (path, source) => path === 'pic.png' && source === 'b/note.md' ? b : null } };
    assert.equal(paths.resolveImageFile(app, 'pic.png', 'b/note.md').file, b);
    assert.equal(paths.resolveImageFile(app, 'missing/pic.png', 'b/note.md').file, null);
    assert.equal(paths.resolveImageFile(app, 'app://vault/C:/notes/b/pic.png', 'b/note.md').file, b);
});
