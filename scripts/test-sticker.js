// test-sticker.js — 测试中文文件名表情包能否通过 HTTP 加载
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const stickerDir = path.join(ROOT, 'img', 'sticker');
const files = fs.readdirSync(stickerDir).filter(f => /\.png$/i.test(f));
console.log('sticker 目录共 ' + files.length + ' 张，测试前 5 张能否 HTTP 加载：');

const base = 'http://localhost:8091';
(async () => {
  for (const f of files.slice(0, 5)) {
    await new Promise(res => {
      http.get(base + '/img/sticker/' + encodeURIComponent(f), resp => {
        let d = '';
        resp.on('data', c => d += c);
        resp.on('end', () => {
          console.log((resp.statusCode === 200 ? '✓ ' : '✗ ') + resp.statusCode + ' ' + f + ' [' + (resp.headers['content-type'] || '') + ']');
          res();
        });
      }).on('error', e => { console.log('✗ ERR ' + f + ' ' + e.message); res(); });
    });
  }
})();
