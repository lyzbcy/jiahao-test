// sticker-rain.js — 迷你表情包随机掉落
// 页面加载后，迷你表情从屏幕顶部随机位置飘落，营造嘉豪氛围
// 复用已上线的 img/sticker/ 表情包 + Sticker 模块取图能力
const StickerRain = (function () {

  let _pool = [];        // 可掉落的表情文件名池
  let _activeCount = 0;  // 当前屏上的表情数
  let _timer = null;
  const MAX_ACTIVE = 8;     // 同时屏上最多 8 个，避免遮挡内容
  const MIN_INTERVAL = 1200; // 最快 1.2 秒一个
  const MAX_INTERVAL = 3500; // 最慢 3.5 秒一个

  // 从 Sticker 模块的表情索引收集可用文件名
  function buildPool() {
    _pool = [];
    if (!window.Sticker || !window.Sticker.ready()) return;
    // Sticker 没暴露原始 index，这里用已知情绪分类拼出文件池
    // 取各类情绪里的表情，够丰富即可
    const moods = ['happy','smug','focus','cool','shy','shock','thinking','cute','wave','encourage','food'];
    const seen = new Set();
    moods.forEach(m => {
      // 借 byMood 逻辑：直接读 index.json 缓存
    });
    // 直接读全局表情索引（Sticker 内部 _index）
    // 为解耦，这里独立 fetch 一次 index.json
  }

  // 独立加载表情池（不依赖 Sticker 内部状态，更稳健）
  async function loadPool() {
    try {
      const res = await fetch('img/sticker/index.json');
      const idx = await res.json();
      const seen = new Set();
      if (idx.byMood) {
        Object.values(idx.byMood).forEach(arr => arr.forEach(f => seen.add(f)));
      }
      _pool = [...seen];
    } catch (e) {
      console.warn('[嘉豪] 表情掉落池加载失败:', e);
    }
  }

  function start() {
    if (_timer) return;
    scheduleNext();
  }

  function stop() {
    if (_timer) { clearTimeout(_timer); _timer = null; }
  }

  function scheduleNext() {
    const delay = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
    _timer = setTimeout(() => {
      if (_activeCount < MAX_ACTIVE) dropOne();
      scheduleNext();
    }, delay);
  }

  function dropOne() {
    if (!_pool.length) return;
    const file = _pool[Math.floor(Math.random() * _pool.length)];
    const url = 'img/sticker/' + encodeURIComponent(file);

    const el = document.createElement('img');
    el.src = url;
    el.className = 'sticker-rain';
    el.alt = '';
    el.loading = 'lazy';
    // 随机起始位置（横向 5%-90%）、大小、旋转、下落时长
    const leftPct = 5 + Math.random() * 85;
    const size = 28 + Math.random() * 28;       // 28-56px 迷你
    const duration = 6 + Math.random() * 6;      // 6-12 秒落完
    const drift = (Math.random() - 0.5) * 120;   // 横向漂移 -60~60px
    const rotate = (Math.random() - 0.5) * 60;   // 旋转角度
    el.style.left = leftPct + '%';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.setProperty('--rain-duration', duration + 's');
    el.style.setProperty('--rain-drift', drift + 'px');
    el.style.setProperty('--rain-rotate', rotate + 'deg');

    // 加载失败就丢弃（不显示坏图标）
    el.onerror = () => el.remove();
    el.onload = () => {
      _activeCount++;
      document.body.appendChild(el);
      // 动画结束后清理
      el.addEventListener('animationend', () => {
        el.remove();
        _activeCount = Math.max(0, _activeCount - 1);
      });
    };
  }

  async function init() {
    await loadPool();
    if (_pool.length) {
      console.log('[嘉豪] 表情掉落就绪，池子 ' + _pool.length + ' 张');
      start();
    }
  }

  return { init, start, stop };
})();
window.StickerRain = StickerRain;
