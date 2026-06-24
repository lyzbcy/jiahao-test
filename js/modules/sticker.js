// sticker.js — 嘉豪表情包工具模块
// 统一处理：按情绪/状态取图、中文文件名编码、加载失败回退 emoji
// 表情包来源 img/sticker/（周三涵系列 190 张），索引见 img/sticker/index.json
const Sticker = (function () {

  const BASE = 'img/sticker/';
  const INDEX_URL = BASE + 'index.json';

  let _index = null;        // 情绪索引 {byMood, byState, byDim}
  let _fallback = {};       // 文件名 → emoji 回退映射（加载失败时用）

  async function init() {
    try {
      const res = await fetch(INDEX_URL);
      if (!res.ok) throw new Error('sticker index 加载失败 ' + res.status);
      _index = await res.json();
      console.log('[嘉豪] 表情包索引已加载');
    } catch (e) {
      console.warn('[嘉豪] 表情包索引加载失败，回退 emoji:', e);
      _index = null;
    }
  }

  function ready() { return !!_index; }

  // 把中文文件名转成可用的 URL（encodeURIComponent 处理中文 + ！等符号）
  function url(filename) {
    if (!filename) return '';
    return BASE + encodeURIComponent(filename);
  }

  // 按状态取图（mascot 用）
  function byState(state) {
    if (!_index || !_index.byState) return null;
    return _index.byState[state] || null;
  }

  // 按情绪取一张（随机）
  function byMood(mood) {
    if (!_index || !_index.byMood) return null;
    const arr = _index.byMood[mood];
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 按维度极性取图
  function byDim(key) {
    if (!_index || !_index.byDim) return null;
    return _index.byDim[key] || null;
  }

  /**
   * 渲染一张表情包 HTML
   * @param {string} filename 文件名（如 "哈哈哈.png"），为空返回 ''
   * @param {string} cls 样式类
   * @param {string} altEmoji 加载失败时的回退 emoji
   */
  function html(filename, cls, altEmoji) {
    if (!filename) return altEmoji ? `<span class="${cls||''}">${altEmoji}</span>` : '';
    const clsStr = cls ? 'class="' + cls + '"' : '';
    const fallback = altEmoji || '😎';
    return `<img ${clsStr} src="${url(filename)}" alt="${filename.replace('.png','')}"
      onerror="this.outerHTML='<span class=&quot;${cls||''}&quot;>${fallback}</span>'"
      loading="lazy">`;
  }

  return { init, ready, url, byState, byMood, byDim, html };
})();
window.Sticker = Sticker;
