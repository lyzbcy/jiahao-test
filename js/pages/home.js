// home.js — 首页 + 做题流程
// 首页：钩子文案 + 吉祥物 + "已有X人开过盒" + 开始按钮
// 做题：一题一屏推进式，进度条，答完进入开盒动画
const HomePage = (function () {

  function mount(sel) {
    const el = document.querySelector(sel);
    el.innerHTML = `
      <div class="home">
        <div class="home-hero">
          <div class="home-badge" id="homeCount">载入中…</div>
          <h1 class="home-title">你是哪种嘉豪？</h1>
          <p class="home-sub">答 16 题，算出你的<span class="hl">豪意值</span>，抽出你的<span class="hl">本命嘉豪</span></p>
          <div class="home-mascot-emoji">😎</div>
          <button class="btn-primary btn-big" id="startBtn">开始测试 →</button>
          <div class="home-nav">
            <a href="#/ranking" class="btn-ghost">🏆 豪意榜</a>
            <a href="#/collection" class="btn-ghost">📖 豪型图鉴</a>
            <a href="#/about" class="btn-ghost">❓ 什么是嘉豪</a>
          </div>
        </div>
        <div class="home-footer">本测试纯属娱乐，嘉豪是一种态度，不是一种病。</div>
      </div>`;

    document.getElementById('startBtn').onclick = () => startQuiz(sel);

    // 首页参与人数
    refreshCount();

    if (window.Mascot) window.Mascot.setState('idle');
  }

  async function refreshCount() {
    try {
      const n = await window.Repo.getCount();
      const el = document.getElementById('homeCount');
      if (el) el.textContent = `🥷 已有 ${n} 位嘉豪测过豪意值`;
    } catch (e) { /* 忽略 */ }
  }

  // ====== 做题流程 ======
  let _answers = [];
  let _idx = 0;
  let _container = null;

  function startQuiz(sel) {
    _container = document.querySelector(sel);
    _answers = [];
    _idx = 0;
    renderQuestion();
  }

  function renderQuestion() {
    const questions = window.JIAHAO_DATA.questions;
    const q = questions[_idx];

    _container.innerHTML = `
      <div class="quiz">
        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" style="width:${(_idx / questions.length) * 100}%"></div>
        </div>
        <div class="quiz-progress-text">第 ${_idx + 1} / ${questions.length} 题</div>
        <div class="quiz-scenario">${q.scenario || ''}</div>
        <h2 class="quiz-text">${q.text}</h2>
        <div class="quiz-options">
          ${q.options.map(o => `
            <button class="quiz-opt" data-key="${o.key}">
              <span class="quiz-opt-key">${o.key}</span>
              <span class="quiz-opt-text">${o.text}</span>
            </button>`).join('')}
        </div>
      </div>`;

    if (window.Mascot) window.Mascot.setState('peek');

    _container.querySelectorAll('.quiz-opt').forEach(btn => {
      btn.onclick = () => {
        _answers.push({ qid: q.id, optionKey: btn.dataset.key });
        if (window.Mascot) window.Mascot.setState('happy');
        if (_idx < questions.length - 1) {
          _idx++;
          renderQuestion();
        } else {
          finish();
        }
      };
    });
    window.scrollTo(0, 0);
  }

  function finish() {
    // 暂存答案，播放开盒动画，跳结果页
    sessionStorage.setItem('jiahao_answers', JSON.stringify(_answers));
    playBoxAnimation(() => { location.hash = '#/result'; });
  }

  // 开盒动画：摇晃 → 脉冲 → 跳转
  function playBoxAnimation(onDone) {
    _container.innerHTML = `
      <div class="box-stage">
        <div class="box-emoji" id="boxEmoji">🎁</div>
        <div class="box-hint">正在凝聚你的豪气…</div>
      </div>`;
    const box = document.getElementById('boxEmoji');
    if (window.Mascot) window.Mascot.setState('spin');
    box.classList.add('shake');
    setTimeout(() => { box.classList.remove('shake'); box.classList.add('pulse'); }, 700);
    setTimeout(() => { onDone(); }, 1400);
  }

  return { mount };
})();
window.Pages = window.Pages || {};
window.Pages.home = HomePage;
