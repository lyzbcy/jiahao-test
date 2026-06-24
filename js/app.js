// app.js — 主程序：数据加载 + hash 路由 + start() 初始化序列
// 全局数据挂在 window.JIAHAO_DATA，各模块通过 window 读取
(function () {
  const DATA_FILES = {
    questions: 'js/data/questions.json',
    types:     'js/data/types.json',
    labels:    'js/data/labels.json',
    labelStickers: 'js/data/label-stickers.json',
  };

  // 加载所有数据（并行）
  async function loadAllData() {
    const entries = Object.entries(DATA_FILES);
    const results = await Promise.all(entries.map(async ([key, path]) => {
      const res = await fetch(path);
      if (!res.ok) throw new Error('加载 ' + path + ' 失败: ' + res.status);
      return [key, await res.json()];
    }));
    const data = {};
    results.forEach(([k, v]) => { data[k] = v; });
    window.JIAHAO_DATA = data;
    // 初始化 Labels 模块（接收已加载的 labels + types）
    window.Labels.init(data.labels, data.types);
  }

  // hash 路由
  const routes = {
    '':          () => window.Pages.home.mount('#app'),
    'result':    () => window.Pages.result.mount('#app'),
    'ranking':   () => window.Pages.ranking.mount('#app'),
    'collection':() => window.Pages.collection.mount('#app'),
    'about':     () => window.Pages.about.mount('#app'),
  };

  function router() {
    const hash = location.hash.replace(/^#\/?/, '');
    const name = hash.split('/')[0];
    const route = routes[name] || routes[''];
    try {
      route();
    } catch (e) {
      console.error('[嘉豪] 路由错误:', e);
      const el = document.querySelector('#app');
      if (el) el.innerHTML = `<div class="empty">页面出错了：${escapeHtml(String(e))}<br><a href="#/">回首页</a></div>`;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // 启动序列
  async function start() {
    // 1. 加载数据（必须先完成，页面渲染依赖）
    try {
      await loadAllData();
    } catch (e) {
      const el = document.querySelector('#app');
      el.innerHTML = `<div class="empty">数据加载失败：${escapeHtml(String(e))}<br>请通过本地预览服务器打开，不要直接双击 index.html。</div>`;
      return;
    }
    // 2. 初始化云后端（失败不阻塞，自动回退 localStorage）
    try { await window.SupabaseConfig.init(); } catch (e) { /* 静默回退 */ }
    // 3. 初始化表情包索引（失败不阻塞，回退 emoji）
    try { await window.Sticker.init(); } catch (e) { /* 静默回退 */ }
    // 4. 表情包随机掉落（失败不阻塞）
    try { window.StickerRain.init(); } catch (e) { /* 静默 */ }
    // 5. 吉祥物
    try { window.Mascot.init('#mascot'); } catch (e) { /* 忽略 */ }
    // 6. 路由
    window.addEventListener('hashchange', router);
    router();
  }

  // DOM ready 后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // 全局 App 对象：供导航栏 onclick 调用（加群/赞赏弹窗）
  const App = {
    openReward() { openModal('reward-modal'); },
    closeReward() { closeModal('reward-modal'); },
    openQq() { openModal('qq-modal'); },
    closeQq() { closeModal('qq-modal'); },
  };
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('hidden', 'fade-out');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('fade-out');
    document.body.style.overflow = '';
    setTimeout(() => m.classList.add('hidden'), 250);
  }
  window.App = App;
})();
