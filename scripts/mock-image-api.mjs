import http from 'node:http';
import { URL } from 'node:url';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.MOCK_IMAGE_API_PORT || '8787', 10);
const tasks = new Map();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${host}:${port}`);

    if (req.method === 'POST' && url.pathname === '/v1/images/generations') {
      const body = await readJsonBody(req);
      const prompt = String(body.prompt || '').trim();
      if (!prompt) {
        sendJson(res, 400, { error: 'prompt is required' });
        return;
      }

      const taskId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      tasks.set(taskId, {
        task_id: taskId,
        status: 'completed',
        prompt,
        model: String(body.model || 'mock'),
        created_at: Date.now(),
      });

      sendJson(res, 200, {
        data: {
          task_id: taskId,
          status: 'processing',
        },
      });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/v1/tasks/')) {
      const taskId = decodeURIComponent(url.pathname.replace('/v1/tasks/', ''));
      const task = tasks.get(taskId);
      if (!task) {
        sendJson(res, 404, { error: `task not found: ${taskId}` });
        return;
      }

      sendJson(res, 200, {
        data: {
          task_id: task.task_id,
          status: 'completed',
          output: [`http://${host}:${port}/images/${encodeURIComponent(task.task_id)}.svg`],
        },
      });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/images/')) {
      const fileName = decodeURIComponent(url.pathname.split('/').pop() || '');
      const taskId = fileName.replace(/\.svg$/i, '');
      const task = tasks.get(taskId);
      if (!task) {
        sendText(res, 404, 'image not found');
        return;
      }

      const svg = renderSvg(task.prompt, task.task_id, task.model);
      res.writeHead(200, {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(svg);
      return;
    }

    sendJson(res, 404, {
      error: 'not found',
      routes: [
        'POST /v1/images/generations',
        'GET /v1/tasks/:task_id',
        'GET /images/:task_id.svg',
      ],
    });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(port, host, () => {
  console.log(`Mock image API listening on http://${host}:${port}`);
  console.log('Use this as image API base URL in plugin settings.');
});

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error(`invalid JSON body: ${error.message}`));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(text);
}

function renderSvg(prompt, taskId, model) {
  const escapedPrompt = escapeXml(prompt);
  const escapedTaskId = escapeXml(taskId);
  const escapedModel = escapeXml(model);
  const promptLines = wrapText(escapedPrompt, 32).slice(0, 6);
  const promptTspans = promptLines
    .map((line, index) => `<tspan x="64" dy="${index === 0 ? 0 : 34}">${line}</tspan>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f6f8fa"/>
      <stop offset="100%" stop-color="#dbeafe"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="42" y="42" width="1196" height="636" rx="28" fill="#ffffff" stroke="#2563eb" stroke-width="4"/>
  <text x="64" y="112" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#111827">Mock Image API</text>
  <text x="64" y="164" font-family="Arial, sans-serif" font-size="20" fill="#4b5563">task_id: ${escapedTaskId}</text>
  <text x="64" y="198" font-family="Arial, sans-serif" font-size="20" fill="#4b5563">model: ${escapedModel}</text>
  <text x="64" y="276" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#1d4ed8">Prompt</text>
  <text x="64" y="328" font-family="Arial, 'Microsoft YaHei', sans-serif" font-size="28" fill="#111827">${promptTspans}</text>
</svg>
`;
}

function wrapText(text, maxLength) {
  const chars = Array.from(text);
  const lines = [];
  for (let index = 0; index < chars.length; index += maxLength) {
    lines.push(chars.slice(index, index + maxLength).join(''));
  }
  return lines.length > 0 ? lines : [''];
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
