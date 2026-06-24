// repository.js — 数据层统一接口
// Supabase 启用时走云（REST API）；未配置/失败时自动回退 localStorage，保证永远可用
const Repo = (function () {

  const LS_HISTORY = 'jiahao_history';   // 本机做题历史
  const LS_BEST    = 'jiahao_best';      // 本机最高豪意值

  /**
   * 保存一条做题记录（云+本地双写，云失败不阻塞）
   * rec 字段：nickname, contact, contactType, province, haoyi, tier, code,
   *          labelId, durationMs, questionTimings
   */
  async function saveRecord(rec) {
    // 1. 本地一定写
    saveLocal(rec);
    // 2. 云端尝试写
    if (window.SupabaseConfig && window.SupabaseConfig.isEnabled()) {
      try {
        await window.SupabaseConfig.insert({
          nickname: rec.nickname || null,
          contact: rec.contact || null,
          contact_type: rec.contactType || null,
          province: rec.province || null,
          haoyi: rec.haoyi,
          tier: rec.tier,
          code: rec.code,
          label_id: rec.labelId,
          duration_ms: rec.durationMs || 0,
          question_timings: rec.questionTimings || null,
          user_agent: navigator.userAgent.slice(0, 200),
        });
      } catch (e) {
        console.warn('[嘉豪] 云端写入失败，仅存本地:', e);
      }
    }
  }

  function saveLocal(rec) {
    const arr = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
    arr.unshift({ ...rec, ts: Date.now() });
    localStorage.setItem(LS_HISTORY, JSON.stringify(arr.slice(0, 50)));
    const best = parseInt(localStorage.getItem(LS_BEST) || '0', 10);
    if ((rec.haoyi || 0) > best) localStorage.setItem(LS_BEST, String(rec.haoyi));
  }

  function getLocalHistory() {
    return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  }

  function getLocalBest() {
    return parseInt(localStorage.getItem(LS_BEST) || '0', 10);
  }

  /** 云端豪意值排行榜：降序 top N。云不可用返回本机数据 */
  async function getRanking(limit) {
    limit = limit || 50;
    if (window.SupabaseConfig && window.SupabaseConfig.isEnabled()) {
      try {
        const rows = await window.SupabaseConfig.select(
          '?select=id,nickname,contact,contact_type,haoyi,tier,code,label_id,province,created_at' +
          '&order=haoyi.desc&limit=' + limit);
        return { source: 'cloud', rows: rows };
      } catch (e) {
        console.warn('[嘉豪] 云端排行榜失败，用本机数据:', e);
      }
    }
    const rows = getLocalHistory().slice(0, limit).map(r => ({
      nickname: r.nickname, haoyi: r.haoyi, tier: r.tier,
      code: r.code, label_id: r.labelId, province: r.province, created_at: r.ts,
    }));
    return { source: 'local', rows };
  }

  /** 各省份豪意值统计榜（平均豪意值 + 人数），云不可用返回空 */
  async function getProvinceRanking() {
    if (window.SupabaseConfig && window.SupabaseConfig.isEnabled()) {
      try {
        // 取所有有省份的记录，前端聚合（数据量不大时可行）
        const rows = await window.SupabaseConfig.select(
          '?select=province,haoyi&province=not.is.null');
        const byProv = {};
        rows.forEach(r => {
          if (!r.province) return;
          if (!byProv[r.province]) byProv[r.province] = { province: r.province, sum: 0, count: 0 };
          byProv[r.province].sum += r.haoyi;
          byProv[r.province].count += 1;
        });
        const list = Object.values(byProv).map(p => ({
          province: p.province,
          avg: Math.round(p.sum / p.count),
          count: p.count,
        })).sort((a, b) => b.avg - a.avg);
        return { source: 'cloud', rows: list };
      } catch (e) {
        console.warn('[嘉豪] 省份榜失败:', e);
      }
    }
    return { source: 'local', rows: [] };
  }

  /** 总参与人数（首页"已有 X 人开过盒"） */
  async function getCount() {
    if (window.SupabaseConfig && window.SupabaseConfig.isEnabled()) {
      try {
        return await window.SupabaseConfig.count();
      } catch (e) { /* fallthrough */ }
    }
    return getLocalHistory().length;
  }

  return { saveRecord, getLocalHistory, getLocalBest, getRanking, getProvinceRanking, getCount };
})();
window.Repo = Repo;
