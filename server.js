const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const publicDir = path.join(rootDir, 'public');
const envPath = path.join(rootDir, '.env');

function parseEnvFile(content) {
  return content
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith('#'))
    .reduce((acc, line) => {
      const separator = line.indexOf('=');
      if (separator === -1) {
        return acc;
      }

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');

      if (key) {
        acc[key] = value;
      }

      return acc;
    }, {});
}

function loadEnvFile() {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    return parseEnvFile(content);
  } catch {
    return {};
  }
}

const envFromFile = loadEnvFile();
const llmEndpoint = process.env.LLM_ENDPOINT || envFromFile.LLM_ENDPOINT || '';
const port = Number.parseInt(process.env.PORT || envFromFile.PORT || '3000', 10);
const MAX_REQUEST_BODY_SIZE = 1024 * 1024;

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function serveStaticFile(reqPath, res) {
  const normalizedPath = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
  const filePath = path.resolve(publicDir, normalizedPath);
  const relativePath = path.relative(publicDir, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === 'ENOENT') {
        sendJson(res, 404, { error: 'Not found' });
        return;
      }

      sendJson(res, 500, { error: 'Failed to read static file' });
      return;
    }

    const extension = path.extname(filePath);
    const contentTypeByExtension = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8'
    };
    const contentType = contentTypeByExtension[extension] || 'text/plain; charset=utf-8';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': data.length
    });
    res.end(data);
  });
}

async function handleChatRequest(req, res) {
  let rawBody = '';
  req.setEncoding('utf8');

  for await (const chunk of req) {
    rawBody += chunk;
    if (rawBody.length > MAX_REQUEST_BODY_SIZE) {
      sendJson(res, 413, { error: 'Request body too large' });
      return;
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const targetEndpoint = payload.endpoint || llmEndpoint;
  if (!targetEndpoint) {
    sendJson(res, 400, { error: 'No LLM endpoint configured. Set LLM_ENDPOINT in .env or provide endpoint in request.' });
    return;
  }

  const abortController = new AbortController();
  const closeHandler = () => abortController.abort();
  req.on('close', closeHandler);

  try {
    const upstream = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json, text/plain'
      },
      body: JSON.stringify({
        message: payload.message,
        stream: true
      }),
      signal: abortController.signal
    });
    const upstreamType = upstream.headers.get('content-type') || 'text/plain; charset=utf-8';

    res.writeHead(upstream.status, {
      'Content-Type': upstreamType,
      'Cache-Control': 'no-store'
    });

    if (!upstream.body) {
      const text = await upstream.text();
      res.end(text);
      return;
    }

    for await (const chunk of upstream.body) {
      res.write(chunk);
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      const detail = error && typeof error.message === 'string' ? error.message : 'Unknown upstream error';
      sendJson(res, 502, { error: `Failed to reach configured LLM endpoint: ${detail}` });
    } else {
      res.end();
    }
  } finally {
    req.off('close', closeHandler);
  }
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: 'Invalid request' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/config.js') {
    const configScript = `window.APP_CONFIG = ${JSON.stringify({ llmEndpoint })};`;
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Content-Length': Buffer.byteLength(configScript),
      'Cache-Control': 'no-store'
    });
    res.end(configScript);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    handleChatRequest(req, res).catch(() => {
      if (!res.headersSent) {
        sendJson(res, 500, { error: 'Unexpected chat proxy error' });
      } else {
        res.end();
      }
    });
    return;
  }

  if (req.method === 'GET') {
    serveStaticFile(url.pathname, res);
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
});

server.listen(port, '0.0.0.0', () => {
  const address = server.address();
  const resolvedPort = address && typeof address === 'object' ? address.port : port;
  console.log(`Budget AI UI available at http://localhost:${resolvedPort}`);
});
