// ranking.js — 豪意值云排行榜
const RankingPage = (function () {

  function mount(sel) {
    const el = document.querySelector(sel);
    el.innerHTML = `
      <div class="page">
        <h1 class="page-title">🏆 豪意榜</h1>
        <p class="page-sub" id="rankSource">载入中…</p>
        <div id="rankList" class="rank-list"></div>
        <div class="page-back"><a href="#/" class="btn-ghost">← 回首页</a></div>
      </div>`;
    load(el);
  }

  async function load(el) {
    try {
      const { source, rows } = await window.Repo.getRanking(50);
      const srcEl = document.getElementById('rankSource');
      srcEl.textContent = source === 'cloud'
        ? '全网实时榜（按豪意值降序）'
        : '本机记录榜（未连接云端）';

      const list = document.getElementById('rankList');
      if (!rows.length) {
        list.innerHTML = `<div class="empty">还没有人上榜，快去做题抢占榜首！</div>`;
        return;
      }
      list.innerHTML = rows.map((r, i) => {
        const tier = window.Labels.tier(r.tier);
        const name = r.nickname || ('匿名嘉豪' + (1000 + i));
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span class="rank-no">${i + 1}</span>`;
        return `
          <div class="rank-row ${i < 3 ? 'rank-top' : ''}">
            <div class="rank-medal">${medal}</div>
            <div class="rank-info">
              <div class="rank-name">${escapeHtml(name)}</div>
              <div class="rank-meta">
                <span style="color:${tier.color}">${tier.stars || ''}</span>
                ${r.label_id ? `<span class="rank-label">${escapeHtml((window.Labels.get(r.label_id) || {}).name || r.label_id)}</span>` : ''}
                <span class="rank-code">${r.code || ''}</span>
              </div>
            </div>
            <div class="rank-haoyi" style="color:${tier.color}">${r.haoyi}</div>
          </div>`;
      }).join('');
    } catch (e) {
      document.getElementById('rankList').innerHTML =
        `<div class="empty">榜单加载失败：${escapeHtml(String(e))}</div>`;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { mount };
})();
window.Pages = window.Pages || {};
window.Pages.ranking = RankingPage;
