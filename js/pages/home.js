// home.js — 首页 + 做题流程
// 首页：钩子文案 + 吉祥物 + "已有X人开过盒" + 开始按钮
// 做题：一题一屏推进式，进度条，答完进入开盒动画
const HomePage = (function () {

  const PROVINCES = ['北京','天津','河北','山西','内蒙古','辽宁','吉林','黑龙江','上海','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','重庆','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆','香港','澳门','台湾'];

  function mount(sel) {
    const el = document.querySelector(sel);
    el.innerHTML = `
      <div class="home">
        <div class="home-hero">
          <div class="home-badge" id="homeCount">载入中…</div>
          <h1 class="home-title">你是哪种嘉豪？</h1>
          <p class="home-sub">答 20 题，算出你的<span class="hl">豪意值</span>，抽出你的<span class="hl">本命嘉豪</span></p>
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
  let _timings = {};      // 各题耗时 { qid: ms }
  let _qStartTime = 0;    // 当前题开始时间
  let _idx = 0;
  let _container = null;

  function startQuiz(sel) {
    _container = document.querySelector(sel);
    _answers = [];
    _timings = {};
    _idx = 0;
    _qStartTime = Date.now();
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
        // 记录本题耗时（首次答题写入，返回重答不覆盖）
        if (_timings[q.id] == null) _timings[q.id] = Date.now() - _qStartTime;
        // 更新答案（返回重答时替换而非追加）
        const exist = _answers.findIndex(a => a.qid === q.id);
        const optKey = btn.dataset.key;
        if (exist >= 0) _answers[exist].optionKey = optKey;
        else _answers.push({ qid: q.id, optionKey: optKey });

        // 弹出契合表情包反馈（按所选选项的维度极性取图）
        const opt = q.options.find(o => o.key === optKey);
        showStickerFeedback(q, opt);
        if (window.Mascot) window.Mascot.setState('happy');
        if (_idx < questions.length - 1) {
          _idx++;
          _qStartTime = Date.now();
          setTimeout(renderQuestion, 480);
        } else {
          setTimeout(finish, 480);
        }
      };
    });
    window.scrollTo(0, 0);
  }

  // 答题反馈：弹一张契合表情包，480ms 后消失（被下一题渲染覆盖）
  function showStickerFeedback(q, opt) {
    if (!window.Sticker || !window.Sticker.ready()) return;
    let file = null;
    // 优先用题库/选项指定的 sticker
    if (opt && opt.sticker) file = opt.sticker;
    else if (q.sticker) file = q.sticker;
    // 否则按维度极性取
    if (!file && opt && q.dim) {
      const pole = opt.pole;
      // 豪极(Z/E/S 的第二极、ZJ 的 Z 第一极)取"得瑟"系，非豪极取"乖巧/发呆"系
      const isHao = (q.dim === 'ZZ' && pole === 'Z') || (q.dim === 'QE' && pole === 'E') ||
                    (q.dim === 'LS' && pole === 'S') || (q.dim === 'ZJ' && pole === 'Z');
      file = isHao ? window.Sticker.byMood('smug') : window.Sticker.byMood('cute');
    }
    if (!file) return;
    const popup = document.createElement('div');
    popup.className = 'sticker-popup';
    popup.innerHTML = window.Sticker.html(file, 'sticker-popup-img', '😎');
    _container.appendChild(popup);
    setTimeout(() => popup.remove(), 460);
  }

  function finish() {
    // 暂存答案和耗时，弹信息表单（填完再开盒）
    sessionStorage.setItem('jiahao_answers', JSON.stringify(_answers));
    sessionStorage.setItem('jiahao_timings', JSON.stringify(_timings));
    renderInfoForm();
  }

  // 信息收集表单：昵称/联系方式/省份（均可不填），带用途说明
  function renderInfoForm() {
    // 默认昵称：随机一个"嘉豪XX号"
    const defaultNick = '嘉豪' + Math.floor(1000 + Math.random() * 9000) + '号';
    _container.innerHTML = `
      <div class="info-form">
        <div class="info-progress">答题完成 ✓</div>
        <h2 class="info-title">填写你的嘉豪档案</h2>
        <p class="info-sub">（以下均可不填，不填则用默认值）</p>

        <div class="info-field">
          <label>昵称 <span class="info-tip">显示在排行榜上</span></label>
          <input type="text" id="ifNick" maxlength="20" placeholder="${defaultNick}">
        </div>

        <div class="info-field">
          <label>联系方式 <span class="info-tip">抖音号/邮箱/QQ/微信，显示在榜单详情里，方便别人找你</span></label>
          <div class="info-contact-row">
            <select id="ifContactType">
              <option value="douyin">抖音号</option>
              <option value="qq">QQ号</option>
              <option value="wechat">微信号</option>
              <option value="email">邮箱</option>
            </select>
            <input type="text" id="ifContact" maxlength="40" placeholder="选填">
          </div>
        </div>

        <div class="info-field">
          <label>省份 <span class="info-tip">参与各省份豪意值榜，不填默认"嘉豪省"</span></label>
          <select id="ifProvince">
            <option value="">— 不填（嘉豪省）—</option>
            ${PROVINCES.map(p => `<option value="${p}">${p}</option>`).join('')}
          </select>
        </div>

        <div class="info-privacy">
          🔒 你的信息将显示在公开排行榜上（供其他玩家查看）。如需删除，可联系作者。
        </div>

        <button class="btn-primary btn-big" id="ifSubmit">提交并开盒 →</button>
        <button class="btn-skip" id="ifSkip">跳过，直接看结果</button>
      </div>`;

    document.getElementById('ifSubmit').onclick = submitInfo;
    document.getElementById('ifSkip').onclick = () => {
      // 跳过：用默认值
      saveUserInfo({ nickname: defaultNick, contact: '', contactType: '', province: '' });
    };
    window.scrollTo(0, 0);
  }

  function submitInfo() {
    const nickname = (document.getElementById('ifNick').value || '').trim();
    const contact = (document.getElementById('ifContact').value || '').trim();
    const contactType = document.getElementById('ifContactType').value;
    const province = document.getElementById('ifProvince').value;
    saveUserInfo({
      nickname: nickname || '',
      contact: contact,
      contactType: contact ? contactType : '',
      province: province,
    });
  }

  function saveUserInfo(info) {
    sessionStorage.setItem('jiahao_userinfo', JSON.stringify(info));
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
