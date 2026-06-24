// about.js — 什么是嘉豪（科普页，给不懂梗的新用户）
const AboutPage = (function () {
  function mount(sel) {
    const el = document.querySelector(sel);
    el.innerHTML = `
      <div class="page about">
        <h1 class="page-title">🥷 什么是嘉豪？</h1>
        <div class="about-body">
          <p><b>嘉豪</b>，2024 年诞生于一段视频：一位穿黑衣黑帽黑口罩的中学生，在教室里模仿 Alan Walker《The Spectre》"虚空打碟"，视频被误标了名字"嘉豪"，从此"嘉豪"就成了所有这类行为的代名词。</p>
          <p>说白了，<b>嘉豪</b>就是调侃学生时代那些<b>爱装×、爱表现、自我感觉良好、中二爆棚</b>（尤其是中学男生）的行为。它不是骂人，更像一个集体自嘲的勋章——人人都可能是嘉豪。</p>

          <h2>什么是"豪意值"？</h2>
          <p>衡量一个人有多"嘉豪"的数值。0 是正常人，100 是传说中的存在。本测试通过<b>装、二、骚、觉</b>四个维度计算你的豪意值。</p>

          <h2>四个维度</h2>
          <ul class="about-dims">
            <li><b>装</b> — 你的表现欲与刻意营造感（朴实无豪 ↔ 极致装杯）</li>
            <li><b>二</b> — 你的中二病浓度（清醒克制 ↔ 中二爆表）</li>
            <li><b>骚</b> — 你的整活能力（老实本分 ↔ 花式整活）</li>
            <li><b>觉</b> — 你对自己嘉豪行为的自觉度（身在豪中 ↔ 浑然自觉）</li>
          </ul>
          <p class="about-tip">💡 "<b>觉</b>"维度是这个测试的灵魂——它把"<b>自在极意豪</b>"（身在豪中不知豪、浑然不自觉）和普通嘉豪区分开。致敬《龙珠》自在极意功。</p>

          <h2>本命嘉豪有几款？</h2>
          <p>共 <b>14 款</b>：12 款常规（上课全对豪、虚空打碟豪、雨中漫步豪、黑衣口罩豪、文学豪、金融豪、黑客豪、兵王豪、球场豪、始祖豪、空气投篮豪、做题豪）+ 2 款隐藏款（<b>自在极意豪</b>、<b>仙豪模式</b>）。</p>

          <div class="about-quote">"质疑嘉豪，理解嘉豪，成为嘉豪。"</div>
          <div class="about-src">梗来源：百度百科"嘉豪"词条 · 游民星空《全世界都成为了嘉豪》</div>

          <h2>支持作者 / 加群</h2>
          <p>这个测试是作者用爱发电做的。如果它让你笑了，欢迎支持一下，也欢迎进群交流嘉豪心得～</p>
          <div class="about-author">
            <button class="btn-ghost" onclick="App.openReward()">☕ 请作者喝咖啡</button>
            <button class="btn-ghost" onclick="App.openQq()">💬 加入 QQ 群</button>
          </div>
        </div>
        <div class="page-back">
          <a href="#/" class="btn-primary">开始测试 →</a>
        </div>
      </div>`;
  }
  return { mount };
})();
window.Pages = window.Pages || {};
window.Pages.about = AboutPage;
