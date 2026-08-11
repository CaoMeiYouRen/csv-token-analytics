#!/usr/bin/env node
/**
 * Preview launcher: 本地静态服务器，预览 dist/ 构建产物（SPA fallback 到 index.html）
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = process.env.DIST_DIR || path.join(ROOT, 'dist');
const PORT = Number(process.env.PREVIEW_PORT || '8002');

if (!fs.existsSync(DIST)) {
  console.error(`[preview] dist 目录不存在：${DIST}`);
  console.error('[preview] 请先运行 npm run build');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);

  if (!filePath.startsWith(DIST) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    const fallback = path.join(DIST, 'index.html');
    if (fs.existsSync(fallback)) {
      filePath = fallback;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[preview] 端口 ${PORT} 已被占用，请先结束占用进程，或用 PREVIEW_PORT 指定其他端口`);
    console.error('[preview] 示例：PREVIEW_PORT=8003 npm run preview');
  } else {
    console.error(`[preview] 启动失败：${err.message}`);
  }
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`[preview] serving ${DIST}`);
  console.log(`[preview] http://localhost:${PORT}`);
});
