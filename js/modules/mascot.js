// mascot.js — 嘉豪吉祥物状态机
// 吉祥物是周三涵表情包风格的卡通形象，全程陪伴：首页迎接、做题反应、开盒转圈
// 状态 → 表情包图/台词 的映射。表情包就位时显示图，否则回退 emoji。
const Mascot = (function () {

  // 状态定义：state → { emoji(回退), line[] }；表情包图由 Sticker.byState 动态取
  const STATES = {
    idle:   { emoji: '😎', lines: ['我就是嘉豪，嘉豪就是我。', '测测你的豪意值？'] },
    peek:   { emoji: '👀', lines: ['这个选项……有内味了。', '嗯哼，继续。'] },
    spin:   { emoji: '🌀', lines: ['正在计算你的豪意值……', '别急，豪气正在凝聚！'] },
    happy:  { emoji: '🤩', lines: ['哇哦！这豪意值！', '牛的牛的！'] },
    cry:    { emoji: '🥲', lines: ['豪意值有点低啊兄弟。', '没事，嘉豪都是练出来的。'] },
    angry:  { emoji: '😤', lines: ['别点了别点了！', '豪哥生气了！'] },
    box:    { emoji: '🎁', lines: ['开盒开盒！你的本命嘉豪是——'] },
  };

  let _el = null;
  let _state = 'idle';
  let _idleTimer = null;

  function init(sel) {
    _el = document.querySelector(sel || '#mascot');
    setState('idle');
    startIdle();
  }

  function setState(state) {
    if (!STATES[state]) state = 'idle';
    _state = state;
    render();
    // 非闲置态 2.5 秒后回到 idle
    clearTimeout(_idleTimer);
    if (state !== 'idle') {
      _idleTimer = setTimeout(() => setState('idle'), 2500);
    }
  }

  function render() {
    if (!_el) return;
    const s = STATES[_state];
    const line = s.lines[Math.floor(Math.random() * s.lines.length)];
    // 优先用表情包图，就位失败回退 emoji
    const emojiSlot = _el.querySelector('.mascot-emoji');
    const stickerFile = (window.Sticker && window.Sticker.ready()) ? window.Sticker.byState(_state) : null;
    if (stickerFile) {
      emojiSlot.innerHTML = window.Sticker.html(stickerFile, 'mascot-sticker', s.emoji);
    } else {
      emojiSlot.textContent = s.emoji;
    }
    _el.querySelector('.mascot-line').textContent = line;
    _el.classList.remove('state-idle','state-peek','state-spin','state-happy','state-cry','state-angry','state-box');
    _el.classList.add('state-' + _state);
  }

  // 闲置时偶尔自言自语
  function startIdle() {
    setInterval(() => {
      if (_state === 'idle') render(); // 换一句台词
    }, 6000);
  }

  function getState() { return _state; }

  return { init, setState, getState };
})();
window.Mascot = Mascot;
