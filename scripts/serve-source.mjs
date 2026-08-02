import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.argv[2] ?? 8765);
const bindAddress = process.argv[3] ?? '0.0.0.0';
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Port must be an integer between 1 and 65535.');
}

const scriptDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const sourceDir = resolve(scriptDir, '..', 'source');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }

  const filePath = resolve(sourceDir, `.${pathname}`);
  if (filePath !== sourceDir && !filePath.startsWith(`${sourceDir}${sep}`)) {
    response.writeHead(403).end();
    return;
  }

  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    response.writeHead(404).end();
    return;
  }

  if (!stats.isFile()) {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, {
    'Content-Length': stats.size,
    'Content-Type': contentTypes[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use.`);
    process.exitCode = 1;
    return;
  }

  throw error;
});

server.listen(port, bindAddress, () => {
  console.log(`Serving source on http://${bindAddress}:${port}/`);
  console.log(`Local: http://127.0.0.1:${port}/online/t0t1.json`);

  if (bindAddress === '0.0.0.0') {
    const addresses = Object.values(networkInterfaces())
      .flat()
      .filter((address) => address?.family === 'IPv4' && !address.internal)
      .map((address) => address.address);

    for (const address of addresses) {
      console.log(`LAN:   http://${address}:${port}/online/t0t1.json`);
    }
  }

  console.log('Press Ctrl+C to stop the server.');
});
