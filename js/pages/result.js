// result.js — 结果页
// 读取答案 → 引擎计算 → 展示：本命嘉豪卡 + 豪意值 + 维度条 + 骚话 + 分享 + 上云
const ResultPage = (function () {

  function mount(sel) {
    const el = document.querySelector(sel);
    const answers = JSON.parse(sessionStorage.getItem('jiahao_answers') || '[]');

    if (!answers.length) {
      el.innerHTML = `<div class="empty"><p>还没做题呢～</p>
        <a href="#/" class="btn-primary">去测试</a></div>`;
      return;
    }

    const D = window.JIAHAO_DATA;
    const result = window.TestEngine.evaluate(answers, D.questions, D.types, D.labels);
    // 缓存结果，供分享/重看用
    sessionStorage.setItem('jiahao_result', JSON.stringify(result));

    render(el, result);
    // 上云记录（不阻塞）
    window.Repo.saveRecord({
      haoyi: result.haoyi.value,
      tier: result.tierKey,
      code: result.code,
      labelId: result.label.id,
    }).catch(() => {});

    if (window.Mascot) {
      window.Mascot.setState(result.tierKey === 'n' ? 'cry' : 'happy');
    }
  }

  function render(el, result) {
    const tier = window.Labels.tier(result.tierKey);
    const label = result.label;
    const beat = window.TrashTalk.beatPercent(result.haoyi.value);
    const trash = window.TrashTalk.pickTrash(result.tierKey);
    const rarity = window.TrashTalk.rarityCopy(label.displayProb, label.name);

    el.innerHTML = `
      <div class="result ${result.tierKey === 'ur' ? 'result-hidden' : ''}">
        <div class="result-tier" style="color:${tier.color}">${tier.stars || ''} ${tier.name}</div>
        ${result.tierKey === 'ur' ? '<div class="rainbow-bg"></div>' : ''}

        <div class="label-card" style="border-color:${tier.color}">
          <div class="label-emoji ${label.special || ''}">${label.emoji || '😎'}</div>
          <h1 class="label-name">${label.name}</h1>
          <p class="label-subtitle">${label.subtitle}</p>
        </div>

        <div class="haoyi-box">
          <div class="haoyi-label">你的豪意值</div>
          <div class="haoyi-value" style="color:${tier.color}">${result.haoyi.value}</div>
          <div class="haoyi-max">/ 100</div>
        </div>

        <div class="code-box">
          <span class="code-label">豪型代码</span>
          <span class="code-value">${result.code}</span>
        </div>

        <div class="dims-box">
          <div class="dims-title">你的四维豪型</div>
          ${result.detail.map(d => dimBar(d)).join('')}
        </div>

        <div class="copy-box">
          <p class="copy-trash">💬 ${trash}</p>
          <p class="copy-beat">🏆 你的豪意值击败了全国 <b>${beat}%</b> 的嘉豪</p>
          <p class="copy-rarity">${rarity}</p>
        </div>

        <div class="label-desc">${label.desc}</div>

        <div class="result-actions">
          <button class="btn-primary" id="shareBtn">📸 生成分享卡</button>
          <a href="#/ranking" class="btn-ghost">🏆 看豪意榜</a>
          <a href="#/" class="btn-ghost" id="redoBtn">🔄 再测一次</a>
        </div>
        <canvas id="shareCanvas" style="display:none"></canvas>
        <div id="sharePreview" class="share-preview"></div>
      </div>`;

    document.getElementById('shareBtn').onclick = onShare;
    document.getElementById('redoBtn').onclick = () => sessionStorage.removeItem('jiahao_answers');
    window.scrollTo(0, 0);
  }

  function dimBar(d) {
    // ratio = 第一极(左)占比；result 是最终倾向的极
    // 进度条：从倾向极那一侧填充，填充量=该极占比，直观反映"偏哪边哪边满"
    const isLeft = d.result === d.poles[0];
    const fillPct = Math.round((isLeft ? d.ratio : (1 - d.ratio)) * 100);
    const leftLabel = d.poleLabels[d.poles[0]];
    const rightLabel = d.poleLabels[d.poles[1]];
    const resultLabel = d.poleLabels[d.result];
    const fillStyle = isLeft
      ? `right:auto;left:0;width:${fillPct}%`
      : `left:auto;right:0;width:${fillPct}%`;
    return `
      <div class="dim-bar">
        <div class="dim-bar-head">
          <span class="dim-name">${d.dimName}：<b>${resultLabel}（${d.result}）</b></span>
        </div>
        <div class="dim-bar-track">
          <div class="dim-bar-fill" style="${fillStyle}"></div>
          <div class="dim-bar-center"></div>
        </div>
        <div class="dim-bar-foot">
          <span>${leftLabel}（${d.poles[0]}）</span>
          <span class="dim-bar-pct">${fillPct}%</span>
          <span>（${d.poles[1]}）${rightLabel}</span>
        </div>
      </div>`;
  }

  async function onShare() {
    const result = JSON.parse(sessionStorage.getItem('jiahao_result') || '{}');
    if (!result.label) return;
    const canvas = await window.ShareCard.generate(result);
    const preview = document.getElementById('sharePreview');
    preview.innerHTML = '';
    canvas.style.maxWidth = '100%';
    canvas.style.borderRadius = '16px';
    canvas.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)';
    preview.appendChild(canvas);
    // 提供下载
    const dl = document.createElement('button');
    dl.className = 'btn-primary';
    dl.textContent = '⬇️ 保存图片';
    dl.onclick = () => window.ShareCard.download(canvas);
    preview.appendChild(dl);
    preview.scrollIntoView({ behavior: 'smooth' });
  }

  return { mount };
})();
window.Pages = window.Pages || {};
window.Pages.result = ResultPage;
