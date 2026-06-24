// trash-talk.js — 骚话评价库
// 按豪意值区间生成"击败百分比""100人里只有X个"等社交裂变文案
const TrashTalk = (function () {

  // 按 tier 给一串骚话模板，随机抽一条
  const BY_TIER = {
    n: [
      '你的豪意值低到嘉豪本人看了都想收你为徒。',
      '好消息：你不是嘉豪。坏消息：每个人心里都住着一个嘉豪，你只是还没醒。',
      '你的装杯技能还在新手村，连村长都打不过。',
      '佛系玩家，主打一个陪伴。嘉豪的江湖，你只是路过。',
    ],
    r: [
      '你的豪意初现锋芒，是块做嘉豪的好料子。',
      '你已经摸到了嘉豪的门，就差推门进去装一下了。',
      '班里那种"有点东西但说不上来"的同学，说的就是你。',
      '再练练，你离赛级嘉豪只差一副黑框眼镜。',
    ],
    sr: [
      '资深嘉豪，日常豪意拉满，走哪都自带 BGM。',
      '你不是在装杯，你是在进行一场长期的、严肃的、艺术性的装杯。',
      '你的同学已经习惯了你的存在——毕竟，没你教室会安静很多。',
      '赛级嘉豪预备役，再努把力就能出道了。',
    ],
    ssr: [
      '赛级嘉豪，豪意值拉满，走哪都是全场焦点（不管你愿不愿意）。',
      '你已经不是在模仿嘉豪了，你就是嘉豪本人。',
      '隔壁班传说的那个男人，疑似就是你的分身。',
      '你的豪意值已经溢出系统量程，建议低调。',
    ],
    ur: [
      '自在极意豪，豪意值突破天际，身在豪中不知豪。',
      '你已经超越了嘉豪的定义，进入了传说中的领域。',
      '测试系统无法理解你，但全网都理解你。',
      '你不是嘉豪，你是嘉豪之神。',
    ],
  };

  // 击败百分比文案：豪意值越高，击败的人越多
  function beatPercent(value) {
    // 豪意值 0→击败5%，100→击败99%，做一个 S 曲线让中间段更有戏剧性
    let pct;
    if (value <= 30) pct = 5 + value * 0.8;          // 5~29%
    else if (value <= 75) pct = 29 + (value - 30) * 1.3; // 29~87%
    else pct = Math.min(99, 87 + (value - 75) * 0.48);   // 87~99%
    return Math.round(pct);
  }

  function pickTrash(tierKey) {
    const arr = BY_TIER[tierKey] || BY_TIER.n;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // "100 人里只有 X 个抽到" 文案，用标签的 displayProb
  function rarityCopy(displayProb, labelName) {
    const per100 = Math.max(1, Math.round(displayProb * 100));
    if (per100 <= 1) return `全网 100 个嘉豪里，只有不到 ${per100} 个抽到了【${labelName}】`;
    return `全网 100 个嘉豪里，只有约 ${per100} 个抽到了【${labelName}】`;
  }

  return { pickTrash, beatPercent, rarityCopy };
})();
window.TrashTalk = TrashTalk;
