// test-engine.js — 引擎逻辑单元测试（纯 Node，不依赖浏览器）
// 验证：维度计分 / 豪意值换算 / 14款标签都能被合理触发 / 两个隐藏款能触发
// 运行：node scripts/test-engine.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
function loadGlobal(file, varName) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf-8');
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.window[varName];
}

// 加载引擎（它们挂 window.XXX）
const TestEngine = loadGlobal('js/modules/test-engine.js', 'TestEngine');
const Labels = loadGlobal('js/modules/labels.js', 'Labels');

// 加载数据
const questions = JSON.parse(fs.readFileSync(path.join(ROOT, 'js/data/questions.json'), 'utf-8'));
const types = JSON.parse(fs.readFileSync(path.join(ROOT, 'js/data/types.json'), 'utf-8'));
const labels = JSON.parse(fs.readFileSync(path.join(ROOT, 'js/data/labels.json'), 'utf-8'));
Labels.init(labels, types);

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('\n=== 1. 数据完整性 ===');
ok('题库 16 题', questions.length === 16, '实际 ' + questions.length);
ok('标签 14 款（12常规+2隐藏）', labels.length === 14, '实际 ' + labels.length);
ok('维度 4 个', types.dimensions.length === 4, '实际 ' + types.dimensions.length);
ok('分档 5 档', types.tiers.length === 5, '实际 ' + types.tiers.length);
// 每维度正好 4 题
types.dimensions.forEach(d => {
  const n = questions.filter(q => q.dim === d.id).length;
  ok('维度 ' + d.id + ' 有 4 题', n === 4, '实际 ' + n);
});

console.log('\n=== 2. 构造各种答案，验证引擎不崩 + 结果合理 ===');

// 造答案：每题选某个选项。poles: 想让每题选哪一极
function makeAnswers(poleByDim) {
  return questions.map(q => {
    const wantPole = poleByDim[q.dim];
    const opt = q.options.find(o => o.pole === wantPole);
    if (!opt) {
      // 没有目标极，取第一个
      return { qid: q.id, optionKey: q.options[0].key };
    }
    // 优先选 score 高的（更强烈）
    const opts = q.options.filter(o => o.pole === wantPole).sort((a,b) => b.score - a.score);
    return { qid: q.id, optionKey: opts[0].key };
  });
}

const FOUR_DIMS = ['ZZ', 'QE', 'LS', 'ZJ'];
const POLES = { ZZ: ['P', 'Z'], QE: ['Q', 'E'], LS: ['L', 'S'], ZJ: ['Z', 'J'] };

// 2a. 全选"低豪极"（P/Q/L/J）→ 豪意值应该低
{
  const ans = makeAnswers({ ZZ: 'P', QE: 'Q', LS: 'L', ZJ: 'J' });
  const r = TestEngine.evaluate(ans, questions, types, labels);
  console.log('  全低豪极 → 代码:' + r.code + ' 豪意值:' + r.haoyi.value + ' 标签:' + r.label.name);
  ok('全低豪极 代码为 PQLJ', r.code === 'PQLJ', r.code);
  ok('全低豪极 豪意值较低 (<=55)', r.haoyi.value <= 55, '值=' + r.haoyi.value);
  ok('有标签返回', !!r.label.name);
}

// 2b. 全选"高豪极"（Z/E/S/Z）→ 应触发仙豪模式（四维同极 Z E S Z），代码 ZESZ
{
  const ans = makeAnswers({ ZZ: 'Z', QE: 'E', LS: 'S', ZJ: 'Z' });
  const r = TestEngine.evaluate(ans, questions, types, labels);
  console.log('  全高豪极 → 代码:' + r.code + ' 豪意值:' + r.haoyi.value + ' 标签:' + r.label.name);
  ok('全高豪极 代码为 ZESZ', r.code === 'ZESZ', r.code);
  ok('全高豪极 触发隐藏款（ur）', r.label.tier === 'ur', 'tier=' + r.label.tier);
}

// 2c. 单独验证自在极意豪条件：豪意值高 + ZJ=Z
{
  // 强装杯+强中二+强整活 + 觉不自觉 → Z E S Z 其实就是仙豪了
  // 自在极意豪要求 value>=96 且 ZJ=Z，但全高豪会先被仙豪(all_extreme)命中
  // 测试一个 ZJ=Z 但其他维度没那么极端的组合
  const ans = makeAnswers({ ZZ: 'Z', QE: 'E', LS: 'L', ZJ: 'Z' });
  const r = TestEngine.evaluate(ans, questions, types, labels);
  console.log('  ZEZ组合 → 代码:' + r.code + ' 豪意值:' + r.haoyi.value + ' 标签:' + r.label.name);
  ok('ZJ=Z 维度判定正确', r.code[3] === 'Z', r.code);
}

console.log('\n=== 3. 16 种维度组合都能算出结果（不崩、不空）===');
let allHaveLabel = true, allHaveValue = true;
let tierSeen = {};
FOUR_DIMS.forEach(d1 => POLES[d1].forEach(p1 => {
  FOUR_DIMS.forEach(d2 => POLES[d2].forEach(p2 => {
    FOUR_DIMS.forEach(d3 => POLES[d3].forEach(p3 => {
      FOUR_DIMS.forEach(d4 => POLES[d4].forEach(p4 => {
        const ans = makeAnswers({ ZZ: p1, QE: p2, LS: p3, ZJ: p4 });
        const r = TestEngine.evaluate(ans, questions, types, labels);
        if (!r.label || !r.label.name) allHaveLabel = false;
        if (typeof r.haoyi.value !== 'number') allHaveValue = false;
        tierSeen[r.tierKey] = (tierSeen[r.tierKey] || 0) + 1;
      }));
    }));
  }));
}));
ok('16 种组合全部有标签', allHaveLabel);
ok('16 种组合全部有豪意值', allHaveValue);
console.log('  稀有度分布: ' + JSON.stringify(tierSeen));

console.log('\n=== 4. 14 款标签至少能被针对性构造触发 ===');
// 关键：构造答案时，hint 指定的维度走指定极，其余维度走"低豪极"压低豪意值，
// 避免误触发仙豪模式(全高豪)或把豪意值顶到不该去的档。
// 对低 tier 标签，hint 维度也用 min 强度压低；高 tier 用 max 强度抬高。
function answersByPolesTuned(poleMap, strength) {
  return questions.map(q => {
    const wantPole = poleMap[q.dim];
    const opts = q.options.filter(o => o.pole === wantPole);
    const pick = strength === 'max'
      ? opts.sort((a,b) => b.score - a.score)[0]
      : opts.sort((a,b) => a.score - b.score)[0];
    return { qid: q.id, optionKey: (pick || q.options[0]).key };
  });
}

let allTriggerable = true;
const notTriggered = [];
// 高豪极映射（与引擎 HAOMAP 一致）
const HAO = { ZZ: 'Z', QE: 'E', LS: 'S', ZJ: 'Z' };
const LOW = { ZZ: 'P', QE: 'Q', LS: 'L', ZJ: 'J' };

labels.forEach(def => {
  // 暴力搜索：遍历 hint 维度的所有极组合 × 非hint维度的高低豪极，找任一能命中目标的
  let found = null;
  // 先确定 hint 必须走的极
  const hintDims = (def.cond && def.cond.hint) ? Object.keys(def.cond.hint) : [];
  const otherDims = FOUR_DIMS.filter(d => hintDims.indexOf(d) < 0);

  // 生成 hint 维度的固定极 + 非hint维度的 2^k 组合
  const combos = [[]];
  otherDims.forEach(d => {
    const next = [];
    combos.forEach(c => { next.push([...c, [d, HAO[d]]]); next.push([...c, [d, LOW[d]]]); });
    combos.length = 0; combos.push(...next);
  });

  for (const basePoleMap of [{ ZZ:'P',QE:'Q',LS:'L',ZJ:'J' }, { ZZ:'Z',QE:'E',LS:'S',ZJ:'Z' }]) {
    for (const combo of combos) {
      for (const str of ['min', 'max']) {
        const poleMap = Object.assign({}, basePoleMap);
        if (def.cond && def.cond.hint) Object.assign(poleMap, def.cond.hint);
        combo.forEach(([d, p]) => { poleMap[d] = p; });
        const ans = answersByPolesTuned(poleMap, str);
        const r = TestEngine.evaluate(ans, questions, types, labels);
        if (r.label.id === def.id) { found = { r, poleMap, str }; break; }
      }
      if (found) break;
    }
    if (found) break;
  }

  if (found) {
    console.log('  ✓ ' + def.name + ' 可触发 (值' + found.r.haoyi.value + ' 代码' + found.r.code + ')');
  } else {
    allTriggerable = false;
    notTriggered.push(def.id);
    console.log('  · ' + def.name + ' 搜索所有组合均未命中（条件可能过严或与 tier 冲突）');
  }
});
ok('14 款标签全部可针对性触发', allTriggerable, notTriggered.join('; '));

console.log('\n=========================');
console.log('  通过 ' + pass + ' / 失败 ' + fail);
console.log('=========================\n');
process.exit(fail > 0 ? 1 : 0);
