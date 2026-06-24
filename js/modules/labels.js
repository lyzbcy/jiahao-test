// labels.js — 本命嘉豪标签系统
// 负责加载/查询 labels.json + types.json，提供标签与稀有度元信息接口
// IIFE + window 范式（兼容 file:// 与老浏览器，无构建步骤）
const Labels = (function () {

  let _labels = [];        // 标签定义数组（labels.json）
  let _labelsById = {};    // id -> def 索引
  let _types = null;       // 维度+分档配置（types.json）
  let _ready = false;

  // 稀有度显示元信息（与 types.json 的 tiers 一致，这里做一份便于 tier key 直接查）
  const TIER_META = {
    ur:  { name: '隐藏',   order: 0 },
    ssr: { name: '传说',   order: 2 },
    sr:  { name: '超稀有', order: 3 },
    r:   { name: '稀有',   order: 4 },
    n:   { name: '普通',   order: 5 },
  };

  /** 初始化：接收已 fetch 好的数据 */
  function init(labelsData, typesData) {
    _labels = labelsData || [];
    _labelsById = {};
    _labels.forEach(d => { _labelsById[d.id] = d; });
    _types = typesData;
    _ready = true;
  }

  function isReady() { return _ready; }

  function get(id) { return _labelsById[id]; }
  function all() { return _labels.slice(); }
  function visible() { return _labels.filter(d => d.tier !== 'ur'); }
  function hidden() { return _labels.filter(d => d.tier === 'ur'); }

  function tiers() { return (_types && _types.tiers) || []; }
  function tier(key) {
    if (_types && _types.tiers) {
      const t = _types.tiers.find(x => x.id === key);
      if (t) return t;
    }
    return TIER_META[key] || { name: key, order: 99 };
  }
  function dimensions() { return (_types && _types.dimensions) || []; }

  return { init, isReady, get, all, visible, hidden, tiers, tier, dimensions };
})();
window.Labels = Labels;
