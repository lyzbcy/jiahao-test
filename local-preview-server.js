// local-preview-server.js — 零依赖 Node 本地预览服务
// 特性：UTF-8 响应头 / 目录→index.html / 端口冲突自动回退 / 防目录穿越 / no-cache
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = __dirname;
const PORT_FALLBACKS = [8091, 8092, 8093, 8094, 8095, 3000, 5000];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

// 路由别名
const ALIAS = { '/': '/index.html' };

function resolveFile(urlPath) {
  let p = ALIAS[urlPath] || urlPath;
  // 去掉 query
  p = p.split('?')[0];
  // 防目录穿越
  const fp = path.normalize(path.join(PROJECT_ROOT, decodeURIComponent(p)));
  if (!fp.startsWith(PROJECT_ROOT)) return null;

  if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return fp;
  // 目录 → index.html（SPA 刷新不 404）
  const idx = path.join(fp, 'index.html');
  if (fs.existsSync(idx)) return idx;
  return null;
}

function sendFile(res, fp) {
  const ext = path.extname(fp).toLowerCase();
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(500); res.end('500'); return; }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const fp = resolveFile(req.url);
  if (!fp) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p><a href="/">回首页</a></p>');
    return;
  }
  sendFile(res, fp);
});

function listen(port) {
  server.listen(port, () => {
    const url = 'http://localhost:' + port;
    console.log('========================================');
    console.log('  嘉豪值测试 · 本地预览已启动');
    console.log('  地址: ' + url);
    console.log('  按 Ctrl+C 停止');
    console.log('========================================');
    // 尝试打开浏览器
    const open = require === undefined ? null : null;
    try {
      const { exec } = require('child_process');
      const cmd = process.platform === 'win32' ? 'start ""' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
      exec(cmd + ' "' + url + '"');
    } catch (e) { /* 忽略，手动打开 */ }
  });
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      const next = PORT_FALLBACKS[PORT_FALLBACKS.indexOf(port) + 1];
      if (next) {
        console.log('端口 ' + port + ' 被占用，尝试 ' + next + ' ...');
        listen(next);
      } else {
        console.error('所有端口均被占用，请手动释放或修改 PORT_FALLBACKS');
      }
    } else {
      console.error(e);
    }
  });
}

listen(PORT_FALLBACKS[0]);
