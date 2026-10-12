import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers.mjs';

const settings = { baseUrl: 'https://example.test', apiKey: 'private-test-key', model: 'test-model', size: '16:9', resolution: '2K', timeoutSeconds: 1, pollIntervalSeconds: 1 };
const response = (body, status = 200) => ({ text: JSON.stringify(body), status });
function setup(transport) {
    const { ImageGenerationClient } = loadTs('src/features/image-generation/image-generation-client.ts', { requestUrl: transport });
    return new ImageGenerationClient(settings);
}

test('APIMart requests use the configured model and only download the result image without credentials', async () => {
    const calls = [];
    const client = setup(async request => {
        calls.push(request);
        return calls.length === 1 ? response({ data: { status: 'completed', result: { images: [{ url: ['https://images.test/result.png'] }] } } }) :
            { status: 200, headers: { 'content-type': 'image/png' }, arrayBuffer: new Uint8Array([137, 80, 78, 71]).buffer };
    });
    const image = await client.generateImage('test prompt');
    assert.equal(calls[0].url, settings.baseUrl + '/v1/images/generations');
    assert.deepEqual(JSON.parse(calls[0].body), { model: 'test-model', prompt: 'test prompt', size: '16:9', resolution: '2K', n: 1 });
    assert.equal(calls[0].headers.Authorization, 'Bearer ' + settings.apiKey);
    assert.equal(calls[1].headers, undefined);
    assert.equal(image.extension, '.png');
});

test('HTTP and provider errors identify the stage and never disclose API keys', async () => {
    for (const status of [200, 401, 403, 429, 500]) {
        const client = setup(async () => response({ error: { message: 'permission denied for ' + settings.apiKey } }, status));
        await assert.rejects(client.generateImage('test'), error => {
            assert.match(error.message, /提交图片生成任务/);
            assert.match(error.message, /permission denied/);
            assert.ok(!error.message.includes(settings.apiKey));
            if (status !== 200) assert.ok(error.message.includes('HTTP ' + status));
            return true;
        });
    }
});

test('invalid response formats and missing task identifiers fail explicitly', async () => {
    await assert.rejects(setup(async () => ({ status: 200, text: '<html>proxy</html>' })).generateImage('test'), /有效 JSON/);
    await assert.rejects(setup(async () => response({ data: [] })).generateImage('test'), /task_id/);
    await assert.rejects(setup(async () => response({ status: 'completed', url: 'https://unrelated.test' })).generateImage('test'), /没有可下载图片/);
});

test('cancelled generation never makes a network request', async () => {
    let calls = 0;
    const controller = new AbortController(); controller.abort();
    await assert.rejects(setup(async () => { calls++; }).generateImage('test', undefined, controller.signal), /停止/);
    assert.equal(calls, 0);
});

test('task polling downloads only after completion and reports task progress', async () => {
    const previous = globalThis.window;
    globalThis.window = { setTimeout: callback => setTimeout(callback, 0), clearTimeout };
    try {
        const calls = [], progress = [];
        const client = setup(async request => {
            calls.push(request.url);
            if (calls.length === 1) return response({ data: [{ task_id:'task-123', status:'processing' }] });
            if (calls.length === 2) return response({ data: { status:'completed', output:['https://images.test/ready.png'] } });
            return { status:200, headers:{ 'content-type':'image/png' }, arrayBuffer:new Uint8Array([137,80,78,71]).buffer };
        });
        await client.generateImage('test', message => progress.push(message));
        assert.equal(calls[1], settings.baseUrl + '/v1/tasks/task-123');
        assert.equal(calls[2], 'https://images.test/ready.png');
        assert.match(progress.join(' '), /task-123.*completed/);
    } finally { globalThis.window = previous; }
});
