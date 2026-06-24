// repository.js — 数据层统一接口
// Supabase 启用时走云；未配置/失败时自动回退 localStorage，保证"我的记录"永远可用
const Repo = (function () {

  const LS_HISTORY = 'jiahao_history';   // 本机做题历史
  const LS_BEST    = 'jiahao_best';      // 本机最高豪意值

  /** 保存一条做题记录（云+本地双写，云失败不阻塞） */
  async function saveRecord(rec) {
    // 1. 本地一定写
    saveLocal(rec);
    // 2. 云端尝试写
    if (window.SupabaseConfig && window.SupabaseConfig.isEnabled()) {
      try {
        const client = window.SupabaseConfig.getClient();
        const table = window.SupabaseConfig.getTable();
        await client.from(table).insert([{
          nickname: rec.nickname || null,
          haoyi: rec.haoyi,
          tier: rec.tier,
          code: rec.code,
          label_id: rec.labelId,
          region: rec.region || null,
          age_group: rec.ageGroup || null,
        }]);
      } catch (e) {
        console.warn('[嘉豪] 云端写入失败，仅存本地:', e);
      }
    }
  }

  function saveLocal(rec) {
    const arr = JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
    arr.unshift({ ...rec, ts: Date.now() });
    // 只留最近 50 条
    localStorage.setItem(LS_HISTORY, JSON.stringify(arr.slice(0, 50)));
    // 更新本机最高
    const best = parseInt(localStorage.getItem(LS_BEST) || '0', 10);
    if ((rec.haoyi || 0) > best) localStorage.setItem(LS_BEST, String(rec.haoyi));
  }

  /** 本机历史 */
  function getLocalHistory() {
    return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]');
  }

  /** 本机最高豪意值 */
  function getLocalBest() {
    return parseInt(localStorage.getItem(LS_BEST) || '0', 10);
  }

  /** 云端排行榜：豪意值降序 top N。云不可用返回本机数据 */
  async function getRanking(limit) {
    limit = limit || 50;
    if (window.SupabaseConfig && window.SupabaseConfig.isEnabled()) {
      try {
        const client = window.SupabaseConfig.getClient();
        const table = window.SupabaseConfig.getTable();
        const { data, error } = await client.from(table)
          .select('nickname,haoyi,tier,code,label_id,created_at')
          .order('haoyi', { ascending: false })
          .limit(limit);
        if (!error && data) return { source: 'cloud', rows: data };
      } catch (e) {
        console.warn('[嘉豪] 云端排行榜失败，用本机数据:', e);
      }
    }
    // 回退本机
    const rows = getLocalHistory().slice(0, limit).map(r => ({
      nickname: r.nickname, haoyi: r.haoyi, tier: r.tier,
      code: r.code, label_id: r.labelId, created_at: r.ts,
    }));
    return { source: 'local', rows };
  }

  /** 总参与人数（首页"已有 X 人开过盒"计数） */
  async function getCount() {
    if (window.SupabaseConfig && window.SupabaseConfig.isEnabled()) {
      try {
        const client = window.SupabaseConfig.getClient();
        const table = window.SupabaseConfig.getTable();
        const { count, error } = await client.from(table)
          .select('*', { count: 'exact', head: true });
        if (!error && count != null) return count;
      } catch (e) { /* fallthrough */ }
    }
    return getLocalHistory().length;
  }

  return { saveRecord, getLocalHistory, getLocalBest, getRanking, getCount };
})();
window.Repo = Repo;
