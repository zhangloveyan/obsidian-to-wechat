import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers.mjs';

const prompts = loadTs('src/features/image-generation/prompt-extractor.ts');
const { ImageGenerationService } = loadTs('src/features/image-generation/image-generation-service.ts');
const line = value => '<!-- image-prompt: ' + value + ' -->';

function setup(markdown, generate) {
    const state = { markdown, saved: [], calls: 0 };
    const file = { path: '2026/article.md', basename: 'article' };
    const app = { vault: {
        read: async () => state.markdown,
        process: async (_file, update) => { state.markdown = update(state.markdown); return state.markdown; },
        adapter: { exists: async () => true },
        createFolder: async () => {},
        createBinary: async path => { state.saved.push(path); },
    } };
    const service = new ImageGenerationService(app, { getSettings: () => ({ imageGeneration: {} }) }, () => ({
        generateImage: async () => {
            state.calls++;
            await generate?.(state);
            return { data: new ArrayBuffer(4), extension: '.png', outputUrl: 'https://example.test/generated.png' };
        },
    }));
    return { state, file, service };
}

test('prompt examples in code fences and ordinary comments are not generated', () => {
    const markdown = ['```md', line('example'), '```', '~~~', line('example'), '~~~', '    ' + line('indented'), '<!--', line('nested'), '-->', line('real')].join('\n');
    assert.deepEqual(prompts.collectImagePromptEntries(markdown).map(p => p.prompt), ['real']);
});

test('stale lines cannot overwrite prose and malformed prompts cannot escape comments', () => {
    assert.throws(() => prompts.updatePromptLine('BODY', 0, 'picture'));
    assert.throws(() => prompts.upsertImageForPrompt('BODY', 0, '![](a.png)'));
    assert.throws(() => prompts.formatImagePromptLine('hello --> altered'));
});

test('prompt updates preserve CRLF and trailing newline', () => {
    assert.equal(prompts.updatePromptLine(line('a') + '\r\nBODY\r\n', 0, 'b'), line('b') + '\r\nBODY\r\n');
});

test('batch generation preserves prose and repeated prompt identities after insertions', async () => {
    const { state, file, service } = setup([line('same'), 'BODY A', line('same'), 'BODY B'].join('\n'));
    const tasks = await service.getTasks(file);
    await service.generateAll(file, tasks);
    assert.equal(state.calls, 2);
    assert.ok(state.markdown.includes('BODY A'));
    assert.ok(state.markdown.includes('BODY B'));
    assert.equal(prompts.collectImagePromptEntries(state.markdown).length, 2);
    assert.equal(tasks.filter(t => t.status === 'generated').length, 2);
    assert.equal((state.markdown.match(/!\[\]/g) || []).length, 2);
});

test('edits before the prompt are rebased without deleting user text', async () => {
    const { state, file, service } = setup(line('a') + '\nBODY', state => { state.markdown = 'NEW\n' + state.markdown; });
    const [task] = await service.getTasks(file);
    await service.generate(file, task, task.prompt);
    assert.equal(task.status, 'generated');
    assert.ok(state.markdown.startsWith('NEW\n' + line('a')));
    assert.ok(state.markdown.endsWith('BODY'));
});

test('editing a prompt during generation preserves the image but does not overwrite the article', async () => {
    const { state, file, service } = setup(line('a') + '\nBODY', state => { state.markdown = line('changed') + '\nBODY'; });
    const [task] = await service.getTasks(file);
    await service.generate(file, task, task.prompt);
    assert.equal(task.status, 'failed');
    assert.equal(state.saved.length, 1);
    assert.equal(state.markdown, line('changed') + '\nBODY');
    assert.match(task.detail, /图片已保留/);
});

test('duplicate clicks do not submit another request; reopening retains running tasks', async () => {
    let finish;
    const wait = new Promise(resolve => { finish = resolve; });
    const { state, file, service } = setup(line('a'), () => wait);
    const tasks = await service.getTasks(file);
    const job = service.generate(file, tasks[0], 'a');
    await service.generate(file, tasks[0], 'a');
    assert.equal(await service.getTasks(file), tasks);
    finish();
    await job;
    assert.equal(state.calls, 1);
});

test('plugin unload prevents pending tasks from writing files or article', async () => {
    const { state, file, service } = setup(line('a'), () => service.dispose());
    const [task] = await service.getTasks(file);
    await service.generate(file, task, task.prompt);
    assert.equal(task.status, 'failed');
    assert.equal(state.saved.length, 0);
    assert.equal(state.markdown, line('a'));
});

test('reopening retains completed and failed job details until explicitly refreshed', async () => {
    const { state, file, service } = setup(line('a'), state => { state.markdown = line('changed'); });
    const [task] = await service.getTasks(file);
    await service.generate(file, task, task.prompt);
    assert.equal(task.status, 'failed');
    assert.equal((await service.getTasks(file))[0], task);
    assert.match(task.detail, /图片已保留/);
    const [current] = await service.reloadTasks(file);
    assert.equal(current.prompt, 'changed');
    assert.equal(current.status, 'idle');
    assert.equal(state.saved.length, 1);
});

test('concurrent openings share one task registry', async () => {
    const { file, service } = setup(line('a'));
    const [a, b] = await Promise.all([service.getTasks(file), service.getTasks(file)]);
    assert.equal(a, b);
});
