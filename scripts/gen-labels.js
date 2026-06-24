// gen-labels.js — 批量调用 codex 生成豪型主图
// 读 scripts/gen-labels.json 配置，逐款调用 codex exec 生图，自动复制到 img/labels/
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BASE = 'C:/Users/24676/Desktop/豪base.png';
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/gen-labels.json'), 'utf8'));
const GEN_DIR = 'C:/Users/24676/.codex/generated_images';
const LABELS_DIR = path.join(ROOT, 'img/labels');

fs.mkdirSync(LABELS_DIR, { recursive: true });

let ok = 0, fail = 0;
CONFIG.forEach((item, i) => {
  const outPath = path.join(LABELS_DIR, item.id + '.png');
  // 已存在则跳过（避免重复生成）
  if (fs.existsSync(outPath)) {
    console.log(`[${i+1}/${CONFIG.length}] ${item.id} 已存在，跳过`);
    ok++;
    return;
  }
  console.log(`[${i+1}/${CONFIG.length}] 生成 ${item.id}（${item.name}）...`);
  try {
    // 调用 codex，prompt 通过 stdin 传
    execSync(`codex exec --enable image_generation --skip-git-repo-check -i "${BASE}"`, {
      input: item.prompt,
      cwd: ROOT,
      stdio: ['pipe', 'ignore', 'ignore'],
      timeout: 180000,
    });
    // 找最新生成的图（按修改时间）
    const sessions = fs.readdirSync(GEN_DIR).map(d => ({
      dir: path.join(GEN_DIR, d),
      mtime: fs.statSync(path.join(GEN_DIR, d)).mtime
    })).sort((a, b) => b.mtime - a.mtime);
    let found = null;
    for (const s of sessions) {
      const pngs = fs.readdirSync(s.dir).filter(f => f.endsWith('.png'));
      if (pngs.length) {
        // 取最新的
        const newest = pngs.map(p => ({
          file: p, mtime: fs.statSync(path.join(s.dir, p)).mtime
        })).sort((a, b) => b.mtime - a.mtime)[0];
        found = path.join(s.dir, newest.file);
        break;
      }
    }
    if (found && fs.existsSync(found)) {
      fs.copyFileSync(found, outPath);
      const sz = (fs.statSync(outPath).size / 1024).toFixed(0);
      console.log(`  ✓ 复制到 ${outPath} (${sz}KB)`);
      ok++;
    } else {
      console.log(`  ✗ 未找到生成图`);
      fail++;
    }
  } catch (e) {
    console.log(`  ✗ 失败: ${String(e.message).slice(0, 100)}`);
    fail++;
  }
});

console.log(`\n完成：成功 ${ok} / 失败 ${fail}`);
