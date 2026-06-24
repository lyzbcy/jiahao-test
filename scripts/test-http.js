// test-http.js — 验证预览服务器的所有资源加载
const http = require('http');
const base = 'http://localhost:8091';
const paths = [
  '/', '/index.html',
  '/js/app.js', '/js/modules/test-engine.js', '/js/modules/labels.js',
  '/js/pages/home.js', '/js/pages/result.js',
  '/js/data/questions.json', '/js/data/labels.json', '/js/data/types.json',
  '/css/style.css', '/css/animations.css',
  '/img/sticker/哈哈哈.png',
];

(async () => {
  let pass = 0, fail = 0;
  for (const p of paths) {
    await new Promise(res => {
      const r = http.get(base + encodeURI(p), resp => {
        let d = '';
        resp.on('data', c => d += c);
        resp.on('end', () => {
          const ok = resp.statusCode === 200;
          const ct = resp.headers['content-type'] || '';
          if (ok) pass++; else fail++;
          console.log((ok ? '✓ OK ' : '✗ FAIL ') + resp.statusCode + ' ' + p + '  [' + ct + ']  ' + (ok ? d.length + 'B' : ''));
          res();
        });
      });
      r.on('error', e => { fail++; console.log('✗ ERR ' + p + ' ' + e.message); res(); });
    });
  }
  console.log('\n通过 ' + pass + ' / 失败 ' + fail);
  process.exit(fail > 0 ? 1 : 0);
})();
