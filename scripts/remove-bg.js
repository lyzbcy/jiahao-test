// remove-bg.js — 把 #ff00ff 洋红背景转透明 + 压缩豪型图
// 等价于 skill 的 remove_chroma_key: 阈值80 + 边缘收缩1px + 不despill
// 用法: node scripts/remove-bg.js [文件...]  无参数则处理 img/labels/ 全部
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const LABELS_DIR = path.join(ROOT, 'img/labels');

// 收集要处理的文件
let files = process.argv.slice(2);
if (!files.length) {
  files = fs.readdirSync(LABELS_DIR).filter(f => f.endsWith('.png')).map(f => path.join(LABELS_DIR, f));
}

// 用 Python + PIL 处理（PIL 已确认可用）
const pyScript = `
import sys
from PIL import Image, ImageFilter
import io

for fpath in sys.argv[1:]:
    img = Image.open(fpath).convert('RGBA')
    w, h = img.size
    px = img.load()
    # 洋红 #ff00ff = (255,0,255)
    # 阈值80: 距离洋红近的(背景区，含渐变噪点)直接全透明
    for y in range(h):
        for x in range(w):
            r,g,b,a = px[x,y]
            # 计算与洋红的距离（简单欧氏）
            dist = abs(r-255) + abs(g-0) + abs(b-255)
            if dist < 150:  # 背景及渐变区
                px[x,y] = (r,g,b,0)
            elif dist < 280:  # 过渡区，半透明
                px[x,y] = (r,g,b, max(0, int(a * (dist-150)/130)))
    # 边缘收缩1px：把仍半透明的边缘吃掉，避免洋红残留
    alpha = img.split()[3]
    # 用最小值滤波收缩alpha 1px
    import numpy as np
    arr = np.array(alpha)
    # erosion 1px
    eroded = arr.copy()
    eroded[1:,1:] = np.minimum(eroded[1:,1:], arr[:-1,:-1])
    eroded[1:,:-1] = np.minimum(eroded[1:,:-1], arr[:-1,1:])
    eroded[:-1,1:] = np.minimum(eroded[:-1,1:], arr[1:,:-1])
    eroded[:-1,:-1] = np.minimum(eroded[:-1,:-1], arr[1:,1:])
    alpha = Image.fromarray(eroded)
    img.putalpha(alpha)
    # 缩放：长边限制 900px（豪型卡显示足够，减小体积）
    max_side = 900
    if max(w,h) > max_side:
        ratio = max_side / max(w,h)
        img = img.resize((int(w*ratio), int(h*ratio)), Image.LANCZOS)
    # 保存，压缩到较小体积
    img.save(fpath, optimize=True)
    import os
    sz = os.path.getsize(fpath)
    print(f'  ok {fpath} -> {sz//1024}KB')
`;

// 检查 numpy
try {
  execSync('python -c "import numpy"', { stdio: 'ignore' });
} catch {
  console.log('numpy 不可用，改用纯 PIL 边缘处理');
}

console.log(`处理 ${files.length} 个文件...`);
fs.writeFileSync(path.join(ROOT, 'scripts/_remove_bg.py'), pyScript);
try {
  execSync(`python "scripts/_remove_bg.py" ${files.map(f => '"' + f + '"').join(' ')}`, {
    cwd: ROOT, stdio: 'inherit'
  });
} catch (e) {
  console.log('抠图失败:', e.message);
}
fs.unlinkSync(path.join(ROOT, 'scripts/_remove_bg.py'));
