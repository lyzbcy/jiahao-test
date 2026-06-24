// test-engine.js — 嘉豪值测试核心引擎
// 三层管线：维度计分 → 豪意值换算 → 本命嘉豪判定
// 参考 lyzbcy-测试题制作 skill 的 MBTI题型引擎 + 盲盒标签引擎
const TestEngine = (function () {

  /**
   * ① 维度计分：把用户答案累加成每个维度两极的得分
   * @param {Array} answers [{ qid, optionKey }, ...]
   * @param {Array} questions 题库
   * @returns {Object} { ZZ:{P:n,Z:n}, QE:{Q:n,E:n}, LS:{L:n,S:n}, ZJ:{Z:n,J:n} }
   */
  function score(answers, questions) {
    const dimScores = {};
    questions.forEach(q => { if (!dimScores[q.dim]) dimScores[q.dim] = {}; });

    answers.forEach(ans => {
      const q = questions.find(x => x.id === ans.qid);
      if (!q) return;
      const opt = q.options.find(o => o.key === ans.optionKey);
      if (!opt) return;
      const pole = opt.pole;
      dimScores[q.dim][pole] = (dimScores[q.dim][pole] || 0) + (opt.score || 1);
    });
    return dimScores;
  }

  /**
   * ② 极性判定：每维度按阈值定极，组成 4 字母豪型代码
   * @returns { code: "PESJ", detail: [{ dim, poles, a, b, ratio, result, strength }] }
   *   strength: 0~1，偏离 0.5 的程度，用于显示"你很 X"以及触发极端彩蛋
   */
  function classify(dimScores, typeConfig) {
    let code = '';
    const detail = [];

    for (const dim of typeConfig.dimensions) {
      const ds = dimScores[dim.id] || {};
      const a = ds[dim.poles[0]] || 0;   // 第一极（如 P 朴实）
      const b = ds[dim.poles[1]] || 0;   // 第二极（如 Z 装杯）
      const total = a + b;
      const ratio = total > 0 ? a / total : 0.5;
      // ratio >= threshold → 第一极，否则第二极
      const pole = ratio >= dim.threshold ? dim.poles[0] : dim.poles[1];
      code += pole;
      detail.push({
        dim: dim.id,
        dimName: dim.name,
        poles: dim.poles,
        poleLabels: dim.poleLabels,
        a, b, ratio,
        result: pole,
        strength: Math.abs(ratio - 0.5) * 2,  // 0~1
      });
    }
    return { code, detail };
  }

  /**
   * ③ 豪意值换算：把四维 strength 映射成 0~100 的豪意值
   *   "嘉豪"程度 = 各维度偏向"高豪"极(Z/E/S/Z)的强度之和
   *   （注意："觉"维度取"身在豪中/不自觉 Z 极"为高豪，对应 poles[0]）
   * @returns { value: 0~100, tierKey: 'n'|'r'|'sr'|'ssr'|'ur' }
   */
  function calcHaoyi(classifyResult, typeConfig) {
    // 各维度"高豪极"是第几个 pole
    // ZZ: Z(装杯)是 poles[1]；QE: E(中二)是 poles[1]；
    // LS: S(整活)是 poles[1]；ZJ: Z(不自觉)是 poles[0]
    const HAOMAP = { ZZ: 1, QE: 1, LS: 1, ZJ: 0 };

    // 每维算一个 0~1 的"豪意贡献"：
    //  - 命中高豪极：贡献 = strength（越极端越豪）
    //  - 没命中高豪极：仍有部分贡献 = strength * 0.35（极端的非豪极也算"作"，给点分铺梯度）
    let contribs = [];
    classifyResult.detail.forEach(d => {
      const haoIdx = HAOMAP[d.dim];
      const isHao = d.result === d.poles[haoIdx];
      contribs.push(isHao ? d.strength : d.strength * 0.35);
    });
    const avg = contribs.reduce((s, v) => s + v, 0) / contribs.length;  // 0~1

    // 非线性映射：avg^1.3 让低豪压低、高豪抬高，同时中段可达 SR/SSR
    let value = Math.round(Math.pow(avg, 1.3) * 100);
    value = Math.max(0, Math.min(100, value));

    const tierKey = tierByValue(value, typeConfig);
    return { value, tierKey, rawSum: avg };
  }

  /** 按豪意值落档 */
  function tierByValue(value, typeConfig) {
    const tiers = (typeConfig && typeConfig.tiers) || [];
    for (const t of tiers) {
      if (value >= t.min && value <= t.max) return t.id;
    }
    return 'n';
  }

  /**
   * ④ 本命嘉豪判定：按 labels.json 的 cond 条件匹配
   *   隐藏款优先（UR），命中即采用；否则常规款按 displayProb 加权抽取；
   *   都不中则按 tier 兜底（取该档第一个标签）
   * @param {Object} ctx { haoyi, tierKey, code, dimScores, detail }
   * @returns { label, matchedAll }
   */
  function resolveLabel(ctx, labels, typeConfig) {
    const input = {
      value: ctx.haoyi.value,
      tierKey: ctx.tierKey,
      code: ctx.code,
      detail: ctx.detail,
      dimScores: ctx.dimScores,
    };

    // 1. 隐藏款优先判定（仙豪模式 all_extreme 比 自在极意豪 zizaijiyi 更严格，应优先）
    const hiddenHits = labels
      .filter(d => d.tier === 'ur' && matchCond(d.cond, input))
      .sort((a, b) => {
        // all_extreme 排第一（最罕见/最严格）
        const rank = t => (t.cond && t.cond.type === 'all_extreme') ? 0 : 1;
        return rank(a) - rank(b);
      });
    if (hiddenHits.length > 0) {
      return { label: hiddenHits[0], matched: hiddenHits };
    }

    // 2. 常规款：tier 命中 + hint 命中的候选
    //    优先在该 tier 内找 hint 完全命中的；按 hint 命中维度数 + 稀有度排序，确定匹配
    let matched = labels
      .filter(d => d.tier !== 'ur' && matchCond(d.cond, input))
      .map(d => ({ def: d, hintHits: countHintHits(d.cond, input) }))
      .sort((a, b) => {
        // hint 命中维度多的优先；并列时 displayProb 低的（更稀有）优先
        if (b.hintHits !== a.hintHits) return b.hintHits - a.hintHits;
        return (a.def.displayProb || 1) - (b.def.displayProb || 1);
      });

    let label;
    if (matched.length > 0) {
      label = matched[0].def;  // 确定匹配，不再随机
    } else {
      // 3. 兜底：该 tier 档没有 hint 命中的，取 tier 内 displayProb 最高的（最常见款）
      const tierLabels = labels
        .filter(d => d.tier === ctx.tierKey && d.tier !== 'ur')
        .sort((a, b) => (b.displayProb || 0) - (a.displayProb || 0));
      label = tierLabels[0] || labels.find(d => d.tier !== 'ur') || labels[0];
    }
    return { label, matched: matched.map(m => m.def) };
  }

  /** 计算 cond.hint 命中了几个维度（用于常规款排序） */
  function countHintHits(cond, input) {
    if (!cond || !cond.hint) return 0;
    const dimMap = detailToDimMap(input.detail);
    let hits = 0;
    for (const dimId in cond.hint) {
      if (dimMap[dimId] === cond.hint[dimId]) hits++;
    }
    return hits;
  }

  /** 条件判定分发：实现 labels.json 里 cond.type 的各种规则 */
  function matchCond(cond, input) {
    if (!cond) return false;
    switch (cond.type) {
      case 'tier_and_dim': {
        // tier 命中 + hint 指定的维度极命中
        if (!cond.tier || cond.tier.indexOf(input.tierKey) < 0) return false;
        if (!cond.hint) return true;
        const dimMap = detailToDimMap(input.detail);
        for (const dimId in cond.hint) {
          if (dimMap[dimId] !== cond.hint[dimId]) return false;
        }
        return true;
      }
      case 'zizaijiyi': {
        // 自在极意豪：明明不装杯(ZZ=P朴实)，却中二(QE=E)+整活(LS=S)+不自觉(ZJ=Z)
        //   "身在豪中不知豪"——不刻意营造，却处处是豪。与 SSR 标签(都含 ZZ=Z)正交
        const dimMap = detailToDimMap(input.detail);
        return dimMap.ZZ === 'P' && dimMap.QE === 'E' && dimMap.LS === 'S' && dimMap.ZJ === 'Z';
      }
      case 'all_extreme': {
        // 仙豪模式：四维全部取"高豪极"（Z/E/S/Z），即 poles[1,1,1,0]
        const dimMap = detailToDimMap(input.detail);
        return dimMap.ZZ === 'Z' && dimMap.QE === 'E' && dimMap.LS === 'S' && dimMap.ZJ === 'Z';
      }
      default:
        return false;
    }
  }

  function detailToDimMap(detail) {
    const m = {};
    (detail || []).forEach(d => { m[d.dim] = d.result; });
    return m;
  }

  /** 加权随机抽取（displayProb 当权重） */
  function weightedPick(defs) {
    const total = defs.reduce((s, d) => s + (d.displayProb || 0.01), 0);
    let r = Math.random() * total;
    for (const d of defs) {
      r -= (d.displayProb || 0.01);
      if (r <= 0) return d;
    }
    return defs[defs.length - 1];
  }

  /** 一站式：answers → 完整结果 */
  function evaluate(answers, questions, typeConfig, labels) {
    const dimScores = score(answers, questions);
    const { code, detail } = classify(dimScores, typeConfig);
    const haoyi = calcHaoyi({ code, detail }, typeConfig);
    const ctx = { dimScores, code, detail, haoyi, tierKey: haoyi.tierKey };
    const { label, matched } = resolveLabel(ctx, labels, typeConfig);
    return { dimScores, code, detail, haoyi, tierKey: haoyi.tierKey, label, matched };
  }

  return { score, classify, calcHaoyi, tierByValue, resolveLabel, matchCond, evaluate };
})();
window.TestEngine = TestEngine;
