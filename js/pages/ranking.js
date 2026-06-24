// ranking.js — 豪意值云排行榜（豪意榜 + 省份榜 + 点击查看详情）
const RankingPage = (function () {

  function mount(sel) {
    const el = document.querySelector(sel);
    el.innerHTML = `
      <div class="page">
        <h1 class="page-title">🏆 豪意榜</h1>
        <div class="rank-tabs">
          <button class="rank-tab active" data-tab="haoyi">🥷 豪意榜</button>
          <button class="rank-tab" data-tab="province">🗺️ 省份榜</button>
        </div>
        <p class="page-sub" id="rankSource">载入中…</p>
        <div id="rankList" class="rank-list"></div>
        <div class="page-back"><a href="#/" class="btn-ghost">← 回首页</a></div>
      </div>`;
    // tab 切换
    el.querySelectorAll('.rank-tab').forEach(btn => {
      btn.onclick = () => {
        el.querySelectorAll('.rank-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        load(el, btn.dataset.tab);
      };
    });
    load(el, 'haoyi');
  }

  async function load(el, tab) {
    const list = document.getElementById('rankList');
    const srcEl = document.getElementById('rankSource');
    list.innerHTML = `<div class="empty">载入中…</div>`;
    try {
      if (tab === 'province') {
        await loadProvince(srcEl, list);
      } else {
        await loadHaoyi(srcEl, list);
      }
    } catch (e) {
      list.innerHTML = `<div class="empty">榜单加载失败：${escapeHtml(String(e))}</div>`;
    }
  }

  // 豪意榜
  async function loadHaoyi(srcEl, list) {
    const { source, rows } = await window.Repo.getRanking(50);
    srcEl.textContent = source === 'cloud'
      ? `全网实时榜 · 共 ${rows.length} 位嘉豪（点击查看详情）`
      : '本机记录榜（未连接云端）';
    if (!rows.length) {
      list.innerHTML = `<div class="empty">还没有人上榜，快去做题抢占榜首！</div>`;
      return;
    }
    list.innerHTML = rows.map((r, i) => {
      const tier = window.Labels.tier(r.tier);
      const name = r.nickname || ('匿名嘉豪' + (1000 + i));
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span class="rank-no">${i + 1}</span>`;
      const labelName = r.label_id ? (window.Labels.get(r.label_id) || {}).name : '';
      return `
        <div class="rank-row ${i < 3 ? 'rank-top' : ''}" data-detail="${makeDetail(r)}">
          <div class="rank-medal">${medal}</div>
          <div class="rank-info">
            <div class="rank-name">${escapeHtml(name)}</div>
            <div class="rank-meta">
              <span style="color:${tier.color}">${tier.stars || ''}</span>
              ${labelName ? `<span class="rank-label">${escapeHtml(labelName)}</span>` : ''}
              <span class="rank-code">${r.code || ''}</span>
            </div>
          </div>
          <div class="rank-haoyi" style="color:${tier.color}">${r.haoyi}</div>
        </div>`;
    }).join('');
    bindDetailClick(list);
  }

  // 省份榜（按平均豪意值降序）
  async function loadProvince(srcEl, list) {
    const { source, rows } = await window.Repo.getProvinceRanking();
    srcEl.textContent = source === 'cloud'
      ? `各省份豪意平均值榜（共 ${rows.length} 个省份）`
      : '本机模式暂无省份榜（需连接云端）';
    if (!rows.length) {
      list.innerHTML = `<div class="empty">还没有省份数据，多拉点人来测吧～</div>`;
      return;
    }
    list.innerHTML = rows.map((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `<span class="rank-no">${i + 1}</span>`;
      return `
        <div class="rank-row ${i < 3 ? 'rank-top' : ''}">
          <div class="rank-medal">${medal}</div>
          <div class="rank-info">
            <div class="rank-name">${escapeHtml(p.province)}</div>
            <div class="rank-meta"><span>${p.count} 位嘉豪参与</span></div>
          </div>
          <div class="rank-haoyi">${p.avg}<span class="rank-haoyi-sub">平均</span></div>
        </div>`;
    }).join('');
  }

  // 拼详情数据（联系方式/省份/豪型），存进 data-*
  function makeDetail(r) {
    const parts = [];
    if (r.province) parts.push('📍 ' + r.province);
    if (r.contact && r.contact_type) {
      const typeMap = { douyin: '抖音', qq: 'QQ', wechat: '微信', email: '邮箱' };
      parts.push((typeMap[r.contact_type] || r.contact_type) + '：' + r.contact);
    } else if (r.contact) {
      parts.push('联系：' + r.contact);
    }
    if (r.code) parts.push('豪型 ' + r.code);
    if (!parts.length) parts.push('这位嘉豪很低调，什么都没留～');
    return escapeHtml(parts.join(' | '));
  }

  // 点击行展开/收起详情
  function bindDetailClick(list) {
    list.querySelectorAll('.rank-row[data-detail]').forEach(row => {
      row.onclick = () => {
        const existing = row.querySelector('.rank-detail');
        if (existing) { existing.remove(); return; }
        const d = document.createElement('div');
        d.className = 'rank-detail';
        d.textContent = row.dataset.detail;
        row.querySelector('.rank-info').appendChild(d);
      };
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { mount };
})();
window.Pages = window.Pages || {};
window.Pages.ranking = RankingPage;
