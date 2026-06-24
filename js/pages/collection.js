// collection.js — 豪型图鉴
// 14 款本命嘉豪全展示，已抽到的高亮，没抽到的灰阶+问号。隐藏款永远问号保神秘
const CollectionPage = (function () {

  function mount(sel) {
    const el = document.querySelector(sel);
    const collected = new Set(
      window.Repo.getLocalHistory().map(r => r.labelId)
    );
    const labels = window.Labels.all();
    // 隐藏款单独显示"已发现 N 款"
    const hiddenFound = labels.filter(d => d.tier === 'ur' && collected.has(d.id)).length;

    el.innerHTML = `
      <div class="page">
        <h1 class="page-title">📖 豪型图鉴</h1>
        <p class="page-sub">共 ${labels.filter(d => d.tier !== 'ur').length} 款本命嘉豪 + 2 款隐藏款 · 你已解锁 ${countUnlocked(labels, collected)}</p>
        <div class="collection-grid">
          ${labels.filter(d => d.tier !== 'ur').map(d => cell(d, collected.has(d.id))).join('')}
        </div>
        <div class="collection-hidden">
          <div class="collection-hidden-title">🌈 隐藏款（${hiddenFound}/2 已发现）</div>
          <div class="collection-grid">
            ${labels.filter(d => d.tier === 'ur').map(() => `
              <div class="cell locked">
                <div class="cell-img"><span class="q-mark">❓</span></div>
                <div class="cell-name">???</div>
              </div>`).join('')}
          </div>
        </div>
        <div class="page-back"><a href="#/" class="btn-ghost">← 回首页</a></div>
      </div>`;
  }

  function countUnlocked(labels, collected) {
    return labels.filter(d => d.tier !== 'ur' && collected.has(d.id)).length;
  }

  function cell(d, has) {
    const tier = window.Labels.tier(d.tier);
    if (has) {
      // 有图显示图，失败回退 emoji
      const visual = (d.img && d.img !== 'emoji')
        ? `<img src="img/labels/${d.img}" alt="${d.name}" onerror="this.outerHTML='${d.emoji || '😎'}'">`
        : (d.emoji || '😎');
      return `
        <div class="cell unlocked ${d.tier}">
          <div class="cell-img" style="border-color:${tier.color}">${visual}</div>
          <div class="cell-name">${d.name}</div>
          <div class="cell-stars" style="color:${tier.color}">${tier.stars || ''}</div>
        </div>`;
    }
    return `
      <div class="cell locked">
        <div class="cell-img"><span class="q-mark">❓</span></div>
        <div class="cell-name">???</div>
        <div class="cell-stars">${tier.stars || ''}</div>
      </div>`;
  }

  return { mount };
})();
window.Pages = window.Pages || {};
window.Pages.collection = CollectionPage;
