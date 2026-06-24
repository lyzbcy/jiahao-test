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
  function evaluate(answers, questions, typeConfig, labels, timings, userInfo) {
    const dimScores = score(answers, questions);
    const { code, detail } = classify(dimScores, typeConfig);
    const haoyi = calcHaoyi({ code, detail }, typeConfig);
    // 本命嘉豪/四维代码用基础豪意值判定（不受思考时间/昵称影响——性格画像 vs 纯度独立）
    const ctx = { dimScores, code, detail, haoyi, tierKey: haoyi.tierKey };
    const { label, matched } = resolveLabel(ctx, labels, typeConfig);

    // 思考时间加成（仅关键题 q6/q13/q15）：真豪=快，装豪=慢
    const baseValue = haoyi.value;
    let timeBonusVal = 0, purity = null;
    if (timings) {
      const tb = calcTimeBonus(timings, questions);
      timeBonusVal = tb.total;
      purity = tb.purity;
    }
    // 昵称/联系方式加成：越爱表现越豪（标榜+4、留联系+3、自谦+2、普通-2）
    let nicknameBonusVal = 0, nicknameReason = null;
    if (userInfo) {
      const nb = calcNicknameBonus(userInfo.nickname || '', userInfo.contact || '');
      nicknameBonusVal = nb.bonus;
      nicknameReason = nb.reason;
    }
    // 最终豪意值 = 基础值 + 时间加成 + 昵称加成，clamp 0-100（影响稀有度/排名）
    const finalValue = Math.max(0, Math.min(100, baseValue + timeBonusVal + nicknameBonusVal));

    return {
      dimScores, code, detail,
      haoyi: { value: finalValue, baseValue, timeBonus: timeBonusVal, nicknameBonus: nicknameBonusVal, tierKey: tierByValue(finalValue, typeConfig) },
      tierKey: tierByValue(finalValue, typeConfig),
      label, matched,
      purity,   // {label, desc} 豪意纯度
      nicknameReason,  // 昵称加成原因（供结果页显示）
    };
  }

  /**
   * 思考时间→豪意加成（心理学模型：自动化加工 vs 控制性加工）
   *   - t<1.2s：盲选/手滑，归零（fast guess）
   *   - t≈2.5s：本能甜区峰值 +5（系统1自动化提取）
   *   - 2.5~8s：正加成递减
   *   - t>8s：进入控制性加工（装），线性扣分
   *   - t>15s：封顶 -4（极慢可能是认真回忆，不无限惩罚）
   * @param {Object} timings { qid: ms }
   * @param {Array} questions
   * @returns { total, detail, purity }
   */
  /**
   * 昵称/联系方式→豪意加成（越爱表现越豪）
   *   - 昵称带自我标榜词(豪/嘉/帅/酷/王/哥/爷/神/帝/爷)：+4（自我标签化，典型嘉豪）
   *   - 昵称带自谦词(低调/普通/正常人/无名/路人)：+2（欲擒故纵式表演）
   *   - 留了联系方式：+3（求关注、渴望被看见=嘉豪本豪）
   *   - 昵称普通自然：-2（不表现不隐藏=最不嘉豪）
   *   - 系统默认昵称(嘉豪XXXX号)：不参与(0)
   */
  function calcNicknameBonus(nickname, contact) {
    let bonus = 0;
    const reasons = [];
    const name = (nickname || '').trim();

    // 系统默认昵称（嘉豪+数字+号）不参与判定
    const isDefault = /^嘉豪\d+号$/.test(name);
    if (!isDefault && name) {
      const brag = /豪|嘉|帅|酷|王|哥|爷|神|帝|霸|总|尊|圣|皇/;
      const humble = /低调|普通|正常|无名|路人|小透明|咸鱼|凡人|普通/;
      if (brag.test(name)) { bonus += 4; reasons.push('昵称带自我标榜字(+4)——这就是嘉豪'); }
      else if (humble.test(name)) { bonus += 2; reasons.push('昵称欲擒故纵(+2)——装低调也是表演'); }
      else { bonus -= 2; reasons.push('昵称朴实无华(-2)——既不表现也不隐藏，最不嘉豪'); }
    }
    if (contact && contact.trim()) {
      bonus += 3;
      reasons.push('敢留联系方式(+3)——求关注、渴望被看见=嘉豪本豪');
    }
    return { bonus, reason: reasons.length ? reasons.join('；') : null };
  }

  function calcTimeBonus(timings, questions) {
    const keyQs = questions.filter(q => q.keyQuestion);
    let total = 0;
    const detail = {};
    keyQs.forEach(q => {
      const ms = timings[q.id];
      if (ms == null) return;
      const t = ms / 1000;          // 转秒
      const b = _singleBonus(t);
      detail[q.id] = { t: +t.toFixed(1), bonus: +b.toFixed(1) };
      total += b;
    });
    total = +total.toFixed(1);

    // 纯度判定：按总加成
    let purity;
    if (total >= 6) purity = { label: '真豪', desc: '你的嘉豪反应是本能的、不假思索的——身在豪中不知豪，豪意纯粹。', emoji: '🏆' };
    else if (total >= 2) purity = { label: '偏真豪', desc: '大部分时候你是真豪，偶尔会思考一下——瑕不掩瑜。', emoji: '✨' };
    else if (total > -2) purity = { label: '亦真亦装', desc: '你在本能和刻意之间反复横跳，是个有演技的嘉豪。', emoji: '🎭' };
    else if (total > -6) purity = { label: '偏装豪', desc: '答题前你常常权衡"哪个更豪"——有点表演成分了。', emoji: '🎬' };
    else purity = { label: '装豪', desc: '你在每道关键题前都深思熟虑——豪意是演出来的，但演技不错。', emoji: '🎞️' };
    return { total, detail, purity };
  }

  // 单题时间加成
  function _singleBonus(t) {
    if (t < 1.2) return 0;                  // 盲选归零
    if (t > 30) t = 30;                     // 极慢封顶
    const peak = 2.5, width = 3.0, amp = 5;
    let v = amp * Math.exp(-((t - peak) * (t - peak)) / (2 * width * width));
    if (t > 8) { v = v - (t - 8) * 0.6; if (v < -4) v = -4; }
    return v;
  }

  return { score, classify, calcHaoyi, tierByValue, resolveLabel, matchCond, evaluate, calcTimeBonus, calcNicknameBonus };
})();
window.TestEngine = TestEngine;
