// copy-assets.js — 复制周三涵表情包到项目 img/sticker
// 用 Node 操作，避免中文路径在 PowerShell/cmd 下的乱码坑（skill 铁律）
const fs = require('fs');
const path = require('path');

const SRC_ROOT = 'E:\\星星布丁\\微信表情包';
const DST = path.join(__dirname, '..', 'img', 'sticker');

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

ensureDir(DST);

let copied = 0;
const seen = new Set();

if (!fs.existsSync(SRC_ROOT)) {
  console.warn('[复制] 源目录不存在: ' + SRC_ROOT);
  process.exit(0);
}

// 递归找所有"最终版"目录下的 png
function walk(dir) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full);
    } else if (e.isFile() && /\.png$/i.test(e.name) && /最终版/.test(dir)) {
      if (seen.has(e.name)) return; // 同名只保留第一张
      seen.add(e.name);
      fs.copyFileSync(full, path.join(DST, e.name));
      copied++;
    }
  }
}

walk(SRC_ROOT);
console.log('[复制] 已复制 ' + copied + ' 张表情包到 img/sticker');
