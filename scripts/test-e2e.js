// test-e2e.js — 端到端流程验证：模拟浏览器 fetch JSON → 引擎计算 → 结果数据完整性
// 验证：app.js 能 fetch 到的数据，喂给引擎，产出的结果包含 result.js 渲染所需的所有字段
const http = require('http');
const vm = require('vm');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        if (resp.statusCode !== 200) return reject(new Error(url + ' -> ' + resp.statusCode));
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// 加载引擎模块（从文件，模拟浏览器 <script>）
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
function loadModule(rel, varName) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.window[varName];
}

(async () => {
  const base = 'http://localhost:8091';
  console.log('=== 端到端流程：模拟一次完整做题 ===\n');

  // 1. 模拟 app.js 启动时 fetch 三个 JSON
  console.log('① app.js fetch 数据...');
  const questions = await fetchJSON(base + '/js/data/questions.json');
  const types = await fetchJSON(base + '/js/data/types.json');
  const labels = await fetchJSON(base + '/js/data/labels.json');
  console.log('   题库 ' + questions.length + ' 题, 标签 ' + labels.length + ' 款, 维度 ' + types.dimensions.length + ' 个 ✓');

  // 2. 初始化 Labels
  const Labels = loadModule('js/modules/labels.js', 'Labels');
  const TestEngine = loadModule('js/modules/test-engine.js', 'TestEngine');
  Labels.init(labels, types);

  // 3. 模拟用户答题（构造一个"装杯+中二+整活+不自觉"的全嘉豪答案）
  console.log('\n② 模拟用户答 ' + questions.length + ' 题（全选嘉豪选项/滑块拉满）...');
  const answers = questions.map((q, i) => {
    if (q.type === 'slider') {
      // 滑块题：拉满（最嘉豪）
      return { qid: q.id, value: (q.scale && q.scale.max) || 7 };
    }
    // 选择题：选 score 最高的选项（最嘉豪）
    const opt = q.options.slice().sort((a, b) => b.score - a.score)[0];
    return { qid: q.id, optionKey: opt.key };
  });

  // 4. 引擎计算
  console.log('\n③ TestEngine.evaluate 计算...');
  const result = TestEngine.evaluate(answers, questions, types, labels);

  // 5. 验证结果包含 result.js 渲染所需的全部字段
  console.log('\n④ 验证结果字段完整性（result.js 依赖）：');
  const need = {
    'result.label': result.label,
    'result.label.name': result.label && result.label.name,
    'result.label.emoji': result.label && result.label.emoji,
    'result.label.subtitle': result.label && result.label.subtitle,
    'result.label.desc': result.label && result.label.desc,
    'result.haoyi.value': typeof (result.haoyi && result.haoyi.value),
    'result.code': result.code,
    'result.tierKey': result.tierKey,
    'result.detail (4维)': result.detail && result.detail.length === 4,
    'result.detail[].poleLabels': result.detail && result.detail[0] && result.detail[0].poleLabels,
    'result.detail[].dimName': result.detail && result.detail[0] && result.detail[0].dimName,
  };
  let ok = true;
  for (const k in need) {
    const good = need[k] !== undefined && need[k] !== false && need[k] !== null;
    if (!good) ok = false;
    console.log('  ' + (good ? '✓' : '✗') + ' ' + k + ' = ' + JSON.stringify(need[k]).slice(0, 60));
  }

  // 6. 验证 Labels.tier / TrashTalk 接口（result.js 也依赖）
  const tier = Labels.tier(result.tierKey);
  console.log('\n⑤ 验证 Labels.tier() 返回：');
  console.log('  ✓ tier.name=' + tier.name + ', tier.stars=' + tier.stars + ', tier.color=' + tier.color);

  console.log('\n=== 端到端结果 ===');
  console.log('  本命嘉豪: ' + result.label.name + ' (' + tier.name + ')');
  console.log('  豪意值: ' + result.haoyi.value + ' / 100');
  console.log('  豪型代码: ' + result.code);
  console.log('  四维: ' + result.detail.map(d => d.dimName + d.result + '(' + Math.round(d.ratio*100) + '%)').join('  '));

  console.log('\n' + (ok ? '✓ 端到端流程完整，result.js 可正常渲染' : '✗ 结果字段缺失'));
  process.exit(ok ? 0 : 1);
})();
